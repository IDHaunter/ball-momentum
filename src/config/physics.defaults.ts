import type { PhysicsConfig } from './config.types';

export const PHYSICS_DEFAULTS: PhysicsConfig = {
  timestep: { hz: 60, maxFrameDeltaMs: 100, maxSubStepsPerFrame: 5 },
  world: { gravityX: 0, gravityY: 1, gravityScale: 0.001, timeScale: 1 },
  ball: { radiusPx: 18, mass: 1, restitution: 0.05, friction: 0.8, frictionStatic: 0.8, frictionAir: 0, fixedRotation: false },
  horizontalControl: { minVelocityDelta: 65, maxVelocityDelta: 180, maxHorizontalSpeed: 840, airControlMultiplier: 0.75, actionCooldownMs: 70 },
  drag: { groundHorizontalDragPerSecond: 0.85, airHorizontalDragPerSecond: 0.10 },
  jump: { baseVelocity: 540, minStrengthMultiplier: 0.85, maxStrengthMultiplier: 1.15, coyoteTimeMs: 100, bufferTimeMs: 120, anticipationMs: 60 },
  airBoost: { velocityDelta: 210, minStrengthMultiplier: 0.8, maxStrengthMultiplier: 1.2, earliestAfterTakeoffMs: 60, latestAfterTakeoffMs: 1000, sweetSpotAfterTakeoffMs: 440, sweetSpotToleranceMs: 180, edgeTimingMultiplier: 0.65, maxUpwardSpeed: 900 },
  limits: { maxHorizontalSpeed: 840, maxUpwardSpeed: 900, maxDownwardSpeed: 1100 },
  groundContact: { maxGroundAngleDegrees: 55, supportGraceMs: 35 },
  wallBounce: { restitution: 0.86, tangentRetention: 0.98, spinRetention: 0.85, minimumImpactSpeed: 10, minimumOutgoingSpeed: 125, separationDistancePx: 3 },
  landingBounce: { restitution: 0.52, tangentRetention: 0.96, minimumImpactSpeed: 45, minimumOutgoingSpeed: 35, maxBounces: 3, separationDistancePx: 1.5 },
  breakableTerrain: { velocityRetention: 0.72, separationDistancePx: 5 },
};

export function createPhysicsConfig(): PhysicsConfig {
  return structuredClone(PHYSICS_DEFAULTS);
}
