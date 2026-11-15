import type Phaser from 'phaser';
import type { BallSkin } from '../player/BallSkin';
import { DEFAULT_BALL_SKIN } from '../player/BallSkin';
import { getSmileyAnimationFrame, type SmileyEyeAnimation } from './SmileyAnimation';
import { drawSmileyGradient, SMILEY_GRADIENT_TEXTURE_KEY, SMILEY_GRADIENT_TEXTURE_SIZE } from './SmileyGradient';
import { drawSmileyMouth, SMILEY_MOUTH_TEXTURE_HEIGHT, SMILEY_MOUTH_TEXTURE_KEY, SMILEY_MOUTH_TEXTURE_WIDTH } from './SmileyMouth';

type LocalPoint = { x: number; y: number };

interface SmileyEyeRig {
  container: Phaser.GameObjects.Container;
  pupil: Phaser.GameObjects.Arc;
  baseX: number;
  baseY: number;
  basePupilX: number;
  basePupilY: number;
}

interface SmileyRig {
  leftEye: SmileyEyeRig;
  rightEye: SmileyEyeRig;
  mouth: Phaser.GameObjects.Image;
}

export class BallRenderer {
  private readonly container: Phaser.GameObjects.Container;
  private readonly radius: number;
  private readonly scene: Phaser.Scene;
  private skin: BallSkin;
  private skinBuilt = false;
  private smileyRig: SmileyRig | null = null;
  private smileyElapsedSeconds = 0;
  private smileyImpact = 0;
  private smileyMouthScaleX = 1;
  private smileyMouthScaleY = 1;

  constructor(scene: Phaser.Scene, radius: number, skin: BallSkin = DEFAULT_BALL_SKIN) {
    this.scene = scene;
    this.radius = radius;
    this.container = scene.add.container(0, 0).setDepth(5);
    this.skin = skin;
    this.setSkin(skin);
  }

  setSkin(skin: BallSkin): void {
    if (this.skinBuilt && this.skin === skin) return;
    this.skin = skin;
    this.smileyRig = null;
    this.smileyElapsedSeconds = 0;
    this.smileyImpact = 0;
    this.smileyMouthScaleX = 1;
    this.smileyMouthScaleY = 1;
    if (this.skinBuilt) this.container.removeAll(true);
    const objects = this.createSkin(skin);
    this.container.add(objects);
    this.skinBuilt = true;
  }

  update(
    x: number,
    y: number,
    angle: number,
    scaleX = 1,
    scaleY = 1,
    dtSeconds = 0,
    speedPxPerSecond = 0,
  ): void {
    this.container.setPosition(x, y);
    this.container.setRotation(angle);
    this.container.setScale(scaleX, scaleY);
    if (this.skin === 'smiley' && this.smileyRig && dtSeconds > 0) {
      this.smileyElapsedSeconds += Math.min(dtSeconds, 0.1);
      this.smileyImpact = Math.max(0, this.smileyImpact - Math.min(dtSeconds, 0.1) * 5.5);
      this.animateSmiley(speedPxPerSecond, Math.min(dtSeconds, 0.1));
    }
  }

  /** Briefly widens the Smiley mouth after an impact without switching its shape. */
  reactToImpact(impactSpeed: number): void {
    if (this.skin !== 'smiley' || !Number.isFinite(impactSpeed)) return;
    const strength = Math.max(0.35, Math.min(1, Math.max(0, impactSpeed) / 520));
    this.smileyImpact = Math.max(this.smileyImpact, strength);
  }

  setVisible(value: boolean): void { this.container.setVisible(value); }
  get radiusPx(): number { return this.radius; }
  get currentSkin(): BallSkin { return this.skin; }
  destroy(): void { this.container.destroy(true); }

  private createSkin(skin: BallSkin): Phaser.GameObjects.GameObject[] {
    switch (skin) {
      case 'soccer': return this.createSoccerSkin();
      case 'basketball': return this.createBasketballSkin();
      case 'eye': return this.createEyeSkin();
      case 'alien': return this.createAlienSkin();
      case 'smiley':
      default: return this.createSmileySkin();
    }
  }

