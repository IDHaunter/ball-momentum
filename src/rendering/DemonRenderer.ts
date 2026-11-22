import type { Vector2 } from '../physics/PhysicsTypes';

export type DemonVisualPhase = 'telegraph' | 'active' | 'vanishing' | 'cooldown' | 'hidden';

export interface DemonGraphicsLike {
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

export interface DemonContainerLike {
  add(child: object): this;
  setDepth(depth: number): this;
  setSize(width: number, height: number): this;
  setRotation(value: number): this;
  setPosition(x: number, y: number): this;
  setVisible(value: boolean): this;
  setScale(x: number, y?: number): this;
  destroy(): void;
}

export interface DemonRendererSceneLike {
  add: {
    container(x: number, y: number): DemonContainerLike;
    graphics(): DemonGraphicsLike;
  };
}

const OUTLINE = 0x35104d;
const PURPLE_DARK = 0x4b176d;
const PURPLE = 0x7f31b5;
const PURPLE_LIGHT = 0xb45be0;
const PURPLE_HIGHLIGHT = 0xe5b3ff;
const ELECTRIC = 0xb7f7ff;

/**
 * A small purple devil emoji with horns, bat wings and a hand-held trident.
 * Teleport/strike lightning lives on independent world-space graphics so it
 * does not rotate with the physical circle.
 */
export class DemonRenderer {
  readonly container: DemonContainerLike;
  private readonly bodyGraphics: DemonGraphicsLike;
  private readonly teleportGraphics: DemonGraphicsLike;
  private readonly strikeGraphics: DemonGraphicsLike;
  private readonly radius: number;
  private readonly seed: number;
  private elapsedMs = 0;
  private materializeMs = 0;
  private strikeMs = 0;
  private knockbackMs = 0;
  private strikeFrom: Vector2 | null = null;
  private strikeTo: Vector2 | null = null;
  private phase: DemonVisualPhase = 'hidden';
  private phasePosition: Vector2 = { x: 0, y: 0 };
  private disposed = false;

  constructor(scene: DemonRendererSceneLike, radius: number, id: string, x: number, y: number) {
    this.radius = Math.max(10, radius);
    this.seed = this.hash(id);
    const extent = this.radius * 4.3;
    this.container = scene.add.container(x, y).setSize(extent, extent).setDepth(8).setVisible(false);
    this.bodyGraphics = scene.add.graphics();
    this.container.add(this.bodyGraphics);
    this.teleportGraphics = scene.add.graphics().setDepth(12);
    this.strikeGraphics = scene.add.graphics().setDepth(13);
  }

  get isVisible(): boolean { return this.phase === 'active'; }

  update(deltaMs: number, position: Vector2, rotation: number, phase: DemonVisualPhase): void {
    if (this.disposed) return;
    const delta = Math.max(0, Math.min(80, deltaMs));
    this.elapsedMs += delta;
    this.knockbackMs = Math.max(0, this.knockbackMs - delta);
    this.phase = phase;
    this.phasePosition = { ...position };

    if (phase === 'active') {
      this.materializeMs = Math.min(220, this.materializeMs + delta);
      this.container.setVisible(true).setPosition(position.x, position.y).setRotation(rotation);
      const pop = Math.min(1, this.materializeMs / 180);
      const scale = 0.76 + 0.24 * (1 - (1 - pop) ** 3);
      this.container.setScale(scale, 1.08 - 0.08 * pop);
      this.drawDemon();
      this.teleportGraphics.clear();
    } else {
      this.container.setVisible(false);
      this.bodyGraphics.clear();
      this.container.setRotation(0).setScale(1, 1);
      if (phase === 'telegraph') this.drawTelegraph(position);
      else if (phase === 'vanishing') this.drawVanish(position);
      else this.teleportGraphics.clear();
    }

    if (this.strikeMs > 0) {
      this.strikeMs = Math.max(0, this.strikeMs - delta);
      this.drawStrike();
    } else {
      this.strikeGraphics.clear();
    }
  }

  onMaterialize(position: Vector2): void {
    this.materializeMs = 0;
    this.phasePosition = { ...position };
  }

  /** Draws a brief jagged bolt, sparks and a glow from the demon to the ball. */
  onStrike(source: Vector2, target: Vector2): void {
    if (this.disposed) return;
    this.strikeFrom = { ...source };
    this.strikeTo = { ...target };
    this.strikeMs = 260;
    this.drawStrike();
  }

  onKnockback(): void {
    this.knockbackMs = 260;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.teleportGraphics.destroy();
    this.strikeGraphics.destroy();
  }

