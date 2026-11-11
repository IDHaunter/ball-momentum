import { describe, expect, it } from 'vitest';
import { INPUT_DEFAULTS } from '../../src/config/input.defaults';
import { GestureRecognizer } from '../../src/input/GestureRecognizer';

const recognizer = new GestureRecognizer(INPUT_DEFAULTS);
const gesture = (dx: number, dy: number, durationMs = 200) => ({
  startX: 100, startY: 100, endX: 100 + dx, endY: 100 + dy,
  durationMs, source: 'mouse' as const, timestamp: 1000,
});

describe('GestureRecognizer', () => {
  it('ignores movement below the minimum distance', () => expect(recognizer.recognize(gesture(10, 0))).toBeNull());
  it('maps horizontal and vertical swipes to exactly one action', () => {
    expect(recognizer.recognize(gesture(90, 10))?.type).toBe('MOVE_RIGHT');
    expect(recognizer.recognize(gesture(-90, 10))?.type).toBe('MOVE_LEFT');
    expect(recognizer.recognize(gesture(10, 90))?.type).toBe('JUMP');
    expect(recognizer.recognize(gesture(10, -90))?.type).toBe('AIR_BOOST');
  });
  it('uses the dominant axis for diagonal gestures', () => expect(recognizer.recognize(gesture(70, 60))?.type).toBe('MOVE_RIGHT'));
  it('rejects gestures that take too long', () => expect(recognizer.recognize(gesture(90, 0, 900))).toBeNull());
  it('clamps strength to the normalized range', () => {
    expect(recognizer.recognize(gesture(500, 0))?.strength).toBe(1);
  });
});
