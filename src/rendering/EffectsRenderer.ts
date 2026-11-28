import type Phaser from 'phaser';
import type { SolidDefinition } from '../level/LevelTypes';

/** Returns a usable optional pickup caption, suppressing missing and whitespace-only values. */
export function resolvePickupCaption(message?: string): string | null {
  const normalized = message?.trim();
  return normalized ? normalized : null;
}

export class EffectsRenderer {
  private lastWallImpactAt = -Infinity;
  private readonly activeEffects = new Set<Phaser.GameObjects.GameObject>();

  constructor(private readonly scene: Phaser.Scene, private reducedMotion = false) {}

  setReducedMotion(enabled: boolean): void { this.reducedMotion = enabled; }

  clear(): void {
    for (const effect of [...this.activeEffects]) {
      this.activeEffects.delete(effect);
      this.scene.tweens.killTweensOf(effect);
      effect.destroy();
    }
  }

  wallImpact(x: number, y: number, normal: { x: number; y: number }, intensity: number): void {
    if (this.reducedMotion) return;
    const now = this.scene.time.now;
    if (now - this.lastWallImpactAt < 120) return;
    this.lastWallImpactAt = now;

    const strength = Math.max(0, Math.min(1, (intensity - 80) / 720));
    const count = 4 + Math.round(strength * 6);
    const tangent = { x: -normal.y, y: normal.x };
    for (let i = 0; i < count; i += 1) {
      const tangentOffset = (Math.random() - 0.5) * (10 + strength * 14);
      const startX = x + normal.x * 2 + tangent.x * tangentOffset;
      const startY = y + normal.y * 2 + tangent.y * tangentOffset;
      const particle = this.trackEffect(this.scene.add.circle(
        startX,
        startY,
        1.5 + Math.random() * 2.2,
        Math.random() > 0.5 ? 0xb7c2cc : 0xd0c7b5,
        0.78,
      ).setDepth(6));
      const distance = 14 + Math.random() * (18 + strength * 24);
      this.scene.tweens.add({
        targets: particle,
        x: startX + normal.x * distance + (Math.random() - 0.5) * 10,
        y: startY + normal.y * distance - 5 - Math.random() * 16,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: 180 + Math.random() * 160,
        onComplete: () => this.finishEffect(particle),
      });
    }
  }


