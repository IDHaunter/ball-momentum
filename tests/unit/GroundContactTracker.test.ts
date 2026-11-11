import { describe, expect, it } from 'vitest';
import { createPhysicsConfig } from '../../src/config/physics.defaults';
import { GroundContactTracker } from '../../src/physics/GroundContactTracker';

describe('GroundContactTracker', () => {
  it('recognizes an upward-facing floor contact as grounded', () => {
    const tracker = new GroundContactTracker(createPhysicsConfig());
    tracker.handle({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE', terrainId: 'floor',
      supportNormal: { x: 0, y: -1 }, impactSpeed: 0,
    }, 100);

    expect(tracker.isGrounded(100)).toBe(true);
  });

  it('does not treat a ceiling underside contact as ground support', () => {
    const tracker = new GroundContactTracker(createPhysicsConfig());
    tracker.handle({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE', terrainId: 'ceiling',
      supportNormal: { x: 0, y: 1 }, impactSpeed: 0,
    }, 100);

    expect(tracker.isGrounded(100)).toBe(false);
  });

  it('retains support only for the configured grace interval', () => {
    const tracker = new GroundContactTracker(createPhysicsConfig());
    tracker.handle({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE', terrainId: 'floor',
      supportNormal: { x: 0, y: -1 }, impactSpeed: 0,
    }, 100);

    expect(tracker.isGrounded(135)).toBe(true);
    expect(tracker.isGrounded(136)).toBe(false);
  });
});
