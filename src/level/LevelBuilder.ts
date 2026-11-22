import type Phaser from 'phaser';
import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { LevelDefinition } from './LevelTypes';
import { TerrainFactory } from './TerrainFactory';
import { TriggerFactory } from './TriggerFactory';
import { PoopPickupFactory } from './PoopPickupFactory';
import { TerrainRenderer } from '../rendering/TerrainRenderer';
import { TriggerRenderer } from '../rendering/TriggerRenderer';
import { PoopPickupRenderer } from '../rendering/PoopPickupRenderer';
import { BackgroundRenderer } from '../rendering/BackgroundRenderer';
import { BreakableTerrainManager } from './BreakableTerrainManager';
import type { BreakableSolidDefinition, PoopPickupDefinition } from './LevelTypes';
import { getDemonSpawnPoints } from './DemonSpawnSelector';

export class LevelBuilder {
  private readonly terrainRenderer: TerrainRenderer;
  private readonly triggerRenderer: TriggerRenderer;
  private readonly poopPickupRenderer: PoopPickupRenderer;
  private readonly backgroundRenderer: BackgroundRenderer;
  private readonly terrainFactory: TerrainFactory;
  private readonly triggerFactory: TriggerFactory;
  private readonly poopPickupFactory: PoopPickupFactory;
  private decorations: Phaser.GameObjects.GameObject[] = [];
  private breakables = new BreakableTerrainManager([]);

  constructor(private readonly scene: Phaser.Scene, private readonly world: IPhysicsWorld) {
    this.terrainRenderer = new TerrainRenderer(scene);
    this.triggerRenderer = new TriggerRenderer(scene);
    this.poopPickupRenderer = new PoopPickupRenderer(scene);
    this.backgroundRenderer = new BackgroundRenderer(scene);
    this.terrainFactory = new TerrainFactory(world, this.terrainRenderer);
    this.triggerFactory = new TriggerFactory(world, this.triggerRenderer);
    this.poopPickupFactory = new PoopPickupFactory(world, this.poopPickupRenderer);
  }

  build(level: LevelDefinition): void {
    this.clear();
    this.breakables = new BreakableTerrainManager(level.solids);
    this.backgroundRenderer.render(level);
    this.terrainFactory.build(level);
    this.triggerFactory.build(level);
    this.poopPickupFactory.build(level.poopPickups ?? []);
    for (const rollingObject of level.rollingObjects ?? []) {
      this.world.createRollingObject({
        id: rollingObject.id,
        x: rollingObject.x,
        y: rollingObject.y,
        radius: rollingObject.radius,
        mass: rollingObject.mass,
        appearance: rollingObject.appearance ?? 'stone',
        friction: rollingObject.friction ?? 0.62,
        restitution: rollingObject.restitution ?? 0.08,
        killPlaneY: level.world.killPlaneY,
      });
    }
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
    for (const bird of level.birds ?? []) {
      this.world.createBird({
        id: bird.id,
        x: bird.x,
        y: bird.y,
        radius: bird.radius,
        mass: bird.mass,
        patrolSpeed: bird.patrolSpeed,
        attackSpeed: bird.attackSpeed,
        aggressive: bird.aggressive ?? false,
        detectionRadius: bird.detectionRadius,
        attackImpulse: bird.attackImpulse,
        direction: bird.direction ?? 1,
        restitution: bird.restitution ?? 0.48,
        friction: bird.friction ?? 0.02,
        killPlaneY: level.world.killPlaneY,
        patrolMinX: bird.patrolRange.minX,
        patrolMaxX: bird.patrolRange.maxX,
      });
    }
    for (const enemy of level.vomitEnemies ?? []) {
      this.world.createVomitEnemy({
        id: enemy.id,
        x: enemy.x,
        y: enemy.y,
        radius: enemy.radius,
        mass: enemy.mass,
        detectionRadius: enemy.detectionRadius,
        pulseImpulse: enemy.pulseImpulse,
        pulseIntervalSeconds: enemy.pulseIntervalSeconds,
        restitution: enemy.restitution ?? 0.18,
        friction: enemy.friction ?? 0.62,
        killPlaneY: level.world.killPlaneY,
      });
    }
    for (const demon of level.demonEnemies ?? []) {
      const spawnPoints = getDemonSpawnPoints(level.solids, demon.spawnArea, demon.radius);
      this.world.createDemonEnemy({
        id: demon.id,
        spawnArea: demon.spawnArea,
        spawnPoints,
        radius: demon.radius,
        mass: demon.mass,
        respawnIntervalSeconds: demon.respawnIntervalSeconds,
        telegraphSeconds: demon.telegraphSeconds ?? 1,
        attackDelaySeconds: demon.attackDelaySeconds ?? 0.5,
        activeSeconds: demon.activeSeconds ?? 4.0,
        attackRadius: demon.attackRadius,
        lightningImpulse: demon.lightningImpulse,
        collisionImpulse: demon.collisionImpulse ?? 520,
        restitution: demon.restitution ?? 0.12,
        friction: demon.friction ?? 0.46,
        killPlaneY: level.world.killPlaneY,
      });
    }
    for (const mechanism of level.platformSwitches ?? []) {
      this.world.createPlatformSwitch({
        id: mechanism.id,
        leverX: mechanism.lever.x,
        leverY: mechanism.lever.y,
        leverHeight: mechanism.lever.height ?? 48,
        minimumImpactSpeed: mechanism.lever.minimumImpactSpeed,
        initiallyEnabled: mechanism.lever.initialState === 'on',
        platformWidth: mechanism.platform.width,
        platformSurface: mechanism.platform.surface,
        platformSpeed: mechanism.platform.speed,
        platformPoints: mechanism.platform.points,
      });
    }
    for (const bomb of level.bombs ?? []) {
      this.world.createBomb({
        id: bomb.id,
        x: bomb.x,
        y: bomb.y,
        radius: bomb.radius,
        mass: bomb.mass,
        fuseSeconds: bomb.fuseSeconds,
        explosionRadius: bomb.explosionRadius,
        explosionEnergy: bomb.explosionEnergy,
        restitution: bomb.restitution ?? 0.58,
        friction: bomb.friction ?? 0.08,
        killPlaneY: level.world.killPlaneY,
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

  collectPoopPickup(id: string): PoopPickupDefinition | null {
    return this.poopPickupFactory.collect(id);
  }

  setReducedMotion(enabled: boolean): void {
    this.poopPickupRenderer.setReducedMotion(enabled);
    this.triggerRenderer.setReducedMotion(enabled);
  }

  activateCheckpoint(id: string): void {
    this.triggerRenderer.setActiveCheckpoint(id);
  }

  activateGoal(id: string): void {
    this.triggerRenderer.activateGoal(id);
  }

  update(deltaMs: number): void {
    this.triggerRenderer.update(deltaMs);
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
    this.backgroundRenderer.clear();
    this.terrainRenderer.clear();
    this.triggerRenderer.render([]);
    this.poopPickupFactory.clear();
    for (const item of this.decorations) item.destroy();
    this.decorations = [];
    this.breakables.reset();
  }

  destroy(): void {
    this.clear();
    this.terrainRenderer.destroy();
    this.triggerRenderer.destroy();
    this.poopPickupRenderer.destroy();
    this.backgroundRenderer.destroy();
  }
}