  bombExplosion(x: number, y: number, radius: number, energy: number): void {
    if (this.reducedMotion) return;
    const strength = Math.max(0.65, Math.min(1.5, Math.sqrt(energy / 180000)));
    const ring = this.trackEffect(this.scene.add.circle(x, y, 12, 0xffffff, 0)
      .setStrokeStyle(5, 0xffad55, 0.95)
      .setDepth(12));
    this.scene.tweens.add({
      targets: ring,
      scale: Math.max(2, radius / 12),
      alpha: 0,
      duration: 420,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishEffect(ring),
    });

    const flash = this.trackEffect(this.scene.add.circle(x, y, 24, 0xffd17b, 0.88).setDepth(11));
    flash.setScale(0.35);
    this.scene.tweens.add({
      targets: flash,
      scale: 3.2 * strength,
      alpha: 0,
      duration: 190,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishEffect(flash),
    });

    const count = Math.max(18, Math.min(38, Math.round(20 + strength * 12)));
    for (let index = 0; index < count; index += 1) {
      const angle = (Math.PI * 2 * index) / count + (Math.random() - 0.5) * 0.42;
      const distance = radius * (0.32 + Math.random() * 0.5);
      const particle = this.trackEffect(this.scene.add.circle(
        x + Math.cos(angle) * 5,
        y + Math.sin(angle) * 5,
        2 + Math.random() * 3,
        index % 3 === 0 ? 0xffe1a0 : index % 3 === 1 ? 0xffa34d : 0xc4d1dc,
        0.95,
      ).setDepth(13));
      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 10 + Math.random() * 18,
        alpha: 0,
        scale: 0.18,
        rotation: (Math.random() - 0.5) * 5,
        duration: 360 + Math.random() * 220,
        ease: 'Quad.easeOut',
        onComplete: () => this.finishEffect(particle),
      });
    }
  }

  radiationFragmentExplosion(x: number, y: number): void {
    if (this.reducedMotion) return;
    const flash = this.trackEffect(this.scene.add.circle(x, y, 4, 0xffef91, 0.9).setDepth(14));
    this.scene.tweens.add({
      targets: flash,
      scale: 2.8,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishEffect(flash),
    });
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 + (Math.random() - 0.5) * 0.45;
      const distance = 10 + Math.random() * 15;
      const spark = this.trackEffect(this.scene.add.circle(
        x, y, 1.2 + Math.random() * 1.5,
        index % 2 === 0 ? 0xffec6a : 0xff8b2b, 0.95,
      ).setDepth(14));
      this.scene.tweens.add({
        targets: spark,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.15,
        duration: 120 + Math.random() * 90,
        ease: 'Quad.easeOut',
        onComplete: () => this.finishEffect(spark),
      });
    }
  }

  glassShatter(solid: SolidDefinition): void {
    if (this.reducedMotion) return;
    let minX: number;
    let maxX: number;
    let minY: number;
    let maxY: number;
    if (solid.type === 'box') {
      minX = solid.x; maxX = solid.x + solid.width;
      minY = solid.y; maxY = solid.y + solid.height;
    } else {
      const xs = solid.vertices.map(([x]) => x);
      const ys = solid.vertices.map(([, y]) => y);
      minX = Math.min(...xs); maxX = Math.max(...xs);
      minY = Math.min(...ys); maxY = Math.max(...ys);
    }
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const span = Math.max(24, Math.min(100, Math.max(maxX - minX, maxY - minY) * 0.42));
    const count = Math.max(14, Math.min(30, Math.round((maxX - minX + maxY - minY) / 18)));

    for (let i = 0; i < count; i += 1) {
      const startX = minX + Math.random() * (maxX - minX);
      const startY = minY + Math.random() * (maxY - minY);
      const size = 3 + Math.random() * 7;
      const shard = this.trackEffect(this.scene.add.triangle(
        startX, startY,
        -size, -size * 0.65,
        size * (0.65 + Math.random() * 0.4), 0,
        -size * 0.2, size,
        0x8cecff, 0.82,
      ).setDepth(8));
      shard.setStrokeStyle(1, 0xe4fcff, 0.9);
      const angle = Math.atan2(startY - centerY, startX - centerX) + (Math.random() - 0.5) * 0.9;
      const distance = span * (0.7 + Math.random() * 1.4);
      this.scene.tweens.add({
        targets: shard,
        x: startX + Math.cos(angle) * distance,
        y: startY + Math.sin(angle) * distance + 18 + Math.random() * 32,
        rotation: (Math.random() - 0.5) * 8,
        alpha: 0,
        scaleX: 0.12,
        scaleY: 0.12,
        duration: 380 + Math.random() * 320,
        ease: 'Quad.easeOut',
        onComplete: () => this.finishEffect(shard),
      });
    }
  }

  springImpact(x: number, y: number, normal: { x: number; y: number }, impulse: number): void {
    if (this.reducedMotion) return;
    const tangentAngle = Math.atan2(normal.y, normal.x) + Math.PI / 2;
    const strength = Math.max(0.65, Math.min(1.6, impulse / 520));
    const flash = this.trackEffect(this.scene.add.rectangle(x, y, 42 * strength, 6, 0xffdf88, 0.95)
      .setRotation(tangentAngle)
      .setDepth(7));
    flash.setScale(0.35, 1);
    this.scene.tweens.add({
      targets: flash,
      scaleX: 1.45,
      alpha: 0,
      duration: 190,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishEffect(flash),
    });

    const count = 5 + Math.round(strength * 3);
    for (let i = 0; i < count; i += 1) {
      const spread = (Math.random() - 0.5) * 0.9;
      const angle = Math.atan2(normal.y, normal.x) + spread;
      const distance = 18 + Math.random() * 26 * strength;
      const particle = this.trackEffect(this.scene.add.circle(
        x + normal.x * 2,
        y + normal.y * 2,
        1.5 + Math.random() * 2,
        i % 2 === 0 ? 0xffe6a3 : 0x9cf4ff,
        0.9,
      ).setDepth(7));
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.2,
        duration: 160 + Math.random() * 130,
        ease: 'Quad.easeOut',
        onComplete: () => this.finishEffect(particle),
      });
    }
  }

  partyPopperBurst(x: number, y: number, radius: number, message?: string): void {
    if (this.reducedMotion) return;

    const colors = [0xff4f78, 0xffd34f, 0x55d6e8, 0x8b70f2, 0x71d68b, 0xff8a45];
    const flash = this.trackEffect(this.scene.add.circle(x, y, Math.max(5, radius * 0.28), 0xfff3b0, 0.9)
      .setDepth(16).setScale(0.35));
    this.scene.tweens.add({
      targets: flash,
      scale: 2.8,
      alpha: 0,
      duration: 180,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishEffect(flash),
    });

    const ring = this.trackEffect(this.scene.add.circle(x, y, Math.max(4, radius * 0.2), 0xffffff, 0)
      .setStrokeStyle(2.2, 0xffdf82, 0.95)
      .setDepth(15));
    this.scene.tweens.add({
      targets: ring,
      scale: 3.6,
      alpha: 0,
      duration: 300,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishEffect(ring),
    });

    // Curled, zig-zag paper ribbons fan upward and outward from the cone.
    for (let index = 0; index < 36; index += 1) {
      const color = colors[index % colors.length];
      const ribbon = this.trackEffect(this.scene.add.graphics().setPosition(x, y).setDepth(17));
      const ribbonWidth = 2.1 + Math.random() * 1.9;
      const length = 9 + Math.random() * 9;
      ribbon.lineStyle(ribbonWidth, color, 1);
      ribbon.beginPath();
      ribbon.moveTo(-length * 0.5, 0);
      ribbon.lineTo(-length * 0.16, -length * 0.42);
      ribbon.lineTo(length * 0.18, length * 0.16);
      ribbon.lineTo(length * 0.5, -length * 0.22);
      ribbon.strokePath();

      const angle = -Math.PI + Math.random() * Math.PI;
      const distance = radius * (2.2 + Math.random() * 4.2);
      this.scene.tweens.add({
        targets: ribbon,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + radius * (0.08 + Math.random() * 0.28),
        angle: (Math.random() - 0.5) * 650,
        scaleX: 0.55 + Math.random() * 0.55,
        scaleY: 0.65 + Math.random() * 0.8,
        alpha: 0,
        duration: 760 + Math.random() * 440,
        ease: 'Cubic.easeOut',
        onComplete: () => this.finishEffect(ribbon),
      });
    }

    // Small square and triangular paper pieces make the burst feel denser.
    for (let index = 0; index < 28; index += 1) {
      const color = colors[(index * 2 + 1) % colors.length];
      const piece = this.trackEffect(this.scene.add.rectangle(
        x, y, 2.5 + Math.random() * 3.5, 4 + Math.random() * 5, color, 1,
      ).setDepth(18));
      const angle = -Math.PI + Math.random() * Math.PI;
      const distance = radius * (2 + Math.random() * 4.1);
      this.scene.tweens.add({
        targets: piece,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + radius * (0.12 + Math.random() * 0.3),
        angle: (Math.random() - 0.5) * 900,
        alpha: 0,
        scale: 0.35,
        duration: 680 + Math.random() * 420,
        ease: 'Cubic.easeOut',
        onComplete: () => this.finishEffect(piece),
      });
    }

    this.showPickupMessage(x, y, radius, message, '#fff2a8', '#57304a');
  }

  poopBoost(x: number, y: number, radius: number, message?: string): void {
    if (this.reducedMotion) return;

    const groundY = y + radius;
    const sourceY = groundY - radius * 0.62;
    const colors = [0x754027, 0x8b4d2c, 0xa76338, 0xb87943, 0xc58a59];

    // A small sticky puddle spreads along the surface instead of a bright explosion.
    const puddle = this.trackEffect(this.scene.add.ellipse(
      x, groundY - 1, radius * 1.18, Math.max(4, radius * 0.28), 0x754027, 0.9,
    ).setStrokeStyle(1.2, 0x4a2618, 0.65).setDepth(14).setScale(0.22, 0.55));
    this.scene.tweens.add({
      targets: puddle,
      scaleX: 1.08,
      scaleY: 0.9,
      alpha: 0.82,
      duration: 170,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.scene.tweens.add({
          targets: puddle,
          scaleX: 1.28,
          scaleY: 0.65,
          alpha: 0,
          duration: 560,
          delay: 90,
          ease: 'Quad.easeIn',
          onComplete: () => this.finishEffect(puddle),
        });
      },
    });

    // Sticky blobs first flick outward, then stretch and run down like little drips.
    const count = 9;
    for (let index = 0; index < count; index += 1) {
      const side = index % 2 === 0 ? -1 : 1;
      const startX = x + (Math.random() - 0.5) * radius * 0.28;
      const startY = sourceY + (Math.random() - 0.5) * radius * 0.34;
      const spread = radius * (0.85 + Math.random() * 1.05);
      const lift = radius * (0.32 + Math.random() * 0.68);
      const width = 3.2 + Math.random() * 4.8;
      const height = 5.5 + Math.random() * 6.5;
      const drip = this.trackEffect(this.scene.add.ellipse(
        startX, startY, width, height, colors[index % colors.length], 0.96,
      ).setStrokeStyle(0.7, 0x4a2618, 0.55).setDepth(15));
      drip.setScale(0.55, 0.7);

      this.scene.tweens.add({
        targets: drip,
        x: startX + side * spread,
        y: startY - lift,
        scaleX: 1.05,
        scaleY: 1.12,
        rotation: side * (0.18 + Math.random() * 0.48),
        duration: 170 + Math.random() * 100,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (!drip.active) return;
          this.scene.tweens.add({
            targets: drip,
            x: drip.x + side * (4 + Math.random() * 9),
            y: groundY + 15 + Math.random() * 28,
            scaleX: 0.72,
            scaleY: 1.9 + Math.random() * 0.8,
            rotation: side * (0.35 + Math.random() * 0.6),
            alpha: 0,
            duration: 470 + Math.random() * 240,
            ease: 'Quad.easeIn',
            onComplete: () => this.finishEffect(drip),
          });
        },
      });
    }

    // A few thin trails stretch down from the splash before fading away.
    for (let index = 0; index < 4; index += 1) {
      const side = index < 2 ? -1 : 1;
      const offset = side * (radius * (0.34 + (index % 2) * 0.48));
      const trail = this.trackEffect(this.scene.add.ellipse(
        x + offset, groundY - 5, 3 + Math.random() * 2, 7 + Math.random() * 4,
        colors[(index + 1) % colors.length], 0.9,
      ).setDepth(14).setScale(0.7, 0.2));
      this.scene.tweens.add({
        targets: trail,
        y: groundY + 17 + Math.random() * 18,
        scaleX: 0.85,
        scaleY: 1.75,
        alpha: 0,
        duration: 520 + Math.random() * 190,
        delay: 80 + index * 35,
        ease: 'Quad.easeIn',
        onComplete: () => this.finishEffect(trail),
      });
    }

    this.showPickupMessage(x, y, radius, message, '#ffe6a1', '#56301d');
  }

  private showPickupMessage(
    x: number,
    y: number,
    radius: number,
    rawMessage: string | undefined,
    color: string,
    stroke: string,
  ): void {
    const message = resolvePickupCaption(rawMessage);
    if (message === null) return;

    const caption = this.trackEffect(this.scene.add.text(x, y - radius - 18, message, {
      fontFamily: 'Arial, sans-serif',
      fontSize: '15px',
      fontStyle: 'bold',
      color,
      stroke,
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: 220, useAdvancedWrap: true },
      shadow: { color: '#24160f', blur: 5, fill: true, offsetX: 1, offsetY: 2 },
      padding: { x: 4, y: 3 },
    }).setOrigin(0.5).setDepth(20));
    this.scene.tweens.add({
      targets: caption,
      y: caption.y - 42,
      alpha: 0,
      scale: 1.12,
      duration: 850,
      ease: 'Quad.easeOut',
      onComplete: () => this.finishEffect(caption),
    });
  }

  /** A comic ghost pops out of a character when it touches a raised spike. */
  spikeSoul(x: number, y: number): void {
    if (this.reducedMotion) return;

    const smokeTones = [0xe7edf2, 0xd5e0e8, 0xf5f8fa];
    for (let index = 0; index < 6; index += 1) {
      const angle = (Math.PI * 2 * index) / 6 + (Math.random() - 0.5) * 0.36;
      const distance = 5 + Math.random() * 9;
      const puff = this.trackEffect(this.scene.add.ellipse(
        x + Math.cos(angle) * distance,
        y + Math.sin(angle) * distance,
        10 + Math.random() * 10,
        8 + Math.random() * 9,
        smokeTones[index % smokeTones.length],
        0.76,
      ).setStrokeStyle(0.8, 0xa9bac8, 0.38).setDepth(17));
      this.scene.tweens.add({
        targets: puff,
        x: puff.x + Math.cos(angle) * (12 + Math.random() * 11),
        y: puff.y - 28 - Math.random() * 24,
        scaleX: 1.55,
        scaleY: 1.7,
        alpha: 0,
        duration: 520 + Math.random() * 180,
        ease: 'Sine.easeOut',
        onComplete: () => this.finishEffect(puff),
      });
    }

    // The scream face is intentionally readable as a tiny floating soul,
    // with smoke puffs trailing behind it as it escapes upward.
    const soul = this.trackEffect(this.scene.add.text(x, y - 2, '😱', {
      fontFamily: 'Arial, sans-serif',
      fontSize: '34px',
      color: '#ffffff',
      stroke: '#8b9eac',
      strokeThickness: 2,
      shadow: { color: '#1c2933', blur: 5, fill: true, offsetX: 1, offsetY: 2 },
    }).setOrigin(0.5).setDepth(19).setScale(0.55).setAlpha(0.2));
    this.scene.tweens.add({
      targets: soul,
      y: y - 78,
      scale: 1.14,
      alpha: 0,
      rotation: 0.16,
      duration: 740,
      ease: 'Back.easeOut',
      onComplete: () => this.finishEffect(soul),
    });
  }

  landing(x: number, y: number, intensity: number): void {
    if (this.reducedMotion) return;
    const count = Math.max(2, Math.min(7, Math.round(intensity / 110)));
    for (let i = 0; i < count; i += 1) {
      const particle = this.trackEffect(this.scene.add.circle(x + (Math.random() - 0.5) * 20, y, 2 + Math.random() * 2, 0xb7c8d9, 0.8).setDepth(4));
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + (Math.random() - 0.5) * 50,
        y: particle.y - 10 - Math.random() * 20,
        alpha: 0,
        duration: 220 + Math.random() * 120,
        onComplete: () => this.finishEffect(particle),
      });
    }
  }

  private trackEffect<T extends Phaser.GameObjects.GameObject>(effect: T): T {
    this.activeEffects.add(effect);
    return effect;
  }

  private finishEffect(effect: Phaser.GameObjects.GameObject): void {
    if (!this.activeEffects.delete(effect)) return;
    effect.destroy();
  }
}