  private drawDemon(): void {
    const g = this.bodyGraphics;
    g.clear();
    const r = this.radius;
    const wingBeat = Math.sin(this.elapsedMs * (this.knockbackMs > 0 ? 0.044 : 0.026)) * (this.knockbackMs > 0 ? 0.72 : 0.55);
    const wingKick = Math.sin(this.elapsedMs * 0.052) * 0.14;

    // Tiny bat wings flutter behind the round body.
    this.drawWing(-r * 0.65, -r * 0.12, -1, wingBeat, r);
    this.drawWing(r * 0.65, -r * 0.12, 1, -wingBeat, r);

    // Tail peeks out behind the left side.
    g.lineStyle(Math.max(1.4, r * 0.095), OUTLINE, 1);
    g.beginPath().moveTo(-r * 0.72, r * 0.46).lineTo(-r * 1.05, r * 0.63).lineTo(-r * 1.16, r * 0.38).strokePath();
    g.fillStyle(0x9a4bd0, 1).fillEllipse(-r * 1.15, r * 0.35, r * 0.2, r * 0.17);

    // Little curved horns, pale at the tips.
    this.drawHorn(-r * 0.42, -r * 0.76, -1, r);
    this.drawHorn(r * 0.42, -r * 0.76, 1, r);

    // Soft shadow and a layered violet shell.
    g.fillStyle(0x170b22, 0.22).fillEllipse(2, r * 0.82, r * 1.82, r * 0.38);
    g.fillStyle(OUTLINE, 1).fillEllipse(0, 0, r * 2.04, r * 2.04);
    g.fillStyle(PURPLE_DARK, 1).fillEllipse(0, 0, r * 1.94, r * 1.94);
    g.fillStyle(PURPLE, 1).fillEllipse(-r * 0.13, -r * 0.16, r * 1.73, r * 1.65);
    g.fillStyle(PURPLE_LIGHT, 0.78).fillEllipse(-r * 0.22, -r * 0.4, r * 1.2, r * 0.73);
    g.fillStyle(PURPLE_HIGHLIGHT, 0.38).fillEllipse(-r * 0.31, -r * 0.59, r * 0.72, r * 0.24);

    // Mischievous, slightly uneven eyes with dark pupils and sharp brows.
    this.drawEye(-r * 0.31, -r * 0.2, r * 0.26, r, 0.15 + Math.sin(this.elapsedMs * 0.009) * 0.08);
    this.drawEye(r * 0.25, -r * 0.23, r * 0.29, r, -0.1 + Math.cos(this.elapsedMs * 0.011) * 0.1);
    g.lineStyle(Math.max(1.2, r * 0.09), 0x35104d, 1);
    g.beginPath().moveTo(-r * 0.57, -r * 0.53).lineTo(-r * 0.13, -r * 0.59).strokePath();
    g.beginPath().moveTo(r * 0.03, -r * 0.6).lineTo(r * 0.53, -r * 0.51).strokePath();

    // Wicked little grin and two tiny fangs.
    g.fillStyle(0x230b2e, 1).fillEllipse(r * 0.06, r * 0.37, r * (this.knockbackMs > 0 ? 0.68 : 0.59), r * (this.knockbackMs > 0 ? 0.4 : 0.32));
    g.fillStyle(0xffe9fa, 1);
    this.fillPolygon([
      { x: -r * 0.13, y: r * 0.27 }, { x: -r * 0.02, y: r * 0.27 }, { x: -r * 0.1, y: r * 0.43 },
    ]);
    this.fillPolygon([
      { x: r * 0.2, y: r * 0.28 }, { x: r * 0.32, y: r * 0.28 }, { x: r * 0.25, y: r * 0.43 },
    ]);
    g.lineStyle(Math.max(0.8, r * 0.045), 0x4a155d, 0.75);
    g.beginPath().moveTo(-r * 0.19, r * 0.48).lineTo(r * 0.22, r * 0.5).strokePath();

    // The trident is held in the right hand and follows the demon's body.
    const tridentX = r * (0.95 + wingKick * 0.18);
    g.lineStyle(Math.max(1.5, r * 0.085), 0x3a2546, 1);
    g.beginPath().moveTo(tridentX, r * 0.55).lineTo(tridentX + r * 0.22, -r * 1.28).strokePath();
    g.lineStyle(Math.max(0.9, r * 0.045), 0xf4c8ff, 0.9);
    g.beginPath().moveTo(tridentX - r * 0.02, r * 0.38).lineTo(tridentX + r * 0.2, -r * 1.2).strokePath();
    g.lineStyle(Math.max(1.4, r * 0.075), 0xa44bd2, 1);
    g.beginPath().moveTo(tridentX + r * 0.22, -r * 0.76)
      .lineTo(tridentX - r * 0.12, -r * 1.18)
      .lineTo(tridentX - r * 0.1, -r * 0.73)
      .lineTo(tridentX + r * 0.22, -r * 1.04)
      .lineTo(tridentX + r * 0.46, -r * 0.73)
      .lineTo(tridentX + r * 0.44, -r * 1.18)
      .lineTo(tridentX + r * 0.22, -r * 0.76)
      .strokePath();
    g.fillStyle(0xf5d8ff, 1).fillEllipse(tridentX + r * 0.22, -r * 1.2, r * 0.13, r * 0.13);

    // A small hand/grip connects the trident to the body.
    g.fillStyle(0xf1a1e8, 1).fillEllipse(tridentX - r * 0.02, r * 0.32, r * 0.23, r * 0.2);
    g.lineStyle(Math.max(0.8, r * 0.04), OUTLINE, 0.95).strokeEllipse(tridentX - r * 0.02, r * 0.32, r * 0.23, r * 0.2);
    if (this.knockbackMs > 0) {
      const alpha = this.knockbackMs / 260;
      g.lineStyle(1.5, 0xf4efff, alpha);
      g.beginPath().moveTo(-r * 0.92, -r * 0.48).lineTo(-r * 1.15, -r * 0.66).lineTo(-r * 0.93, -r * 0.72).strokePath();
    }
  }

