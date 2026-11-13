import { describe, expect, it } from 'vitest';
import { calculateNormalImpactEnergy } from '../../src/physics/ImpactEnergy';

describe('calculateNormalImpactEnergy', () => {
  it('uses the square of the velocity component perpendicular to the surface', () => {
    expect(calculateNormalImpactEnergy(600, 1)).toBe(180000);
    expect(calculateNormalImpactEnergy(300, 1)).toBe(45000);
  });

  it('makes a glancing hit weaker than a perpendicular hit at the same speed', () => {
    const speed = 800;
    const perpendicular = calculateNormalImpactEnergy(speed, 1);
    const atSixtyDegrees = calculateNormalImpactEnergy(speed * Math.cos(Math.PI / 3), 1);
    expect(atSixtyDegrees).toBeCloseTo(perpendicular * 0.25, 5);
  });

  it('returns zero for invalid or non-positive mass values', () => {
    expect(calculateNormalImpactEnergy(500, 0)).toBe(0);
    expect(calculateNormalImpactEnergy(Number.NaN, 1)).toBe(0);
    expect(calculateNormalImpactEnergy(-500, 1)).toBe(0);
  });
});
