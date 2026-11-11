import Phaser from 'phaser';
import type { LevelDefinition } from '../level/LevelTypes';

export class BackgroundRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  constructor(private readonly scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(-100); }

  render(level: LevelDefinition): void {
    this.graphics.clear();
    const color = Phaser.Display.Color.HexStringToColor(level.world.backgroundColor ?? '#18212f').color;
    this.graphics.fillStyle(color, 1);
    this.graphics.fillRect(0, 0, level.world.width, level.world.height);
    this.graphics.fillStyle(0x25364c, 0.55);
    for (let i = 0; i < Math.ceil(level.world.width / 420); i += 1) {
      const x = i * 420 + 40;
      this.graphics.fillCircle(x, 170 + (i % 3) * 48, 70 + (i % 2) * 25);
    }
  }

  destroy(): void { this.graphics.destroy(); }
}
