import type { PatrolGeometry, Vector2 } from './PhysicsTypes';
import { pointInsidePatrolGeometry } from './BotPatrol';

/**
 * Quadratic radial falloff used by bomb blasts. Energy is strongest at the
 * epicentre and reaches zero at the configured radius.
 */
export function calculateBlastEnergy(
  explosionEnergy: number,
  explosionRadius: number,
  distance: number,
): number {
  if (!(explosionEnergy > 0) || !(explosionRadius > 0) || distance >= explosionRadius) return 0;
  const attenuation = Math.max(0, 1 - Math.max(0, distance) / explosionRadius);
  return explosionEnergy * attenuation * attenuation;
}

/** Convert blast energy into a radial velocity change for a body of given mass. */
export function calculateBlastVelocityDelta(
  origin: Vector2,
  target: Vector2,
  mass: number,
  energyAtTarget: number,
): Vector2 {
  if (!(mass > 0) || !(energyAtTarget > 0)) return { x: 0, y: 0 };
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const distance = Math.hypot(dx, dy);
  const normal = distance > 1e-6 ? { x: dx / distance, y: dy / distance } : { x: 0, y: -1 };
  const speed = Math.sqrt((2 * energyAtTarget) / mass);
  return { x: normal.x * speed, y: normal.y * speed };
}

/** Shortest distance from a point to the outside of an axis-aligned or polygon collider. */
export function distanceToPatrolGeometry(point: Vector2, geometry: PatrolGeometry): number {
  if (pointInsidePatrolGeometry(point, geometry)) return 0;
  if (geometry.type === 'box') {
    const closestX = Math.max(geometry.x, Math.min(geometry.x + geometry.width, point.x));
    const closestY = Math.max(geometry.y, Math.min(geometry.y + geometry.height, point.y));
    return Math.hypot(point.x - closestX, point.y - closestY);
  }

  let minimum = Number.POSITIVE_INFINITY;
  const vertices = geometry.vertices;
  for (let index = 0; index < vertices.length; index += 1) {
    const a = vertices[index];
    const b = vertices[(index + 1) % vertices.length];
    const abX = b.x - a.x;
    const abY = b.y - a.y;
    const lengthSquared = abX * abX + abY * abY;
    const t = lengthSquared > 0
      ? Math.max(0, Math.min(1, ((point.x - a.x) * abX + (point.y - a.y) * abY) / lengthSquared))
      : 0;
    const nearestX = a.x + abX * t;
    const nearestY = a.y + abY * t;
    minimum = Math.min(minimum, Math.hypot(point.x - nearestX, point.y - nearestY));
  }
  return minimum;
}
