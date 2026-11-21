import type { Vector2 } from '../physics/PhysicsTypes';

/** Small Phaser drawing surface used by the bird renderer and its unit tests. */
export interface BirdGraphicsLike {
  clear(): this;
  setDepth(depth: number): this;
  fillStyle(color: number, alpha?: number): this;
  lineStyle(width: number, color: number, alpha?: number): this;
  fillEllipse(x: number, y: number, width: number, height: number): this;
  strokeEllipse(x: number, y: number, width: number, height: number): this;
  beginPath(): this;
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  closePath(): this;
  fillPath(): this;
  strokePath(): this;
  destroy(): void;
}

export interface BirdContainerLike {
  add(child: object): this;
  setDepth(depth: number): this;
  setSize(width: number, height: number): this;
  setScale(x: number, y?: number): this;
  setRotation(value: number): this;
  destroy(): void;
}

export interface BirdRendererSceneLike {
  add: {
    container(x: number, y: number): BirdContainerLike;
    graphics(): BirdGraphicsLike;
  };
}

interface FeatherParticle {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  rotation: number;
  angularVelocity: number;
  ageMs: number;
  lifeMs: number;
  length: number;
  width: number;
  color: number;
}

const FEATHER_COLORS = [0x31a6c7, 0x55c8d7, 0xf0c35a, 0x2386a8, 0xf4e2b2, 0xe99b45];
const OUTLINE = 0x17384b;

/**
 * Procedural, frame-by-frame cartoon bird. The Matter body remains a separate
 * circle; the container only supplies the bird's animated visual layers.
 */
export class BirdRenderer {
  readonly container: BirdContainerLike;
  private readonly birdGraphics: BirdGraphicsLike;
  private readonly featherGraphics: BirdGraphicsLike;
  private readonly radius: number;
  private elapsedMs = 0;
  private direction: -1 | 1 = 1;
  private attacking = false;
  private hitReactionMs = 0;
  private visualBodyRotation = 0;
  private invertedDurationMs = 0;
  private recoveringFromFlip = false;
  private recoveryStartRotation = 0;
  private recoveryElapsedMs = 0;
  private uprightLock = false;
  private uprightStableMs = 0;
  private seed: number;
  private feathers: FeatherParticle[] = [];
  private disposed = false;

  constructor(scene: BirdRendererSceneLike, radius: number, id: string, x = 0, y = 0) {
    this.radius = Math.max(10, radius);
    this.seed = this.hashSeed(id);
    this.container = scene.add.container(x, y)
      .setSize(this.radius * 3.5, this.radius * 3.2)
      .setDepth(8);
    this.birdGraphics = scene.add.graphics();
    this.container.add(this.birdGraphics);
    this.featherGraphics = scene.add.graphics().setDepth(11);
  }

  get facingDirection(): -1 | 1 { return this.direction; }
  get isAttacking(): boolean { return this.attacking; }
  get activeFeatherCount(): number { return this.feathers.length; }

  update(
    deltaMs: number,
    direction: -1 | 1,
    attacking: boolean,
    bodyRotation = 0,
  ): void {
    if (this.disposed) return;
    const safeDelta = Math.max(0, Math.min(80, deltaMs));
    this.elapsedMs += safeDelta;
    this.direction = direction;
    this.attacking = attacking;
    this.hitReactionMs = Math.max(0, this.hitReactionMs - safeDelta);

    const flapRate = attacking ? 0.052 : 0.031;
    const flapPhase = this.elapsedMs * flapRate;
    const flap = Math.sin(flapPhase) + Math.sin(flapPhase * 1.73 + 0.8) * 0.14;
    const lean = attacking ? direction * 0.085 : Math.sin(this.elapsedMs * 0.004) * 0.018;
    this.container.setScale(1, 1);
    const visualRotation = this.resolveVisualRotation(bodyRotation, safeDelta);
    this.container.setRotation(visualRotation + lean);
    this.drawBird(flap, flapPhase);
    this.updateFeathers(safeDelta);
  }


