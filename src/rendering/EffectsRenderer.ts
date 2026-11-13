import type Phaser from 'phaser';

export class EffectsRenderer {
  private lastWallImpactAt = -Infinity;

  constructor(private readonly scene: Phaser.Scene, private reducedMotion = false) {}

  setReducedMotion(enabled: boolean): void { this.reducedMotion = enabled; }

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
      const particle = this.scene.add.circle(
        startX,
        startY,
        1.5 + Math.random() * 2.2,
        Math.random() > 0.5 ? 0xb7c2cc : 0xd0c7b5,
        0.78,
      ).setDepth(6);
      const distance = 14 + Math.random() * (18 + strength * 24);
      this.scene.tweens.add({
        targets: particle,
        x: startX + normal.x * distance + (Math.random() - 0.5) * 10,
        y: startY + normal.y * distance - 5 - Math.random() * 16,
        alpha: 0,
        scaleX: 0.25,
        scaleY: 0.25,
        duration: 180 + Math.random() * 160,
        onComplete: () => particle.destroy(),
      });
    }
  }

  landing(x: number, y: number, intensity: number): void {
    if (this.reducedMotion) return;
    const count = Math.max(2, Math.min(7, Math.round(intensity / 110)));
    for (let i = 0; i < count; i += 1) {
      const particle = this.scene.add.circle(x + (Math.random() - 0.5) * 20, y, 2 + Math.random() * 2, 0xb7c8d9, 0.8).setDepth(4);
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + (Math.random() - 0.5) * 50,
        y: particle.y - 10 - Math.random() * 20,
        alpha: 0,
        duration: 220 + Math.random() * 120,
        onComplete: () => particle.destroy(),
      });
    }
  }
}
