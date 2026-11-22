import type { Vector2 } from './PhysicsTypes';

/** Returns ON for a sufficiently fast hit from the left, OFF for a hit from the right. */
export function getPlatformSwitchTargetState(horizontalSpeed: number, minimumImpactSpeed: number): boolean | null {
  if (!Number.isFinite(horizontalSpeed) || Math.abs(horizontalSpeed) < minimumImpactSpeed) return null;
  return horizontalSpeed > 0;
}

/** Constant-speed travel for one fixed physics step, clamped at the waypoint. */
export function getPlatformWaypointVelocity(
  position: Vector2,
  target: Vector2,
  speed: number,
  stepSeconds: number,
): { velocity: Vector2; reachesTarget: boolean } {
  const dx = target.x - position.x;
  const dy = target.y - position.y;
  const distance = Math.hypot(dx, dy);
  if (distance < 0.001 || stepSeconds <= 0 || speed <= 0) {
    return { velocity: { x: 0, y: 0 }, reachesTarget: true };
  }
  const stepDistance = speed * stepSeconds;
  const stepSpeed = Math.min(speed, distance / stepSeconds);
  return {
    velocity: { x: dx / distance * stepSpeed, y: dy / distance * stepSpeed },
    reachesTarget: distance <= stepDistance + 0.75,
  };
}
