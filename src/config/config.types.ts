export interface PhysicsConfig {
  timestep: { hz: number; maxFrameDeltaMs: number; maxSubStepsPerFrame: number };
  world: { gravityX: number; gravityY: number; gravityScale: number; timeScale: number };
  ball: { radiusPx: number; mass: number; restitution: number; friction: number; frictionStatic: number; frictionAir: number; fixedRotation: boolean };
  horizontalControl: { minVelocityDelta: number; maxVelocityDelta: number; maxHorizontalSpeed: number; airControlMultiplier: number; actionCooldownMs: number };
  drag: { groundHorizontalDragPerSecond: number; airHorizontalDragPerSecond: number };
  jump: { baseVelocity: number; minStrengthMultiplier: number; maxStrengthMultiplier: number; coyoteTimeMs: number; bufferTimeMs: number; anticipationMs: number };
  airBoost: { velocityDelta: number; minStrengthMultiplier: number; maxStrengthMultiplier: number; earliestAfterTakeoffMs: number; latestAfterTakeoffMs: number; sweetSpotAfterTakeoffMs: number; sweetSpotToleranceMs: number; edgeTimingMultiplier: number; maxUpwardSpeed: number };
  limits: { maxHorizontalSpeed: number; maxUpwardSpeed: number; maxDownwardSpeed: number };
  groundContact: { maxGroundAngleDegrees: number; supportGraceMs: number };
  wallBounce: { restitution: number; tangentRetention: number; minimumImpactSpeed: number };
}

export interface InputConfig {
  minimumSwipeDistancePx: number;
  maximumSwipeDistancePx: number;
  maximumSwipeDurationMs: number;
  keyboardActionCooldownMs: number;
}

export interface GameConfig {
  width: number;
  height: number;
  backgroundColor: string;
  levelIds: string[];
  initialLevelId: string;
  sandboxLevelId: string;
}

export interface RenderConfig {
  cameraSmoothing: number;
  horizontalAnchorRatio: number;
  showPhysicsBodiesByDefault: boolean;
  reducedMotion: boolean;
}