  private createSmileySkin(): Phaser.GameObjects.GameObject[] {
    const r = this.radius;
    const gradient = this.createSmileyGradient();
    const outlinePoints = this.regularPolygon(0, 0, r * 0.975, 64, -Math.PI / 2);
    const outline = this.polyline(
      [...outlinePoints, outlinePoints[0]],
      Math.max(1.4, r * 0.065),
      0x9b5a26,
      0.88,
    );
    const softHighlight = this.scene.add.ellipse(-r * 0.28, -r * 0.57, r * 0.72, r * 0.2, 0xfff4bf, 0.13);

    // Large, simple white eyes keep the face readable at the in-game 36 px size.
    const leftEye = this.createSmileyEye(-r * 0.29, -r * 0.16);
    const rightEye = this.createSmileyEye(r * 0.29, -r * 0.16);
    const mouth = this.createSmileyMouth();
    const rig: SmileyRig = { leftEye, rightEye, mouth };
    this.smileyRig = rig;

    return [gradient, outline, softHighlight, leftEye.container, rightEye.container, mouth];
  }

  private createSmileyGradient(): Phaser.GameObjects.Image {
    const textureManager = this.scene.textures;
    if (!textureManager.exists(SMILEY_GRADIENT_TEXTURE_KEY)) {
      const texture = textureManager.createCanvas(
        SMILEY_GRADIENT_TEXTURE_KEY,
        SMILEY_GRADIENT_TEXTURE_SIZE,
        SMILEY_GRADIENT_TEXTURE_SIZE,
      );
      if (!texture) {
        throw new Error(`Unable to create Smiley texture: ${SMILEY_GRADIENT_TEXTURE_KEY}`);
      }
      drawSmileyGradient(texture.getContext(), SMILEY_GRADIENT_TEXTURE_SIZE);
      texture.refresh();
    }

    // The cached high-resolution texture is shared across level restarts.
    return this.scene.add.image(0, 0, SMILEY_GRADIENT_TEXTURE_KEY)
      .setDisplaySize(this.radius * 2, this.radius * 2);
  }

  private createSmileyEye(x: number, y: number): SmileyEyeRig {
    const r = this.radius;
    const sclera = this.scene.add.circle(0, 0, r * 0.215, 0xfffdf7)
      .setStrokeStyle(Math.max(0.7, r * 0.022), 0x8f5b27, 0.52);
    const pupilX = r * 0.012;
    const pupilY = r * 0.018;
    const pupil = this.scene.add.circle(pupilX, pupilY, r * 0.098, 0x20202a);
    const highlight = this.scene.add.circle(-r * 0.045, -r * 0.065, r * 0.043, 0xffffff, 0.96);
    const container = this.scene.add.container(x, y, [sclera, pupil, highlight]);
    return { container, pupil, baseX: x, baseY: y, basePupilX: pupilX, basePupilY: pupilY };
  }

  private createSmileyMouth(): Phaser.GameObjects.Image {
    const textureManager = this.scene.textures;
    if (!textureManager.exists(SMILEY_MOUTH_TEXTURE_KEY)) {
      const texture = textureManager.createCanvas(
        SMILEY_MOUTH_TEXTURE_KEY,
        SMILEY_MOUTH_TEXTURE_WIDTH,
        SMILEY_MOUTH_TEXTURE_HEIGHT,
      );
      if (!texture) {
        throw new Error(`Unable to create Smiley mouth texture: ${SMILEY_MOUTH_TEXTURE_KEY}`);
      }
      drawSmileyMouth(texture.getContext(), SMILEY_MOUTH_TEXTURE_WIDTH, SMILEY_MOUTH_TEXTURE_HEIGHT);
      texture.refresh();
    }

    // One cached, antialiased CanvasTexture remains stable while the ball rotates.
    return this.scene.add.image(0, this.radius * 0.48, SMILEY_MOUTH_TEXTURE_KEY)
      .setDisplaySize(this.radius * 0.84, this.radius * 0.36);
  }

