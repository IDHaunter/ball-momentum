/** Pure animation values for the goofy, wide-eyed Smiley skin. All offsets are radius-relative. */
export interface SmileyEyeAnimation {
  eyeOffsetX: number;
  eyeOffsetY: number;
  pupilOffsetX: number;
  pupilOffsetY: number;
  verticalScale: number;
}

export const SMILEY_SURPRISE_IMPACT_THRESHOLD = 260;

export interface SmileyImpactExpression {
  /** Alpha of the normal smile. It stays hidden for the complete surprise reaction. */
  smileAlpha: number;
  /** Alpha of the surprised O mouth, faded in and out without overlapping the smile. */
  surpriseMouthAlpha: number;
  /** Eye scale follows the visible strength of the surprised expression. */
  eyeScale: number;
}

/**
 * Returns mutually-exclusive mouth visibility for the remaining impact timer.
 * The normal smile is hidden immediately and only returns after the O mouth
 * has completely faded out, preventing the two mouth sprites from crossing.
 */
export function getSmileyImpactExpression(remainingFraction: number): SmileyImpactExpression {
  const remaining = clamp(Number.isFinite(remainingFraction) ? remainingFraction : 0, 0, 1);
  if (remaining <= 0) {
    return { smileAlpha: 1, surpriseMouthAlpha: 0, eyeScale: 1 };
  }

  // Reserve a short entrance and exit fade for the O mouth. The smile remains
  // fully hidden throughout both fades so there can never be two mouths at once.
  const fadeIn = clamp((1 - remaining) / 0.12, 0, 1);
  const fadeOut = clamp(remaining / 0.22, 0, 1);
  const surpriseMouthAlpha = Math.min(fadeIn, fadeOut);
  return {
    smileAlpha: 0,
    surpriseMouthAlpha,
    eyeScale: 1 + surpriseMouthAlpha * 0.25,
  };
}

export function shouldTriggerSmileySurprise(impactSpeed: number): boolean {
  return Number.isFinite(impactSpeed) && impactSpeed >= SMILEY_SURPRISE_IMPACT_THRESHOLD;
}

export interface SmileyAnimationFrame {
  leftEye: SmileyEyeAnimation;
  rightEye: SmileyEyeAnimation;
  mouthScaleX: number;
  mouthScaleY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function pulseAt(phase: number, centre: number, duration: number): number {
  const distance = Math.abs(phase - centre);
  if (distance >= duration * 0.5) return 0;
  const linear = 1 - distance / (duration * 0.5);
  return linear * linear * (3 - 2 * linear);
}

function blinkAmount(timeSeconds: number, offset: number): number {
  const period = 4.7;
  const phase = ((timeSeconds + offset) % period + period) % period;
  return Math.max(
    pulseAt(phase, 3.55, 0.14),
    pulseAt(phase, 3.78, 0.11) * 0.72,
  );
}

function eyeAnimation(timeSeconds: number, phase: number): SmileyEyeAnimation {
  const blink = blinkAmount(timeSeconds, phase);
  // Independent, slightly erratic pupil movement gives the face a goofy, alert look.
  const gazeX = Math.sin(timeSeconds * 1.9 + phase) * 0.052
    + Math.sin(timeSeconds * 4.25 + phase * 2.2) * 0.012;
  const gazeY = Math.cos(timeSeconds * 1.55 + phase) * 0.034
    + Math.sin(timeSeconds * 3.4 + phase) * 0.009;
  return {
    eyeOffsetX: Math.sin(timeSeconds * 1.35 + phase) * 0.006,
    eyeOffsetY: Math.cos(timeSeconds * 2.05 + phase) * 0.009,
    pupilOffsetX: clamp(gazeX, -0.068, 0.068),
    pupilOffsetY: clamp(gazeY, -0.048, 0.048),
    verticalScale: Math.max(0.055, 1 - blink * 0.945),
  };
}

/** Idle facial motion. Impact expression is layered separately by BallRenderer. */
export function getSmileyAnimationFrame(
  timeSeconds: number,
  speedPxPerSecond = 0,
): SmileyAnimationFrame {
  const safeTime = Number.isFinite(timeSeconds) ? Math.max(0, timeSeconds) : 0;
  const safeSpeed = Number.isFinite(speedPxPerSecond) ? Math.max(0, speedPxPerSecond) : 0;
  const speed = clamp(safeSpeed / 760, 0, 1);
  return {
    leftEye: eyeAnimation(safeTime, 0),
    rightEye: eyeAnimation(safeTime, 0.42),
    // Speed only gives the normal smile a subtle, stable widening.
    mouthScaleX: 1 + speed * 0.045,
    mouthScaleY: 1 + speed * 0.012,
  };
}
