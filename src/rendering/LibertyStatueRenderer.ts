import type Phaser from 'phaser';

interface StatueVisual {
  id: string;
  x: number;
  y: number;
  graphics: Phaser.GameObjects.Graphics;
  activated: boolean;
  animationMs: number;
}

interface Point {
  x: number;
  y: number;
}

const ANIMATION_DURATION_MS = 720;
const OUTLINE = 0x304b57;
const PATINA = 0x659f98;
const PATINA_LIGHT = 0x9bc8bd;
const PATINA_MID = 0x548d87;
const PATINA_DARK = 0x376b69;
const PATINA_DEEP = 0x2f5a5a;
const GOLD = 0xe7bd58;
const GOLD_LIGHT = 0xffe6a0;
const GOLD_DARK = 0xb88639;
const BOOK_COVER = 0x493d50;
const BOOK_HIGHLIGHT = 0x92768a;
const PAPER = 0xe8d8ae;
const STONE = 0x9a9587;
const STONE_LIGHT = 0xc3bba6;
const STONE_DARK = 0x6d7069;
const BLUSH = 0xf08a76;
const VISUAL_HORIZONTAL_SCALE = 0.75;

function drawLine(
  graphics: Phaser.GameObjects.Graphics,
  points: Point[],
  color: number,
  width: number,
  alpha = 1,
): void {
  if (points.length < 2) return;
  graphics.lineStyle(width, color, alpha);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
  graphics.strokePath();
}

function drawPolygon(
  graphics: Phaser.GameObjects.Graphics,
  points: Point[],
  fill: number,
  stroke = OUTLINE,
  strokeWidth = 2,
): void {
  if (points.length < 3) return;
  graphics.fillStyle(fill, 1);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
  graphics.closePath();
  graphics.fillPath();

  graphics.lineStyle(strokeWidth, stroke, 1);
  graphics.beginPath();
  graphics.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
  graphics.closePath();
  graphics.strokePath();
}

function rotatePoint(point: Point, angle: number): Point {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: point.x * cosine - point.y * sine,
    y: point.x * sine + point.y * cosine,
  };
}

function horizontallyScaledGraphics(
  graphics: Phaser.GameObjects.Graphics,
  originX: number,
  scale: number,
): Phaser.GameObjects.Graphics {
  let proxy: Phaser.GameObjects.Graphics;
  proxy = new Proxy(graphics, {
    get(target, property) {
      const value = Reflect.get(target, property, target) as unknown;
      if (typeof value !== 'function') return value;
      return (...args: unknown[]) => {
        const transformed = [...args];
        if (property === 'moveTo' || property === 'lineTo' || property === 'fillCircle' || property === 'strokeCircle') {
          transformed[0] = originX + ((transformed[0] as number) - originX) * scale;
        } else if (property === 'fillEllipse' || property === 'strokeEllipse') {
          transformed[0] = originX + ((transformed[0] as number) - originX) * scale;
          transformed[2] = (transformed[2] as number) * scale;
        }
        const result = Reflect.apply(value, target, transformed);
        return result === target ? proxy : result;
      };
    },
  });
  return proxy;
}

function cubicBezier(start: Point, controlA: Point, controlB: Point, end: Point, t: number): Point {
  const inverse = 1 - t;
  const a = inverse * inverse * inverse;
  const b = 3 * inverse * inverse * t;
  const c = 3 * inverse * t * t;
  const d = t * t * t;
  return {
    x: a * start.x + b * controlA.x + c * controlB.x + d * end.x,
    y: a * start.y + b * controlA.y + c * controlB.y + d * end.y,
  };
}