  private animateSmiley(speedPxPerSecond: number, dtSeconds: number): void {
    const rig = this.smileyRig;
    if (!rig) return;
    const frame = getSmileyAnimationFrame(this.smileyElapsedSeconds, speedPxPerSecond, this.smileyImpact);
    this.applyEyeAnimation(rig.leftEye, frame.leftEye);
    this.applyEyeAnimation(rig.rightEye, frame.rightEye);

    // Smooth the tiny expression changes; never clear or re-tessellate the smile per frame.
    const blend = 1 - Math.exp(-dtSeconds * 5.5);
    this.smileyMouthScaleX += (frame.mouthScaleX - this.smileyMouthScaleX) * blend;
    this.smileyMouthScaleY += (frame.mouthScaleY - this.smileyMouthScaleY) * blend;
    rig.mouth.setDisplaySize(
      this.radius * 0.84 * this.smileyMouthScaleX,
      this.radius * 0.36 * this.smileyMouthScaleY,
    );
  }

  private applyEyeAnimation(eye: SmileyEyeRig, animation: SmileyEyeAnimation): void {
    eye.container.setPosition(
      eye.baseX + animation.eyeOffsetX * this.radius,
      eye.baseY + animation.eyeOffsetY * this.radius,
    );
    eye.container.setScale(1, animation.verticalScale);
    eye.pupil.setPosition(
      eye.basePupilX + animation.pupilOffsetX * this.radius,
      eye.basePupilY + animation.pupilOffsetY * this.radius,
    );
  }

  private createSoccerSkin(): Phaser.GameObjects.GameObject[] {
    const r = this.radius;
    const dark = 0x18212f;
    const seam = 0x5d6875;
    const objects: Phaser.GameObjects.GameObject[] = [this.circle(0xf8f9f6, 0xcbd5df)];

    // Keep the traditional pentagon-and-panel silhouette, but simplify seams for the small in-game ball.
    objects.push(this.scene.add.ellipse(-r * 0.28, -r * 0.42, r * 0.48, r * 0.2, 0xffffff, 0.36));

    const angles = Array.from({ length: 5 }, (_, index) => -Math.PI / 2 + (Math.PI * 2 * index) / 5);
    for (const angle of angles) {
      objects.push(this.polyline([
        { x: Math.cos(angle) * r * 0.31, y: Math.sin(angle) * r * 0.31 },
        { x: Math.cos(angle) * r * 0.49, y: Math.sin(angle) * r * 0.49 },
      ], Math.max(0.95, r * 0.05), seam));
    }

    for (const angle of angles) {
      const cx = Math.cos(angle) * r * 0.69;
      const cy = Math.sin(angle) * r * 0.69;
      objects.push(this.filledPolygon(
        this.regularPolygon(cx, cy, r * 0.19, 5, angle + Math.PI),
        dark,
        dark,
      ));
    }

    objects.push(this.filledPolygon(this.regularPolygon(0, 0, r * 0.3, 5, -Math.PI / 2), dark, dark));
    return objects;
  }

  private createBasketballSkin(): Phaser.GameObjects.GameObject[] {
    const r = this.radius;
    const seamColor = 0x432719;
    const seamWidth = Math.max(1.85, r * 0.11);
    const objects: Phaser.GameObjects.GameObject[] = [this.circle(0xe9822d, 0x6a3b22)];

    // Classic basketball layout: two bowed side seams, a centre meridian and a bold equator.
    objects.push(
      this.polyline(this.sampleCurve((t) => ({
        x: -r * 0.43 * Math.sin(Math.PI * t),
        y: -r * 0.94 + t * r * 1.88,
      }), 24), seamWidth, seamColor),
      this.polyline(this.sampleCurve((t) => ({
        x: r * 0.43 * Math.sin(Math.PI * t),
        y: -r * 0.94 + t * r * 1.88,
      }), 24), seamWidth, seamColor),
      this.polyline([
        { x: 0, y: -r * 0.94 },
        { x: 0, y: r * 0.94 },
      ], seamWidth, seamColor),
      this.polyline(this.sampleCurve((t) => ({
        x: -r * 0.94 + t * r * 1.88,
        y: r * 0.025 * Math.sin(t * Math.PI * 2),
      }), 24), seamWidth, seamColor),
      this.scene.add.ellipse(-r * 0.3, -r * 0.4, r * 0.5, r * 0.22, 0xffcf91, 0.34),
    );
    return objects;
  }

