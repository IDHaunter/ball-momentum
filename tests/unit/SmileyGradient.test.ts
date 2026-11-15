import { describe, expect, it, vi } from 'vitest';
import {
  drawSmileyGradient,
  SMILEY_GRADIENT_TEXTURE_SIZE,
  SMILEY_GRADIENT_TEXTURE_KEY,
} from '../../src/rendering/SmileyGradient';

describe('Smiley in-game gradient', () => {
  it('uses a single clipped vertical warm gradient instead of polygon bands', () => {
    const linearStops: Array<[number, string]> = [];
    const linearGradient = { addColorStop: (offset: number, color: string) => linearStops.push([offset, color]) };
    const context = {
      clearRect: vi.fn(),
      save: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      closePath: vi.fn(),
      clip: vi.fn(),
      createLinearGradient: vi.fn(() => linearGradient),
      fillRect: vi.fn(),
      restore: vi.fn(),
      fillStyle: '' as unknown as CanvasRenderingContext2D['fillStyle'],
    } as unknown as CanvasRenderingContext2D;

    drawSmileyGradient(context);

    expect(SMILEY_GRADIENT_TEXTURE_KEY).toBe('ball-momentum-smiley-gradient-v3');
    expect(context.createLinearGradient).toHaveBeenCalledWith(0, 0, 0, SMILEY_GRADIENT_TEXTURE_SIZE);
    expect(context.arc).toHaveBeenCalledWith(
      SMILEY_GRADIENT_TEXTURE_SIZE / 2,
      SMILEY_GRADIENT_TEXTURE_SIZE / 2,
      SMILEY_GRADIENT_TEXTURE_SIZE * 0.49,
      0,
      Math.PI * 2,
    );
    expect(linearStops).toEqual([
      [0, '#ffd94d'],
      [0.42, '#f8b932'],
      [0.76, '#ef873f'],
      [1, '#e77978'],
    ]);
    expect(context.createRadialGradient).toBeUndefined();
    expect(context.clip).toHaveBeenCalledTimes(1);
    expect(context.fillRect).toHaveBeenCalledTimes(1);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });

  it('clamps invalid and very small texture sizes to a safe canvas size', () => {
    const context = {
      clearRect: vi.fn(), save: vi.fn(), beginPath: vi.fn(), arc: vi.fn(), closePath: vi.fn(),
      clip: vi.fn(), createLinearGradient: vi.fn(() => ({ addColorStop: vi.fn() })),
      fillRect: vi.fn(), restore: vi.fn(),
      fillStyle: '' as unknown as CanvasRenderingContext2D['fillStyle'],
    } as unknown as CanvasRenderingContext2D;

    drawSmileyGradient(context, 8);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 32, 32);
    expect(context.arc).toHaveBeenCalledWith(16, 16, 15.68, 0, Math.PI * 2);

    drawSmileyGradient(context, Number.NaN);
    expect(context.clearRect).toHaveBeenLastCalledWith(0, 0, SMILEY_GRADIENT_TEXTURE_SIZE, SMILEY_GRADIENT_TEXTURE_SIZE);
  });
});
