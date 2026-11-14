import { describe, expect, it } from 'vitest';
import {
  directionFromVelocity,
  hasPatrolGroundBelow,
  hasPatrolObstacleAhead,
  pointInsidePatrolGeometry,
} from '../../src/physics/BotPatrol';
import type { PatrolGeometry } from '../../src/physics/PhysicsTypes';

const platform: PatrolGeometry = { type: 'box', x: 100, y: 200, width: 100, height: 100 };
const triangle: PatrolGeometry = {
  type: 'polygon',
  vertices: [{ x: 220, y: 200 }, { x: 270, y: 150 }, { x: 320, y: 200 }, { x: 320, y: 300 }, { x: 220, y: 300 }],
};

describe('BotPatrol geometry', () => {
  it('detects points inside boxes and polygons', () => {
    expect(pointInsidePatrolGeometry({ x: 150, y: 220 }, platform)).toBe(true);
    expect(pointInsidePatrolGeometry({ x: 99, y: 220 }, platform)).toBe(false);
    expect(pointInsidePatrolGeometry({ x: 270, y: 190 }, triangle)).toBe(true);
    expect(pointInsidePatrolGeometry({ x: 230, y: 155 }, triangle)).toBe(false);
  });

  it('finds support below the current position but not beyond a platform edge', () => {
    expect(hasPatrolGroundBelow(180, 200, [platform])).toBe(true);
    expect(hasPatrolGroundBelow(215, 200, [platform])).toBe(false);
  });

  it('detects a wall in the direction of travel without treating the floor as a wall', () => {
    const wall: PatrolGeometry = { type: 'box', x: 200, y: 150, width: 20, height: 60 };
    expect(hasPatrolObstacleAhead(180, 184, 1, 16, [platform, wall])).toBe(true);
    expect(hasPatrolObstacleAhead(180, 184, 1, 16, [platform])).toBe(false);
    expect(hasPatrolObstacleAhead(180, 184, -1, 16, [platform, wall])).toBe(false);
  });

  it('uses post-collision horizontal velocity to choose the next patrol direction', () => {
    expect(directionFromVelocity(20, 1)).toBe(1);
    expect(directionFromVelocity(-20, 1)).toBe(-1);
    expect(directionFromVelocity(0, 1)).toBe(-1);
  });
});
