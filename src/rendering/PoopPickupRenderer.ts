import type Phaser from 'phaser';
import type { PoopPickupDefinition } from '../level/LevelTypes';

const POOP_PICKUP_BASE_RADIUS = 19;
const POOP_PICKUP_VISUAL_SCALE = 0.36;
const POOP_PICKUP_LOCAL_BOTTOM = 19.5;

export interface PoopPickupCharacterLayout {
  x: number;
  y: number;
  scale: number;
  groundY: number;
}

/** Aligns the scaled character's visual bottom with the pickup's surface contact line. */
export function getPoopPickupCharacterLayout(
  definition: Pick<PoopPickupDefinition, 'x' | 'y' | 'radius'>,
): PoopPickupCharacterLayout {
  const scale = (definition.radius / POOP_PICKUP_BASE_RADIUS) * POOP_PICKUP_VISUAL_SCALE;
  const groundY = definition.y + definition.radius;
  return {
    x: definition.x,
    y: groundY - POOP_PICKUP_LOCAL_BOTTOM * scale,
    scale,
    groundY,
  };
}

interface RenderedPickup {
  definition: PoopPickupDefinition;
  container: Phaser.GameObjects.Container;
  pupils: [Phaser.GameObjects.Container, Phaser.GameObjects.Container];
}

interface CharacterParts {
  container: Phaser.GameObjects.Container;
  pupils: [Phaser.GameObjects.Container, Phaser.GameObjects.Container];
}

/** Draws a stationary, friendly poop character with independently animated eyes. */
export class PoopPickupRenderer {
  private readonly pickups = new Map<string, RenderedPickup>();
  private readonly collectingContainers = new Set<Phaser.GameObjects.Container>();
  private reducedMotion = false;

  constructor(private readonly scene: Phaser.Scene) {}

  render(definitions: PoopPickupDefinition[]): void {
    this.clear();
    for (const definition of definitions) {
      const character = this.createCharacter(definition);
      const pickup: RenderedPickup = { definition, ...character };
      this.pickups.set(definition.id, pickup);
      this.startEyeAnimation(pickup);
    }
  }

  collect(id: string): void {
    const pickup = this.pickups.get(id);
    if (!pickup) return;
    this.pickups.delete(id);
    this.stopEyeAnimation(pickup);

    if (this.reducedMotion) {
      pickup.container.destroy(true);
      return;
    }

    this.collectingContainers.add(pickup.container);
    this.scene.tweens.add({
      targets: pickup.container,
      y: pickup.container.y - 13,
      scale: pickup.container.scaleX * 0.12,
      angle: 28,
      alpha: 0,
      duration: 190,
      ease: 'Back.easeIn',
      onComplete: () => {
        this.collectingContainers.delete(pickup.container);
        pickup.container.destroy(true);
      },
    });
  }

  setReducedMotion(enabled: boolean): void {
    if (this.reducedMotion === enabled) return;
    this.reducedMotion = enabled;
    for (const pickup of this.pickups.values()) {
      this.stopEyeAnimation(pickup);
      const layout = getPoopPickupCharacterLayout(pickup.definition);
      pickup.container.setPosition(layout.x, layout.y);
      pickup.container.setAngle(0);
      pickup.container.setScale(layout.scale);
      pickup.container.setAlpha(1);
      pickup.pupils[0].setPosition(-7.1, -5.8);
      pickup.pupils[1].setPosition(6.7, -6.1);
      this.startEyeAnimation(pickup);
    }
  }

  clear(): void {
    for (const pickup of this.pickups.values()) {
      this.stopEyeAnimation(pickup);
      pickup.container.destroy(true);
    }
    for (const container of this.collectingContainers) {
      this.scene.tweens.killTweensOf(container);
      container.destroy(true);
    }
    this.pickups.clear();
    this.collectingContainers.clear();
  }

  destroy(): void { this.clear(); }

