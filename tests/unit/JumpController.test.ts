import { describe, expect, it } from 'vitest';
import { PHYSICS_DEFAULTS } from '../../src/config/physics.defaults';
import { createBallState } from '../../src/player/BallModel';
import { JumpController } from '../../src/player/JumpController';
import type { IPhysicsBody } from '../../src/physics/IPhysicsBody';

class FakeBody implements IPhysicsBody {
  velocity = { x: 0, y: 0 };
  getSnapshot() { return { position: { x: 10, y: 20 }, velocity: { ...this.velocity }, angle: 0, angularVelocity: 0 }; }
  setPosition(): void {}
  setVelocity(value: { x: number; y: number }): void { this.velocity = { ...value }; }
  addVelocityDelta(value: { x: number; y: number }): void { this.velocity.x += value.x; this.velocity.y += value.y; }
  setAngularVelocity(): void {}
  setAwake(): void {}
  destroy(): void {}
}

describe('JumpController', () => {
  it('waits for the anticipation window before launching', () => {
    const state = createBallState();
    state.grounded = true;
    const controller = new JumpController(PHYSICS_DEFAULTS, state);
    const body = new FakeBody();
    controller.requestJump(1, 100);
    expect(controller.updateBeforePhysics(159, body)).toBe(false);
    expect(controller.updateBeforePhysics(160, body)).toBe(true);
    expect(body.velocity.y).toBe(-PHYSICS_DEFAULTS.jump.baseVelocity * PHYSICS_DEFAULTS.jump.maxStrengthMultiplier);
    expect(state.takeoffAtMs).toBe(160);
    expect(state.airBoostAvailable).toBe(true);
  });

  it('accepts a jump during coyote time', () => {
    const state = createBallState();
    state.lastGroundedAtMs = 1000;
    const controller = new JumpController(PHYSICS_DEFAULTS, state);
    controller.requestJump(0.5, 1050);
    const body = new FakeBody();
    expect(controller.updateBeforePhysics(1110, body)).toBe(true);
  });

  it('buffers an early airborne jump until landing', () => {
    const state = createBallState();
    const controller = new JumpController(PHYSICS_DEFAULTS, state);
    const body = new FakeBody();
    controller.requestJump(1, 100);
    expect(state.pendingJumpUntilMs).toBe(220);
    controller.onLanding(180);
    expect(controller.updateBeforePhysics(240, body)).toBe(true);
    expect(body.velocity.y).toBe(-PHYSICS_DEFAULTS.jump.baseVelocity * PHYSICS_DEFAULTS.jump.maxStrengthMultiplier);
    expect(state.pendingJumpUntilMs).toBe(null);
  });
});
