import type { BallPhysicsOptions, PhysicsEvent, SensorOptions, StaticBoxOptions, StaticPolygonOptions, Vector2 } from './PhysicsTypes';
import type { IPhysicsBody } from './IPhysicsBody';

export interface IPhysicsWorld {
  step(fixedStepMs: number): void;
  createBall(position: Vector2, options: BallPhysicsOptions): IPhysicsBody;
  createStaticBox(definition: StaticBoxOptions): void;
  createStaticPolygon(definition: StaticPolygonOptions): void;
  removeTerrainBody(id: string): void;
  createSensor(definition: SensorOptions): void;
  removeLevelBodies(): void;
  setGravity(x: number, y: number, scale: number): void;
  setTimeScale(value: number): void;
  onPhysicsEvent(listener: (event: PhysicsEvent) => void): () => void;
}