/** Creates a tapered, curved ribbon used for each octopus tentacle. */
function drawRibbon(
  graphics: Phaser.GameObjects.Graphics,
  start: Point,
  controlA: Point,
  controlB: Point,
  end: Point,
  startWidth: number,
  endWidth: number,
  fill: number,
  highlight = PATINA_LIGHT,
): Point[] {
  const centerline: Point[] = [];
  const left: Point[] = [];
  const right: Point[] = [];
  const segments = 12;

  for (let index = 0; index <= segments; index += 1) {
    const t = index / segments;
    const point = cubicBezier(start, controlA, controlB, end, t);
    const previous = cubicBezier(start, controlA, controlB, end, Math.max(0, t - 0.015));
    const next = cubicBezier(start, controlA, controlB, end, Math.min(1, t + 0.015));
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.max(0.001, Math.hypot(dx, dy));
    const normal = { x: -dy / length, y: dx / length };
    const width = startWidth + (endWidth - startWidth) * t;
    const half = width / 2;
    centerline.push(point);
    left.push({ x: point.x + normal.x * half, y: point.y + normal.y * half });
    right.push({ x: point.x - normal.x * half, y: point.y - normal.y * half });
  }

  drawPolygon(graphics, [...left, ...right.reverse()], fill, OUTLINE, 1.8);
  drawLine(graphics, centerline.slice(1, 10), highlight, 1.25, 0.78);
  return centerline;
}

/** Draws a compact, goofy octopus mascot inspired by the Statue of Liberty. */
export class LibertyStatueRenderer {
  private readonly statues = new Map<string, StatueVisual>();
  private reducedMotion = false;

  constructor(private readonly scene: Phaser.Scene) {}

  create(id: string, x: number, baseY: number): void {
    this.remove(id);
    const graphics = this.scene.add.graphics().setDepth(6.2);
    const visual: StatueVisual = {
      id,
      x,
      y: baseY,
      graphics,
      activated: false,
      animationMs: 0,
    };
    this.statues.set(id, visual);
    this.draw(visual, 0);
  }

  activate(id: string): boolean {
    const statue = this.statues.get(id);
    if (!statue || statue.activated) return false;
    statue.activated = true;
    statue.animationMs = this.reducedMotion ? ANIMATION_DURATION_MS : 0;
    if (this.reducedMotion) this.draw(statue, 1);
    return true;
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    if (!enabled) return;
    for (const statue of this.statues.values()) {
      if (!statue.activated) continue;
      statue.animationMs = ANIMATION_DURATION_MS;
      this.draw(statue, 1);
    }
  }

  update(deltaMs: number): void {
    if (this.reducedMotion) return;
    for (const statue of this.statues.values()) {
      if (!statue.activated || statue.animationMs >= ANIMATION_DURATION_MS) continue;
      statue.animationMs = Math.min(ANIMATION_DURATION_MS, statue.animationMs + Math.max(0, deltaMs));
      const linear = statue.animationMs / ANIMATION_DURATION_MS;
      const eased = 1 - (1 - linear) * (1 - linear);
      this.draw(statue, eased);
    }
  }

  remove(id: string): void {
    const statue = this.statues.get(id);
    if (!statue) return;
    statue.graphics.destroy();
    this.statues.delete(id);
  }

  clear(): void {
    for (const statue of this.statues.values()) statue.graphics.destroy();
    this.statues.clear();
  }

  destroy(): void {
    this.clear();
  }

  private draw(statue: StatueVisual, progress: number): void {
    const graphics = statue.graphics;
    const { x, y } = statue;
    graphics.clear();

    // Compress the body, arms and base horizontally while keeping the head perfectly round.
    const compactGraphics = horizontallyScaledGraphics(graphics, x, VISUAL_HORIZONTAL_SCALE);
    this.drawPedestal(compactGraphics, x, y);
    this.drawTentacleSkirt(compactGraphics, x, y);
    this.drawBookArm(compactGraphics, x, y);
    this.drawGestureArm(compactGraphics, x, y, progress);
    this.drawHeadAndCrown(graphics, x, y, progress);
  }

