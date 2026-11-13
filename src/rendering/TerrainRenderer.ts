import type Phaser from 'phaser';
import { polygonCentroid } from '../utils/GeometryUtils';
import type { LevelDefinition, SolidDefinition, TerrainMaterialDefinition } from '../level/LevelTypes';

const MATERIAL_COLORS: Record<string, number> = {
  normal: 0x52647b,
  ice: 0x6fc9e8,
  rubber: 0x8f6ad8,
  stone: 0x7a899a,
  glass: 0x72d8ea,
};

export class TerrainRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private currentLevel: LevelDefinition | null = null;
  private readonly removed = new Set<string>();

  constructor(scene: Phaser.Scene) { this.graphics = scene.add.graphics().setDepth(0); }

  render(level: LevelDefinition): void {
    this.currentLevel = level;
    this.removed.clear();
    this.drawAll();
  }

  removeSolid(id: string): void {
    if (!this.currentLevel || this.removed.has(id)) return;
    this.removed.add(id);
    this.drawAll();
  }

  clear(): void {
    this.graphics.clear();
    this.currentLevel = null;
    this.removed.clear();
  }

  destroy(): void { this.graphics.destroy(); }

  private drawAll(): void {
    this.graphics.clear();
    if (!this.currentLevel) return;
    for (const solid of this.currentLevel.solids) {
      if (this.removed.has(solid.id)) continue;
      this.draw(solid, this.currentLevel.materials?.[solid.material ?? 'normal'], solid.material ?? 'normal');
    }
  }

  private draw(solid: SolidDefinition, _material: TerrainMaterialDefinition | undefined, materialName: string): void {
    const isGlass = materialName === 'glass';
    const color = MATERIAL_COLORS[materialName] ?? MATERIAL_COLORS.normal;
    this.graphics.fillStyle(color, isGlass ? 0.26 : 1);
    this.graphics.lineStyle(isGlass ? 2.5 : 3, isGlass ? 0xc5f7ff : 0x91a5bb, isGlass ? 0.98 : 0.85);
    if (solid.type === 'box') {
      this.graphics.fillRect(solid.x, solid.y, solid.width, solid.height);
      this.graphics.strokeRect(solid.x, solid.y, solid.width, solid.height);
      if (isGlass) {
        this.graphics.lineStyle(1.5, 0xd9fbff, 0.7);
        this.graphics.lineBetween(solid.x + 8, solid.y + 8, solid.x + solid.width - 8, solid.y + solid.height - 8);
        this.graphics.lineBetween(solid.x + solid.width - 8, solid.y + 8, solid.x + 8, solid.y + solid.height - 8);
        this.graphics.lineBetween(solid.x + solid.width * 0.5, solid.y + 5, solid.x + solid.width * 0.5, solid.y + solid.height - 5);
      }
    } else {
      const points = solid.vertices;
      this.graphics.beginPath();
      this.graphics.moveTo(points[0][0], points[0][1]);
      for (let i = 1; i < points.length; i += 1) this.graphics.lineTo(points[i][0], points[i][1]);
      this.graphics.closePath();
      this.graphics.fillPath();
      this.graphics.strokePath();
      if (isGlass) {
        const centroid = polygonCentroid(points.map(([x, y]) => ({ x, y })));
        this.graphics.lineStyle(1.5, 0xd9fbff, 0.72);
        for (const [x, y] of points) this.graphics.lineBetween(centroid.x, centroid.y, x, y);
      }
    }
  }
}
