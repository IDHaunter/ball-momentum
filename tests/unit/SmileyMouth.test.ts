import { describe, expect, it, vi } from 'vitest';
import {
  drawSmileyMouth,
  drawSmileySurpriseMouth,
  SMILEY_MOUTH_TEXTURE_HEIGHT,
  SMILEY_MOUTH_TEXTURE_KEY,
  SMILEY_MOUTH_TEXTURE_WIDTH,
  SMILEY_SURPRISE_MOUTH_TEXTURE_KEY,
  SMILEY_SURPRISE_MOUTH_TEXTURE_SIZE,
} from '../../src/rendering/SmileyMouth';

describe('Smiley mouth texture', () => {
  it('draws a single smooth rounded quadratic stroke with no extra marks', () => {
    const context = {
      clearRect: vi.fn(),
      save: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(),
      stroke: vi.fn(),
      restore: vi.fn(),
      lineCap: '',
      lineJoin: '',
      lineWidth: 0,
      strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    drawSmileyMouth(context);

    expect(SMILEY_MOUTH_TEXTURE_KEY).toBe('ball-momentum-smiley-mouth-v1');
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, SMILEY_MOUTH_TEXTURE_WIDTH, SMILEY_MOUTH_TEXTURE_HEIGHT);
    expect(context.moveTo).toHaveBeenCalledTimes(1);
    expect(context.quadraticCurveTo).toHaveBeenCalledTimes(1);
    expect(context.stroke).toHaveBeenCalledTimes(1);
    expect(context.lineCap).toBe('round');
    expect(context.lineJoin).toBe('round');
    expect(context.lineWidth).toBe(25);
    expect(context.strokeStyle).toBe('#33221b');
    expect(context.restore).toHaveBeenCalledTimes(1);
    expect((context as unknown as Record<string, unknown>).arc).toBeUndefined();
    expect((context as unknown as Record<string, unknown>).fill).toBeUndefined();
  });

  it('clamps unsafe texture dimensions to safe minimums and fallback defaults', () => {
    const context = {
      clearRect: vi.fn(), save: vi.fn(), beginPath: vi.fn(), moveTo: vi.fn(),
      quadraticCurveTo: vi.fn(), stroke: vi.fn(), restore: vi.fn(),
      lineCap: '', lineJoin: '', lineWidth: 0, strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    drawSmileyMouth(context, 1, 1);
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, 64, 48);

    drawSmileyMouth(context, Number.NaN, Number.NaN);
    expect(context.clearRect).toHaveBeenLastCalledWith(
      0, 0, SMILEY_MOUTH_TEXTURE_WIDTH, SMILEY_MOUTH_TEXTURE_HEIGHT,
    );
  });

  it('draws a compact surprised O mouth with a tongue highlight', () => {
    const context = {
      clearRect: vi.fn(), save: vi.fn(), beginPath: vi.fn(), ellipse: vi.fn(),
      fill: vi.fn(), restore: vi.fn(), fillStyle: '',
    } as unknown as CanvasRenderingContext2D;

    drawSmileySurpriseMouth(context);

    expect(SMILEY_SURPRISE_MOUTH_TEXTURE_KEY).toBe('ball-momentum-smiley-surprise-mouth-v1');
    expect(context.clearRect).toHaveBeenCalledWith(0, 0, SMILEY_SURPRISE_MOUTH_TEXTURE_SIZE, SMILEY_SURPRISE_MOUTH_TEXTURE_SIZE);
    expect(context.ellipse).toHaveBeenCalledTimes(3);
    expect(context.fill).toHaveBeenCalledTimes(3);
    expect(context.restore).toHaveBeenCalledTimes(1);
  });

});