  private createEyeSkin(): Phaser.GameObjects.GameObject[] {
    const r = this.radius;
    return [
      this.circle(0xf8f7ed, 0xd7e1e8),
      this.scene.add.circle(r * 0.1, 0, r * 0.5, 0x43b9c9).setStrokeStyle(2, 0x247d91, 1),
      this.scene.add.circle(r * 0.17, r * 0.015, r * 0.27, 0x142238),
      this.scene.add.circle(-r * 0.015, -r * 0.2, r * 0.13, 0xffffff, 0.98),
      this.scene.add.circle(r * 0.33, r * 0.2, r * 0.055, 0xffffff, 0.88),
      this.scene.add.ellipse(-r * 0.34, -r * 0.43, r * 0.42, r * 0.2, 0xffffff, 0.52),
    ];
  }

  private createAlienSkin(): Phaser.GameObjects.GameObject[] {
    const r = this.radius;
    return [
      this.circle(0x8ed45b, 0xc5f28b),
      this.polyline([{ x: -r * 0.28, y: -r * 0.78 }, { x: -r * 0.46, y: -r * 1.02 }], Math.max(2, r * 0.1), 0x4c9c53),
      this.polyline([{ x: r * 0.28, y: -r * 0.78 }, { x: r * 0.46, y: -r * 1.02 }], Math.max(2, r * 0.1), 0x4c9c53),
      this.scene.add.circle(-r * 0.46, -r * 1.02, r * 0.13, 0xf5b942),
      this.scene.add.circle(r * 0.46, -r * 1.02, r * 0.13, 0xf5b942),
      this.scene.add.ellipse(-r * 0.3, -r * 0.12, r * 0.31, r * 0.52, 0x18212f),
      this.scene.add.ellipse(r * 0.3, -r * 0.12, r * 0.31, r * 0.52, 0x18212f),
      this.scene.add.circle(-r * 0.34, -r * 0.28, r * 0.075, 0xffffff),
      this.scene.add.circle(r * 0.26, -r * 0.28, r * 0.075, 0xffffff),
      this.polyline([
        { x: -r * 0.2, y: r * 0.43 }, { x: -r * 0.1, y: r * 0.49 },
        { x: r * 0.1, y: r * 0.49 }, { x: r * 0.2, y: r * 0.43 },
      ], Math.max(1.5, r * 0.09), 0x27543b),
    ];
  }

  private circle(fill: number, stroke: number): Phaser.GameObjects.Arc {
    return this.scene.add.circle(0, 0, this.radius, fill).setStrokeStyle(2.5, stroke, 1);
  }

  private polyline(points: LocalPoint[], width: number, color: number, alpha = 1): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.lineStyle(width, color, alpha);
    graphics.beginPath();
    points.forEach((point, index) => {
      if (index === 0) graphics.moveTo(point.x, point.y);
      else graphics.lineTo(point.x, point.y);
    });
    graphics.strokePath();
    return graphics;
  }

  private filledPolygon(points: LocalPoint[], fill: number, stroke: number, alpha = 1): Phaser.GameObjects.Graphics {
    const graphics = this.scene.add.graphics();
    graphics.fillStyle(fill, alpha);
    graphics.lineStyle(1.2, stroke, 0.9);
    graphics.beginPath();
    points.forEach((point, index) => {
      if (index === 0) graphics.moveTo(point.x, point.y);
      else graphics.lineTo(point.x, point.y);
    });
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();
    return graphics;
  }

  private regularPolygon(cx: number, cy: number, radius: number, sides: number, rotation: number): LocalPoint[] {
    return Array.from({ length: sides }, (_, index) => {
      const angle = rotation + (Math.PI * 2 * index) / sides;
      return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
    });
  }

  private sampleCurve(curve: (t: number) => LocalPoint, segments: number): LocalPoint[] {
    return Array.from({ length: segments + 1 }, (_, index) => curve(index / segments));
  }


}
