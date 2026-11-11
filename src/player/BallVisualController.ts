import type { BallRenderer } from '../rendering/BallRenderer';

export class BallVisualController {
  private squashX = 1;
  private squashY = 1;
  private recovery = 0;

  constructor(private readonly renderer: BallRenderer, private reducedMotion = false) {}

  setReducedMotion(enabled: boolean): void {
    this.reducedMotion = enabled;
    if (enabled) { this.squashX = 1; this.squashY = 1; }
  }

  anticipate(): void {
    if (this.reducedMotion) return;
    this.squashX = 1.14; this.squashY = 0.82; this.recovery = 0.12;
  }
  launch(): void {
    if (this.reducedMotion) return;
    this.squashX = 0.88; this.squashY = 1.18; this.recovery = 0.16;
  }
  land(impactSpeed: number): void {
    if (this.reducedMotion) return;
    const intensity = Math.min(0.18, Math.max(0.04, impactSpeed / 5000));
    this.squashX = 1 + intensity;
    this.squashY = 1 - intensity;
    this.recovery = 0.18;
  }

  update(dtSeconds: number, x: number, y: number, angle: number): void {
    if (this.reducedMotion) {
      this.renderer.update(x, y, angle, 1, 1);
      return;
    }
    const blend = Math.min(1, dtSeconds / Math.max(0.001, this.recovery));
    this.squashX += (1 - this.squashX) * blend;
    this.squashY += (1 - this.squashY) * blend;
    this.renderer.update(x, y, angle, this.squashX, this.squashY);
  }
}
