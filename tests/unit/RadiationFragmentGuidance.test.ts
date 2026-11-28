import { describe, expect, it } from 'vitest';
import { getDirectHomingVelocity } from '../../src/physics/RadiationFragmentGuidance';

describe('radiation fragment guidance', () => {
  it('points directly at the target with the configured constant speed', () => {
    expect(getDirectHomingVelocity({ x: 10, y: 10 }, { x: 10, y: 30 }, 250))
      .toEqual({ x: 0, y: 250 });
  });

  it('uses the previous heading as a stable fallback when the target overlaps the fragment', () => {
    expect(getDirectHomingVelocity({ x: 5, y: 5 }, { x: 5, y: 5 }, 120, { x: 3, y: 4 }))
      .toEqual({ x: 72, y: 96 });
  });
});