  /**
   * A Matter circle can spin freely after a collision. Keep the bird readable:
   * allow the initial tumble, then animate its artwork back upright and hold it
   * there until the physical body's angle naturally returns near upright.
   */
  private resolveVisualRotation(bodyRotation: number, deltaMs: number): number {
    const normalizedRotation = this.normalizeAngle(bodyRotation);
    const inversionThreshold = Math.PI * 0.52;
    const uprightThreshold = Math.PI * 0.16;
    const inversionHoldMs = 260;
    const recoveryDurationMs = 720;

    if (this.recoveringFromFlip) {
      this.recoveryElapsedMs = Math.min(recoveryDurationMs, this.recoveryElapsedMs + deltaMs);
      const progress = this.recoveryElapsedMs / recoveryDurationMs;
      const easedProgress = 1 - Math.pow(1 - progress, 3);
      const settlingWobble = Math.sin(progress * Math.PI * 2) * 0.055 * (1 - progress);
      this.visualBodyRotation = this.recoveryStartRotation * (1 - easedProgress) + settlingWobble;

      if (progress >= 1) {
        this.visualBodyRotation = 0;
        this.recoveringFromFlip = false;
        this.uprightLock = true;
        this.uprightStableMs = 0;
      }
      return this.visualBodyRotation;
    }

    if (this.uprightLock) {
      if (Math.abs(normalizedRotation) <= uprightThreshold) {
        this.uprightStableMs += deltaMs;
      } else {
        this.uprightStableMs = 0;
      }

      if (this.uprightStableMs >= 180) {
        this.uprightLock = false;
        this.invertedDurationMs = 0;
        this.visualBodyRotation = normalizedRotation;
      } else {
        this.visualBodyRotation = 0;
      }
      return this.visualBodyRotation;
    }

    if (Math.abs(normalizedRotation) >= inversionThreshold) {
      this.invertedDurationMs += deltaMs;
      if (this.invertedDurationMs >= inversionHoldMs) {
        this.recoveringFromFlip = true;
        this.recoveryStartRotation = normalizedRotation;
        this.recoveryElapsedMs = 0;
      }
    } else {
      this.invertedDurationMs = 0;
    }

    this.visualBodyRotation = normalizedRotation;
    return this.visualBodyRotation;
  }

  private normalizeAngle(angle: number): number {
    let normalized = angle % (Math.PI * 2);
    if (normalized > Math.PI) normalized -= Math.PI * 2;
    if (normalized < -Math.PI) normalized += Math.PI * 2;
    return normalized;
  }

  /** Throws a ridiculous burst of loose feathers when the bird hits the ball. */
  onImpact(position: Vector2, impactSpeed: number): void {
    if (this.disposed) return;
    this.hitReactionMs = 320;
    const intensity = Math.max(0, Math.min(1.8, impactSpeed / 220));
    const count = Math.round(10 + intensity * 5);
    for (let index = 0; index < count; index += 1) {
      const random = this.random.bind(this);
      const angle = -Math.PI * 0.88 + (index / Math.max(1, count - 1)) * Math.PI * 1.76;
      const speed = 70 + random() * 110 + intensity * 35;
      const color = FEATHER_COLORS[Math.floor(random() * FEATHER_COLORS.length)] ?? FEATHER_COLORS[0];
      this.feathers.push({
        x: position.x + (random() - 0.5) * this.radius * 0.8,
        y: position.y + (random() - 0.5) * this.radius * 0.6,
        velocityX: Math.cos(angle) * speed + (random() - 0.5) * 42,
        velocityY: Math.sin(angle) * speed - 35 - random() * 75,
        rotation: random() * Math.PI * 2,
        angularVelocity: (random() - 0.5) * 12,
        ageMs: 0,
        lifeMs: 760 + random() * 620,
        length: 9 + random() * 9,
        width: 3 + random() * 2.4,
        color,
      });
    }
  }

