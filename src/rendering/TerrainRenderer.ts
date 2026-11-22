import type Phaser from 'phaser';
import type { LevelDefinition, SolidDefinition, TerrainMaterialDefinition } from '../level/LevelTypes';
import { drawBoxBorders, drawPolygonBorders, drawSpringTape, getBoxBorderSegments, getPolygonBorderSegments } from './SurfaceBorderRenderer';
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
  brick: 0xb9684b,
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

    // Pattern images sit above the flat material fills but below outlines
    // and spring markers.
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
    const defaultBorderColor = isGlass ? 0xc5f7ff : 0x91a5bb;
    if (solid.type === 'box') {
      drawBoxBorders(this.overlayGraphics, solid.x, solid.y, solid.width, solid.height, solid.borders, defaultBorderColor);
    } else {
      drawPolygonBorders(this.overlayGraphics, solid.vertices, solid.borders, defaultBorderColor);
    }

    // Springs override the configured edge style with a high-contrast hazard
    // tape so the gameplay affordance remains unmistakable.
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
    if (solid.type === 'box') {
      const segments = getBoxBorderSegments(solid.x, solid.y, solid.width, solid.height);
      for (const surface of solid.springSurfaces ?? []) {
        if (!('side' in surface)) continue;
        const edge = segments.find((segment) => segment.side === surface.side);
        if (edge) drawSpringTape(this.overlayGraphics, edge);
      }
      return;
    }

    const segments = getPolygonBorderSegments(solid.vertices);
    for (const surface of solid.springSurfaces ?? []) {
      if (!('edge' in surface)) continue;
      const edge = segments.find((segment) => segment.edge === surface.edge);
      if (edge) drawSpringTape(this.overlayGraphics, edge);
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
