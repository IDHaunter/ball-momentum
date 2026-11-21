import type { Vector2 } from '../physics/PhysicsTypes';

/** Small procedural drawing surface for the green vomit enemy. */
export interface VomitGraphicsLike {
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

export interface VomitContainerLike {
  add(child: object): this;
  setDepth(depth: number): this;
  setSize(width: number, height: number): this;
  setRotation(value: number): this;
  setPosition(x: number, y: number): this;
  destroy(): void;
}

export interface VomitRendererSceneLike {
  add: {
    container(x: number, y: number): VomitContainerLike;
    graphics(): VomitGraphicsLike;
  };
}

interface SlimeDroplet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ageMs: number;
  lifeMs: number;
  radius: number;
  rotation: number;
  spin: number;
  color: number;
}

const SLIME_COLORS = [0x83df43, 0x63c936, 0xa6eb55, 0x4fae2e, 0xc3f36b];
const OUTLINE = 0x225128;

/**
 * A goofy green emoji-like creature. Its Matter circle is separate from this
 * artwork, so the enemy remains pushable and can fall into a level pit.
 */
export class VomitEnemyRenderer {
  readonly container: VomitContainerLike;
  private readonly bodyGraphics: VomitGraphicsLike;
  private readonly effectGraphics: VomitGraphicsLike;
  private readonly radius: number;
  private elapsedMs = 0;
  private gaggingMs = 0;
  private facing: -1 | 1 = -1;
  private targetLocalX = -1;
  private droplets: SlimeDroplet[] = [];
  private seed: number;
  private disposed = false;

  constructor(scene: VomitRendererSceneLike, radius: number, id: string, x: number, y: number) {
    this.radius = Math.max(12, radius);
    this.seed = this.hashSeed(id);
    this.container = scene.add.container(x, y)
      .setSize(this.radius * 3.2, this.radius * 3.15)
      .setDepth(8);
    this.bodyGraphics = scene.add.graphics();
    this.container.add(this.bodyGraphics);
    this.effectGraphics = scene.add.graphics().setDepth(12);
    this.drawBody();
  }

  get activeDropletCount(): number { return this.droplets.length; }
  get isGagging(): boolean { return this.gaggingMs > 0; }

  update(deltaMs: number, position: Vector2, bodyRotation: number, targetPosition: Vector2 | null): void {
    if (this.disposed) return;
    const delta = Math.max(0, Math.min(80, deltaMs));
    this.elapsedMs += delta;
    this.container.setPosition(position.x, position.y).setRotation(bodyRotation);
    this.gaggingMs = Math.max(0, this.gaggingMs - delta);

    if (targetPosition) {
      this.facing = targetPosition.x >= position.x ? 1 : -1;
      this.targetLocalX = this.facing;
      this.gaggingMs = Math.max(this.gaggingMs, 80);
    } else {
      this.targetLocalX = this.facing;
    }

    this.drawBody();
    this.updateDroplets(delta);
    this.drawEffects();
  }