  private drawPedestal(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // Keep the familiar warm stone plinth, scaled down with the mascot.
    drawPolygon(g, [
      { x: x - 36, y: y - 17 }, { x: x + 36, y: y - 17 },
      { x: x + 33, y: y - 3 }, { x: x - 33, y: y - 3 },
    ], STONE_DARK, OUTLINE, 2);
    drawPolygon(g, [
      { x: x - 33, y: y - 16 }, { x: x + 33, y: y - 16 },
      { x: x + 30, y: y - 4 }, { x: x - 30, y: y - 4 },
    ], STONE, OUTLINE, 1.35);
    drawLine(g, [
      { x: x - 29, y: y - 13 }, { x: x - 12, y: y - 13 },
      { x: x + 11, y: y - 13 }, { x: x + 29, y: y - 13 },
    ], STONE_LIGHT, 1.35, 0.85);
    drawPolygon(g, [
      { x: x - 40, y: y - 22 }, { x: x + 40, y: y - 22 },
      { x: x + 37, y: y - 17 }, { x: x - 37, y: y - 17 },
    ], STONE_LIGHT, OUTLINE, 1.8);
    drawLine(g, [
      { x: x - 37, y: y - 20 }, { x: x + 37, y: y - 20 },
    ], 0xe0d4bd, 1.35, 0.95);
    drawPolygon(g, [
      { x: x - 35, y: y - 4 }, { x: x + 35, y: y - 4 },
      { x: x + 40, y }, { x: x - 40, y },
    ], STONE_DARK, OUTLINE, 2);
    drawLine(g, [
      { x: x - 35, y: y - 3 }, { x: x + 35, y: y - 3 },
    ], STONE_LIGHT, 1.5, 0.9);
  }

  private drawTentacleSkirt(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // A soft shadow under the head makes the skirt read as a bundle of tentacles.
    g.fillStyle(PATINA_DEEP, 0.42).fillEllipse(x, y - 38, 48, 24);

    const tentacles = [
      { sx: -17, c1: -29, c2: -43, ex: -37, color: PATINA_DARK },
      { sx: -11, c1: -21, c2: -29, ex: -25, color: PATINA },
      { sx: -4, c1: -9, c2: -17, ex: -15, color: PATINA_MID },
      { sx: 4, c1: 12, c2: 18, ex: 16, color: PATINA },
      { sx: 11, c1: 24, c2: 31, ex: 28, color: PATINA_MID },
      { sx: 17, c1: 31, c2: 43, ex: 38, color: PATINA_DARK },
    ];

    // Six lower tentacles fan out and taper into a dress-like silhouette.
    tentacles.forEach((tentacle, index) => {
      const centerline = drawRibbon(
        g,
        { x: x + tentacle.sx, y: y - 99 },
        { x: x + tentacle.c1, y: y - 75 },
        { x: x + tentacle.c2, y: y - 43 },
        { x: x + tentacle.ex, y: y - 22 },
        index === 0 || index === 5 ? 10 : 9,
        2.8,
        tentacle.color,
        index % 2 === 0 ? PATINA_LIGHT : 0x86b9ae,
      );

      // Tiny pale suckers along the inner edge add an unmistakable octopus detail.
      [0.42, 0.55, 0.68, 0.81].forEach((t, suckerIndex) => {
        const point = centerline[Math.round(t * (centerline.length - 1))];
        const offset = index < 3 ? 2 : -2;
        g.fillStyle(PATINA_LIGHT, 0.98).fillCircle(point.x + offset, point.y + (suckerIndex % 2), 1.35);
      });
    });

    // A gathered mantle/collar ties the tentacles into a single body under the head.
    drawPolygon(g, [
      { x: x - 20, y: y - 101 }, { x: x - 13, y: y - 108 },
      { x: x, y: y - 111 }, { x: x + 13, y: y - 108 },
      { x: x + 20, y: y - 101 }, { x: x + 13, y: y - 92 },
      { x: x, y: y - 95 }, { x: x - 13, y: y - 92 },
    ], PATINA_MID, OUTLINE, 2);
    drawLine(g, [
      { x: x - 14, y: y - 103 }, { x: x - 7, y: y - 98 },
      { x, y: y - 96 }, { x: x + 8, y: y - 99 },
      { x: x + 14, y: y - 104 },
    ], PATINA_LIGHT, 1.8, 0.92);
  }