  /** Releases the independent particle layer; the Matter wrapper owns the container. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.feathers = [];
    this.featherGraphics.destroy?.();
  }

  private drawBird(flap: number, phase: number): void {
    const graphics = this.birdGraphics;
    graphics.clear();
    const facing = this.direction;
    const bodyRadius = this.radius * 0.77;
    const wingLength = this.radius * 1.12;
    const hit = this.hitReactionMs > 0;
    const panic = this.attacking || hit;

    // Far wing and tail sit behind the round, readable collision body.
    this.drawWing(-bodyRadius * 0.14, -bodyRadius * 0.24, wingLength, -Math.PI / 2 + flap * 0.92, bodyRadius * 0.47, 0x187b9c, 0x155d7a, 0.92, facing);
    this.drawTail(facing, bodyRadius);
    this.drawWing(-bodyRadius * 0.2, bodyRadius * 0.12, wingLength * 0.87, -Math.PI / 2 + Math.sin(phase + 1.55) * 0.84, bodyRadius * 0.42, 0x45bcd0, 0x176b88, 1, facing);

    // Round little body: teal-blue back, buttery belly and soft highlights.
    graphics.fillStyle(0x102e40, 0.22).fillEllipse(facing * 1.8, 5.4, bodyRadius * 2.15, bodyRadius * 1.72);
    graphics.fillStyle(0x2388a9, 1).fillEllipse(0, 1.5, bodyRadius * 2.13, bodyRadius * 1.78);
    graphics.fillStyle(0x36b0c8, 1).fillEllipse(-bodyRadius * 0.13, -bodyRadius * 0.13, bodyRadius * 1.78, bodyRadius * 1.38);
    graphics.fillStyle(0x8edbe0, 0.5).fillEllipse(-bodyRadius * 0.23, -bodyRadius * 0.45, bodyRadius * 1.02, bodyRadius * 0.45);
    graphics.fillStyle(0xf4d69a, 1).fillEllipse(facing * bodyRadius * 0.23, bodyRadius * 0.29, bodyRadius * 1.24, bodyRadius * 1.1);
    graphics.lineStyle(2.8, OUTLINE, 1).strokeEllipse(0, 1.5, bodyRadius * 2.13, bodyRadius * 1.78);

    // A few chest flecks make the bird feel feathery without visual noise.
    graphics.lineStyle(1.5, 0xb5e9df, 0.9);
    for (let index = 0; index < 3; index += 1) {
      const x = facing * (bodyRadius * (0.12 + index * 0.16));
      const y = bodyRadius * (0.15 + (index % 2) * 0.19);
      graphics.beginPath().moveTo(x, y).lineTo(x - facing * 3, y + 4).strokePath();
    }

    this.drawEyes(facing, bodyRadius, panic);
    this.drawBeak(facing, bodyRadius, panic);
    this.drawFeet(facing, bodyRadius, phase);
    this.drawHeadTuft(facing, bodyRadius, phase);
  }

  private drawWing(originX: number, originY: number, length: number, angle: number, width: number, fill: number, stroke: number, alpha: number, facing: -1 | 1): void {
    const shape: Array<[number, number]> = [
      [0, 0], [length * 0.12, -width * 0.43], [length * 0.36, -width * 0.66],
      [length * 0.52, -width * 0.37], [length * 0.74, -width * 0.56],
      [length, -width * 0.08], [length * 0.83, width * 0.28],
      [length * 0.61, width * 0.13], [length * 0.43, width * 0.46],
      [length * 0.23, width * 0.2], [length * 0.08, width * 0.39],
    ];
    const points = shape.map(([x, y]) => { const point = this.rotatePoint(originX, originY, x, y, angle); return { x: point.x * facing, y: point.y }; });
    this.drawPolygon(points, fill, stroke, alpha, 1.8);

    const graphics = this.birdGraphics;
    graphics.lineStyle(1.2, 0x153f59, alpha * 0.72);
    for (const [start, end] of [[0.22, 0.72], [0.38, 0.85], [0.52, 0.94]] as const) {
      const from = this.rotatePoint(originX, originY, length * start, 0, angle);
      const to = this.rotatePoint(originX, originY, length * end, width * 0.06, angle);
      from.x *= facing;
      to.x *= facing;
      graphics.beginPath().moveTo(from.x, from.y).lineTo(to.x, to.y).strokePath();
    }
  }

  private drawTail(facing: -1 | 1, bodyRadius: number): void {
    const baseX = -facing * bodyRadius * 0.82;
    const baseY = bodyRadius * 0.12;
    const tailColors = [0x2388a9, 0xf1bd4f, 0x45bcd0];
    for (let index = 0; index < 3; index += 1) {
      const offset = (index - 1) * bodyRadius * 0.2;
      const points = [
        { x: baseX, y: baseY + offset * 0.25 },
        { x: baseX - facing * bodyRadius * 0.64, y: baseY + offset - 3 },
        { x: baseX - facing * bodyRadius * 0.45, y: baseY + offset + 5 },
      ];
      this.drawPolygon(points, tailColors[index] ?? tailColors[0], OUTLINE, 1, 1.25);
    }
  }

  private drawEyes(facing: -1 | 1, bodyRadius: number, panic: boolean): void {
    const graphics = this.birdGraphics;
    const jitter = panic ? 2.8 : 1.65;
    const pupilX = Math.sin(this.elapsedMs * (panic ? 0.027 : 0.009) + 0.45) * jitter + (panic ? 2.1 : 0.6);
    const pupilY = Math.cos(this.elapsedMs * (panic ? 0.022 : 0.007) + 1.3) * (panic ? 2.4 : 1.5);
    const eyes = [
      { x: facing * bodyRadius * 0.24, y: -bodyRadius * 0.43, rx: bodyRadius * 0.34, ry: bodyRadius * 0.39, pupil: 3.55 },
      { x: facing * bodyRadius * 0.73, y: -bodyRadius * 0.28, rx: bodyRadius * 0.29, ry: bodyRadius * 0.34, pupil: 3.1 },
    ];
    for (let index = 0; index < eyes.length; index += 1) {
      const eye = eyes[index]!;
      graphics.fillStyle(0x153348, 0.25).fillEllipse(eye.x + 1.1, eye.y + 1.8, eye.rx * 2.18, eye.ry * 2.16);
      graphics.fillStyle(0xfffdf2, 1).fillEllipse(eye.x, eye.y, eye.rx * 2, eye.ry * 2);
      graphics.lineStyle(1.9, OUTLINE, 1).strokeEllipse(eye.x, eye.y, eye.rx * 2, eye.ry * 2);
      const px = eye.x + facing * (pupilX + (index === 0 ? 0 : 1.2));
      const py = eye.y + pupilY + (index === 1 ? 0.7 : 0);
      graphics.fillStyle(0x172c3d, 1).fillEllipse(px, py, eye.pupil * 2, eye.pupil * 2.2);
      graphics.fillStyle(0xffffff, 1).fillEllipse(px - facing * 1.1, py - 1.2, 2.2, 2.2);

      // Asymmetric eyebrows sell the bird's permanently confused expression.
      const browY = eye.y - eye.ry * (panic ? 0.9 : 0.72);
      graphics.lineStyle(panic ? 3.6 : 2.8, 0x243746, 1);
      graphics.beginPath()
        .moveTo(eye.x - facing * eye.rx * 0.78, browY + (index === 0 ? -1 : 2))
        .lineTo(eye.x - facing * eye.rx * 0.22, browY - 2.7)
        .lineTo(eye.x + facing * eye.rx * 0.68, browY + (panic ? -1.5 : 1.3))
        .strokePath();
    }
  }

  private drawBeak(facing: -1 | 1, bodyRadius: number, panic: boolean): void {
    const graphics = this.birdGraphics;
    const x = facing * bodyRadius * 0.95;
    const y = -bodyRadius * 0.02;
    if (panic) {
      this.drawPolygon([
        { x, y: y - 3 }, { x: x + facing * bodyRadius * 0.62, y: y + 1 }, { x: x + facing * bodyRadius * 0.03, y: y + 5 },
      ], 0xf29a32, 0x703f27, 1, 1.8);
      this.drawPolygon([
        { x: x + facing * 1.5, y: y + 5 }, { x: x + facing * bodyRadius * 0.53, y: y + 9 }, { x: x + facing * bodyRadius * 0.1, y: y + 7 },
      ], 0xd96b27, 0x703f27, 1, 1.5);
      graphics.fillStyle(0x5b2c25, 1).fillEllipse(x + facing * 3.2, y + 4.8, 5.2, 2.7);
    } else {
      this.drawPolygon([
        { x, y: y - 3.4 }, { x: x + facing * bodyRadius * 0.58, y: y + 1 }, { x: x + facing * bodyRadius * 0.04, y: y + 5.5 },
      ], 0xf5a43b, 0x75442c, 1, 1.8);
    }
  }

  private drawFeet(facing: -1 | 1, bodyRadius: number, phase: number): void {
    const graphics = this.birdGraphics;
    const wiggle = Math.sin(phase * 0.72) * 2.2;
    graphics.lineStyle(2.2, 0xb96e32, 1);
    for (let index = 0; index < 2; index += 1) {
      const x = facing * (bodyRadius * (0.08 + index * 0.45));
      const y = bodyRadius * 0.76;
      graphics.beginPath().moveTo(x, y).lineTo(x + wiggle * (index === 0 ? 0.3 : -0.3), y + 6).strokePath();
      graphics.beginPath().moveTo(x - 3, y + 6).lineTo(x + 3, y + 6).lineTo(x + 5, y + 8).strokePath();
    }
  }

  private drawHeadTuft(facing: -1 | 1, bodyRadius: number, phase: number): void {
    const twitch = Math.sin(phase * 0.63) * 2;
    const points = [
      { x: facing * bodyRadius * 0.08, y: -bodyRadius * 0.79 },
      { x: facing * bodyRadius * 0.02, y: -bodyRadius * 1.22 - twitch },
      { x: facing * bodyRadius * 0.32, y: -bodyRadius * 0.85 },
      { x: facing * bodyRadius * 0.42, y: -bodyRadius * 1.11 + twitch * 0.4 },
      { x: facing * bodyRadius * 0.58, y: -bodyRadius * 0.72 },
    ];
    this.drawPolygon(points, 0xf3c34e, OUTLINE, 1, 1.5);
  }

  private updateFeathers(deltaMs: number): void {
    const deltaSeconds = deltaMs / 1000;
    for (const feather of this.feathers) {
      feather.ageMs += deltaMs;
      feather.x += feather.velocityX * deltaSeconds;
      feather.y += feather.velocityY * deltaSeconds;
      feather.velocityY += 520 * deltaSeconds;
      feather.velocityX *= Math.pow(0.985, deltaMs / 16.67);
      feather.rotation += feather.angularVelocity * deltaSeconds;
    }
    this.feathers = this.feathers.filter((feather) => feather.ageMs < feather.lifeMs);

    const graphics = this.featherGraphics;
    graphics.clear();
    for (const feather of this.feathers) {
      const alpha = Math.max(0, 1 - feather.ageMs / feather.lifeMs);
      this.drawWorldFeather(feather, alpha);
    }
  }

  private drawWorldFeather(feather: FeatherParticle, alpha: number): void {
    const graphics = this.featherGraphics;
    const { x, y, rotation, length, width } = feather;
    const points = [
      [0, 0], [length * 0.28, -width * 0.55], [length * 0.72, -width * 0.5],
      [length, 0], [length * 0.7, width * 0.48], [length * 0.25, width * 0.55],
    ] as const;
    const transformed = points.map(([px, py]) => ({
      x: x + px * Math.cos(rotation) - py * Math.sin(rotation),
      y: y + px * Math.sin(rotation) + py * Math.cos(rotation),
    }));
    this.drawPolygon(transformed, feather.color, 0x24485a, alpha, 0.8, graphics);
    const shaftStart = { x: x + Math.cos(rotation) * 1.5, y: y + Math.sin(rotation) * 1.5 };
    const shaftEnd = { x: x + Math.cos(rotation) * length * 0.88, y: y + Math.sin(rotation) * length * 0.88 };
    graphics.lineStyle(0.9, 0xf8edce, alpha * 0.85);
    graphics.beginPath().moveTo(shaftStart.x, shaftStart.y).lineTo(shaftEnd.x, shaftEnd.y).strokePath();
  }

  private drawPolygon(points: Vector2[], fill: number, stroke: number, alpha: number, strokeWidth: number, graphics: BirdGraphicsLike = this.birdGraphics): void {
    if (points.length < 3) return;
    graphics.fillStyle(fill, alpha).beginPath().moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) graphics.lineTo(points[index]!.x, points[index]!.y);
    graphics.closePath().fillPath();
    if (strokeWidth > 0) graphics.lineStyle(strokeWidth, stroke, alpha).strokePath();
  }

  private rotatePoint(originX: number, originY: number, x: number, y: number, angle: number): Vector2 {
    return {
      x: originX + x * Math.cos(angle) - y * Math.sin(angle),
      y: originY + x * Math.sin(angle) + y * Math.cos(angle),
    };
  }

  private hashSeed(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    return hash >>> 0 || 1;
  }

  private random(): number {
    let value = this.seed;
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    this.seed = value >>> 0;
    return this.seed / 0xffffffff;
  }
}
