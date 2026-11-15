import type Phaser from 'phaser';
import { polygonCentroid, polygonEdgeOutwardNormal } from '../utils/GeometryUtils';
import type { BoxSurfaceSide, LevelDefinition, SolidDefinition, TerrainMaterialDefinition } from '../level/LevelTypes';
import {
  createSurfaceTextureCanvas,
  createSurfaceTextureKey,
  type SurfaceTexturePoint,
} from './SurfaceTextureGenerator';
import { hashSurfaceTextureSeed } from './SurfaceTextureCatalog';

const MATERIAL_COLORS: Record<string, number> = {
  normal: 0x52647b,
  ice: 0x6fc9e8,
  rubber: 0x8f6ad8,
  stone: 0x7a899a,
  glass: 0x72d8ea,
  wood: 0x9b704d,
  sand: 0xc5a46b,
};

export class TerrainRenderer {
  private readonly scene: Phaser.Scene;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly overlayGraphics: Phaser.GameObjects.Graphics;
  private readonly textureImages: Phaser.GameObjects.Image[] = [];
  private readonly textureKeys = new Set<string>();
  private currentLevel: LevelDefinition | null = null;
  private readonly removed = new Set<string>();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(0);
    this.overlayGraphics = scene.add.graphics().setDepth(0.3);
  }

  render(level: LevelDefinition): void {
    this.clearTextureAssets();
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
    this.overlayGraphics.clear();
    this.clearTextureAssets();
    this.currentLevel = null;
    this.removed.clear();
  }

  destroy(): void {
    this.clear();
    this.graphics.destroy();
    this.overlayGraphics.destroy();
  }

  private drawAll(): void {
    this.graphics.clear();
    this.overlayGraphics.clear();
    this.destroyTextureImages();
    if (!this.currentLevel) return;

    for (const solid of this.currentLevel.solids) {
      if (this.removed.has(solid.id)) continue;
      const materialName = solid.material ?? 'normal';
      this.draw(solid, this.currentLevel.materials?.[materialName], materialName);
    }

    // Pattern images sit above the flat material fills but below outlines,
    // spring markers and the movable-block direction marker.
    for (const solid of this.currentLevel.solids) {
      if (this.removed.has(solid.id) || !solid.texture || (solid.type === 'box' && solid.movable)) continue;
      this.drawTexture(solid, this.currentLevel.id);
    }
  }

  private draw(solid: SolidDefinition, _material: TerrainMaterialDefinition | undefined, materialName: string): void {
    const isGlass = materialName === 'glass';
    const color = MATERIAL_COLORS[materialName] ?? MATERIAL_COLORS.normal;

    // Movable blocks are drawn by their Matter Game Object; their texture is
    // rendered as a separately synchronized overlay at depth 4.5.
    const isMovable = solid.type === 'box' && Boolean(solid.movable);
    if (!isMovable) {
      this.graphics.fillStyle(color, isGlass ? 0.26 : 1);
      if (solid.type === 'box') {
        this.graphics.fillRect(solid.x, solid.y, solid.width, solid.height);
      } else {
        const points = solid.vertices;
        this.graphics.beginPath();
        this.graphics.moveTo(points[0][0], points[0][1]);
        for (let index = 1; index < points.length; index += 1) this.graphics.lineTo(points[index][0], points[index][1]);
        this.graphics.closePath();
        this.graphics.fillPath();
      }
    }

    if (isMovable) return;
    this.overlayGraphics.lineStyle(isGlass ? 2.5 : 3, isGlass ? 0xc5f7ff : 0x91a5bb, isGlass ? 0.98 : 0.85);
    if (solid.type === 'box') {
      this.overlayGraphics.strokeRect(solid.x, solid.y, solid.width, solid.height);
      if (isGlass) {
        this.overlayGraphics.lineStyle(1.5, 0xd9fbff, 0.7);
        this.overlayGraphics.lineBetween(solid.x + 8, solid.y + 8, solid.x + solid.width - 8, solid.y + solid.height - 8);
        this.overlayGraphics.lineBetween(solid.x + solid.width - 8, solid.y + 8, solid.x + 8, solid.y + solid.height - 8);
        this.overlayGraphics.lineBetween(solid.x + solid.width * 0.5, solid.y + 5, solid.x + solid.width * 0.5, solid.y + solid.height - 5);
      }
    } else {
      const points = solid.vertices;
      this.overlayGraphics.beginPath();
      this.overlayGraphics.moveTo(points[0][0], points[0][1]);
      for (let index = 1; index < points.length; index += 1) this.overlayGraphics.lineTo(points[index][0], points[index][1]);
      this.overlayGraphics.closePath();
      this.overlayGraphics.strokePath();
      if (isGlass) {
        const centroid = polygonCentroid(points.map(([x, y]) => ({ x, y })));
        this.overlayGraphics.lineStyle(1.5, 0xd9fbff, 0.72);
        for (const [x, y] of points) this.overlayGraphics.lineBetween(centroid.x, centroid.y, x, y);
      }
    }

    // Springs are intentionally not rendered on glass: glass ignores spring
    // assignments and remains governed exclusively by its breakable behavior.
    if (!isGlass && solid.springSurfaces?.length) this.drawSpringMarkers(solid);
  }

  private drawTexture(solid: SolidDefinition, levelId: string): void {
    if (!solid.texture) return;
    const geometry = getTextureGeometry(solid);
    const key = createSurfaceTextureKey(levelId, solid.id, solid.texture);
    createSurfaceTextureCanvas(
      this.scene, key, geometry.width, geometry.height, geometry.points, solid.texture,
      hashSurfaceTextureSeed(`${levelId}:${solid.id}`),
    );
    this.textureKeys.add(key);
    const image = this.scene.add.image(
      geometry.left + geometry.width / 2,
      geometry.top + geometry.height / 2,
      key,
    ).setDisplaySize(geometry.width, geometry.height).setDepth(0.15);
    this.textureImages.push(image);
  }

  private destroyTextureImages(): void {
    for (const image of this.textureImages) image.destroy();
    this.textureImages.length = 0;
  }

  private clearTextureAssets(): void {
    this.destroyTextureImages();
    for (const key of this.textureKeys) {
      if (this.scene.textures.exists(key)) this.scene.textures.remove(key);
    }
    this.textureKeys.clear();
  }

  private drawSpringMarkers(solid: SolidDefinition): void {
    const surfaces = solid.springSurfaces ?? [];
    this.overlayGraphics.lineStyle(4, 0xf0c96a, 0.98);
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

      this.overlayGraphics.lineBetween(a.x, a.y, b.x, b.y);
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const length = Math.hypot(dx, dy);
      const markCount = Math.max(2, Math.min(10, Math.floor(length / 24)));
      this.overlayGraphics.lineStyle(2, 0xffe8a6, 0.95);
      for (let mark = 1; mark < markCount; mark += 1) {
        const t = mark / markCount;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        this.overlayGraphics.lineBetween(x - normal.x * 5, y - normal.y * 5, x + normal.x * 5, y + normal.y * 5);
      }
      this.overlayGraphics.lineStyle(4, 0xf0c96a, 0.98);
    }
  }
}

function getTextureGeometry(solid: SolidDefinition): { left: number; top: number; width: number; height: number; points: SurfaceTexturePoint[] } {
  if (solid.type === 'box') {
    return {
      left: solid.x,
      top: solid.y,
      width: solid.width,
      height: solid.height,
      points: [
        { x: 0, y: 0 },
        { x: solid.width, y: 0 },
        { x: solid.width, y: solid.height },
        { x: 0, y: solid.height },
      ],
    };
  }
  const xs = solid.vertices.map(([x]) => x);
  const ys = solid.vertices.map(([, y]) => y);
  const left = Math.min(...xs);
  const top = Math.min(...ys);
  const right = Math.max(...xs);
  const bottom = Math.max(...ys);
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
    points: solid.vertices.map(([x, y]) => ({ x: x - left, y: y - top })),
  };
}
