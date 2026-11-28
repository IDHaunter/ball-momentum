import type { Vector2 } from './PhysicsTypes';

/**
 * Returns a launch direction inside a wide hemisphere facing away from the
 * surface supporting the radioactive enemy. Each fragment owns one angular
 * slice, so the six shards spread across open space instead of clustering or
 * being launched into the floor they spawned on.
 *
 * `randomValue` is injected to keep the launch distribution deterministic in
 * unit tests. Values outside [0, 1] are safely clamped.
 */
export function getOutwardFragmentLaunchDirection(
  surfaceNormal: Vector2,
  fragmentIndex: number,
  fragmentCount: number,
  randomValue: number,
): Vector2 {
  const normalLength = Math.hypot(surfaceNormal.x, surfaceNormal.y);
  const normal = normalLength > 1e-6
    ? { x: surfaceNormal.x / normalLength, y: surfaceNormal.y / normalLength }
    : { x: 0, y: -1 };
  const count = Math.max(1, Math.floor(fragmentCount));
  const index = Math.min(count - 1, Math.max(0, Math.floor(fragmentIndex)));
  const sample = Math.max(0, Math.min(1, randomValue));

  // Keep a 18-degree safety margin from either tangent. This guarantees a
  // meaningful velocity component away from the surface, even for the two
  // outermost fragments.
  const maximumAngle = Math.PI * 0.4;
  const slicePosition = (index + sample) / count;
  const angleOffset = (slicePosition * 2 - 1) * maximumAngle;
  const baseAngle = Math.atan2(normal.y, normal.x);
  const angle = baseAngle + angleOffset;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** A deliberately simple homing rule: point directly at the target at fixed speed. */
export function getDirectHomingVelocity(
  position: Vector2,
  target: Vector2,
  speed: number,
  fallback: Vector2 = { x: 1, y: 0 },
): Vector2 {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy);
  const fallbackLength = Math.hypot(fallback.x, fallback.y) || 1;
  const direction = distance > 1e-6
    ? { x: dx / distance, y: dy / distance }
    : { x: fallback.x / fallbackLength, y: fallback.y / fallbackLength };
  return { x: direction.x * speed, y: direction.y * speed };
}
