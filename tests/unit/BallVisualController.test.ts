import { describe, expect, it } from 'vitest';
import { BallVisualController } from '../../src/player/BallVisualController';
import type { BallRenderer } from '../../src/rendering/BallRenderer';

describe('BallVisualController facial animation timing', () => {
  it('forwards frame delta to the renderer when motion is enabled', () => {
    const calls: unknown[][] = [];
    const renderer = {
      update: (...args: unknown[]) => calls.push(args),
    } as unknown as BallRenderer;
    const visual = new BallVisualController(renderer);

    visual.update(1 / 60, 10, 20, 0.5, 375);

    expect(calls).toHaveLength(1);
    expect(calls[0][5]).toBeCloseTo(1 / 60, 10);
    expect(calls[0][6]).toBe(375);
  });

  it('freezes facial animation while reduced motion is enabled', () => {
    const calls: unknown[][] = [];
    const renderer = {
      update: (...args: unknown[]) => calls.push(args),
    } as unknown as BallRenderer;
    const visual = new BallVisualController(renderer);

    visual.setReducedMotion(true);
    visual.update(1 / 30, 10, 20, 0.5, 420);

    expect(calls).toHaveLength(1);
    expect(calls[0][5]).toBe(0);
    expect(calls[0][3]).toBe(1);
    expect(calls[0][4]).toBe(1);
    expect(calls[0][6]).toBe(420);
  });

  it('forwards impact reactions to the smiley renderer', () => {
    const impacts: number[] = [];
    const renderer = {
      update: () => undefined,
      reactToImpact: (speed: number) => impacts.push(speed),
    } as unknown as BallRenderer;
    const visual = new BallVisualController(renderer);

    visual.impact(480);
    visual.land(620);

    expect(impacts).toEqual([480, 620]);
  });

  it('does not trigger facial impact reactions when reduced motion is enabled', () => {
    const impacts: number[] = [];
    const renderer = {
      update: () => undefined,
      reactToImpact: (speed: number) => impacts.push(speed),
    } as unknown as BallRenderer;
    const visual = new BallVisualController(renderer);

    visual.setReducedMotion(true);
    visual.impact(500);
    visual.land(500);

    expect(impacts).toHaveLength(0);
  });
});
