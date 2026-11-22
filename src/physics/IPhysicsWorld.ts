import type { BallPhysicsOptions, PhysicsEvent, SensorOptions, StaticBoxOptions, StaticPolygonOptions, MovableBoxOptions, BotPhysicsOptions, BirdPhysicsOptions, BombPhysicsOptions, VomitEnemyPhysicsOptions, DemonPhysicsOptions, PlatformSwitchPhysicsOptions, RollingObjectPhysicsOptions, SpikeSensorOptions, Vector2 } from './PhysicsTypes';
import type { IPhysicsBody } from './IPhysicsBody';

export interface IPhysicsWorld {
  step(fixedStepMs: number): void;
  createBall(position: Vector2, options: BallPhysicsOptions): IPhysicsBody;
  createStaticBox(definition: StaticBoxOptions): void;
  createStaticPolygon(definition: StaticPolygonOptions): void;
  createSpikeSensor(definition: SpikeSensorOptions): void;
  createMovableBox(definition: MovableBoxOptions): void;
  createBot(definition: BotPhysicsOptions): void;
  createBird(definition: BirdPhysicsOptions): void;
  createBomb(definition: BombPhysicsOptions): void;
  createRollingObject(definition: RollingObjectPhysicsOptions): void;
  createVomitEnemy(definition: VomitEnemyPhysicsOptions): void;
  createDemonEnemy(definition: DemonPhysicsOptions): void;
  createPlatformSwitch(definition: PlatformSwitchPhysicsOptions): void;
  removeTerrainBody(id: string): void;
  createSensor(definition: SensorOptions): void;
  removeSensor(id: string): void;
  removeLevelBodies(): void;
  setGravity(x: number, y: number, scale: number): void;
  setTimeScale(value: number): void;
  onPhysicsEvent(listener: (event: PhysicsEvent) => void): () => void;
}
