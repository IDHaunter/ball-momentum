import type { BodySnapshot, Vector2 } from './PhysicsTypes';

export interface IPhysicsBody {
  getSnapshot(): BodySnapshot;
  setPosition(position: Vector2): void;
  setVelocity(velocity: Vector2): void;
  addVelocityDelta(delta: Vector2): void;
  setAngularVelocity(value: number): void;
  setAwake(): void;
  destroy(): void;
}
