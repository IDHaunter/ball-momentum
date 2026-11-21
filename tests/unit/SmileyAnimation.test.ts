import { describe, expect, it } from 'vitest';
import { getSmileyAnimationFrame, getSmileyImpactExpression, shouldTriggerSmileySurprise, SMILEY_SURPRISE_IMPACT_THRESHOLD } from '../../src/rendering/SmileyAnimation';

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

  it('triggers the surprised face only for substantial impacts', () => {
    expect(SMILEY_SURPRISE_IMPACT_THRESHOLD).toBe(260);
    expect(shouldTriggerSmileySurprise(259.9)).toBe(false);
    expect(shouldTriggerSmileySurprise(260)).toBe(true);
    expect(shouldTriggerSmileySurprise(520)).toBe(true);
    expect(shouldTriggerSmileySurprise(Number.NaN)).toBe(false);
    expect(shouldTriggerSmileySurprise(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('repeats its blink cycle deterministically', () => {
    const first = getSmileyAnimationFrame(1.25);
    const repeated = getSmileyAnimationFrame(1.25 + 4.7);

    expect(repeated.leftEye.verticalScale).toBeCloseTo(first.leftEye.verticalScale, 10);
    expect(repeated.rightEye.verticalScale).toBeCloseTo(first.rightEye.verticalScale, 10);
  });

  it('returns finite neutral values for invalid inputs', () => {
    const frame = getSmileyAnimationFrame(Number.NaN, Number.NaN);
    const values = [
      frame.leftEye.eyeOffsetX, frame.leftEye.eyeOffsetY,
      frame.leftEye.pupilOffsetX, frame.leftEye.pupilOffsetY,
      frame.leftEye.verticalScale, frame.rightEye.verticalScale,
      frame.mouthScaleX, frame.mouthScaleY,
    ];
    expect(values.every(Number.isFinite)).toBe(true);
  });
});


describe('getSmileyImpactExpression', () => {
  it('never cross-fades the normal smile with the surprised O mouth', () => {
    for (let step = 0; step <= 100; step += 1) {
      const remaining = step / 100;
      const expression = getSmileyImpactExpression(remaining);
      expect(expression.smileAlpha * expression.surpriseMouthAlpha).toBe(0);
      expect(expression.smileAlpha + expression.surpriseMouthAlpha).toBeLessThanOrEqual(1);
    }
  });

  it('hides the smile immediately, fades the O in and out, then restores the smile', () => {
    const atImpact = getSmileyImpactExpression(1);
    const entering = getSmileyImpactExpression(0.94);
    const held = getSmileyImpactExpression(0.5);
    const exiting = getSmileyImpactExpression(0.11);
    const restored = getSmileyImpactExpression(0);

    expect(atImpact.smileAlpha).toBe(0);
    expect(atImpact.surpriseMouthAlpha).toBe(0);
    expect(entering.smileAlpha).toBe(0);
    expect(entering.surpriseMouthAlpha).toBeGreaterThan(0);
    expect(held.surpriseMouthAlpha).toBe(1);
    expect(exiting.smileAlpha).toBe(0);
    expect(exiting.surpriseMouthAlpha).toBeGreaterThan(0);
    expect(restored).toEqual({ smileAlpha: 1, surpriseMouthAlpha: 0, eyeScale: 1 });
  });

  it('returns safe expression values for invalid timer input', () => {
    expect(getSmileyImpactExpression(Number.NaN)).toEqual({
      smileAlpha: 1, surpriseMouthAlpha: 0, eyeScale: 1,
    });
  });
});
