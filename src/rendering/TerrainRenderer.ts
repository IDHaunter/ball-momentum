import type Phaser from 'phaser';
import type { LevelDefinition, SolidDefinition, TerrainMaterialDefinition } from '../level/LevelTypes';

const MATERIAL_COLORS: Record<string, number> = { normal: 0x52647b, ice: 0x6fc9e8, rubber: 0x8f6ad8, stone: 0x7a899a };

export class TerrainRenderer {
  private graphics: Phaser.GameObjects.Graphics;
  constructor(scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(0); }

  render(level: LevelDefinition): void {
    this.graphics.clear();
    for (const solid of level.solids) this.draw(solid, level.materials?.[solid.material ?? 'normal'], solid.material ?? 'normal');
  }

  clear(): void { this.graphics.clear(); }
  destroy(): void { this.graphics.destroy(); }

  private draw(solid: SolidDefinition, material: TerrainMaterialDefinition | undefined, materialName: string): void {
    const color = MATERIAL_COLORS[materialName] ?? 0x52647b;
    this.graphics.fillStyle(color, 1);
    this.graphics.lineStyle(3, 0x91a5bb, 0.85);
    if (solid.type === 'box') {
      this.graphics.fillRect(solid.x, solid.y, solid.width, solid.height);
      this.graphics.strokeRect(solid.x, solid.y, solid.width, solid.height);
    } else {
      const points = solid.vertices;
      this.graphics.beginPath();
      this.graphics.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) this.graphics.lineTo(points[i][0], points[i][1]);
      this.graphics.closePath();
      this.graphics.fillPath();
      this.graphics.strokePath();
    }
    void material;
  }
}
