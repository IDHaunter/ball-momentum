import type { InputConfig } from '../config/config.types';
import type { InputSource, PlayerAction } from './PlayerAction';

export interface PointerGesture {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  durationMs: number;
  source: InputSource;
  timestamp: number;
}

export class GestureRecognizer {
  constructor(private readonly config: InputConfig) {}

  recognize(gesture: PointerGesture): PlayerAction | null {
    const dx = gesture.endX - gesture.startX;
    const dy = gesture.endY - gesture.startY;
    const distance = Math.hypot(dx, dy);
    if (distance < this.config.minimumSwipeDistancePx) return null;
    if (gesture.durationMs > this.config.maximumSwipeDurationMs || gesture.durationMs < 0) return null;

    const strength = Math.max(0, Math.min(1,
      (distance - this.config.minimumSwipeDistancePx) /
      Math.max(1, this.config.maximumSwipeDistancePx - this.config.minimumSwipeDistancePx),
    ));

    let type: PlayerAction['type'];
    if (Math.abs(dx) > Math.abs(dy)) type = dx > 0 ? 'MOVE_RIGHT' : 'MOVE_LEFT';
    else type = dy > 0 ? 'JUMP' : 'AIR_BOOST';

    return { type, strength, source: gesture.source, timestamp: gesture.timestamp } as PlayerAction;
  }
}