  private drawBookArm(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // One upper tentacle curls left and holds a little closed book.
    drawRibbon(
      g,
      { x: x - 17, y: y - 111 },
      { x: x - 29, y: y - 116 },
      { x: x - 38, y: y - 102 },
      { x: x - 39, y: y - 88 },
      7.5,
      5.2,
      PATINA_MID,
      PATINA_LIGHT,
    );

    // Book: visible pages, dark teal cover, gold corners and a small bookmark; no tiny text.
    drawPolygon(g, [
      { x: x - 55, y: y - 96 }, { x: x - 34, y: y - 92 },
      { x: x - 32, y: y - 65 }, { x: x - 54, y: y - 69 },
    ], PAPER, OUTLINE, 1.65);
    drawPolygon(g, [
      { x: x - 57, y: y - 99 }, { x: x - 35, y: y - 95 },
      { x: x - 34, y: y - 68 }, { x: x - 56, y: y - 72 },
    ], BOOK_COVER, OUTLINE, 1.8);
    drawLine(g, [
      { x: x - 45, y: y - 97 }, { x: x - 44, y: y - 70 },
    ], GOLD, 1.2, 0.95);
    drawLine(g, [
      { x: x - 53, y: y - 75 }, { x: x - 37, y: y - 72 },
    ], BOOK_HIGHLIGHT, 1, 0.9);
    drawPolygon(g, [
      { x: x - 40, y: y - 69 }, { x: x - 36, y: y - 68 },
      { x: x - 37, y: y - 61 }, { x: x - 40, y: y - 64 },
    ], BLUSH, GOLD_DARK, 0.7);
    g.fillStyle(GOLD_LIGHT, 1).fillCircle(x - 49, y - 91, 1.5);

    // A tiny curl of tentacle crosses the book's outer edge to show a grip.
    drawLine(g, [
      { x: x - 35, y: y - 86 }, { x: x - 31, y: y - 82 },
      { x: x - 33, y: y - 78 }, { x: x - 37, y: y - 79 },
    ], PATINA_LIGHT, 4, 1);
    drawLine(g, [
      { x: x - 35, y: y - 86 }, { x: x - 31, y: y - 82 },
      { x: x - 33, y: y - 78 },
    ], OUTLINE, 1.15, 1);
  }

  private drawGestureArm(g: Phaser.GameObjects.Graphics, x: number, y: number, progress: number): void {
    // The second upper tentacle rises out to the right and ends in a large, readable hand.
    drawRibbon(
      g,
      { x: x + 17, y: y - 111 },
      { x: x + 29, y: y - 121 },
      { x: x + 38, y: y - 112 },
      { x: x + 40, y: y - 96 },
      8,
      5.6,
      PATINA_MID,
      PATINA_LIGHT,
    );

    // A punk wrist cuff separates the hand from the soft tentacle arm.
    drawPolygon(g, [
      { x: x + 34, y: y - 101 }, { x: x + 45, y: y - 99 },
      { x: x + 46, y: y - 91 }, { x: x + 35, y: y - 93 },
    ], BOOK_COVER, OUTLINE, 1.5);
    drawLine(g, [
      { x: x + 35, y: y - 100 }, { x: x + 45, y: y - 98 },
    ], BOOK_HIGHLIGHT, 1.1, 0.95);
    g.fillStyle(GOLD_LIGHT, 1).fillCircle(x + 39, y - 97, 1.25);
    g.fillStyle(GOLD_LIGHT, 1).fillCircle(x + 43, y - 96, 1.25);

    this.drawGestureHand(g, { x: x + 43, y: y - 105 }, progress);
  }

  private drawGestureHand(g: Phaser.GameObjects.Graphics, center: Point, progress: number): void {
    // The thumb is a broad side protrusion from a closed fist, never a lone raised finger.
    // A half-turn changes the thumbs-up silhouette into a thumbs-down silhouette.
    const rotation = Math.PI * (1 - progress);
    const handShape: Point[] = [
      { x: -7, y: 15 },
      { x: -10, y: 12 },
      { x: -10, y: 1 },
      { x: -10, y: -5 },
      { x: -13, y: -7 },
      { x: -18, y: -10 },
      { x: -18, y: -16 },
      { x: -14, y: -20 },
      { x: -10, y: -18 },
      { x: -7, y: -13 },
      { x: -3, y: -11 },
      { x: 4, y: -10 },
      { x: 8, y: -7 },
      { x: 10, y: -3 },
      { x: 10, y: 3 },
      { x: 8, y: 8 },
      { x: 6, y: 13 },
      { x: 2, y: 16 },
      { x: -4, y: 16 },
      { x: -7, y: 15 },
    ];
    const transformed = handShape.map((point) => rotatePoint(point, rotation))
      .map((point) => ({ x: point.x + center.x, y: point.y + center.y }));
    drawPolygon(g, transformed, PATINA_LIGHT, OUTLINE, 2.3);

    const thumbHighlight = [
      { x: -16, y: -13 }, { x: -15, y: -18 }, { x: -11, y: -18 },
    ].map((point) => rotatePoint(point, rotation))
      .map((point) => ({ x: point.x + center.x, y: point.y + center.y }));
    drawLine(g, thumbHighlight, 0xd0e5d7, 1.45, 0.95);

    const creases = [
      [{ x: 0, y: -5 }, { x: 4, y: -4 }, { x: 8, y: -3 }],
      [{ x: 0, y: -1 }, { x: 5, y: 0 }, { x: 9, y: 1 }],
      [{ x: -1, y: 3 }, { x: 4, y: 4 }, { x: 8, y: 5 }],
    ];
    creases.forEach((crease) => {
      drawLine(g, crease.map((point) => rotatePoint(point, rotation))
        .map((point) => ({ x: point.x + center.x, y: point.y + center.y })), PATINA_DARK, 1.05, 0.9);
    });
  }

