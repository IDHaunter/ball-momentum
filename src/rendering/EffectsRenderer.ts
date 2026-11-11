import type Phaser from 'phaser';

export class EffectsRenderer {
  constructor(private readonly scene: Phaser.Scene, private reducedMotion = false) {}

  setReducedMotion(enabled: boolean): void { this.reducedMotion = enabled; }

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
