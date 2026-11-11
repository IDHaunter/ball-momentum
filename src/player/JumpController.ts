import type { PhysicsConfig } from '../config/config.types';
import { clamp, lerp } from '../utils/MathUtils';
import type { IPhysicsBody } from '../physics/IPhysicsBody';
import type { BallState } from './BallModel';

export class JumpController {
  private launchAtMs: number | null = null;
  private launchStrength = 0.5;

  constructor(private readonly config: PhysicsConfig, private readonly state: BallState) {}

  requestJump(strength: number, nowMs: number): void {
    if (this.launchAtMs !== null) return;
    const withinCoyote = nowMs - this.state.lastGroundedAtMs <= this.config.jump.coyoteTimeMs;
    if (this.state.grounded || withinCoyote) {
      this.scheduleLaunch(strength, nowMs);
      return;
    }
    this.state.pendingJumpUntilMs = nowMs + this.config.jump.bufferTimeMs;
    this.state.pendingJumpStrength = clamp(strength, 0, 1);
  }

  updateBeforePhysics(nowMs: number, body: IPhysicsBody): boolean {
    if (this.launchAtMs === null || nowMs < this.launchAtMs) return false;
    const multiplier = lerp(
      this.config.jump.minStrengthMultiplier,
      this.config.jump.maxStrengthMultiplier,
      clamp(this.launchStrength, 0, 1),
    );
    const current = body.getSnapshot().velocity;
    body.setVelocity({ x: current.x, y: -this.config.jump.baseVelocity * multiplier });
    body.setAwake();
    this.state.grounded = false;
    this.state.takeoffAtMs = nowMs;
    this.state.airBoostAvailable = true;
    this.state.airBoostUsed = false;
    this.state.pendingJumpUntilMs = null;
    this.launchAtMs = null;
    return true;
  }

  onLanding(nowMs: number): void {
    this.state.lastGroundedAtMs = nowMs;
    this.state.airBoostAvailable = false;
    this.state.airBoostUsed = false;
    this.state.takeoffAtMs = null;
    if (this.state.pendingJumpUntilMs !== null && this.state.pendingJumpUntilMs >= nowMs) {
      this.scheduleLaunch(this.state.pendingJumpStrength, nowMs);
      this.state.pendingJumpUntilMs = null;
      this.state.pendingJumpStrength = 0.5;
    } else if (this.state.pendingJumpUntilMs !== null) {
      this.state.pendingJumpUntilMs = null;
      this.state.pendingJumpStrength = 0.5;
    }
  }

  reset(): void {
    this.launchAtMs = null;
    this.launchStrength = 0.5;
    this.state.pendingJumpUntilMs = null;
    this.state.pendingJumpStrength = 0.5;
    this.state.takeoffAtMs = null;
    this.state.airBoostAvailable = false;
    this.state.airBoostUsed = false;
  }

  private scheduleLaunch(strength: number, nowMs: number): void {
    this.launchStrength = clamp(strength, 0, 1);
    this.launchAtMs = nowMs + this.config.jump.anticipationMs;
  }
}
