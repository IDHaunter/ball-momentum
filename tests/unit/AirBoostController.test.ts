import { describe, expect, it } from 'vitest';
import { PHYSICS_DEFAULTS } from '../../src/config/physics.defaults';
import { createBallState } from '../../src/player/BallModel';
import { AirBoostController } from '../../src/player/AirBoostController';
import type { IPhysicsBody } from '../../src/physics/IPhysicsBody';

class FakeBody implements IPhysicsBody {
  velocity = { x: 80, y: -200 };
  getSnapshot() { return { position: { x: 0, y: 0 }, velocity: { ...this.velocity }, angle: 0, angularVelocity: 0 }; }
  setPosition(): void {}
  setVelocity(value: { x: number; y: number }): void { this.velocity = { ...value }; }
  addVelocityDelta(value: { x: number; y: number }): void { this.velocity.x += value.x; this.velocity.y += value.y; }
  setAngularVelocity(): void {}
  setAwake(): void {}
  destroy(): void {}
}

describe('AirBoostController', () => {
  it('has a strongest timing multiplier around the sweet spot', () => {
    const controller = new AirBoostController(PHYSICS_DEFAULTS, createBallState());
    expect(controller.timingMultiplier(440)).toBe(1);
    expect(controller.timingMultiplier(1000)).toBe(0);
    expect(controller.timingMultiplier(10)).toBe(0);
  });
  it('applies one boost and prevents a second boost during the same airtime', () => {
    const state = createBallState();
    state.grounded = false; state.takeoffAtMs = 1000; state.airBoostAvailable = true;
    const controller = new AirBoostController(PHYSICS_DEFAULTS, state);
    const body = new FakeBody();
    expect(controller.apply(0.5, 1440, body)).toBe(true);
    expect(body.velocity.y).toBeLessThan(-200);
    expect(controller.apply(0.5, 1450, body)).toBe(false);
  });
  it('rejects boosting while grounded', () => {
    const state = createBallState(); state.grounded = true; state.takeoffAtMs = 0; state.airBoostAvailable = true;
    expect(new AirBoostController(PHYSICS_DEFAULTS, state).apply(1, 440, new FakeBody())).toBe(false);
  });
});