  private drawHeadAndCrown(g: Phaser.GameObjects.Graphics, x: number, y: number, progress: number): void {
    const headX = x;
    const headY = y - 119;

    // A rounded, oversized head is the octopus's main silhouette and emotional focal point.
    g.fillStyle(PATINA_DARK, 1).fillCircle(headX, headY + 1, 27.5);
    g.fillStyle(PATINA, 1).fillCircle(headX, headY, 26);
    g.fillStyle(PATINA_LIGHT, 0.45).fillEllipse(headX - 8, headY - 13, 19, 9);
    g.lineStyle(2.2, OUTLINE, 1).strokeCircle(headX, headY, 26);

    // Seven short golden crown rays keep the Statue of Liberty reference without overpowering the mascot.
    const rays = [
      { bx: -22, tx: -31, ty: -20 },
      { bx: -16, tx: -23, ty: -30 },
      { bx: -9, tx: -12, ty: -35 },
      { bx: 0, tx: 0, ty: -40 },
      { bx: 9, tx: 12, ty: -35 },
      { bx: 16, tx: 23, ty: -30 },
      { bx: 22, tx: 31, ty: -20 },
    ];
    rays.forEach((ray) => {
      drawPolygon(g, [
        { x: headX + ray.bx - 3, y: headY - 15 },
        { x: headX + ray.tx, y: headY + ray.ty },
        { x: headX + ray.bx + 3, y: headY - 14 },
      ], GOLD, OUTLINE, 1.35);
      drawLine(g, [
        { x: headX + ray.bx - 1, y: headY - 17 },
        { x: headX + ray.tx - 1, y: headY + ray.ty + 4 },
      ], GOLD_LIGHT, 1, 0.9);
    });

    // A little plum mohawk peeks between the rays for a playful punk-rock nod.
    drawPolygon(g, [
      { x: headX - 10, y: headY - 21 }, { x: headX - 9, y: headY - 31 },
      { x: headX - 3, y: headY - 26 }, { x: headX + 1, y: headY - 35 },
      { x: headX + 5, y: headY - 25 }, { x: headX + 10, y: headY - 30 },
      { x: headX + 11, y: headY - 20 },
    ], BOOK_COVER, OUTLINE, 1.5);
    drawLine(g, [
      { x: headX - 7, y: headY - 25 }, { x: headX - 3, y: headY - 31 },
      { x: headX + 1, y: headY - 25 }, { x: headX + 6, y: headY - 28 },
    ], BLUSH, 1.2, 0.95);

    // A gold circlet sits at the front of the crown, with three visible rivets.
    drawLine(g, [
      { x: headX - 23, y: headY - 14 }, { x: headX - 17, y: headY - 19 },
      { x: headX, y: headY - 22 }, { x: headX + 17, y: headY - 19 },
      { x: headX + 23, y: headY - 14 },
    ], GOLD_DARK, 4.2, 1);
    drawLine(g, [
      { x: headX - 21, y: headY - 15 }, { x: headX - 13, y: headY - 20 },
      { x: headX, y: headY - 21 }, { x: headX + 13, y: headY - 20 },
      { x: headX + 21, y: headY - 15 },
    ], GOLD_LIGHT, 1.25, 1);
    for (const offset of [-13, 0, 13]) {
      g.fillStyle(GOLD_LIGHT, 1).fillCircle(headX + offset, headY - 18, 1.35);
    }

    const happy = progress >= 0.48;
    if (!happy) {
      // Sad face: drooping eyelids, pupils looking down, a tear and a clear frown.
      for (const side of [-1, 1]) {
        const eyeX = headX + side * 9;
        g.fillStyle(0xf2e5bf, 1).fillCircle(eyeX, headY - 2, 6.3);
        g.lineStyle(1.3, OUTLINE, 1).strokeCircle(eyeX, headY - 2, 6.3);
        g.fillStyle(PATINA_DEEP, 1).fillCircle(eyeX + side * 0.7, headY + 1, 2.5);
      }
      drawLine(g, [
        { x: headX - 16, y: headY - 11 }, { x: headX - 10, y: headY - 14 },
        { x: headX - 4, y: headY - 11 },
      ], PATINA_DEEP, 2.2, 1);
      drawLine(g, [
        { x: headX + 4, y: headY - 11 }, { x: headX + 10, y: headY - 14 },
        { x: headX + 16, y: headY - 11 },
      ], PATINA_DEEP, 2.2, 1);
      drawPolygon(g, [
        { x: headX + 17, y: headY + 4 }, { x: headX + 20, y: headY + 10 },
        { x: headX + 17, y: headY + 15 }, { x: headX + 14, y: headY + 10 },
      ], 0x9bc8d0, 0x4c8790, 0.85);
      drawLine(g, [
        { x: headX - 7, y: headY + 15 }, { x: headX - 4, y: headY + 11 },
        { x: headX, y: headY + 9 }, { x: headX + 4, y: headY + 11 },
        { x: headX + 7, y: headY + 15 },
      ], PATINA_DEEP, 2.5, 1);
    } else {
      // Happy face: bright round eyes and an exaggerated open smile.
      for (const side of [-1, 1]) {
        const eyeX = headX + side * 9;
        g.fillStyle(0xffedb7, 1).fillCircle(eyeX, headY - 3, 6.5);
        g.lineStyle(1.25, OUTLINE, 1).strokeCircle(eyeX, headY - 3, 6.5);
        g.fillStyle(OUTLINE, 1).fillCircle(eyeX, headY - 2, 2.8);
        g.fillStyle(0xffffff, 1).fillCircle(eyeX - 1.1, headY - 4, 1.25);
      }
      drawLine(g, [
        { x: headX - 16, y: headY - 12 }, { x: headX - 10, y: headY - 15 },
        { x: headX - 4, y: headY - 12 },
      ], PATINA_DEEP, 1.8, 1);
      drawLine(g, [
        { x: headX + 4, y: headY - 12 }, { x: headX + 10, y: headY - 15 },
        { x: headX + 16, y: headY - 12 },
      ], PATINA_DEEP, 1.8, 1);
      drawPolygon(g, [
        { x: headX - 8, y: headY + 8 }, { x: headX - 4, y: headY + 7 },
        { x: headX, y: headY + 8 }, { x: headX + 4, y: headY + 7 },
        { x: headX + 8, y: headY + 8 }, { x: headX + 6, y: headY + 17 },
        { x: headX, y: headY + 20 }, { x: headX - 6, y: headY + 17 },
      ], BOOK_COVER, OUTLINE, 1.5);
      drawLine(g, [
        { x: headX - 5, y: headY + 9 }, { x: headX, y: headY + 10 },
        { x: headX + 5, y: headY + 9 },
      ], GOLD_LIGHT, 1.25, 0.95);
      g.fillStyle(BLUSH, 0.9).fillCircle(headX - 17, headY + 9, 2.2);
      g.fillStyle(BLUSH, 0.9).fillCircle(headX + 17, headY + 9, 2.2);
    }

    // A tiny hoop earring makes the round head feel like a cheeky character.
    g.lineStyle(1.4, GOLD_DARK, 1).strokeCircle(headX + 23, headY + 5, 3.2);
    g.fillStyle(GOLD_LIGHT, 1).fillCircle(headX + 25, headY + 8, 1.1);
  }
}
