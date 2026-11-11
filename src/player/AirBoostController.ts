import type { PhysicsConfig } from '../config/config.types';
import { clamp, lerp } from '../utils/MathUtils';
import type { IPhysicsBody } from '../physics/IPhysicsBody';
import type { BallState } from './BallModel';

export class AirBoostController {
  constructor(private readonly config: PhysicsConfig, private readonly state: BallState) {}

  apply(strength: number, nowMs: number, body: IPhysicsBody): boolean {
    if (this.state.grounded || !this.state.airBoostAvailable || this.state.airBoostUsed || this.state.takeoffAtMs === null) return false;
    const elapsed = nowMs - this.state.takeoffAtMs;
    const timing = this.timingMultiplier(elapsed);
    if (timing <= 0) return false;

    const strengthMultiplier = lerp(
      this.config.airBoost.minStrengthMultiplier,
      this.config.airBoost.maxStrengthMultiplier,
      clamp(strength, 0, 1),
    );
    const snapshot = body.getSnapshot();
    const nextY = Math.max(
      -this.config.airBoost.maxUpwardSpeed,
      snapshot.velocity.y - this.config.airBoost.velocityDelta * timing * strengthMultiplier,
    );
    body.setVelocity({ x: snapshot.velocity.x, y: nextY });
    body.setAwake();
    this.state.airBoostAvailable = false;
    this.state.airBoostUsed = true;
    return true;
  }

  timingMultiplier(elapsedMs: number): number {
    const cfg = this.config.airBoost;
    if (elapsedMs < cfg.earliestAfterTakeoffMs || elapsedMs >= cfg.latestAfterTakeoffMs) return 0;
    const sweetStart = cfg.sweetSpotAfterTakeoffMs - cfg.sweetSpotToleranceMs;
    const sweetEnd = cfg.sweetSpotAfterTakeoffMs + cfg.sweetSpotToleranceMs;
    if (elapsedMs >= sweetStart && elapsedMs <= sweetEnd) return 1;
    if (elapsedMs < sweetStart) {
      const span = Math.max(1, sweetStart - cfg.earliestAfterTakeoffMs);
      return lerp(cfg.edgeTimingMultiplier, 1, (elapsedMs - cfg.earliestAfterTakeoffMs) / span);
    }
    const span = Math.max(1, cfg.latestAfterTakeoffMs - sweetEnd);
    return lerp(1, cfg.edgeTimingMultiplier, (elapsedMs - sweetEnd) / span);
  }
}
