import type Phaser from 'phaser';

interface StatueVisual {
  id: string;
  x: number;
  y: number;
  graphics: Phaser.GameObjects.Graphics;
  bookText: Phaser.GameObjects.Text;
  activated: boolean;
  animationMs: number;
}

const ANIMATION_DURATION_MS = 720;
const OUTLINE = 0x304b57;
const STATUE_TEAL = 0x63aaa4;
const STATUE_LIGHT = 0x9bd3c8;
const STATUE_MID = 0x579b94;
const STATUE_SHADE = 0x397b78;
const GOLD = 0xf2c85d;
const GOLD_LIGHT = 0xffe39a;
const GOLD_SHADE = 0xc8993e;
const BRICK = 0xb9674e;
const BRICK_DARK = 0x814537;

function interpolate(from: number, to: number, amount: number): number {
  return from + (to - from) * amount;
}

function drawLine(
  graphics: Phaser.GameObjects.Graphics,
  points: Array<{ x: number; y: number }>,
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
  points: Array<{ x: number; y: number }>,
  fill: number,
  stroke = OUTLINE,
  strokeWidth = 2.5,
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

function pointOnCircle(cx: number, cy: number, radius: number, angle: number): { x: number; y: number } {
  return {
    x: cx + Math.cos(angle) * radius,
    y: cy + Math.sin(angle) * radius,
  };
}

/** Draws a Liberty-inspired copper statue with a one-shot dislike-to-like transition. */
export class LibertyStatueRenderer {
  private readonly statues = new Map<string, StatueVisual>();
  private reducedMotion = false;

  constructor(private readonly scene: Phaser.Scene) {}

  create(id: string, x: number, baseY: number): void {
    this.remove(id);
    const graphics = this.scene.add.graphics().setDepth(6.2);
    const bookText = this.scene.add.text(x + 48, baseY - 87, 'BAD\nVIBES', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '7px',
      fontStyle: 'bold',
      color: '#304b57',
      align: 'center',
      lineSpacing: -1,
    }).setOrigin(0.5).setDepth(6.8).setAngle(17);
    const visual: StatueVisual = {
      id,
      x,
      y: baseY,
      graphics,
      bookText,
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
    statue.bookText.setText('GOOD\nVIBES');
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
    statue.bookText.destroy();
    this.statues.delete(id);
  }

  clear(): void {
    for (const statue of this.statues.values()) {
      statue.graphics.destroy();
      statue.bookText.destroy();
    }
    this.statues.clear();
  }

  destroy(): void {
    this.clear();
  }

  private draw(statue: StatueVisual, progress: number): void {
    const g = statue.graphics;
    const x = statue.x;
    const y = statue.y;
    g.clear();

    this.drawPedestal(g, x, y);
    this.drawRobe(g, x, y);
    this.drawArms(g, x, y, progress);
    this.drawHeadAndCrown(g, x, y, progress);
    this.drawBook(g, x, y);
  }

  private drawPedestal(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // Three masonry courses, with staggered joints and a stone cap, replace the toy-like narrow stand.
    g.fillStyle(0x75463f, 0.18).fillEllipse(x, y - 2, 112, 12);
    g.fillStyle(BRICK_DARK, 1).fillRect(x - 53, y - 18, 106, 18);
    g.lineStyle(2.5, OUTLINE, 1).strokeRect(x - 53, y - 18, 106, 18);
    g.fillStyle(BRICK, 1).fillRect(x - 50, y - 16, 100, 14);
    g.lineStyle(1.4, BRICK_DARK, 1);
    g.beginPath();
    g.moveTo(x - 50, y - 9).lineTo(x + 50, y - 9);
    g.moveTo(x - 34, y - 16).lineTo(x - 34, y - 9);
    g.moveTo(x - 2, y - 16).lineTo(x - 2, y - 9);
    g.moveTo(x + 31, y - 16).lineTo(x + 31, y - 9);
    g.moveTo(x - 18, y - 9).lineTo(x - 18, y - 2);
    g.moveTo(x + 15, y - 9).lineTo(x + 15, y - 2);
    g.strokePath();

    g.fillStyle(0x985442, 1).fillRect(x - 58, y - 25, 116, 7);
    g.lineStyle(2.2, OUTLINE, 1).strokeRect(x - 58, y - 25, 116, 7);
    g.fillStyle(0xd07b5c, 1).fillRect(x - 54, y - 24, 108, 4);
    g.fillStyle(0x96513f, 1).fillRect(x - 48, y - 30, 96, 5);
    g.lineStyle(2, OUTLINE, 1).strokeRect(x - 48, y - 30, 96, 5);
    g.fillStyle(0xe0a06f, 1).fillRect(x - 45, y - 29, 90, 2);
  }

  private drawRobe(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // A continuous flared gown hides mechanical-looking knees and segmented legs.
    drawPolygon(g, [
      { x: x - 15, y: y - 128 },
      { x: x + 14, y: y - 128 },
      { x: x + 24, y: y - 115 },
      { x: x + 23, y: y - 92 },
      { x: x + 19, y: y - 78 },
      { x: x + 35, y: y - 31 },
      { x: x - 35, y: y - 31 },
      { x: x - 20, y: y - 78 },
      { x: x - 24, y: y - 94 },
      { x: x - 24, y: y - 115 },
    ], STATUE_TEAL, OUTLINE, 3);

    // Soft highlights and deep pleats give the robe volume without losing the game's outlined style.
    drawLine(g, [
      { x: x - 18, y: y - 113 }, { x: x - 15, y: y - 91 }, { x: x - 26, y: y - 39 },
    ], STATUE_LIGHT, 4, 0.82);
    drawLine(g, [
      { x: x - 7, y: y - 89 }, { x: x - 10, y: y - 70 }, { x: x - 17, y: y - 35 },
    ], STATUE_SHADE, 2.6, 0.9);
    drawLine(g, [
      { x: x + 5, y: y - 91 }, { x: x + 10, y: y - 69 }, { x: x + 19, y: y - 35 },
    ], STATUE_LIGHT, 3.2, 0.78);
    drawLine(g, [
      { x: x + 17, y: y - 111 }, { x: x + 15, y: y - 91 }, { x: x + 29, y: y - 39 },
    ], STATUE_SHADE, 3, 0.9);
    drawLine(g, [
      { x: x - 20, y: y - 106 }, { x: x - 8, y: y - 96 },
      { x: x - 3, y: y - 83 }, { x: x - 8, y: y - 65 },
    ], 0x4c8984, 2.2, 0.82);
    drawLine(g, [
      { x: x + 19, y: y - 105 }, { x: x + 9, y: y - 93 },
      { x: x + 8, y: y - 79 }, { x: x + 15, y: y - 58 },
    ], STATUE_LIGHT, 2.0, 0.74);
    drawLine(g, [
      { x: x - 22, y: y - 58 }, { x: x - 15, y: y - 48 },
      { x: x - 17, y: y - 36 },
    ], STATUE_SHADE, 1.8, 0.8);
    drawLine(g, [
      { x: x + 22, y: y - 57 }, { x: x + 16, y: y - 47 },
      { x: x + 18, y: y - 35 },
    ], STATUE_LIGHT, 1.8, 0.7);
    drawLine(g, [
      { x: x - 29, y: y - 34 }, { x, y: y - 32 }, { x: x + 29, y: y - 34 },
    ], 0x315e5d, 2.2, 0.9);

    // Neckline and a softly sculpted collar.
    drawLine(g, [
      { x: x - 12, y: y - 123 }, { x: x - 6, y: y - 118 },
      { x, y: y - 116 }, { x: x + 7, y: y - 118 }, { x: x + 13, y: y - 123 },
    ], STATUE_SHADE, 3);
    drawLine(g, [
      { x: x - 10, y: y - 122 }, { x: x, y: y - 118 }, { x: x + 10, y: y - 122 },
    ], STATUE_LIGHT, 1.7);

    // Diagonal gold sash and its small round clasp.
    drawLine(g, [
      { x: x + 20, y: y - 115 }, { x: x + 3, y: y - 99 },
      { x: x - 15, y: y - 86 }, { x: x - 21, y: y - 78 },
    ], OUTLINE, 15);
    drawLine(g, [
      { x: x + 20, y: y - 115 }, { x: x + 3, y: y - 99 },
      { x: x - 15, y: y - 86 }, { x: x - 21, y: y - 78 },
    ], GOLD, 10.5);
    drawLine(g, [
      { x: x + 17, y: y - 115 }, { x: x + 2, y: y - 100 },
      { x: x - 14, y: y - 88 },
    ], GOLD_LIGHT, 1.8);
    drawPolygon(g, [
      { x: x - 8, y: y - 96 },
      { x: x - 3, y: y - 101 },
      { x: x + 2, y: y - 96 },
      { x: x - 3, y: y - 91 },
    ], GOLD_SHADE, OUTLINE, 1.5);
    g.fillStyle(GOLD_LIGHT, 1).fillCircle(x - 3, y - 96, 1.8);
  }

  private drawArms(g: Phaser.GameObjects.Graphics, x: number, y: number, progress: number): void {
    // The raised arm is sculpted as a continuous limb. Subtle elbow folds replace
    // the old gold "joint" ring, which made the arm look mechanical.
    const shoulder = { x: x - 22, y: y - 113 };
    const elbow = {
      x: interpolate(x - 48, x - 42, progress),
      y: interpolate(y - 126, y - 137, progress),
    };
    const wrist = {
      x: interpolate(x - 58, x - 56, progress),
      y: interpolate(y - 132, y - 157, progress),
    };
    drawLine(g, [shoulder, elbow, wrist], OUTLINE, 21);
    drawLine(g, [shoulder, elbow, wrist], STATUE_TEAL, 15);
    drawLine(g, [
      { x: shoulder.x - 3, y: shoulder.y - 6 },
      { x: elbow.x - 3, y: elbow.y - 5 },
      { x: wrist.x - 3, y: wrist.y - 5 },
    ], STATUE_LIGHT, 2.3, 0.78);
    drawLine(g, [
      { x: elbow.x - 6, y: elbow.y - 2 },
      { x: elbow.x - 1, y: elbow.y + 2 },
      { x: elbow.x + 4, y: elbow.y + 3 },
    ], STATUE_SHADE, 1.8, 0.78);
    drawLine(g, [
      { x: elbow.x - 7, y: elbow.y + 5 },
      { x: elbow.x - 2, y: elbow.y + 7 },
    ], STATUE_LIGHT, 1.2, 0.6);
    this.drawHand(g, wrist.x, wrist.y, progress);

    // The other arm bends around the tablet; a softly highlighted sleeve and
    // elbow crease give it the same sculpted, non-mechanical treatment.
    const bookShoulder = { x: x + 21, y: y - 113 };
    const bookElbow = { x: x + 31, y: y - 96 };
    const bookWrist = { x: x + 34, y: y - 88 };
    drawLine(g, [bookShoulder, bookElbow, bookWrist], OUTLINE, 18);
    drawLine(g, [bookShoulder, bookElbow, bookWrist], STATUE_MID, 12.5);
    drawLine(g, [
      { x: bookShoulder.x + 2, y: bookShoulder.y - 5 },
      { x: bookElbow.x + 1, y: bookElbow.y - 3 },
      { x: bookWrist.x + 1, y: bookWrist.y - 3 },
    ], STATUE_LIGHT, 1.8, 0.75);
    drawLine(g, [
      { x: bookElbow.x - 2, y: bookElbow.y + 2 },
      { x: bookElbow.x + 3, y: bookElbow.y + 5 },
    ], STATUE_SHADE, 1.6, 0.7);
  }

  private drawHand(
    g: Phaser.GameObjects.Graphics,
    wristX: number,
    wristY: number,
    progress: number,
  ): void {
    // The hand is based on a conventional closed-fist/thumb silhouette: four
    // curled knuckles form the palm, while one broad, angled thumb is clearly
    // separated from the fist. The mirrored vertical pose makes dislike read as
    // a real thumbs-down rather than a raised middle finger.
    const thumbDirection = 2 * progress - 1; // down at 0, up at 1
    const transitionArc = Math.sin(progress * Math.PI) * 5.5;
    const thumbUp = [
      { x: 0, y: -7 },
      { x: 3, y: -10 },
      { x: 4, y: -16 },
      { x: 5, y: -22 },
      { x: 8, y: -26 },
      { x: 12, y: -26 },
      { x: 15, y: -23 },
      { x: 15, y: -19 },
      { x: 13, y: -11 },
      { x: 11, y: -5 },
      { x: 8, y: 1 },
    ];
    const thumb = thumbUp.map((point) => ({
      x: wristX + point.x + (point.y < -12 ? transitionArc : transitionArc * 0.45),
      y: wristY - 2 + point.y * thumbDirection,
    }));
    drawPolygon(g, thumb, STATUE_LIGHT, OUTLINE, 2.8);

    const palm = [
      { x: wristX - 18, y: wristY - 4 },
      { x: wristX - 18, y: wristY - 9 },
      { x: wristX - 15, y: wristY - 12 },
      { x: wristX - 12, y: wristY - 11 },
      { x: wristX - 10, y: wristY - 8 },
      { x: wristX - 9, y: wristY - 11 },
      { x: wristX - 5, y: wristY - 12 },
      { x: wristX - 2, y: wristY - 9 },
      { x: wristX, y: wristY - 11 },
      { x: wristX + 4, y: wristY - 10 },
      { x: wristX + 7, y: wristY - 7 },
      { x: wristX + 10, y: wristY - 6 },
      { x: wristX + 12, y: wristY - 2 },
      { x: wristX + 11, y: wristY + 7 },
      { x: wristX + 7, y: wristY + 11 },
      { x: wristX - 3, y: wristY + 13 },
      { x: wristX - 13, y: wristY + 11 },
      { x: wristX - 18, y: wristY + 6 },
    ];
    drawPolygon(g, palm, STATUE_TEAL, OUTLINE, 3);

    // Four shallow knuckle ridges and two palm creases make the fist read as
    // folded fingers, rather than a plain rounded block.
    for (const offset of [-12, -6, 0, 5]) {
      drawLine(g, [
        { x: wristX + offset - 1.5, y: wristY - 8.3 },
        { x: wristX + offset, y: wristY - 5.3 },
        { x: wristX + offset + 1.5, y: wristY - 4.7 },
      ], STATUE_LIGHT, 1.35, 0.85);
    }
    drawLine(g, [
      { x: wristX - 11, y: wristY + 2 },
      { x: wristX - 5, y: wristY + 5 },
      { x: wristX + 2, y: wristY + 5 },
    ], STATUE_SHADE, 1.6, 0.78);
    drawLine(g, [
      { x: wristX + 4, y: wristY - 4 },
      { x: wristX + 8, y: wristY - 2 },
    ], STATUE_LIGHT, 1.4, 0.9);

    // A soft highlight follows the thumb's length; the small crease at its base
    // reinforces the thumb joint and keeps it distinct from an upright finger.
    const thumbHighlight = [
      { x: wristX + 4 + transitionArc * 0.45, y: wristY - 8 * thumbDirection },
      { x: wristX + 7 + transitionArc, y: wristY - 15 * thumbDirection },
      { x: wristX + 10 + transitionArc, y: wristY - 22 * thumbDirection },
    ];
    drawLine(g, thumbHighlight, 0xc3e7d8, 1.5, 0.82);
    drawLine(g, [
      { x: wristX + 5, y: wristY - 5 },
      { x: wristX + 8, y: wristY - 2 },
      { x: wristX + 10, y: wristY + 1 },
    ], STATUE_SHADE, 1.35, 0.85);
  }

  private drawHeadAndCrown(g: Phaser.GameObjects.Graphics, x: number, y: number, progress: number): void {
    const headX = x;
    const headY = y - 153;

    // Seven filled triangular rays fan from a curved crown band, with bright inner facets.
    const rayAngles = [-Math.PI + 0.10, -2.52, -2.05, -Math.PI / 2, -1.09, -0.62, -0.10];
    const rayLengths = [36, 42, 46, 52, 46, 42, 36];
    rayAngles.forEach((angle, index) => {
      const halfWidth = index === 3 ? 0.105 : 0.085;
      const left = pointOnCircle(headX, headY, 20, angle - halfWidth);
      const tip = pointOnCircle(headX, headY, rayLengths[index], angle);
      const right = pointOnCircle(headX, headY, 20, angle + halfWidth);
      drawPolygon(g, [left, tip, right], GOLD, OUTLINE, 2.1);
      const facetBase = pointOnCircle(headX, headY, 23, angle);
      const facetTip = pointOnCircle(headX, headY, rayLengths[index] - 6, angle);
      drawLine(g, [facetBase, facetTip], GOLD_LIGHT, 1.35, 0.95);
      const shadedBase = pointOnCircle(headX, headY, 22, angle + halfWidth * 0.6);
      drawLine(g, [shadedBase, tip], GOLD_SHADE, 1.0, 0.72);
    });

    // Face, ears, and neck are sculpted as one silhouette; no circular robot helmet.
    g.fillStyle(STATUE_SHADE, 1).fillRoundedRect(x - 7.5, y - 136, 15, 17, 6);
    // A tapered jaw and long oval silhouette feel closer to a carved classical
    // face than the previous round, helmet-like shape.
    drawPolygon(g, [
      { x: headX - 13, y: headY - 17 },
      { x: headX - 9, y: headY - 21 },
      { x: headX, y: headY - 23 },
      { x: headX + 9, y: headY - 21 },
      { x: headX + 13, y: headY - 17 },
      { x: headX + 16, y: headY - 7 },
      { x: headX + 15, y: headY + 4 },
      { x: headX + 11, y: headY + 15 },
      { x: headX + 5, y: headY + 22 },
      { x: headX, y: headY + 24 },
      { x: headX - 5, y: headY + 22 },
      { x: headX - 11, y: headY + 15 },
      { x: headX - 15, y: headY + 4 },
      { x: headX - 16, y: headY - 7 },
    ], STATUE_TEAL, OUTLINE, 3);
    drawLine(g, [
      { x: headX - 12, y: headY - 8 },
      { x: headX - 11, y: headY + 4 },
      { x: headX - 7, y: headY + 15 },
    ], STATUE_LIGHT, 1.5, 0.62);
    drawLine(g, [
      { x: headX + 12, y: headY - 8 },
      { x: headX + 10, y: headY + 5 },
      { x: headX + 6, y: headY + 15 },
    ], STATUE_SHADE, 1.5, 0.58);
    for (const side of [-1, 1]) {
      g.fillStyle(STATUE_MID, 1).fillEllipse(headX + side * 18, headY + 1, 7, 11);
      g.lineStyle(1.6, OUTLINE, 1).strokeEllipse(headX + side * 18, headY + 1, 7, 11);
      g.fillStyle(STATUE_LIGHT, 0.42).fillEllipse(headX + side * 6, headY - 9, 7, 15);
    }

    // A curved circlet sits at the forehead and ties the seven rays together.
    drawLine(g, [
      { x: headX - 18, y: headY - 8 },
      { x: headX - 14, y: headY - 17 },
      { x: headX - 7, y: headY - 21 },
      { x: headX, y: headY - 22 },
      { x: headX + 7, y: headY - 21 },
      { x: headX + 14, y: headY - 17 },
      { x: headX + 18, y: headY - 8 },
    ], GOLD_SHADE, 6);
    drawLine(g, [
      { x: headX - 17, y: headY - 9 },
      { x: headX - 13, y: headY - 17 },
      { x: headX, y: headY - 21 },
      { x: headX + 13, y: headY - 17 },
      { x: headX + 17, y: headY - 9 },
    ], GOLD_LIGHT, 1.8);
    for (const gemX of [-13, -7, 0, 7, 13]) {
      g.fillStyle(GOLD_LIGHT, 1).fillCircle(headX + gemX, headY - 16 + Math.abs(gemX) * 0.16, 2);
      g.lineStyle(0.8, OUTLINE, 0.8).strokeCircle(headX + gemX, headY - 16 + Math.abs(gemX) * 0.16, 2);
    }

    // Eyes and brows change from worried to warm and open.
    const eyeY = headY - 1;
    for (const side of [-1, 1]) {
      const eyeX = headX + side * 8;
      const eyeHeight = interpolate(2.8, 3.8, progress);
      g.fillStyle(0x315e5d, 0.92).fillEllipse(eyeX, eyeY, 5.8, eyeHeight);
      g.lineStyle(1.1, OUTLINE, 0.9).strokeEllipse(eyeX, eyeY, 5.8, eyeHeight);
      drawLine(g, [
        { x: eyeX - 4.5, y: eyeY - 0.3 },
        { x: eyeX, y: eyeY - interpolate(1.8, 2.3, progress) },
        { x: eyeX + 4.5, y: eyeY - 0.2 },
      ], STATUE_SHADE, 1.35, 0.95);
      const browInnerY = interpolate(headY - 11, headY - 9, progress);
      const browOuterY = interpolate(headY - 8, headY - 10, progress);
      drawLine(g, [
        { x: eyeX - 5, y: browOuterY }, { x: eyeX, y: browInnerY },
        { x: eyeX + 4, y: browOuterY + 1 },
      ], STATUE_SHADE, 1.45, 0.9);
    }

    // Small nose and a genuine frown-to-smile mouth transition.
    drawLine(g, [
      { x: headX, y: headY + 2 }, { x: headX - 1, y: headY + 7 },
      { x: headX + 2, y: headY + 8 },
    ], STATUE_SHADE, 1.6);
    const mouth = [
      { x: headX - 8, y: headY + interpolate(14, 11, progress) },
      { x: headX - 4, y: headY + interpolate(9, 16, progress) },
      { x: headX, y: headY + interpolate(8, 17, progress) },
      { x: headX + 4, y: headY + interpolate(9, 16, progress) },
      { x: headX + 8, y: headY + interpolate(14, 11, progress) },
    ];
    drawLine(g, mouth, OUTLINE, 2.3);
    if (progress > 0.55) {
      drawLine(g, [
        { x: headX - 3, y: headY + 18 },
        { x: headX, y: headY + 19 },
        { x: headX + 3, y: headY + 18 },
      ], STATUE_LIGHT, 1.1, 0.72);
    }
  }

  private drawBook(g: Phaser.GameObjects.Graphics, x: number, y: number): void {
    // A small engraved tablet/book with a raised spine, gold corner studs and a page edge.
    drawPolygon(g, [
      { x: x + 30, y: y - 112 },
      { x: x + 67, y: y - 101 },
      { x: x + 61, y: y - 65 },
      { x: x + 24, y: y - 76 },
    ], 0x76b7ac, OUTLINE, 2.7);
    drawLine(g, [
      { x: x + 35, y: y - 106 }, { x: x + 29, y: y - 80 },
    ], 0xc5e8dc, 2);
    drawLine(g, [
      { x: x + 36, y: y - 108 }, { x: x + 63, y: y - 100 },
    ], GOLD_LIGHT, 1.6);
    drawLine(g, [
      { x: x + 28, y: y - 78 }, { x: x + 59, y: y - 69 },
    ], STATUE_SHADE, 1.5);
    g.fillStyle(GOLD, 1).fillCircle(x + 31, y - 108, 2.1);
    g.fillStyle(GOLD, 1).fillCircle(x + 62, y - 98, 2.1);
    // A small sculpted hand wraps around the lower edge of the tablet. Its
    // fingers overlap the cover, replacing the old circular, robot-like wrist cap.
    drawPolygon(g, [
      { x: x + 22, y: y - 89 },
      { x: x + 25, y: y - 94 },
      { x: x + 30, y: y - 95 },
      { x: x + 34, y: y - 91 },
      { x: x + 36, y: y - 84 },
      { x: x + 34, y: y - 78 },
      { x: x + 29, y: y - 76 },
      { x: x + 24, y: y - 79 },
    ], STATUE_TEAL, OUTLINE, 2.1);
    drawLine(g, [
      { x: x + 25, y: y - 84 },
      { x: x + 30, y: y - 82 },
      { x: x + 35, y: y - 83 },
    ], STATUE_LIGHT, 1.25, 0.88);
    drawLine(g, [
      { x: x + 27, y: y - 89 }, { x: x + 31, y: y - 86 },
    ], STATUE_SHADE, 1.15, 0.82);
  }
}
