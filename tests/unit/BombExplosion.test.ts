import { describe, expect, it } from 'vitest';
import { calculateBlastEnergy, calculateBlastVelocityDelta, distanceToPatrolGeometry } from '../../src/physics/BombExplosion';

describe('bomb explosion falloff', () => {
  it('uses quadratic radial energy falloff and reaches zero at the blast radius', () => {
    expect(calculateBlastEnergy(40000, 300, 0)).toBe(40000);
    expect(calculateBlastEnergy(40000, 300, 150)).toBe(10000);
    expect(calculateBlastEnergy(40000, 300, 300)).toBe(0);
  });

  it('converts blast energy into a radial velocity change that depends on mass', () => {
    const delta = calculateBlastVelocityDelta({ x: 0, y: 0 }, { x: 3, y: 4 }, 2, 100);
    expect(delta.x).toBeCloseTo(6, 8);
    expect(delta.y).toBeCloseTo(8, 8);
    const heavier = calculateBlastVelocityDelta({ x: 0, y: 0 }, { x: 3, y: 4 }, 8, 100);
    expect(Math.hypot(heavier.x, heavier.y)).toBeCloseTo(5, 8);
  });

  it('measures distance to box and polygon surfaces rather than their centres', () => {
    expect(distanceToPatrolGeometry({ x: 4, y: 5 }, { type: 'box', x: 10, y: 0, width: 20, height: 10 })).toBe(6);
    expect(distanceToPatrolGeometry({ x: 5, y: 5 }, {
      type: 'polygon',
      vertices: [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10 }],
    })).toBe(5);
    expect(distanceToPatrolGeometry({ x: 15, y: 5 }, {
      type: 'polygon',
      vertices: [{ x: 10, y: 0 }, { x: 20, y: 0 }, { x: 20, y: 10 }, { x: 10, y: 10 }],
    })).toBe(0);
  });
});
