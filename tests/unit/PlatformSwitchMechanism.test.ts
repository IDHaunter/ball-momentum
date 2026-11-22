import { describe, expect, it } from 'vitest';
import { getPlatformSwitchTargetState, getPlatformWaypointVelocity } from '../../src/physics/PlatformSwitchMechanism';

describe('platform switch mechanism', () => {
  it('turns on from a sufficiently fast rightward impact and off from a leftward impact', () => {
    expect(getPlatformSwitchTargetState(300, 245)).toBe(true);
    expect(getPlatformSwitchTargetState(-300, 245)).toBe(false);
  });

  it('ignores weak, vertical-only, and invalid impact speeds', () => {
    expect(getPlatformSwitchTargetState(244, 245)).toBeNull();
    expect(getPlatformSwitchTargetState(0, 245)).toBeNull();
    expect(getPlatformSwitchTargetState(Number.NaN, 245)).toBeNull();
  });

  it('moves at a steady configured speed without overshooting a waypoint', () => {
    expect(getPlatformWaypointVelocity({ x: 0, y: 0 }, { x: 100, y: 0 }, 50, 0.5)).toEqual({
      velocity: { x: 50, y: 0 }, reachesTarget: false,
    });
    expect(getPlatformWaypointVelocity({ x: 90, y: 0 }, { x: 100, y: 0 }, 50, 0.5)).toEqual({
      velocity: { x: 20, y: 0 }, reachesTarget: true,
    });
  });
});