  private drawWing(originX: number, originY: number, facing: -1 | 1, flap: number, radius: number): void {
    const g = this.bodyGraphics;
    const length = radius * 1.1;
    const lift = flap * radius * 0.35;
    const points = [
      { x: originX, y: originY },
      { x: originX + facing * length * 0.35, y: originY - radius * 0.54 - lift },
      { x: originX + facing * length * 0.68, y: originY - radius * 0.38 - lift * 0.6 },
      { x: originX + facing * length, y: originY + radius * 0.1 },
      { x: originX + facing * length * 0.68, y: originY + radius * 0.14 },
      { x: originX + facing * length * 0.38, y: originY + radius * 0.34 },
    ];
    g.fillStyle(0x3d125b, 1);
    this.fillPolygon(points);
    g.lineStyle(1.2, 0x2a0d3e, 1);
    this.strokePolygon(points);
    g.lineStyle(1, 0xc276e5, 0.75);
    for (let index = 0; index < 3; index += 1) {
      const x = originX + facing * length * (0.36 + index * 0.16);
      const y = originY - radius * (0.24 + index * 0.06) - lift * (1 - index * 0.18);
      g.beginPath().moveTo(originX + facing * radius * 0.16, originY + radius * 0.05)
        .lineTo(x, y).lineTo(originX + facing * length * (0.84 - index * 0.08), originY + radius * (0.12 + index * 0.05)).strokePath();
    }
  }

  private drawHorn(x: number, y: number, facing: -1 | 1, radius: number): void {
    const points = [
      { x, y: y + radius * 0.16 },
      { x: x + facing * radius * 0.1, y: y - radius * 0.28 },
      { x: x + facing * radius * 0.38, y: y - radius * 0.63 },
      { x: x + facing * radius * 0.26, y: y - radius * 0.12 },
      { x: x + facing * radius * 0.12, y: y + radius * 0.24 },
    ];
    this.bodyGraphics.fillStyle(0xe6c6f2, 1);
    this.fillPolygon(points);
    this.bodyGraphics.lineStyle(1.25, OUTLINE, 1);
    this.strokePolygon(points);
  }

  private drawEye(x: number, y: number, radius: number, bodyRadius: number, pupilBias: number): void {
    const g = this.bodyGraphics;
    g.fillStyle(0x35104d, 0.26).fillEllipse(x + 0.8, y + 1.2, radius * 2.3, radius * 2.35);
    g.fillStyle(0xfff8ff, 1).fillEllipse(x, y, radius * 2.12, radius * 2.2);
    g.lineStyle(Math.max(0.8, bodyRadius * 0.045), OUTLINE, 1).strokeEllipse(x, y, radius * 2.12, radius * 2.2);
    const px = x + bodyRadius * pupilBias;
    const py = y + bodyRadius * 0.04;
    g.fillStyle(0x211029, 1).fillEllipse(px, py, radius * 0.9, radius * 1.1);
    g.fillStyle(0xffffff, 0.98).fillEllipse(px - radius * 0.12, py - radius * 0.19, radius * 0.3, radius * 0.3);
  }

