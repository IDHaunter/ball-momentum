import type { Vector2 } from './PhysicsTypes';

export interface BirdGuardZone {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** Builds the rectangular territory around a horizontal patrol segment. */
export function getBirdGuardZone(
  patrolMinX: number,
  patrolMaxX: number,
  patrolY: number,
  detectionRadius: number,
): BirdGuardZone {
  return {
    left: patrolMinX - detectionRadius,
    right: patrolMaxX + detectionRadius,
    top: patrolY - detectionRadius,
    bottom: patrolY + detectionRadius,
  };
}

export function isPointInsideBirdGuardZone(point: Vector2, zone: BirdGuardZone): boolean {
  return point.x >= zone.left && point.x <= zone.right
    && point.y >= zone.top && point.y <= zone.bottom;
}

/**
 * The patrol is horizontal, so a guardian drives intruders toward one of the
 * two ends of the protected lane. Keeping egress horizontal also avoids
 * pushing a ball down into the very platform that forms the bird's nest.
 */
export function getBirdTerritoryEgressDirection(point: Vector2, zone: BirdGuardZone): Vector2 {
  const distanceToLeft = point.x - zone.left;
  const distanceToRight = zone.right - point.x;
  return distanceToLeft <= distanceToRight
    ? { x: -1, y: 0 }
    : { x: 1, y: 0 };
}

export function getBirdAttackInterceptPoint(
  ballPosition: Vector2,
  ballRadius: number,
  birdRadius: number,
  egressDirection: Vector2,
  clearance = 3,
): Vector2 {
  const standOff = Math.max(0, ballRadius + birdRadius - clearance);
  return {
    x: ballPosition.x - egressDirection.x * standOff,
    y: ballPosition.y - egressDirection.y * standOff,
  };
}

export function getBirdChaseVelocity(from: Vector2, target: Vector2, speed: number): Vector2 {
  const dx = target.x - from.x;
  const dy = target.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length <= 0.001 || speed <= 0) return { x: 0, y: 0 };
  const scale = speed / length;
  return { x: dx * scale, y: dy * scale };
}
