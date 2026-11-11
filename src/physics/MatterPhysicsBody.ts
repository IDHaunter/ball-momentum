import type { IPhysicsBody } from './IPhysicsBody';
import { PhysicsAdapter } from './PhysicsAdapter';
import type { BodySnapshot, Vector2 } from './PhysicsTypes';

export interface MatterBodyLike {
  position: Vector2;
  velocity: Vector2;
  angle: number;
  angularVelocity: number;
  label?: string;
  parent?: MatterBodyLike;
}

export interface MatterGameObjectLike {
  body: MatterBodyLike;
  setPosition(x: number, y: number): unknown;
  setVelocity(x: number, y: number): unknown;
  setAngularVelocity(value: number): unknown;
  setAwake(): unknown;
  destroy(): unknown;
}

export class MatterPhysicsBody implements IPhysicsBody {
  private destroyed = false;
  constructor(private readonly object: MatterGameObjectLike, private readonly onDestroy: () => void = () => undefined) {}

  getSnapshot(): BodySnapshot {
    const body = this.object.body;
    return {
      position: { x: body.position.x, y: body.position.y },
      velocity: PhysicsAdapter.fromMatterVelocity(body.velocity),
      angle: body.angle,
      angularVelocity: body.angularVelocity,
    };
  }

  setPosition(position: Vector2): void { this.object.setPosition(position.x, position.y); }

  setVelocity(velocity: Vector2): void {
    const matterVelocity = PhysicsAdapter.toMatterVelocity(velocity);
    this.object.setVelocity(matterVelocity.x, matterVelocity.y);
  }

  addVelocityDelta(delta: Vector2): void {
    const current = this.getSnapshot().velocity;
    this.setVelocity({ x: current.x + delta.x, y: current.y + delta.y });
  }

  setAngularVelocity(value: number): void { this.object.setAngularVelocity(value); }
  setAwake(): void { this.object.setAwake(); }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.object.destroy();
    this.onDestroy();
  }
}
