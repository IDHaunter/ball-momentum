import { describe, expect, it } from 'vitest';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';

describe('PhysicsAdapter', () => {
  it('converts pixels per second to Matter per-step velocity and back', () => {
    const original = { x: 540, y: -300 };
    const matter = PhysicsAdapter.toMatterVelocity(original);
    expect(matter.x).toBeCloseTo(9);
    expect(matter.y).toBeCloseTo(-5);
    expect(PhysicsAdapter.fromMatterVelocity(matter)).toEqual(original);
  });
});
