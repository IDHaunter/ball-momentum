import { describe, expect, it } from 'vitest';
import { getDirectHomingVelocity, getOutwardFragmentLaunchDirection } from '../../src/physics/RadiationFragmentGuidance';

describe('radiation fragment guidance', () => {
  it('points directly at the target with the configured constant speed', () => {
    expect(getDirectHomingVelocity({ x: 10, y: 10 }, { x: 10, y: 30 }, 250))
      .toEqual({ x: 0, y: 250 });
  });

  it('uses the previous heading as a stable fallback when the target overlaps the fragment', () => {
    expect(getDirectHomingVelocity({ x: 5, y: 5 }, { x: 5, y: 5 }, 120, { x: 3, y: 4 }))
      .toEqual({ x: 72, y: 96 });
  });

  it('spreads all six fragments into the hemisphere facing away from the floor', () => {
    const directions = Array.from({ length: 6 }, (_, index) =>
      getOutwardFragmentLaunchDirection({ x: 0, y: -1 }, index, 6, 0.5));

    expect(directions).toHaveLength(6);
    for (const direction of directions) {
      expect(direction.y).toBeLessThan(0);
      expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 8);
    }
    expect(new Set(directions.map(({ x, y }) => `${x.toFixed(5)}:${y.toFixed(5)}`)).size).toBe(6);
  });

  it('uses the outward normal of a wall or slope, not a hard-coded upward direction', () => {
    const direction = getOutwardFragmentLaunchDirection({ x: 1, y: 0 }, 3, 6, 0.5);
    expect(direction.x).toBeGreaterThan(0);
    expect(Math.hypot(direction.x, direction.y)).toBeCloseTo(1, 8);
  });
});
