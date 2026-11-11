import { describe, expect, it } from 'vitest';
import { createPhysicsConfig } from '../../src/config/physics.defaults';
import { GameClock } from '../../src/core/GameClock';
import type { PlayerAction } from '../../src/input/PlayerAction';
import { BallController } from '../../src/player/BallController';
import type { IPhysicsBody } from '../../src/physics/IPhysicsBody';
import type { IPhysicsWorld } from '../../src/physics/IPhysicsWorld';
import type { BallPhysicsOptions, PhysicsEvent, SensorOptions, StaticBoxOptions, StaticPolygonOptions, Vector2 } from '../../src/physics/PhysicsTypes';

class FakeBody implements IPhysicsBody {
  position: Vector2;
  velocity: Vector2 = { x: 0, y: 0 };
  angle = 0;
  angularVelocity = 0;
  destroyed = false;
  constructor(position: Vector2) { this.position = { ...position }; }
  getSnapshot() { return { position: { ...this.position }, velocity: { ...this.velocity }, angle: this.angle, angularVelocity: this.angularVelocity }; }
  setPosition(value: Vector2): void { this.position = { ...value }; }
  setVelocity(value: Vector2): void { this.velocity = { ...value }; }
  addVelocityDelta(value: Vector2): void { this.velocity.x += value.x; this.velocity.y += value.y; }
  setAngularVelocity(value: number): void { this.angularVelocity = value; }
  setAwake(): void {}
  destroy(): void { this.destroyed = true; }
}

class FakeWorld implements IPhysicsWorld {
  body: FakeBody | null = null;
  private readonly listeners = new Set<(event: PhysicsEvent) => void>();
  step(): void {}
  createBall(position: Vector2, _options: BallPhysicsOptions): IPhysicsBody { this.body = new FakeBody(position); return this.body; }
  createStaticBox(_definition: StaticBoxOptions): void {}
  createStaticPolygon(_definition: StaticPolygonOptions): void {}
  createSensor(_definition: SensorOptions): void {}
  removeLevelBodies(): void {}
  setGravity(): void {}
  setTimeScale(): void {}
  onPhysicsEvent(listener: (event: PhysicsEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
}

const action = (type: 'MOVE_LEFT' | 'MOVE_RIGHT', strength: number): PlayerAction => ({
  type, strength, source: 'keyboard', timestamp: 0,
});

describe('BallController', () => {
  it('converts direction changes into additive horizontal momentum', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const ball = new BallController(world, createPhysicsConfig(), clock, { x: 20, y: 20 });
    ball.state.grounded = true;
    ball.stepBeforePhysics([action('MOVE_RIGHT', 0.5)]);
    expect(ball.snapshot.velocity.x).toBeGreaterThan(0);
    clock.advance(100);
    ball.stepBeforePhysics([action('MOVE_LEFT', 1)]);
    expect(ball.snapshot.velocity.x).toBeLessThan(0);
    ball.dispose();
  });

  it('clears velocity and transient jump state after a reset', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const ball = new BallController(world, createPhysicsConfig(), clock, { x: 20, y: 20 });
    ball.currentBody.setVelocity({ x: 400, y: -200 });
    ball.state.takeoffAtMs = 50;
    ball.state.airBoostAvailable = true;
    ball.resetAt(300, 120);
    expect(ball.snapshot.position).toEqual({ x: 300, y: 120 });
    expect(ball.snapshot.velocity).toEqual({ x: 0, y: 0 });
    expect(ball.state.takeoffAtMs).toBe(null);
    expect(ball.state.airBoostAvailable).toBe(false);
    ball.dispose();
  });
});
