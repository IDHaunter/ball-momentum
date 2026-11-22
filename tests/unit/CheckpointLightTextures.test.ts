import { describe, expect, it } from 'vitest';
import {
  drawCheckpointFlame,
  drawCheckpointGlass,
  drawCheckpointGlow,
} from '../../src/rendering/CheckpointLightTextures';

interface FakeGradient {
  stops: Array<{ offset: number; color: string }>;
  addColorStop(offset: number, color: string): void;
}

function createContextHarness() {
  const gradients: FakeGradient[] = [];
  const calls: string[] = [];
  const createGradient = (): FakeGradient => {
    const gradient: FakeGradient = {
      stops: [],
      addColorStop(offset, color) { this.stops.push({ offset, color }); },
    };
    gradients.push(gradient);
    return gradient;
  };
  const context = {
    clearRect: () => calls.push('clearRect'),
    save: () => calls.push('save'),
    restore: () => calls.push('restore'),
    beginPath: () => calls.push('beginPath'),
    arc: () => calls.push('arc'),
    closePath: () => calls.push('closePath'),
    clip: () => calls.push('clip'),
    moveTo: () => calls.push('moveTo'),
    lineTo: () => calls.push('lineTo'),
    bezierCurveTo: () => calls.push('bezierCurveTo'),
    quadraticCurveTo: () => calls.push('quadraticCurveTo'),
    createRadialGradient: () => createGradient(),
    createLinearGradient: () => createGradient(),
    fillRect: () => calls.push('fillRect'),
    ellipse: () => calls.push('ellipse'),
    fill: () => calls.push('fill'),
    stroke: () => calls.push('stroke'),
    fillStyle: '' as unknown,
    strokeStyle: '' as unknown,
    lineWidth: 1,
    globalAlpha: 1,
  };
  return { context: context as unknown as CanvasRenderingContext2D, gradients, calls };
}

describe('checkpoint lantern textures', () => {
  it('draws a small warm active flame with a separate bright inner lick', () => {
    const harness = createContextHarness();
    drawCheckpointFlame(harness.context, 128, true);

    expect(harness.calls.filter((call) => call === 'bezierCurveTo').length).toBeGreaterThanOrEqual(7);
    expect(harness.calls).toContain('fill');
    expect(harness.gradients.flatMap((gradient) => gradient.stops.map((stop) => stop.color)))
      .toContain('#ff922f');
    expect(harness.gradients.flatMap((gradient) => gradient.stops.map((stop) => stop.color)))
      .toContain('rgba(255, 255, 218, 0.98)');
  });

  it('keeps the dormant flame muted rather than showing a face or a bright bulb', () => {
    const harness = createContextHarness();
    drawCheckpointFlame(harness.context, 128, false);

    const colors = harness.gradients.flatMap((gradient) => gradient.stops.map((stop) => stop.color));
    expect(colors).toContain('#a96b39');
    expect(colors).not.toContain('#ff922f');
    expect(harness.calls).not.toContain('arc');
  });

  it('draws a transparent glass housing with subtle outlines and curved reflections', () => {
    const harness = createContextHarness();
    drawCheckpointGlass(harness.context, 128);

    expect(harness.calls.filter((call) => call === 'bezierCurveTo').length).toBeGreaterThanOrEqual(6);
    expect(harness.calls).toContain('stroke');
    expect(harness.calls).toContain('ellipse');
    expect(harness.gradients.flatMap((gradient) => gradient.stops.map((stop) => stop.color)))
      .toContain('rgba(192, 222, 235, 0.22)');
  });

  it('uses diffuse alpha gradients for the light pool rather than stroked or filled rings', () => {
    const harness = createContextHarness();
    drawCheckpointGlow(harness.context, 256);

    expect(harness.gradients).toHaveLength(2);
    expect(harness.gradients.every((gradient) => gradient.stops.length >= 3)).toBe(true);
    expect(harness.gradients.flatMap((gradient) => gradient.stops.map((stop) => stop.color)))
      .toContain('rgba(255, 170, 70, 0)');
    expect(harness.calls).toContain('fillRect');
    expect(harness.calls).not.toContain('ellipse');
  });
});
