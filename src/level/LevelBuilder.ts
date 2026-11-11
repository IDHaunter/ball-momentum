import type Phaser from 'phaser';
import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { LevelDefinition } from './LevelTypes';
import { TerrainFactory } from './TerrainFactory';
import { TriggerFactory } from './TriggerFactory';
import { TerrainRenderer } from '../rendering/TerrainRenderer';
import { TriggerRenderer } from '../rendering/TriggerRenderer';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';

export class LevelBuilder {
  private readonly terrainRenderer: TerrainRenderer;
  private readonly triggerRenderer: TriggerRenderer;
  private readonly backgroundRenderer: BackgroundRenderer;
  private readonly terrainFactory: TerrainFactory;
  private readonly triggerFactory: TriggerFactory;
  private decorations: Phaser.GameObjects.GameObject[] = [];

  constructor(private readonly scene: Phaser.Scene, world: IPhysicsWorld) {
    this.terrainRenderer = new TerrainRenderer(scene);
    this.triggerRenderer = new TriggerRenderer(scene);
    this.backgroundRenderer = new BackgroundRenderer(scene);
    this.terrainFactory = new TerrainFactory(world, this.terrainRenderer);
    this.triggerFactory = new TriggerFactory(world, this.triggerRenderer);
  }

  build(level: LevelDefinition): void {
    this.clear();
    this.backgroundRenderer.render(level);
    this.terrainFactory.build(level);
    this.triggerFactory.build(level);
    for (const item of level.decorations ?? []) {
      const color = item.color ?? '#ffffff';
      if (item.type === 'circle') {
        this.decorations.push(this.scene.add.circle(item.x, item.y, item.radius ?? 8, Number.parseInt(color.replace('#', ''), 16)).setDepth(item.depth ?? 1));
      } else if (item.type === 'rectangle') {
        this.decorations.push(this.scene.add.rectangle(item.x, item.y, item.width ?? 20, item.height ?? 20, Number.parseInt(color.replace('#', ''), 16)).setDepth(item.depth ?? 1));
      } else if (item.type === 'line') {
        const line = this.scene.add.line(item.x, item.y, 0, 0, item.width ?? 20, item.height ?? 0, Number.parseInt(color.replace('#', ''), 16));
        this.decorations.push(line.setDepth(item.depth ?? 1));
      } else if (item.type === 'text') {
        this.decorations.push(this.scene.add.text(item.x, item.y, item.text ?? '', { color, fontSize: '16px' }).setDepth(item.depth ?? 1));
      }
    }
  }

  activateCheckpoint(id: string): void {
    this.triggerRenderer.setActiveCheckpoint(id);
  }

  clear(): void {
    this.terrainRenderer.clear();
    this.triggerRenderer.render([]);
    for (const item of this.decorations) item.destroy();
    this.decorations = [];
  }

  destroy(): void {
    this.clear();
    this.terrainRenderer.destroy();
    this.triggerRenderer.destroy();
    this.backgroundRenderer.destroy();
  }
}
