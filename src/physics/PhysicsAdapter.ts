import { FIXED_STEP_SECONDS } from '../utils/TimeUtils';
import type { Vector2 } from './PhysicsTypes';

export class PhysicsAdapter {
  static toMatterVelocity(value: Vector2): Vector2 {
    return { x: value.x * FIXED_STEP_SECONDS, y: value.y * FIXED_STEP_SECONDS };
  }

  static fromMatterVelocity(value: Vector2): Vector2 {
    return { x: value.x / FIXED_STEP_SECONDS, y: value.y / FIXED_STEP_SECONDS };
  }
}
