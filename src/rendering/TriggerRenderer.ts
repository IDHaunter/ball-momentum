import type Phaser from 'phaser';
import type { TriggerDefinition } from '../level/LevelTypes';
import {
  CHECKPOINT_FLAME_ACTIVE_TEXTURE_KEY,
  CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY,
  CHECKPOINT_GLASS_TEXTURE_KEY,
  CHECKPOINT_GLOW_TEXTURE_KEY,
  ensureCheckpointLightTextures,
} from './CheckpointLightTextures';

interface CheckpointMarkerVisual {
  id: string;
  container: Phaser.GameObjects.Container;
  glow: Phaser.GameObjects.Image;
  flame: Phaser.GameObjects.Image;
  activationFlash: Phaser.GameObjects.Graphics;
  active: boolean;
}

const MARKER_DEPTH = 6;
const LANTERN_Y = -145;
const METAL_DARK = 0x344754;
const METAL_MID = 0x78909e;
const METAL_LIGHT = 0xc2d2d9;

/** Draws trigger zones and decorative, non-physical checkpoint lanterns. */
export class TriggerRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private triggers: TriggerDefinition[] = [];
  private readonly checkpointMarkers = new Map<string, CheckpointMarkerVisual>();
  private activeCheckpointId: string | null = null;
  private reducedMotion = false;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(2);
  }

  render(triggers: TriggerDefinition[]): void {
    this.destroyCheckpointMarkers();
    this.triggers = [...triggers];
    this.activeCheckpointId = null;
    this.draw();
  }

  setActiveCheckpoint(id: string): void {
    if (this.activeCheckpointId === id) return;
    this.activeCheckpointId = id;

    for (const marker of this.checkpointMarkers.values()) {
      const shouldBeActive = marker.id === id;
      if (marker.active === shouldBeActive) continue;
      marker.active = shouldBeActive;
      this.applyMarkerState(marker, shouldBeActive, !this.reducedMotion);
    }
  }

  setReducedMotion(enabled: boolean): void {
    if (this.reducedMotion === enabled) return;
    this.reducedMotion = enabled;
    for (const marker of this.checkpointMarkers.values()) {
      this.killMarkerTweens(marker);
      this.applyMarkerState(marker, marker.active, !enabled);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    for (const label of this.labels) label.destroy();
    this.labels = [];
    this.destroyCheckpointMarkers();
    this.triggers = [];
  }

  private draw(): void {
    this.graphics.clear();
    for (const label of this.labels) label.destroy();
    this.labels = [];

    for (const trigger of this.triggers) {
      if (trigger.type === 'checkpoint') {
        this.createCheckpointMarker(trigger);
        continue;
      }

      const color = trigger.type === 'hazard' ? 0xf05b5b : 0xf5c451;
      this.graphics.fillStyle(color, 0.16);
      this.graphics.lineStyle(3, color, 0.95);
      this.graphics.fillRect(trigger.x, trigger.y, trigger.width, trigger.height);
      this.graphics.strokeRect(trigger.x, trigger.y, trigger.width, trigger.height);
      const symbol = trigger.type === 'hazard' ? '!' : 'FINISH';
      const text = this.scene.add.text(trigger.x + trigger.width / 2, trigger.y - 25, symbol, {
        fontFamily: 'Arial, sans-serif',
        fontSize: trigger.type === 'goal' ? '18px' : '22px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(3);
      this.labels.push(text);
    }
  }

  private createCheckpointMarker(trigger: TriggerDefinition): void {
    ensureCheckpointLightTextures(this.scene);

    const x = trigger.x + trigger.width / 2;
    // The trigger ends at the supporting surface. The lantern is decorative only;
    // the existing trigger sensor remains the sole checkpoint interaction.
    const groundY = trigger.y + trigger.height;

    const shadow = this.scene.add.ellipse(0, -2, 39, 7, 0x101925, 0.24);
    // Keep the same broad, diffuse light texture; it only becomes visible when
    // the little flame wakes up inside its glass housing.
    const glow = this.scene.add.image(0, LANTERN_Y, CHECKPOINT_GLOW_TEXTURE_KEY)
      .setDisplaySize(226, 226)
      .setAlpha(0);

    // Narrow brushed-metal post and compact lantern fittings.
    const foot = this.scene.add.ellipse(0, -6, 34, 9, 0x526b7a, 1)
      .setStrokeStyle(1, METAL_DARK, 0.85);
    const footRim = this.scene.add.ellipse(0, -9, 25, 4, 0xa9bbc4, 1)
      .setStrokeStyle(0.8, METAL_DARK, 0.7);
    const baseBoltLeft = this.scene.add.ellipse(-10, -6, 3, 3, 0x293b47, 1);
    const baseBoltRight = this.scene.add.ellipse(10, -6, 3, 3, 0x293b47, 1);
    const shaftShadow = this.scene.add.rectangle(1.5, -64, 9, 112, 0x263946, 0.2);
    const shaft = this.scene.add.rectangle(-1, -65, 7, 112, METAL_MID, 1)
      .setStrokeStyle(0.65, METAL_DARK, 0.48);
    const shaftHighlight = this.scene.add.graphics();
    shaftHighlight.lineStyle(1.2, METAL_LIGHT, 0.82).lineBetween(-2.8, -117, -2.8, -14);
    shaftHighlight.lineStyle(0.7, 0x344754, 0.28).lineBetween(1.7, -116, 1.7, -14);

    // The flame is deliberately small. It sits behind the transparent shell,
    // so the light feels contained inside a little glass lantern.
    const flame = this.scene.add.image(0, LANTERN_Y + 1, CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY)
      .setDisplaySize(14, 21)
      .setAlpha(0.72);
    const glass = this.scene.add.image(0, LANTERN_Y, CHECKPOINT_GLASS_TEXTURE_KEY)
      .setDisplaySize(48, 58)
      .setAlpha(1);
    const collar = this.scene.add.ellipse(0, -119, 16, 6, 0x91a7b3, 1)
      .setStrokeStyle(0.8, METAL_DARK, 0.62);
    const topCap = this.scene.add.ellipse(0, -171, 17, 5, 0x718895, 1)
      .setStrokeStyle(0.8, METAL_DARK, 0.66);
    const topCapHighlight = this.scene.add.ellipse(-2, -172, 7, 1.5, 0xd5e2e7, 0.78);
    const activationFlash = this.scene.add.graphics().setAlpha(0);
    this.drawActivationFlash(activationFlash);

    const children: Phaser.GameObjects.GameObject[] = [
      shadow,
      glow,
      foot, footRim, baseBoltLeft, baseBoltRight,
      shaftShadow, shaft, shaftHighlight,
      flame, glass, collar, topCap, topCapHighlight, activationFlash,
    ];
    const container = this.scene.add.container(x, groundY, children).setDepth(MARKER_DEPTH);
    const marker: CheckpointMarkerVisual = {
      id: trigger.id,
      container,
      glow,
      flame,
      activationFlash,
      active: false,
    };
    this.checkpointMarkers.set(trigger.id, marker);
    this.applyMarkerState(marker, false, !this.reducedMotion);
  }

  private applyMarkerState(marker: CheckpointMarkerVisual, active: boolean, animate: boolean): void {
    this.killMarkerTweens(marker);
    marker.active = active;

    if (active) {
      marker.flame
        .setTexture(CHECKPOINT_FLAME_ACTIVE_TEXTURE_KEY)
        .setScale(1)
        // The steady flame stays compact. The larger size is used only for
        // the short ignition pulse, never as its permanent active size.
        .setDisplaySize(14, 21)
        .setAngle(0)
        .setAlpha(1);
      marker.glow.setScale(1).setAlpha(animate ? 0.22 : 0.28);
      marker.activationFlash.setPosition(0, LANTERN_Y).setScale(0.45).setAlpha(animate ? 0.95 : 0);
      if (animate) {
        this.startLightingFlicker(marker);
        this.scene.tweens.add({
          targets: marker.activationFlash,
          scale: 1.55,
          alpha: 0,
          duration: 520,
          ease: 'Cubic.Out',
        });
      }
      return;
    }

    marker.flame
      .setTexture(CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY)
      .setScale(1)
      .setDisplaySize(14, 21)
      .setAngle(0)
      .setAlpha(0.72);
    marker.glow.setScale(1).setAlpha(0);
    marker.activationFlash.setAlpha(0);
  }

  private startLightingFlicker(marker: CheckpointMarkerVisual): void {
    if (this.reducedMotion || !marker.active) return;

    // Keep the familiar soft ambient light. Its very slow breathing is
    // independent from the flame animation, so the lamp never looks like it
    // is switching between a stack of expanding circles.
    this.scene.tweens.add({
      targets: marker.glow,
      alpha: 0.31,
      scaleX: 1.045,
      scaleY: 1.035,
      duration: 2850,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });

    // A single, restrained ignition: grow to 1.5x the compact flame size,
    // then return to exactly the same dimensions. Do not tween scale to an
    // absolute value such as 1.05 here: Phaser Image scales are relative to
    // the source texture, so that would make this tiny sprite several times
    // larger than its glass housing.
    const baseScaleX = marker.flame.scaleX;
    const baseScaleY = marker.flame.scaleY;
    this.scene.tweens.add({
      targets: marker.flame,
      scaleX: baseScaleX * 1.5,
      scaleY: baseScaleY * 1.5,
      duration: 190,
      hold: 35,
      ease: 'Sine.Out',
      yoyo: true,
      onComplete: () => {
        if (this.reducedMotion || !marker.active) return;
        this.startSteadyFlameAnimation(marker, baseScaleX, baseScaleY);
      },
    });
  }

  private startSteadyFlameAnimation(
    marker: CheckpointMarkerVisual,
    baseScaleX: number,
    baseScaleY: number,
  ): void {
    if (this.reducedMotion || !marker.active) return;

    // After ignition, the fire only flickers by a few percent and leans by
    // less than a degree. Its silhouette therefore remains comfortably
    // inside the glass lantern at all times.
    this.scene.tweens.add({
      targets: marker.flame,
      scaleX: baseScaleX * 1.025,
      scaleY: baseScaleY * 1.035,
      angle: 0.7,
      alpha: 0.97,
      duration: 1250,
      ease: 'Sine.InOut',
      yoyo: true,
      repeat: -1,
    });
  }

  private drawActivationFlash(graphics: Phaser.GameObjects.Graphics): void {
    graphics.clear();
    graphics.lineStyle(2.4, 0xfff2b0, 0.9);
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      const inner = 25;
      const outer = index % 2 === 0 ? 39 : 33;
      graphics.lineBetween(
        Math.cos(angle) * inner, Math.sin(angle) * inner,
        Math.cos(angle) * outer, Math.sin(angle) * outer,
      );
    }
    graphics.fillStyle(0xffffff, 0.9).fillCircle(0, 0, 2.8);
  }

  private killMarkerTweens(marker: CheckpointMarkerVisual): void {
    this.scene.tweens.killTweensOf(marker.glow);
    this.scene.tweens.killTweensOf(marker.flame);
    this.scene.tweens.killTweensOf(marker.activationFlash);
  }

  private destroyCheckpointMarkers(): void {
    for (const marker of this.checkpointMarkers.values()) {
      this.killMarkerTweens(marker);
      marker.container.destroy(true);
    }
    this.checkpointMarkers.clear();
  }
}
