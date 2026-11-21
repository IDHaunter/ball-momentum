import { describe, expect, it } from 'vitest';
import { drawBotGradient, BOT_GRADIENT_TEXTURE_SIZE } from '../../src/rendering/BotGradient';

describe('BotGradient', () => {
  it('draws a clipped multi-stop red shell with radial blush, lower shade, and glossy highlights', () => {
    const events: string[] = [];
    const stops: string[] = [];
    const gradient = {
      addColorStop: (_offset: number, color: string) => stops.push(color),
    };
    const context = {
      clearRect: () => events.push('clear'),
      save: () => events.push('save'),
      beginPath: () => events.push('begin'),
      arc: () => events.push('arc'),
      closePath: () => events.push('close'),
      clip: () => events.push('clip'),
      fillRect: () => events.push('fillRect'),
      ellipse: () => events.push('ellipse'),
      fill: () => events.push('fill'),
      restore: () => events.push('restore'),
      createLinearGradient: () => { events.push('linear'); return gradient; },
      createRadialGradient: () => { events.push('radial'); return gradient; },
      set fillStyle(_value: unknown) { events.push('fillStyle'); },
    } as unknown as CanvasRenderingContext2D;

    drawBotGradient(context);

    expect(events[0]).toBe('clear');
    expect(events).toContain('clip');
    expect(events.filter((event) => event === 'radial')).toHaveLength(2);
    expect(events).toContain('linear');
    expect(events.filter((event) => event === 'ellipse').length).toBeGreaterThanOrEqual(2);
    expect(stops).toContain('#f58ba8');
    expect(stops).toContain('#9b315b');
    expect(stops).toContain('rgba(255, 220, 231, 0.62)');
    expect(stops).toContain('rgba(88, 18, 48, 0.34)');
    expect(BOT_GRADIENT_TEXTURE_SIZE).toBe(128);
  });
});
