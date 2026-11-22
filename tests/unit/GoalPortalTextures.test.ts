import { describe, expect, it } from 'vitest';
import { drawPortalGlow } from '../../src/rendering/GoalPortalTextures';

interface GradientRecord {
  stops: Array<{ offset: number; color: string }>;
  addColorStop(offset: number, color: string): void;
}

class FakeGradient implements GradientRecord {
  readonly stops: Array<{ offset: number; color: string }> = [];
  addColorStop(offset: number, color: string): void {
    this.stops.push({ offset, color });
  }
}

class FakeGlowContext {
  private currentFilter = 'none';
  private currentCompositeOperation = 'source-over';
  fillStyle: string | FakeGradient = '';
  readonly filters: string[] = [];
  readonly compositeOperations: string[] = [];
  readonly gradients: FakeGradient[] = [];
  get filter(): string { return this.currentFilter; }
  set filter(value: string) {
    this.currentFilter = value;
    this.filters.push(value);
  }
  get globalCompositeOperation(): string { return this.currentCompositeOperation; }
  set globalCompositeOperation(value: string) {
    this.currentCompositeOperation = value;
    this.compositeOperations.push(value);
  }
  clearRect(): void {}
  save(): void {}
  restore(): void {}
  translate(): void {}
  beginPath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  closePath(): void {}
  fill(): void {}
  fillRect(): void {}
  createLinearGradient(): FakeGradient {
    const gradient = new FakeGradient();
    this.gradients.push(gradient);
    return gradient;
  }
}

describe('GoalPortalTextures', () => {
  it('feathers the portal glow to transparent edges on both axes', () => {
    const context = new FakeGlowContext();
    drawPortalGlow(context as unknown as CanvasRenderingContext2D, 512, 512);

    expect(context.filters).toContain('blur(48.128px)');
    expect(context.filters).toContain('blur(33.792px)');
    expect(context.compositeOperations).toContain('destination-in');
    expect(context.gradients).toHaveLength(2);
    for (const gradient of context.gradients) {
      expect(gradient.stops[0]).toMatchObject({ offset: 0, color: 'rgba(255, 255, 255, 0)' });
      expect(gradient.stops.at(-1)).toMatchObject({ offset: 1, color: 'rgba(255, 255, 255, 0)' });
    }
  });
});
