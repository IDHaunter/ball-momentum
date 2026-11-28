import type Phaser from 'phaser';

interface StatueVisual {
  id: string;
  x: number;
  y: number;
  graphics: Phaser.GameObjects.Graphics;
  flameGraphics: Phaser.GameObjects.Graphics;
  faceGraphics: Phaser.GameObjects.Graphics;
  activated: boolean;
  animationMs: number;
  elapsedMs: number;
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
const PUNK_HAIR = 0x493d50;
const PUNK_HAIR_LIGHT = 0x92768a;
const TORCH_HANDLE = 0x654b3f;
const TORCH_HANDLE_LIGHT = 0xa77b53;
const FLAME_ORANGE = 0xff922f;
const FLAME_GOLD = 0xffd95e;
const FLAME_HOT = 0xfff8bd;
const STONE = 0x9a9587;
const STONE_LIGHT = 0xc3bba6;
const STONE_DARK = 0x6d7069;
const GESTURE_SCALE = 0.82;
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

interface CubicSegment {
  controlA: Point;
  controlB: Point;
  end: Point;
}

function sampleCubicPath(start: Point, segments: CubicSegment[], steps = 4): Point[] {
  const points = [start];
  let segmentStart = start;
  for (const segment of segments) {
    for (let index = 1; index <= steps; index += 1) {
      points.push(cubicBezier(
        segmentStart,
        segment.controlA,
        segment.controlB,
        segment.end,
        index / steps,
      ));
    }
    segmentStart = segment.end;
  }
  return points;
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
    const flameGraphics = this.scene.add.graphics().setDepth(6.25);
    const faceGraphics = this.scene.add.graphics().setDepth(6.23);
    const visual: StatueVisual = {
      id,
      x,
      y: baseY,
      graphics,
      flameGraphics,
      faceGraphics,
      activated: false,
      animationMs: 0,
      elapsedMs: 0,
    };
    this.statues.set(id, visual);
    this.draw(visual, 0);
    this.drawTorchFlameLayer(visual, visual.elapsedMs);
    this.drawFaceLayer(visual, 0);
  }

