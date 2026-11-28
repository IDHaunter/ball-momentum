import type { Vector2 } from './PhysicsTypes';

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
