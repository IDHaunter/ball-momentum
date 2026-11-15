import type Phaser from 'phaser';
import type { SolidDefinition } from '../level/LevelTypes';

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