  private drawTelegraph(position: Vector2): void {
    const g = this.teleportGraphics;
    g.clear();
    const pulse = 0.78 + Math.sin(this.elapsedMs * 0.032) * 0.22;
    const r = this.radius * (1.15 + pulse * 0.3);
    g.lineStyle(2.2, ELECTRIC, 0.72 + pulse * 0.24).strokeEllipse(position.x, position.y, r * 2.4, r * 2.8);
    g.lineStyle(1.2, 0x8b45df, 0.8).strokeEllipse(position.x, position.y, r * 1.55, r * 2.12);
    for (let arc = 0; arc < 5; arc += 1) {
      const angle = (arc / 5) * Math.PI * 2 + this.elapsedMs * 0.0015;
      const start = { x: position.x + Math.cos(angle) * r * 0.66, y: position.y + Math.sin(angle) * r * 0.75 };
      const end = { x: position.x + Math.cos(angle + 0.42) * r * 1.28, y: position.y + Math.sin(angle + 0.42) * r * 1.38 };
      this.drawWorldBolt(g, start, end, 3, this.seed + arc * 13 + Math.floor(this.elapsedMs / 45), 0xbdfaff, 0.94);
    }
    g.fillStyle(0xc8fbff, 0.28).fillEllipse(position.x, position.y, this.radius * 1.4, this.radius * 1.6);
  }

  private drawVanish(position: Vector2): void {
    const g = this.teleportGraphics;
    g.clear();
    const pulse = Math.max(0, 1 - ((this.elapsedMs % 280) / 280));
    g.lineStyle(2, ELECTRIC, 0.65 * pulse).strokeEllipse(position.x, position.y, this.radius * 2.5 * pulse, this.radius * 2.8 * pulse);
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2 + this.elapsedMs * 0.007;
      const from = { x: position.x + Math.cos(angle) * this.radius * 0.3, y: position.y + Math.sin(angle) * this.radius * 0.4 };
      const to = { x: position.x + Math.cos(angle) * this.radius * 1.3 * pulse, y: position.y + Math.sin(angle) * this.radius * 1.5 * pulse };
      this.drawWorldBolt(g, from, to, 2, this.seed + index * 7, 0xd5c2ff, 0.76 * pulse);
    }
  }

  private drawStrike(): void {
    const g = this.strikeGraphics;
    g.clear();
    if (!this.strikeFrom || !this.strikeTo || this.strikeMs <= 0) return;
    const alpha = Math.min(1, this.strikeMs / 70);
    this.drawWorldBolt(g, this.strikeFrom, this.strikeTo, 4, this.seed + Math.floor(this.elapsedMs / 24), ELECTRIC, alpha);
    const target = this.strikeTo;
    g.fillStyle(0xf5ffff, 0.5 * alpha).fillEllipse(target.x, target.y, this.radius * 0.9, this.radius * 0.9);
    g.lineStyle(1.6, 0xd5faff, alpha);
    for (let index = 0; index < 4; index += 1) {
      const angle = index * Math.PI / 2 + this.elapsedMs * 0.01;
      g.beginPath().moveTo(target.x + Math.cos(angle) * this.radius * 0.45, target.y + Math.sin(angle) * this.radius * 0.45)
        .lineTo(target.x + Math.cos(angle) * this.radius * 0.9, target.y + Math.sin(angle) * this.radius * 0.9).strokePath();
    }
  }

  private drawWorldBolt(
    graphics: DemonGraphicsLike,
    start: Vector2,
    end: Vector2,
    width: number,
    seed: number,
    color: number,
    alpha: number,
  ): void {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const segments = 7;
    graphics.lineStyle(width + 2.4, 0x8246d7, alpha * 0.32);
    graphics.beginPath().moveTo(start.x, start.y);
    for (let index = 1; index < segments; index += 1) {
      const t = index / segments;
      const jitter = (this.random(seed + index * 17) - 0.5) * this.radius * 0.82;
      graphics.lineTo(start.x + dx * t + nx * jitter, start.y + dy * t + ny * jitter);
    }
    graphics.lineTo(end.x, end.y).strokePath();
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath().moveTo(start.x, start.y);
    for (let index = 1; index < segments; index += 1) {
      const t = index / segments;
      const jitter = (this.random(seed + index * 17) - 0.5) * this.radius * 0.82;
      graphics.lineTo(start.x + dx * t + nx * jitter, start.y + dy * t + ny * jitter);
    }
    graphics.lineTo(end.x, end.y).strokePath();
  }

  private fillPolygon(points: Vector2[]): void {
    const g = this.bodyGraphics;
    g.beginPath().moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) g.lineTo(points[index]!.x, points[index]!.y);
    g.closePath().fillPath();
  }

  private strokePolygon(points: Vector2[]): void {
    const g = this.bodyGraphics;
    g.beginPath().moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) g.lineTo(points[index]!.x, points[index]!.y);
    g.closePath().strokePath();
  }

  private random(seed: number): number {
    const value = Math.sin(seed * 12.9898 + this.seed * 0.017) * 43758.5453;
    return value - Math.floor(value);
  }

  private hash(value: string): number {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) hash = Math.imul(hash ^ value.charCodeAt(index), 16777619);
    return hash >>> 0;
  }
}
