import type Phaser from 'phaser';
import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { LevelDefinition } from './LevelTypes';
import { TerrainFactory } from './TerrainFactory';
import { TriggerFactory } from './TriggerFactory';
import { TerrainRenderer } from '../rendering/TerrainRenderer';
import { TriggerRenderer } from '../rendering/TriggerRenderer';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { BreakableTerrainManager } from './BreakableTerrainManager';
import type { BreakableSolidDefinition } from './LevelTypes';

export class LevelBuilder {
  private readonly terrainRenderer: TerrainRenderer;
  private readonly triggerRenderer: TriggerRenderer;
  private readonly backgroundRenderer: BackgroundRenderer;
  private readonly terrainFactory: TerrainFactory;
  private readonly triggerFactory: TriggerFactory;
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private breakables = new BreakableTerrainManager([]);

  constructor(private readonly scene: Phaser.Scene, private readonly world: IPhysicsWorld) {
    this.terrainRenderer = new TerrainRenderer(scene);
    this.triggerRenderer = new TriggerRenderer(scene);
    this.backgroundRenderer = new BackgroundRenderer(scene);
    this.terrainFactory = new TerrainFactory(world, this.terrainRenderer);
    this.triggerFactory = new TriggerFactory(world, this.triggerRenderer);
  }

  build(level: LevelDefinition): void {
    this.clear();
    this.breakables = new BreakableTerrainManager(level.solids);
    this.backgroundRenderer.render(level);
    this.terrainFactory.build(level);
    this.triggerFactory.build(level);
    for (const bot of level.bots ?? []) {
      this.world.createBot({
        id: bot.id,
        x: bot.x,
        y: bot.y,
        radius: bot.radius,
        mass: bot.mass,
        speed: bot.speed,
        direction: bot.direction ?? 1,
        restitution: bot.restitution ?? 0.82,
        friction: bot.friction ?? 0.015,
        killPlaneY: level.world.killPlaneY,
        patrolMinX: bot.patrolRange?.minX,
        patrolMaxX: bot.patrolRange?.maxX,
      });
    }
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

  getBreakable(id: string): BreakableSolidDefinition | null {
    return this.breakables.get(id);
  }

  breakSolid(id: string): BreakableSolidDefinition[] {
    const broken = this.breakables.break(id);
    for (const solid of broken) {
      this.terrainFactory.remove(solid.id);
      this.terrainRenderer.removeSolid(solid.id);
    }
    return broken;
  }

  clear(): void {
    this.terrainRenderer.clear();
    this.triggerRenderer.render([]);
    for (const item of this.decorations) item.destroy();
    this.decorations = [];
    this.breakables.reset();
  }

  destroy(): void {
    this.clear();
    this.terrainRenderer.destroy();
    this.triggerRenderer.destroy();
    this.backgroundRenderer.destroy();
  }
}
