import { describe, expect, it } from 'vitest';
import {
  getBirdAttackInterceptPoint,
  getBirdChaseVelocity,
  getBirdGuardZone,
  getBirdTerritoryEgressDirection,
  isPointInsideBirdGuardZone,
} from '../../src/physics/BirdPatrol';

describe('BirdPatrol', () => {
  const zone = getBirdGuardZone(100, 300, 180, 100);

  it('builds a rectangular guard zone around the patrol segment', () => {
    expect(zone).toEqual({ left: 0, right: 400, top: 80, bottom: 280 });
    expect(isPointInsideBirdGuardZone({ x: 200, y: 205 }, zone)).toBe(true);
    expect(isPointInsideBirdGuardZone({ x: 200, y: 281 }, zone)).toBe(false);
    expect(isPointInsideBirdGuardZone({ x: 401, y: 180 }, zone)).toBe(false);
  });

  it('chooses the nearest horizontal exit so the guardian drives the ball off the patrol lane', () => {
    expect(getBirdTerritoryEgressDirection({ x: 200, y: 205 }, zone)).toEqual({ x: -1, y: 0 });
    expect(getBirdTerritoryEgressDirection({ x: 382, y: 170 }, zone)).toEqual({ x: 1, y: 0 });
    expect(getBirdTerritoryEgressDirection({ x: 18, y: 170 }, zone)).toEqual({ x: -1, y: 0 });
  });

  it('positions the bird behind the ball and normalizes attack velocity', () => {
    const exit = { x: 1, y: 0 };
    const target = getBirdAttackInterceptPoint({ x: 220, y: 205 }, 18, 17, exit);
    expect(target).toEqual({ x: 188, y: 205 });
    const velocity = getBirdChaseVelocity({ x: 220, y: 180 }, target, 260);
    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(260);
    expect(velocity.x).toBeLessThan(0);
  });
});