  /** Starts a short directional spray of separate slime blobs; no continuous beam is drawn. */
  onVomitPulse(source: Vector2, target: Vector2, bodyRotation: number, impulse: number): void {
    if (this.disposed) return;
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    this.facing = dx >= 0 ? 1 : -1;
    this.targetLocalX = this.facing;
    const distance = Math.hypot(dx, dy) || 1;
    const direction = { x: dx / distance, y: dy / distance };
    const perpendicular = { x: -direction.y, y: direction.x };
    const localMouth = { x: this.facing * this.radius * 0.66, y: this.radius * 0.12 };
    const cos = Math.cos(bodyRotation);
    const sin = Math.sin(bodyRotation);
    const mouth = {
      x: source.x + localMouth.x * cos - localMouth.y * sin,
      y: source.y + localMouth.x * sin + localMouth.y * cos,
    };
    this.gaggingMs = 420;

    // A loose cone of chunky droplets reads as a silly gagging spray rather
    // than a laser-like ray. The deterministic seed keeps replays stable.
    const count = Math.max(14, Math.min(24, Math.round(14 + impulse / 28)));
    for (let index = 0; index < count; index += 1) {
      const spread = (this.random() - 0.5) * 0.7;
      const speed = 165 + this.random() * 150 + Math.min(95, impulse * 0.09);
      const sideSpeed = (this.random() - 0.5) * 165;
      const color = SLIME_COLORS[Math.floor(this.random() * SLIME_COLORS.length)] ?? SLIME_COLORS[0]!;
      this.droplets.push({
        x: mouth.x + (this.random() - 0.5) * 4,
        y: mouth.y + (this.random() - 0.5) * 4,
        vx: direction.x * speed + perpendicular.x * sideSpeed + direction.x * spread * 22,
        vy: direction.y * speed + perpendicular.y * sideSpeed + 45 + this.random() * 65,
        ageMs: 0,
        lifeMs: 420 + this.random() * 360,
        radius: 3.1 + this.random() * 4.8,
        rotation: this.random() * Math.PI * 2,
        spin: (this.random() - 0.5) * 10,
        color,
      });
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.droplets = [];
    this.effectGraphics.destroy();
  }

  private drawBody(): void {
    const graphics = this.bodyGraphics;
    graphics.clear();
    const r = this.radius;
    const breath = 1 + Math.sin(this.elapsedMs * 0.0044) * 0.012;
    const gag = this.gaggingMs > 0;
    const gagPulse = gag ? 1 + Math.sin(this.elapsedMs * 0.034) * 0.09 : 0;
    // The green face uses the same 18 px physics radius as the player smiley.
    // Keep its visible silhouette within that same approximately 36 px footprint.
    const bodyWidth = r * 1.78 * breath;
    const bodyHeight = r * 1.78 * (breath - gagPulse * 0.025);

    // A soft puddle shadow and a lumpy green silhouette make it feel like a
    // squishy emoji rather than another plain rolling ball.
    graphics.fillStyle(0x132716, 0.2).fillEllipse(2, r * 0.88, r * 1.75, r * 0.38);
    graphics.fillStyle(OUTLINE, 1).fillEllipse(0, 0, bodyWidth + 4, bodyHeight + 4);
    graphics.fillStyle(0x64c936, 1).fillEllipse(0, -1, bodyWidth, bodyHeight);
    graphics.fillStyle(0x8bdf45, 0.96).fillEllipse(-r * 0.16, -r * 0.22, r * 1.48, r * 1.25);
    graphics.fillStyle(0xb3ed62, 0.46).fillEllipse(-r * 0.24, -r * 0.48, r * 0.92, r * 0.34);

    // Tiny slime bumps at the crown.
    graphics.fillStyle(0x78d63e, 1);
    graphics.fillEllipse(-r * 0.49, -r * 0.72, r * 0.34, r * 0.3);
    graphics.fillEllipse(-r * 0.13, -r * 0.91, r * 0.28, r * 0.24);
    graphics.fillEllipse(r * 0.27, -r * 0.8, r * 0.32, r * 0.28);

    const lookX = this.targetLocalX * r * (gag ? 0.14 : 0.09);
    const lookY = gag ? r * 0.055 : Math.sin(this.elapsedMs * 0.0025) * r * 0.025;
    this.drawEye(-r * 0.32, -r * 0.26, r * 0.245, lookX * 0.45, lookY);
    this.drawEye(r * 0.23, -r * 0.28, r * 0.27, lookX, lookY);

    // Worried eyebrows lift when the creature starts retching.
    graphics.lineStyle(Math.max(1.3, r * 0.075), 0x28542b, 0.98);
    graphics.beginPath().moveTo(-r * 0.56, -r * 0.63 - (gag ? 2 : 0)).lineTo(-r * 0.17, -r * 0.68 - (gag ? 3 : 0)).strokePath();
    graphics.beginPath().moveTo(r * 0.05, -r * 0.69 - (gag ? 3 : 0)).lineTo(r * 0.49, -r * 0.61 - (gag ? 2 : 0)).strokePath();

    // Puffy cheeks, an expressive mouth and a tiny tongue sell the gagging pose.
    graphics.fillStyle(0x4fae36, gag ? 0.8 : 0.42);
    graphics.fillEllipse(-r * 0.58, r * 0.2, r * 0.36, r * 0.25);
    graphics.fillEllipse(r * 0.57, r * 0.2, r * 0.36, r * 0.25);
    graphics.fillStyle(0x1b3720, 1);
    graphics.fillEllipse(this.facing * r * 0.22, r * 0.43, r * (gag ? 0.42 + gagPulse * 0.08 : 0.3), r * (gag ? 0.49 : 0.18));
    if (gag) {
      graphics.fillStyle(0x82d93d, 1).fillEllipse(this.facing * r * 0.22, r * 0.57, r * 0.2, r * 0.12);
      graphics.fillStyle(0xd5fb80, 0.95).fillEllipse(this.facing * r * 0.52, r * 0.42, r * 0.14, r * 0.09);
    } else {
      graphics.lineStyle(Math.max(1.2, r * 0.06), 0x28512a, 1);
      graphics.beginPath().moveTo(-r * 0.04, r * 0.43).lineTo(r * 0.1, r * 0.49).lineTo(r * 0.26, r * 0.43).strokePath();
    }

    // A few lime bubbles gather around the mouth when the player is in range.
    if (gag) {
      const bubblePhase = this.elapsedMs * 0.018;
      graphics.fillStyle(0xc4f66a, 0.82);
      graphics.fillEllipse(this.facing * r * (0.72 + Math.sin(bubblePhase) * 0.04), r * 0.39, r * 0.12, r * 0.12);
      graphics.fillEllipse(this.facing * r * 0.84, r * (0.2 + Math.cos(bubblePhase) * 0.04), r * 0.08, r * 0.08);
    }
  }

  private drawEye(x: number, y: number, size: number, lookX: number, lookY: number): void {
    const graphics = this.bodyGraphics;
    graphics.fillStyle(0x1b4024, 0.28).fillEllipse(x + 1, y + 1.7, size * 1.08, size * 1.2);
    graphics.fillStyle(0xf9fff0, 1).fillEllipse(x, y, size, size * 1.16);
    graphics.lineStyle(Math.max(0.8, this.radius * 0.035), 0x28552a, 1).strokeEllipse(x, y, size, size * 1.16);
    graphics.fillStyle(0x18301b, 1).fillEllipse(x + lookX, y + lookY, size * 0.43, size * 0.52);
    graphics.fillStyle(0xffffff, 0.96).fillEllipse(x + lookX - size * 0.08, y + lookY - size * 0.13, size * 0.13, size * 0.16);
  }

  private updateDroplets(deltaMs: number): void {
    const seconds = deltaMs / 1000;
    for (const drop of this.droplets) {
      drop.ageMs += deltaMs;
      drop.vy += 520 * seconds;
      drop.vx *= Math.pow(0.992, deltaMs / 16.667);
      drop.x += drop.vx * seconds;
      drop.y += drop.vy * seconds;
      drop.rotation += drop.spin * seconds;
    }
    this.droplets = this.droplets.filter((drop) => drop.ageMs < drop.lifeMs);
  }

  private drawEffects(): void {
    const graphics = this.effectGraphics;
    graphics.clear();
    for (const drop of this.droplets) {
      const progress = drop.ageMs / drop.lifeMs;
      const alpha = Math.max(0, 1 - progress);
      const stretch = 1 + Math.min(1.4, Math.hypot(drop.vx, drop.vy) / 360) * 0.75;
      const width = drop.radius * 1.5;
      const height = drop.radius * 2.1 * stretch;
      graphics.fillStyle(drop.color, alpha * 0.95).fillEllipse(drop.x, drop.y, width, height);
      graphics.fillStyle(0xd7ff8e, alpha * 0.72).fillEllipse(drop.x - drop.radius * 0.22, drop.y - drop.radius * 0.4, drop.radius * 0.42, drop.radius * 0.56);
    }
  }

  private hashSeed(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    return hash >>> 0;
  }

  private random(): number {
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 0x1_0000_0000;
  }
}