  private createCharacter(definition: PoopPickupDefinition): CharacterParts {
    const children: Phaser.GameObjects.GameObject[] = [];
    const outline = 0x4a2618;
    const addEllipse = (
      x: number, y: number, width: number, height: number, color: number, stroke = true,
    ): Phaser.GameObjects.Ellipse => {
      const shape = this.scene.add.ellipse(x, y, width, height, color, 1);
      if (stroke) shape.setStrokeStyle(1.7, outline, 0.95);
      children.push(shape);
      return shape;
    };

    // Layered rounded tiers form the character. The body remains completely still.
    addEllipse(0, 8, 44, 23, 0x6e3b24);
    addEllipse(-1, 0, 36, 22, 0x7c4528);
    addEllipse(1, -9, 26, 19, 0x8d4e2c);
    addEllipse(-1, -18, 16, 16, 0x9d5a32);
    addEllipse(-2, -23, 8, 10, 0xaa693c, false);

    // Soft highlights make the brown tiers read as glossy cartoon material.
    addEllipse(-12, 1, 7, 3.5, 0xc58a59, false).setAlpha(0.72);
    addEllipse(-7, -11, 5.5, 3, 0xd19a65, false).setAlpha(0.68);
    addEllipse(-3, -21, 3.5, 2.2, 0xe0b07b, false).setAlpha(0.75);

    // Oversized, slightly wonky eye whites give it a silly, wide-eyed expression.
    addEllipse(-7.1, -5.8, 11.4, 14.2, 0xfff8e8, false);
    addEllipse(6.7, -6.1, 12.2, 14.8, 0xfff8e8, false);

    // Pupils are separate child containers so only the gaze moves, never the body.
    const createPupil = (x: number, y: number): Phaser.GameObjects.Container => {
      const pupil = this.scene.add.ellipse(0, 0, 4.1, 6.1, 0x21140f, 1)
        .setStrokeStyle(0.45, 0x120b08, 0.9);
      const glint = this.scene.add.ellipse(-0.9, -1.7, 1.55, 1.9, 0xffffff, 0.98);
      return this.scene.add.container(x, y, [pupil, glint]);
    };
    const pupils: [Phaser.GameObjects.Container, Phaser.GameObjects.Container] = [
      createPupil(-7.1, -5.8),
      createPupil(6.7, -6.1),
    ];
    children.push(...pupils);

    // Tiny warm cheeks and a goofy smile complete the face.
    addEllipse(-9, 2.5, 4.8, 3.1, 0xd77c70, false).setAlpha(0.72);
    addEllipse(9, 2.5, 4.8, 3.1, 0xd77c70, false).setAlpha(0.72);

    const mouth = this.scene.add.graphics();
    mouth.lineStyle(1.8, 0x32180f, 1);
    mouth.beginPath();
    mouth.moveTo(-4.5, 4);
    mouth.lineTo(-2, 6.2);
    mouth.lineTo(1.6, 6.2);
    mouth.lineTo(4.5, 3.8);
    mouth.strokePath();
    children.push(mouth);

    const layout = getPoopPickupCharacterLayout(definition);
    const container = this.scene.add.container(layout.x, layout.y, children)
      .setScale(layout.scale)
      .setDepth(8);
    return { container, pupils };
  }


  private startEyeAnimation(pickup: RenderedPickup): void {
    if (this.reducedMotion) return;

    // The two pupils glance around with slightly different timing for a goofy, unfocused look.
    pickup.pupils.forEach((pupil, index) => {
      this.scene.tweens.add({
        targets: pupil,
        x: '+=1.15',
        y: index === 0 ? '-=0.45' : '+=0.35',
        duration: index === 0 ? 470 : 560,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        repeatDelay: index === 0 ? 760 : 980,
        delay: index * 140,
      });
    });
  }

  private stopEyeAnimation(pickup: RenderedPickup): void {
    for (const pupil of pickup.pupils) {
      this.scene.tweens.killTweensOf(pupil);
    }
  }
}
