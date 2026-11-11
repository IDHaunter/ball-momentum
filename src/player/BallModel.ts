export interface BallState {
  grounded: boolean;
  lastGroundedAtMs: number;
  takeoffAtMs: number | null;
  airBoostAvailable: boolean;
  airBoostUsed: boolean;
  pendingJumpUntilMs: number | null;
  pendingJumpStrength: number;
  horizontalActionReadyAtMs: number;
}

export function createBallState(): BallState {
  return {
    grounded: false,
    lastGroundedAtMs: -Infinity,
    takeoffAtMs: null,
    airBoostAvailable: false,
    airBoostUsed: false,
    pendingJumpUntilMs: null,
    pendingJumpStrength: 0.5,
    horizontalActionReadyAtMs: 0,
  };
}
