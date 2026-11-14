import type { PatrolGeometry, Vector2 } from './PhysicsTypes';

/** Point-in-shape helper used by autonomous bots to detect platform support. */
export function pointInsidePatrolGeometry(point: Vector2, geometry: PatrolGeometry): boolean {
  if (geometry.type === 'box') {
    return point.x >= geometry.x
      && point.x <= geometry.x + geometry.width
      && point.y >= geometry.y
      && point.y <= geometry.y + geometry.height;
  }

  let inside = false;
  const vertices = geometry.vertices;
  for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
    const a = vertices[i];
    const b = vertices[j];
    const intersects = (a.y > point.y) !== (b.y > point.y)
      && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/**
 * Checks whether a small vertical probe below a patrol point reaches terrain.
 * The search distance tolerates uneven surfaces and small descents without
 * allowing a bot to walk over a real gap.
 */
export function hasPatrolGroundBelow(
  x: number,
  startY: number,
  geometries: PatrolGeometry[],
  searchDistance = 42,
  step = 6,
): boolean {
  for (let offset = 2; offset <= searchDistance; offset += step) {
    const probe = { x, y: startY + offset };
    if (geometries.some((geometry) => pointInsidePatrolGeometry(probe, geometry))) return true;
  }
  return false;
}

/** Checks the bot's forward centre corridor for an obstacle, excluding its floor. */
export function hasPatrolObstacleAhead(
  x: number,
  y: number,
  direction: -1 | 1,
  radius: number,
  geometries: PatrolGeometry[],
): boolean {
  const probeX = x + direction * (radius + 7);
  const probeYs = [y - radius * 0.55, y, y + radius * 0.2];
  return probeYs.some((probeY) => geometries.some((geometry) =>
    pointInsidePatrolGeometry({ x: probeX, y: probeY }, geometry),
  ));
}

/** Normalizes a horizontal direction after a collision response. */
export function directionFromVelocity(velocityX: number, fallback: -1 | 1): -1 | 1 {
  if (velocityX > 0.5) return 1;
  if (velocityX < -0.5) return -1;
  return fallback === 1 ? -1 : 1;
}
