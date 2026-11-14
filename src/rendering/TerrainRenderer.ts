import type Phaser from 'phaser';
import { polygonCentroid, polygonEdgeOutwardNormal } from '../utils/GeometryUtils';
import type { BoxSurfaceSide, LevelDefinition, SolidDefinition, TerrainMaterialDefinition } from '../level/LevelTypes';

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
      if (this.removed.has(solid.id) || (solid.type === 'box' && solid.movable)) continue;
      const materialName = solid.material ?? 'normal';
      this.draw(solid, this.currentLevel.materials?.[materialName], materialName);
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

    // Springs are intentionally not rendered on glass: glass ignores spring
    // assignments and remains governed exclusively by its breakable behavior.
    if (!isGlass && solid.springSurfaces?.length) this.drawSpringMarkers(solid);
  }

  private drawSpringMarkers(solid: SolidDefinition): void {
    const surfaces = solid.springSurfaces ?? [];
    this.graphics.lineStyle(4, 0xf0c96a, 0.98);
    for (const surface of surfaces) {
      let a: { x: number; y: number };
      let b: { x: number; y: number };
      let normal: { x: number; y: number };
      if (solid.type === 'box' && 'side' in surface) {
        const bounds: Record<BoxSurfaceSide, [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]> = {
          top: [{ x: solid.x, y: solid.y }, { x: solid.x + solid.width, y: solid.y }, { x: 0, y: -1 }],
          right: [{ x: solid.x + solid.width, y: solid.y }, { x: solid.x + solid.width, y: solid.y + solid.height }, { x: 1, y: 0 }],
          bottom: [{ x: solid.x + solid.width, y: solid.y + solid.height }, { x: solid.x, y: solid.y + solid.height }, { x: 0, y: 1 }],
          left: [{ x: solid.x, y: solid.y + solid.height }, { x: solid.x, y: solid.y }, { x: -1, y: 0 }],
        };
        [a, b, normal] = bounds[surface.side];
      } else if (solid.type === 'polygon' && 'edge' in surface) {
        const edge = surface.edge;
        a = { x: solid.vertices[edge][0], y: solid.vertices[edge][1] };
        const next = solid.vertices[(edge + 1) % solid.vertices.length];
        b = { x: next[0], y: next[1] };
        normal = polygonEdgeOutwardNormal(solid.vertices.map(([x, y]) => ({ x, y })), edge);
      } else {
        continue;
      }

      this.graphics.lineBetween(a.x, a.y, b.x, b.y);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      const markCount = Math.max(2, Math.min(10, Math.floor(length / 24)));
      this.graphics.lineStyle(2, 0xffe8a6, 0.95);
      for (let mark = 1; mark < markCount; mark += 1) {
        const t = mark / markCount;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        this.graphics.lineBetween(x - normal.x * 5, y - normal.y * 5, x + normal.x * 5, y + normal.y * 5);
      }
      this.graphics.lineStyle(4, 0xf0c96a, 0.98);
    }
  }
}
