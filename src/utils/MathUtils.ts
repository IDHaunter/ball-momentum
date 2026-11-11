export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * clamp(t, 0, 1);
}

export function exponentialDecay(dragPerSecond: number, stepSeconds: number): number {
  return Math.exp(-Math.max(0, dragPerSecond) * stepSeconds);
}

export function isFiniteVector(value: { x: number; y: number }): boolean {
  return Number.isFinite(value.x) && Number.isFinite(value.y);
}
