import type Phaser from 'phaser';

export class BallRenderer {
  private readonly container: Phaser.GameObjects.Container;
  private readonly radius: number;

  constructor(scene: Phaser.Scene, radius: number) {
    this.radius = radius;
    const body = scene.add.circle(0, 0, radius, 0xf5b942).setStrokeStyle(3, 0xffdf91, 1);
    const highlight = scene.add.ellipse(-radius * 0.28, -radius * 0.35, radius * 0.62, radius * 0.38, 0xfff2c7, 0.78);
    const marker = scene.add.line(radius * 0.13, radius * 0.07, -radius * 0.45, 0, radius * 0.45, 0, 0x18212f, 0.9).setLineWidth(3);
    this.container = scene.add.container(0, 0, [body, highlight, marker]).setDepth(5);
  }

  update(x: number, y: number, angle: number, scaleX = 1, scaleY = 1): void {
    this.container.setPosition(x, y);
    this.container.setRotation(angle);
    this.container.setScale(scaleX, scaleY);
  }

  setVisible(value: boolean): void { this.container.setVisible(value); }
  get radiusPx(): number { return this.radius; }
  destroy(): void { this.container.destroy(true); }
}
