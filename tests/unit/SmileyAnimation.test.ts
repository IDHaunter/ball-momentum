import { describe, expect, it } from 'vitest';
import { getSmileyAnimationFrame } from '../../src/rendering/SmileyAnimation';

describe('getSmileyAnimationFrame', () => {
  it('moves both pupils independently while keeping their gaze bounded', () => {
    const first = getSmileyAnimationFrame(0);
    const later = getSmileyAnimationFrame(0.7);

    expect(first.leftEye.pupilOffsetX).not.toBe(later.leftEye.pupilOffsetX);
    expect(first.rightEye.pupilOffsetY).not.toBe(later.rightEye.pupilOffsetY);
    for (const eye of [first.leftEye, first.rightEye]) {
      expect(Math.abs(eye.pupilOffsetX)).toBeLessThanOrEqual(0.068);
      expect(Math.abs(eye.pupilOffsetY)).toBeLessThanOrEqual(0.048);
    }
  });

  it('keeps the eyes wide open most of the time and performs an offset double blink', () => {
    const frame = getSmileyAnimationFrame(3.55);

    expect(frame.leftEye.verticalScale).toBeLessThan(0.1);
    expect(frame.rightEye.verticalScale).toBeGreaterThan(0.9);
    expect(frame.leftEye.verticalScale).toBeGreaterThanOrEqual(0.055);
    expect(getSmileyAnimationFrame(0).leftEye.verticalScale).toBe(1);
  });

  it('keeps one stable smile and only scales it subtly as the ball gains speed', () => {
    const idle = getSmileyAnimationFrame(0, 0);
    const fast = getSmileyAnimationFrame(0, 760);

    expect(idle.mouthScaleX).toBe(1);
    expect(idle.mouthScaleY).toBe(1);
    expect(fast.mouthScaleX).toBeGreaterThan(idle.mouthScaleX);
    expect(fast.mouthScaleX).toBeLessThanOrEqual(1.05);
    expect(fast.mouthScaleY).toBeGreaterThan(idle.mouthScaleY);
    expect(fast.mouthScaleY).toBeLessThanOrEqual(1.02);
  });

  it('reacts to impact with a subtle smooth widening instead of switching mouth shapes', () => {
    const normal = getSmileyAnimationFrame(0.7, 200, 0);
    const impact = getSmileyAnimationFrame(0.7, 200, 0.85);

    expect(impact.mouthScaleX).toBeGreaterThan(normal.mouthScaleX);
    expect(impact.mouthScaleX - normal.mouthScaleX).toBeLessThanOrEqual(0.03);
    expect(impact.mouthScaleY).toBe(normal.mouthScaleY);
    expect(impact.leftEye.verticalScale).toBe(normal.leftEye.verticalScale);
  });

  it('repeats its blink cycle deterministically', () => {
    const first = getSmileyAnimationFrame(1.25);
    const repeated = getSmileyAnimationFrame(1.25 + 4.7);

    expect(repeated.leftEye.verticalScale).toBeCloseTo(first.leftEye.verticalScale, 10);
    expect(repeated.rightEye.verticalScale).toBeCloseTo(first.rightEye.verticalScale, 10);
  });

  it('returns finite neutral values for invalid inputs', () => {
    const frame = getSmileyAnimationFrame(Number.NaN, Number.NaN, Number.NaN);
    const values = [
      frame.leftEye.eyeOffsetX, frame.leftEye.eyeOffsetY,
      frame.leftEye.pupilOffsetX, frame.leftEye.pupilOffsetY,
      frame.leftEye.verticalScale, frame.rightEye.verticalScale,
      frame.mouthScaleX, frame.mouthScaleY,
    ];
    expect(values.every(Number.isFinite)).toBe(true);
  });
});
