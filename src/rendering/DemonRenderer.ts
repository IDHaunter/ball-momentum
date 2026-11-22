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

export interface DemonRendererSceneLike {
  add: {
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
 * Draws demon artwork authored in local coordinates onto a plain world-space
 * Graphics object. The Graphics itself is never moved, rotated, scaled or
 * hidden: every point is transformed here and an empty `clear()` is how the
 * body disappears. This is the same technique as the teleport/strike effects.
 */
class WorldSpacePen {
  private originX = 0;
  private originY = 0;
  private cos = 1;
  private sin = 0;
  private scaleX = 1;
  private scaleY = 1;

  constructor(private readonly target: DemonGraphicsLike) {}

  setTransform(x: number, y: number, rotation: number, scaleX: number, scaleY: number): void {
    this.originX = x;
    this.originY = y;
    this.cos = Math.cos(rotation);
    this.sin = Math.sin(rotation);
    this.scaleX = scaleX;
    this.scaleY = scaleY;
  }

  clear(): this { this.target.clear(); return this; }
  fillStyle(color: number, alpha?: number): this { this.target.fillStyle(color, alpha); return this; }
  lineStyle(width: number, color: number, alpha?: number): this {
    this.target.lineStyle(width * Math.sqrt(Math.abs(this.scaleX * this.scaleY)), color, alpha);
    return this;
  }
  beginPath(): this { this.target.beginPath(); return this; }
  closePath(): this { this.target.closePath(); return this; }
  fillPath(): this { this.target.fillPath(); return this; }
  strokePath(): this { this.target.strokePath(); return this; }
  moveTo(x: number, y: number): this {
    const point = this.map(x, y);
    this.target.moveTo(point.x, point.y);
    return this;
  }
  lineTo(x: number, y: number): this {
    const point = this.map(x, y);
    this.target.lineTo(point.x, point.y);
    return this;
  }
  fillEllipse(x: number, y: number, width: number, height: number): this {
    this.ellipsePath(x, y, width, height);
    this.target.fillPath();
    return this;
  }
  strokeEllipse(x: number, y: number, width: number, height: number): this {
    this.ellipsePath(x, y, width, height);
    this.target.strokePath();
    return this;
  }

  private ellipsePath(x: number, y: number, width: number, height: number): void {
    const segments = 22;
    this.target.beginPath();
    for (let index = 0; index < segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const point = this.map(x + Math.cos(angle) * width / 2, y + Math.sin(angle) * height / 2);
      if (index === 0) this.target.moveTo(point.x, point.y);
      else this.target.lineTo(point.x, point.y);
    }
    this.target.closePath();
  }

  private map(x: number, y: number): Vector2 {
    const localX = x * this.scaleX;
    const localY = y * this.scaleY;
    return {
      x: this.originX + localX * this.cos - localY * this.sin,
      y: this.originY + localX * this.sin + localY * this.cos,
    };
  }
}

/**
 * A small purple devil emoji with horns, bat wings and a hand-held trident.
 * Teleport/strike lightning lives on independent world-space graphics so it
 * does not rotate with the physical circle.
 */
export class DemonRenderer {
  private readonly bodyGraphics: DemonGraphicsLike;
  private readonly bodyPen: WorldSpacePen;
  private readonly teleportGraphics: DemonGraphicsLike;
  private readonly strikeGraphics: DemonGraphicsLike;
  private readonly contactGraphics: DemonGraphicsLike;
  private readonly radius: number;
  private readonly seed: number;
  private elapsedMs = 0;
  private materializeMs = 0;
  private strikeMs = 0;
  private knockbackMs = 0;
  private strikeFrom: Vector2 | null = null;
  private strikeTo: Vector2 | null = null;
  private contactMs = 0;
  private contactCenter: Vector2 | null = null;
  private contactTarget: Vector2 | null = null;
  private contactPower = 0;
  private phase: DemonVisualPhase = 'hidden';
  private disposed = false;

  constructor(scene: DemonRendererSceneLike, radius: number, id: string, x: number, y: number) {
    this.radius = Math.max(10, radius);
    this.seed = this.hash(id);
    // Every demon visual is a standalone, never-transformed, never-hidden
    // world-space Graphics object (identical to the teleport effect, which is
    // known to render). Nothing is nested in a Container or tied to Matter.
    this.bodyGraphics = scene.add.graphics().setDepth(20);
    this.bodyPen = new WorldSpacePen(this.bodyGraphics);
    this.teleportGraphics = scene.add.graphics().setDepth(21);
    this.strikeGraphics = scene.add.graphics().setDepth(22);
    this.contactGraphics = scene.add.graphics().setDepth(23);
  }

  get isVisible(): boolean { return this.phase === 'active'; }

  update(deltaMs: number, position: Vector2, rotation: number, phase: DemonVisualPhase): void {
    if (this.disposed) return;
    const delta = Math.max(0, Math.min(80, deltaMs));
    this.elapsedMs += delta;
    this.knockbackMs = Math.max(0, this.knockbackMs - delta);
    this.contactMs = Math.max(0, this.contactMs - delta);
    this.phase = phase;

    if (phase === 'active') {
      this.materializeMs = Math.min(220, this.materializeMs + delta);
      const pop = Math.min(1, this.materializeMs / 180);
      const scale = 0.76 + 0.24 * (1 - (1 - pop) ** 3);
      const valid = Number.isFinite(position.x) && Number.isFinite(position.y) && Number.isFinite(rotation);
      if (valid) {
        this.bodyPen.setTransform(position.x, position.y, rotation, scale, 1.08 - 0.08 * pop);
        this.drawDemon();
      } else {
        this.bodyGraphics.clear();
      }
      this.teleportGraphics.clear();
    } else {
      this.bodyGraphics.clear();
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
    if (this.contactMs > 0) this.drawContactBurst();
    else this.contactGraphics.clear();
  }

  onMaterialize(position: Vector2): void {
    this.materializeMs = 0;
  }

  /** Draws a brief jagged bolt, sparks and a glow from the demon to the ball. */
  onStrike(source: Vector2, target: Vector2): void {
    if (this.disposed) return;
    this.strikeFrom = { ...source };
    this.strikeTo = { ...target };
    // Keep the discharge on screen long enough to read clearly at 60 FPS.
    this.strikeMs = 800;
    this.drawStrike();
  }

  /** A bright, short contact discharge with branching arcs and radial sparks. */
  onContact(demonPosition: Vector2, ballPosition: Vector2, impulse: number): void {
    if (this.disposed) return;
    this.contactCenter = { ...demonPosition };
    this.contactTarget = { ...ballPosition };
    this.contactPower = Math.max(0.35, Math.min(1.8, impulse / 520));
    this.contactMs = 360;
    this.drawContactBurst();
  }

  onKnockback(): void {
    this.knockbackMs = 260;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.bodyGraphics.destroy();
    this.teleportGraphics.destroy();
    this.strikeGraphics.destroy();
    this.contactGraphics.destroy();
  }

  private drawDemon(): void {
    const g = this.bodyPen;
    g.clear();
    const r = this.radius;
    // Broad, unmistakable bat wings move with a slow, self-important sway.
    // A knockback briefly makes the demon twitch its wings more quickly.
    const wingBeat = Math.sin(this.elapsedMs * (this.knockbackMs > 0 ? 0.018 : 0.0042))
      * (this.knockbackMs > 0 ? 0.24 : 0.13);
    const wingKick = Math.sin(this.elapsedMs * 0.012) * 0.035;

    this.drawWing(-r * 0.58, -r * 0.12, -1, wingBeat, r);
    this.drawWing(r * 0.58, -r * 0.12, 1, -wingBeat, r);

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
    const g = this.bodyPen;
    const lift = flap * radius;
    const point = (x: number, y: number): Vector2 => ({
      x: originX + facing * x * radius,
      y: originY + y * radius + lift * (x / 1.55),
    });

    // A broad leathery membrane with a high outer tip and three scalloped
    // trailing lobes. The scallops make the bat-wing silhouette readable
    // even when the demon is only a few dozen pixels across.
    const outline = [
      point(0, 0.02),
      point(0.42, -0.62),
      point(0.78, -0.94),
      point(1.48, -0.56),
      point(1.31, -0.24),
      point(1.16, 0.03),
      point(0.99, -0.13),
      point(0.82, 0.23),
      point(0.62, 0.02),
      point(0.43, 0.34),
      point(0.25, 0.12),
    ];

    g.fillStyle(0x35104d, 1);
    this.fillPolygon(outline);
    g.fillStyle(0x65218a, 0.96);
    this.fillPolygon([
      point(0.08, 0.01), point(0.44, -0.53), point(0.78, -0.82),
      point(1.35, -0.53), point(1.19, -0.25), point(1.03, -0.04),
      point(0.83, 0.13), point(0.63, -0.06), point(0.44, 0.23), point(0.27, 0.06),
    ]);

    g.lineStyle(Math.max(1.1, radius * 0.065), 0x260b39, 1);
    this.strokePolygon(outline);

    // Raised wing fingers radiate from the shoulder into each membrane lobe.
    g.lineStyle(Math.max(0.85, radius * 0.045), 0xc276e5, 0.9);
    const shoulder = point(0.08, 0.02);
    for (const [x, y] of [[0.78, -0.88], [1.42, -0.53], [1.12, 0.0], [0.82, 0.2], [0.43, 0.31]]) {
      const tip = point(x, y);
      g.beginPath().moveTo(shoulder.x, shoulder.y).lineTo(tip.x, tip.y).strokePath();
    }
    // A small highlight along the leading edge gives the membrane some volume.
    const leadingA = point(0.42, -0.62);
    const leadingB = point(0.78, -0.94);
    g.lineStyle(Math.max(0.7, radius * 0.035), 0xe0a0f5, 0.72);
    g.beginPath().moveTo(leadingA.x, leadingA.y).lineTo(leadingB.x, leadingB.y).strokePath();
  }

  private drawHorn(x: number, y: number, facing: -1 | 1, radius: number): void {
    const points = [
      { x, y: y + radius * 0.16 },
      { x: x + facing * radius * 0.1, y: y - radius * 0.28 },
      { x: x + facing * radius * 0.38, y: y - radius * 0.63 },
      { x: x + facing * radius * 0.26, y: y - radius * 0.12 },
      { x: x + facing * radius * 0.12, y: y + radius * 0.24 },
    ];
    this.bodyPen.fillStyle(0xe6c6f2, 1);
    this.fillPolygon(points);
    this.bodyPen.lineStyle(1.25, OUTLINE, 1);
    this.strokePolygon(points);
  }

  private drawEye(x: number, y: number, radius: number, bodyRadius: number, pupilBias: number): void {
    const g = this.bodyPen;
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


  private drawContactBurst(): void {
    const g = this.contactGraphics;
    g.clear();
    if (!this.contactCenter || !this.contactTarget || this.contactMs <= 0) return;
    const alpha = Math.min(1, this.contactMs / 85);
    const cx = (this.contactCenter.x + this.contactTarget.x) / 2;
    const cy = (this.contactCenter.y + this.contactTarget.y) / 2;
    const dx = this.contactTarget.x - this.contactCenter.x;
    const dy = this.contactTarget.y - this.contactCenter.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    const reach = (this.radius * 1.25 + 8) * this.contactPower;
    // Multiple jagged arcs make the collision read as a burst, not the demon's
    // separate ranged lightning attack.
    for (let branch = -1; branch <= 1; branch += 1) {
      const offset = branch * reach * 0.42;
      const start = { x: cx + nx * offset, y: cy + ny * offset };
      const end = { x: cx - nx * offset * 0.7 + dx / length * reach * 0.34, y: cy - ny * offset * 0.7 + dy / length * reach * 0.34 };
      this.drawWorldBolt(g, start, end, 2.2 + this.contactPower, this.seed + branch * 31 + Math.floor(this.elapsedMs / 18), ELECTRIC, alpha);
    }
    g.fillStyle(0xf5ffff, 0.78 * alpha).fillEllipse(cx, cy, reach * 0.9, reach * 0.9);
    g.lineStyle(2, 0xd5faff, alpha);
    for (let index = 0; index < 8; index += 1) {
      const angle = index * Math.PI / 4 + this.elapsedMs * 0.018;
      const inner = reach * 0.28;
      const outer = reach * (0.72 + (index % 2) * 0.18);
      g.beginPath()
        .moveTo(cx + Math.cos(angle) * inner, cy + Math.sin(angle) * inner)
        .lineTo(cx + Math.cos(angle) * outer, cy + Math.sin(angle) * outer)
        .strokePath();
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
    const g = this.bodyPen;
    g.beginPath().moveTo(points[0]!.x, points[0]!.y);
    for (let index = 1; index < points.length; index += 1) g.lineTo(points[index]!.x, points[index]!.y);
    g.closePath().fillPath();
  }

  private strokePolygon(points: Vector2[]): void {
    const g = this.bodyPen;
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