  activate(id: string): boolean {
    const statue = this.statues.get(id);
    if (!statue || statue.activated) return false;
    statue.activated = true;
    statue.animationMs = this.reducedMotion ? ANIMATION_DURATION_MS : 0;
    if (this.reducedMotion) {
      this.draw(statue, 1);
      this.drawFaceLayer(statue, 1);
    }
    return true;
  }

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    if (!enabled) return;
    for (const statue of this.statues.values()) {
      if (!statue.activated) continue;
      statue.animationMs = ANIMATION_DURATION_MS;
      this.draw(statue, 1);
      this.drawFaceLayer(statue, 1);
    }
  }

  update(deltaMs: number): void {
    if (this.reducedMotion) return;
    const safeDelta = Math.max(0, deltaMs);
    for (const statue of this.statues.values()) {
      statue.elapsedMs += safeDelta;
      if (statue.activated && statue.animationMs < ANIMATION_DURATION_MS) {
        statue.animationMs = Math.min(ANIMATION_DURATION_MS, statue.animationMs + safeDelta);
        const linear = statue.animationMs / ANIMATION_DURATION_MS;
        const eased = 1 - (1 - linear) * (1 - linear);
        // Draw the terminal 1.0 frame too; otherwise an exact 720 ms step would stop one frame early.
        this.draw(statue, eased);
      }
      const linearProgress = statue.animationMs / ANIMATION_DURATION_MS;
      const faceProgress = 1 - (1 - linearProgress) * (1 - linearProgress);
      // Eyes animate on a separate lightweight layer; the octopus body remains untouched.
      this.drawFaceLayer(statue, faceProgress);
      // Only the small flame layer is redrawn continuously besides the animated face.
      this.drawTorchFlameLayer(statue, statue.elapsedMs);
    }
  }

  remove(id: string): void {
    const statue = this.statues.get(id);
    if (!statue) return;
    statue.graphics.destroy();
    statue.flameGraphics.destroy();
    statue.faceGraphics.destroy();
    this.statues.delete(id);
  }

  clear(): void {
    for (const statue of this.statues.values()) {
      statue.graphics.destroy();
      statue.flameGraphics.destroy();
      statue.faceGraphics.destroy();
    }
    this.statues.clear();
  }

  destroy(): void {
    this.clear();
  }

  private draw(statue: StatueVisual, progress: number): void {
    const graphics = statue.graphics;
    const { x, y } = statue;
    graphics.clear();

    // Compress the body, props and pedestal while keeping the smiley head perfectly round.
    const compactGraphics = horizontallyScaledGraphics(graphics, x, VISUAL_HORIZONTAL_SCALE);
    this.drawPedestal(compactGraphics, x, y);
    this.drawTentacleSkirt(compactGraphics, x, y);
    this.drawTorchArm(compactGraphics, x, y);
    this.drawGestureArm(compactGraphics, x, y, progress);
    this.drawHeadAndCrown(graphics, x, y);
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

  private drawTorchArm(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // One upper tentacle curls upward and wraps around the torch handle.
    const arm = drawRibbon(
      g,
      { x: x - 15, y: y - 109 },
      { x: x - 28, y: y - 117 },
      { x: x - 36, y: y - 135 },
      { x: x - 37, y: y - 145 },
      7.5,
      5.2,
      PATINA_MID,
      PATINA_LIGHT,
    );
    [0.62, 0.76, 0.88].forEach((t) => {
      const point = arm[Math.round(t * (arm.length - 1))];
      g.fillStyle(PATINA_LIGHT, 0.98).fillCircle(point.x + 2.2, point.y, 1.15);
    });

    const torchX = x - 41;
    // A dark, slightly leaning shaft with warm brass bands.
    drawLine(g, [
      { x: torchX + 2, y: y - 140 },
      { x: torchX, y: y - 157 },
      { x: torchX - 2, y: y - 169 },
    ], TORCH_HANDLE, 6.4, 1);
    drawLine(g, [
      { x: torchX + 0.5, y: y - 141 },
      { x: torchX - 1, y: y - 157 },
    ], TORCH_HANDLE_LIGHT, 1.35, 0.9);
    drawLine(g, [
      { x: torchX - 1.5, y: y - 151 },
      { x: torchX + 4.5, y: y - 150 },
    ], GOLD, 2.5, 1);
    drawLine(g, [
      { x: torchX - 3.2, y: y - 165 },
      { x: torchX + 3.4, y: y - 164 },
    ], GOLD_LIGHT, 2.1, 1);

    // The flared cup makes the object read as the Statue of Liberty's torch.
    drawPolygon(g, [
      { x: torchX - 8, y: y - 171 },
      { x: torchX - 6, y: y - 165 },
      { x: torchX - 4, y: y - 161 },
      { x: torchX + 4, y: y - 161 },
      { x: torchX + 6, y: y - 165 },
      { x: torchX + 8, y: y - 171 },
      { x: torchX + 4, y: y - 169 },
      { x: torchX, y: y - 172 },
      { x: torchX - 4, y: y - 169 },
    ], GOLD_DARK, OUTLINE, 1.35);
    drawLine(g, [
      { x: torchX - 8, y: y - 171 },
      { x: torchX, y: y - 173 },
      { x: torchX + 8, y: y - 171 },
    ], GOLD_LIGHT, 1.4, 1);
    drawLine(g, [
      { x: torchX - 5, y: y - 165 },
      { x: torchX + 5, y: y - 165 },
    ], GOLD, 1.2, 0.9);

    // A little tentacle curl visibly grips the lower half of the shaft.
    drawLine(g, [
      { x: torchX + 3, y: y - 143 },
      { x: torchX + 7, y: y - 147 },
      { x: torchX + 7, y: y - 152 },
      { x: torchX + 2, y: y - 154 },
    ], PATINA_LIGHT, 4.2, 1);
    drawLine(g, [
      { x: torchX + 3, y: y - 143 },
      { x: torchX + 7, y: y - 147 },
      { x: torchX + 7, y: y - 152 },
    ], OUTLINE, 1.2, 1);
  }


  private drawTorchFlameLayer(statue: StatueVisual, elapsedMs: number): void {
    const g = statue.flameGraphics;
    g.clear();
    const compactGraphics = horizontallyScaledGraphics(g, statue.x, VISUAL_HORIZONTAL_SCALE);
    this.drawTorchFlame(compactGraphics, { x: statue.x - 41, y: statue.y - 180 }, elapsedMs);
  }

  private drawTorchFlame(g: Phaser.GameObjects.Graphics, center: Point, elapsedMs: number): void {
    const sway = Math.sin(elapsedMs * 0.012) * 1.25;
    const pulse = 0.94 + Math.sin(elapsedMs * 0.018 + 0.8) * 0.08;
    const width = pulse;
    const height = 0.94 + Math.sin(elapsedMs * 0.015 + 1.7) * 0.1;

    // A faint warm halo and layered flame echo the checkpoint lantern's orange/gold core.
    g.fillStyle(0xffa33b, 0.15).fillEllipse(center.x + sway * 0.35, center.y + 1, 19 * width, 27 * height);
    const outer = [
      { x: center.x + sway, y: center.y - 14 * height },
      { x: center.x + 4 * width + sway, y: center.y - 8 * height },
      { x: center.x + 7 * width + sway, y: center.y - 1 },
      { x: center.x + 6 * width, y: center.y + 6 * height },
      { x: center.x + 2.5, y: center.y + 10 * height },
      { x: center.x - 3 * width, y: center.y + 9 * height },
      { x: center.x - 7 * width, y: center.y + 4 * height },
      { x: center.x - 6 * width - sway * 0.35, y: center.y - 3 },
      { x: center.x - 3 * width + sway * 0.25, y: center.y - 9 * height },
    ];
    drawPolygon(g, outer, FLAME_ORANGE, 0xd95128, 0.85);

    const middle = [
      { x: center.x + sway * 0.45, y: center.y - 9 * height },
      { x: center.x + 4.2 * width, y: center.y - 3 * height },
      { x: center.x + 4.5 * width, y: center.y + 4 * height },
      { x: center.x, y: center.y + 8 * height },
      { x: center.x - 4 * width, y: center.y + 4 * height },
      { x: center.x - 3.3 * width, y: center.y - 2 * height },
    ];
    drawPolygon(g, middle, FLAME_GOLD, 0xf58a32, 0.55);

    const hotCore = [
      { x: center.x + sway * 0.2, y: center.y - 5.8 * height },
      { x: center.x + 2.3 * width, y: center.y - 1 },
      { x: center.x + 2.2 * width, y: center.y + 4.5 * height },
      { x: center.x - 1.5 * width, y: center.y + 5.5 * height },
      { x: center.x - 2.5 * width, y: center.y + 1.5 * height },
    ];
    drawPolygon(g, hotCore, FLAME_HOT, 0xffe6a0, 0.45);
  }

  private drawGestureArm(g: Phaser.GameObjects.Graphics, x: number, y: number, progress: number): void {
    // The wrist grows directly from the side of the head. The cuff sits at the head-side
    // end of a horizontally extended fist, like a familiar social-app thumbs reaction.
    drawRibbon(
      g,
      { x: x + 15, y: y - 119 },
      { x: x + 23, y: y - 121 },
      { x: x + 31, y: y - 120 },
      { x: x + 37, y: y - 119 },
      6.8,
      7.4,
      PATINA_MID,
      PATINA_LIGHT,
    );
    this.drawThumbIcon(g, { x: x + 66, y: y - 119 }, progress);
  }

  private drawThumbIcon(g: Phaser.GameObjects.Graphics, center: Point, progress: number): void {
    // A side-facing, Facebook-style thumbs-up: wrist enters from the left, the fist
    // extends horizontally to the right, and only the thumb points vertically.
    // DISLIKE is a vertical mirror of the same silhouette; no rotation is involved.
    const flipY = -Math.cos(Math.PI * Math.max(0, Math.min(1, progress)));
    const transform = (point: Point): Point => ({
      x: center.x + point.x * GESTURE_SCALE,
      y: center.y + point.y * GESTURE_SCALE * flipY,
    });

    const outline = sampleCubicPath(
      { x: -35, y: -8 },
      [
        // Straight wrist entering from the head-side cuff.
        { controlA: { x: -30, y: -8 }, controlB: { x: -23, y: -8 }, end: { x: -18, y: -8 } },
        { controlA: { x: -15, y: -8 }, controlB: { x: -13, y: -9 }, end: { x: -11, y: -12 } },
        // Thumb rises clearly from the upper edge of the palm.
        { controlA: { x: -10, y: -15 }, controlB: { x: -11, y: -20 }, end: { x: -7, y: -24 } },
        { controlA: { x: -4, y: -28 }, controlB: { x: 2, y: -28 }, end: { x: 5, y: -24 } },
        { controlA: { x: 7, y: -21 }, controlB: { x: 6, y: -17 }, end: { x: 5, y: -14 } },
        { controlA: { x: 4, y: -12 }, controlB: { x: 4, y: -11 }, end: { x: 7, y: -11 } },
        // Palm and folded fingers face outwards, away from the octopus head.
        { controlA: { x: 12, y: -12 }, controlB: { x: 17, y: -12 }, end: { x: 21, y: -9 } },
        { controlA: { x: 25, y: -7 }, controlB: { x: 25, y: -3 }, end: { x: 22, y: 0 } },
        { controlA: { x: 25, y: 2 }, controlB: { x: 24, y: 6 }, end: { x: 20, y: 8 } },
        { controlA: { x: 19, y: 12 }, controlB: { x: 15, y: 13 }, end: { x: 11, y: 12 } },
        { controlA: { x: 6, y: 12 }, controlB: { x: 1, y: 10 }, end: { x: -5, y: 9 } },
        { controlA: { x: -10, y: 8 }, controlB: { x: -14, y: 8 }, end: { x: -18, y: 8 } },
        { controlA: { x: -24, y: 8 }, controlB: { x: -30, y: 8 }, end: { x: -35, y: 8 } },
      ],
      4,
    );
    const transformedOutline = outline.map(transform);

    // The shaded edge and strong outline keep the reaction readable at gameplay scale.
    drawPolygon(
      g,
      transformedOutline.map((point) => ({ x: point.x + 1.2, y: point.y + 1.5 })),
      PATINA_DARK,
      OUTLINE,
      3.2,
    );
    drawPolygon(g, transformedOutline, PATINA, OUTLINE, 3.0);

    // A vertical cuff band sits at the left/wrist end, visibly attached to the head-side arm.
    const cuff = [
      { x: -36, y: -9 }, { x: -27, y: -9 },
      { x: -27, y: 9 }, { x: -36, y: 9 },
    ].map(transform);
    drawPolygon(g, cuff, GOLD, OUTLINE, 1.5);
    drawLine(g, [
      transform({ x: -34, y: -7 }),
      transform({ x: -34, y: 7 }),
    ], GOLD_LIGHT, 1.15, 0.98);
    for (const rivetY of [-5, 5]) {
      const rivet = transform({ x: -29.5, y: rivetY });
      g.fillStyle(GOLD_LIGHT, 1).fillCircle(rivet.x, rivet.y, 1.05);
    }

    // Three shallow creases at the outer edge suggest the folded fingers of a closed fist.
    const knuckles = [
      [{ x: 17, y: -7 }, { x: 20, y: -6 }, { x: 21, y: -4 }],
      [{ x: 18, y: -1 }, { x: 21, y: 0 }, { x: 21, y: 2 }],
      [{ x: 16, y: 6 }, { x: 19, y: 7 }, { x: 19, y: 9 }],
    ];
    knuckles.forEach((crease) => drawLine(g, crease.map(transform), PATINA_DEEP, 1.3, 0.84));

    // A thumb highlight follows the nail-side curve; the mirror animation flips it with the thumb.
    drawLine(g, [
      transform({ x: -7, y: -23 }),
      transform({ x: -3, y: -25 }),
      transform({ x: 1, y: -24 }),
    ], PATINA_LIGHT, 2.0, 0.96);
    drawLine(g, [
      transform({ x: 7, y: -8 }),
      transform({ x: 12, y: -8 }),
      transform({ x: 16, y: -7 }),
    ], PATINA_LIGHT, 1.3, 0.72);
  }

  private drawHeadAndCrown(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    const headX = x;
    const headY = y - 119;

    // A rounded, oversized head is the octopus's main silhouette and emotional focal point.
    g.fillStyle(PATINA_DARK, 1).fillCircle(headX, headY + 1, 27.5);
    g.fillStyle(PATINA, 1).fillCircle(headX, headY, 26);
    g.fillStyle(PATINA_LIGHT, 0.45).fillEllipse(headX - 8, headY - 13, 19, 9);
    g.lineStyle(2.2, OUTLINE, 1).strokeCircle(headX, headY, 26);

    // A chunky, uneven purple mohawk reads like a punk hairstyle growing from the round head.
    // The seven spikes keep a subtle echo of the old Liberty crown, but are now clearly hair.
    const hairSpikes = [
      { base: -22, tip: -31, height: -30, width: 5.5 },
      { base: -16, tip: -23, height: -39, width: 6 },
      { base: -9, tip: -13, height: -45, width: 6.4 },
      { base: -2, tip: 0, height: -40, width: 6.8 },
      { base: 6, tip: 10, height: -47, width: 6.4 },
      { base: 14, tip: 23, height: -37, width: 6 },
      { base: 21, tip: 31, height: -28, width: 5.5 },
    ];
    hairSpikes.forEach((spike, index) => {
      drawPolygon(g, [
        { x: headX + spike.base - spike.width * 0.65, y: headY - 16 },
        { x: headX + spike.tip, y: headY + spike.height },
        { x: headX + spike.base + spike.width * 0.65, y: headY - 15 },
      ], index % 2 === 0 ? PUNK_HAIR : 0x59445f, OUTLINE, 1.6);
      drawLine(g, [
        { x: headX + spike.base - 1.8, y: headY - 19 },
        { x: headX + spike.tip - 0.8, y: headY + spike.height + 5 },
      ], PUNK_HAIR_LIGHT, 1.35, 0.95);
    });

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
    for (const offset of [-16, -8, 0, 8, 16]) {
      g.fillStyle(GOLD_LIGHT, 1).fillCircle(headX + offset, headY - 18, 1.3);
    }
    // A tiny safety-pin accent makes the circlet feel more like punk jewellery.
    drawLine(g, [
      { x: headX + 18, y: headY - 17 },
      { x: headX + 22, y: headY - 13 },
      { x: headX + 19, y: headY - 10 },
    ], GOLD_LIGHT, 1.25, 0.95);

  }

  /** Redraws only the face so eye movement never forces the body or tentacles to repaint. */
  private drawFaceLayer(statue: StatueVisual, progress: number): void {
    const g = statue.faceGraphics;
    const headX = statue.x;
    const headY = statue.y - 119;
    const happy = progress >= 0.48;
    const elapsed = statue.elapsedMs;
    g.clear();

    // The pupils gently look around; a periodic blink makes the round mascot feel alive.
    const lookX = Math.sin(elapsed * 0.00125) * 1.05;
    const lookY = Math.sin(elapsed * 0.0017 + 0.6) * 0.55;
    const blinkPhase = elapsed % 3900;
    const blink = blinkPhase >= 2500 && blinkPhase <= 2650
      ? 1 - Math.abs(blinkPhase - 2575) / 75
      : 0;
    const eyeHeight = 1.3 + 11.4 * (1 - Math.max(0, Math.min(1, blink)));

    for (const side of [-1, 1]) {
      const eyeX = headX + side * 9;
      const eyeY = headY - (happy ? 3 : 2);
      g.fillStyle(0xf2e5bf, 1).fillEllipse(eyeX, eyeY, 12.6, eyeHeight);
      g.lineStyle(1.25, OUTLINE, 1).strokeEllipse(eyeX, eyeY, 12.6, eyeHeight);
      if (blink < 0.88) {
        const pupilX = eyeX + side * 0.25 + lookX;
        const pupilY = eyeY + 0.8 + lookY;
        g.fillStyle(PATINA_DEEP, 1).fillCircle(pupilX, pupilY, 2.65);
        g.fillStyle(0xffffff, 1).fillCircle(pupilX - 0.95, pupilY - 1.05, 0.95);
      } else {
        // A thin curved lid remains visible during the blink instead of a disappearing eye.
        drawLine(g, [
          { x: eyeX - 5.2, y: eyeY },
          { x: eyeX, y: eyeY + 0.5 },
          { x: eyeX + 5.2, y: eyeY },
        ], PATINA_DEEP, 1.35, 1);
      }
    }

    if (!happy) {
      // Sad brows angle down toward the centre; the mouth is a simple closed frown.
      drawLine(g, [
        { x: headX - 16, y: headY - 12 }, { x: headX - 10, y: headY - 15 },
        { x: headX - 4, y: headY - 12 },
      ], PATINA_DEEP, 2.2, 1);
      drawLine(g, [
        { x: headX + 4, y: headY - 12 }, { x: headX + 10, y: headY - 15 },
        { x: headX + 16, y: headY - 12 },
      ], PATINA_DEEP, 2.2, 1);
      const frown: Point[] = [];
      for (let index = 0; index <= 8; index += 1) {
        const t = index / 8;
        frown.push(cubicBezier(
          { x: headX - 7, y: headY + 14 },
          { x: headX - 4, y: headY + 9 },
          { x: headX + 4, y: headY + 9 },
          { x: headX + 7, y: headY + 14 },
          t,
        ));
      }
      drawLine(g, frown, PATINA_DEEP, 2.5, 1);
      return;
    }

    // Happy brows are softer, and the mouth is a closed crescent smile with two teeth.
    drawLine(g, [
      { x: headX - 16, y: headY - 13 }, { x: headX - 10, y: headY - 15 },
      { x: headX - 4, y: headY - 13 },
    ], PATINA_DEEP, 1.65, 0.95);
    drawLine(g, [
      { x: headX + 4, y: headY - 13 }, { x: headX + 10, y: headY - 15 },
      { x: headX + 16, y: headY - 13 },
    ], PATINA_DEEP, 1.65, 0.95);

    const smile = sampleCubicPath(
      { x: headX - 8, y: headY + 8 },
      [
        { controlA: { x: headX - 5, y: headY + 13 }, controlB: { x: headX + 5, y: headY + 13 }, end: { x: headX + 8, y: headY + 8 } },
        { controlA: { x: headX + 7, y: headY + 14 }, controlB: { x: headX + 4, y: headY + 18 }, end: { x: headX, y: headY + 18 } },
        { controlA: { x: headX - 4, y: headY + 18 }, controlB: { x: headX - 7, y: headY + 14 }, end: { x: headX - 8, y: headY + 8 } },
      ],
      4,
    );
    drawPolygon(g, smile, PUNK_HAIR, OUTLINE, 1.5);
    drawPolygon(g, [
      { x: headX - 5.1, y: headY + 9.0 },
      { x: headX - 0.65, y: headY + 9.8 },
      { x: headX - 0.85, y: headY + 13.0 },
      { x: headX - 4.2, y: headY + 12.5 },
    ], 0xfff0cf, OUTLINE, 0.7);
    drawPolygon(g, [
      { x: headX + 0.65, y: headY + 9.8 },
      { x: headX + 5.1, y: headY + 9.0 },
      { x: headX + 4.2, y: headY + 12.5 },
      { x: headX + 0.85, y: headY + 13.0 },
    ], 0xfff0cf, OUTLINE, 0.7);
  }
}
