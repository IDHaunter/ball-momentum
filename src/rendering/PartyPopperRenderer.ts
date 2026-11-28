import type Phaser from 'phaser';
import type { PartyPopperDefinition } from '../level/LevelTypes';

const BASE_RADIUS = 19;
const VISUAL_SCALE = 0.36;
const LOCAL_BOTTOM = 19;

export interface PartyPopperLayout { x: number; y: number; scale: number; groundY: number; }

export function getPartyPopperLayout(
  definition: Pick<PartyPopperDefinition, 'x' | 'y' | 'radius'>,
): PartyPopperLayout {
  const scale = (definition.radius / BASE_RADIUS) * VISUAL_SCALE;
  const groundY = definition.y + definition.radius;
  return { x: definition.x, y: groundY - LOCAL_BOTTOM * scale, scale, groundY };
}

interface RenderedPartyPopper {
  definition: PartyPopperDefinition;
  container: Phaser.GameObjects.Container;
}

/** Draws a small emoji-like striped party popper resting on the level surface. */
export class PartyPopperRenderer {
  private readonly poppers = new Map<string, RenderedPartyPopper>();
  private readonly collecting = new Set<Phaser.GameObjects.Container>();
  private reducedMotion = false;

  constructor(private readonly scene: Phaser.Scene) {}

  render(definitions: PartyPopperDefinition[]): void {
    this.clear();
    for (const definition of definitions) {
      const container = this.createPopper(definition);
      this.poppers.set(definition.id, { definition, container });
      this.startIdleAnimation(container);
    }
  }

  collect(id: string): void {
    const popper = this.poppers.get(id);
    if (!popper) return;
    this.poppers.delete(id);
    this.scene.tweens.killTweensOf(popper.container);

    if (this.reducedMotion) {
      popper.container.destroy(true);
      return;
    }

    this.collecting.add(popper.container);
    this.scene.tweens.add({
      targets: popper.container,
      y: popper.container.y - 7,
      scale: popper.container.scaleX * 1.35,
      angle: popper.container.angle + 24,
      alpha: 0,
      duration: 145,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.collecting.delete(popper.container);
        popper.container.destroy(true);
      },
    });
  }

  setReducedMotion(enabled: boolean): void {
    if (this.reducedMotion === enabled) return;
    this.reducedMotion = enabled;
    for (const popper of this.poppers.values()) {
      this.scene.tweens.killTweensOf(popper.container);
      const layout = getPartyPopperLayout(popper.definition);
      popper.container.setPosition(layout.x, layout.y).setAngle(0).setScale(layout.scale).setAlpha(1);
      this.startIdleAnimation(popper.container);
    }
  }

  clear(): void {
    for (const popper of this.poppers.values()) {
      this.scene.tweens.killTweensOf(popper.container);
      popper.container.destroy(true);
    }
    for (const container of this.collecting) {
      this.scene.tweens.killTweensOf(container);
      container.destroy(true);
    }
    this.poppers.clear();
    this.collecting.clear();
  }

  destroy(): void { this.clear(); }

  private createPopper(definition: PartyPopperDefinition): Phaser.GameObjects.Container {
    const graphics = this.scene.add.graphics();

    // Soft ground shadow.
    graphics.fillStyle(0x0b1119, 0.25);
    graphics.fillEllipse(0, 17.5, 38, 6);

    // Cone silhouette and colored body, pointing diagonally up and right.
    graphics.fillStyle(0x34243c, 1);
    graphics.lineStyle(1.8, 0x34243c, 1);
    graphics.beginPath();
    graphics.moveTo(-19, 3);
    graphics.lineTo(15, -19);
    graphics.lineTo(3, 19);
    graphics.closePath();
    graphics.fillPath();
    graphics.strokePath();

    graphics.fillStyle(0xf05a78, 1);
    graphics.beginPath();
    graphics.moveTo(-15.5, 3.5);
    graphics.lineTo(12.2, -14.5);
    graphics.lineTo(2.2, 15.2);
    graphics.closePath();
    graphics.fillPath();

    // Bright diagonal stripes give the cone the familiar party-popper emoji look.
    graphics.lineStyle(3.8, 0xffd45e, 1);
    graphics.beginPath().moveTo(-7.3, 4.2).lineTo(1.4, 8.5).strokePath();
    graphics.lineStyle(3.6, 0x67d7e8, 1);
    graphics.beginPath().moveTo(-1.7, -0.5).lineTo(7.7, 3.6).strokePath();
    graphics.lineStyle(3.3, 0xffd45e, 1);
    graphics.beginPath().moveTo(4.5, -5.7).lineTo(11.9, -2.7).strokePath();

    // Golden mouth rim and a little red nozzle at the narrow tip.
    graphics.lineStyle(3.2, 0xffe08a, 1);
    graphics.beginPath().moveTo(-19, 3).lineTo(3, 19).strokePath();
    graphics.fillStyle(0xffe08a, 1);
    graphics.fillCircle(14.2, -17.2, 2.5);
    graphics.fillStyle(0xff8c9e, 1);
    graphics.fillCircle(14.2, -17.2, 1.2);

    // A few tiny paper curls peek out of the open end while the popper waits.
    graphics.lineStyle(1.8, 0x77d9e8, 0.95);
    graphics.beginPath().moveTo(-17, 1).lineTo(-21, -3).lineTo(-18, -6).strokePath();
    graphics.lineStyle(1.8, 0xffd45e, 0.95);
    graphics.beginPath().moveTo(-15, 5).lineTo(-19, 9).lineTo(-15, 11).strokePath();

    const layout = getPartyPopperLayout(definition);
    return this.scene.add.container(layout.x, layout.y, [graphics])
      .setScale(layout.scale)
      .setDepth(8);
  }

  private startIdleAnimation(container: Phaser.GameObjects.Container): void {
    if (this.reducedMotion) return;
    this.scene.tweens.add({
      targets: container,
      y: container.y - 1.2,
      angle: 3.2,
      duration: 680,
      ease: 'Sine.easeInOut',
      yoyo: true,
      repeat: -1,
      repeatDelay: 280,
    });
  }
}
