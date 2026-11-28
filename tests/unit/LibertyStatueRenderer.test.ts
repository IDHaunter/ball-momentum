import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { LibertyStatueRenderer } from '../../src/rendering/LibertyStatueRenderer';

interface GraphicsCall {
  name: string;
  args: unknown[];
}

function createHarness() {
  const calls: GraphicsCall[] = [];
  const graphics = new Proxy({}, {
    get: (_target, property) => (...args: unknown[]) => {
      calls.push({ name: String(property), args });
      return graphics;
    },
  });
  const add = {
    graphics: () => graphics,
  };
  return {
    scene: { add } as unknown as Phaser.Scene,
    calls,
  };
}

function getFilledPaths(calls: GraphicsCall[]): Array<Array<{ x: number; y: number }>> {
  const paths: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];
  for (const call of calls) {
    if (call.name === 'beginPath') current = [];
    if (call.name === 'moveTo' || call.name === 'lineTo') {
      const [x, y] = call.args as [number, number];
      current.push({ x, y });
    }
    if (call.name === 'fillPath') paths.push([...current]);
  }
  return paths;
}

function getGestureHand(calls: GraphicsCall[]): Array<{ x: number; y: number }> | undefined {
  return getFilledPaths(calls).find((path) => {
    if (path.length !== 20) return false;
    const width = Math.max(...path.map((point) => point.x)) - Math.min(...path.map((point) => point.x));
    const height = Math.max(...path.map((point) => point.y)) - Math.min(...path.map((point) => point.y));
    return width >= 20 && width <= 22 && height >= 35 && height <= 37;
  });
}

describe('LibertyStatueRenderer', () => {
  it('draws a compact octopus mascot with a book, eight tentacles and a seven-ray crown', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);

    renderer.create('statue-a', 400, 900);

    const filledPaths = getFilledPaths(harness.calls);
    // Eight curved ribbons: six form the tentacle skirt and two become the arms.
    const tentacleRibbons = filledPaths.filter((path) => path.length === 26);
    expect(tentacleRibbons).toHaveLength(8);
    expect(filledPaths.length).toBeGreaterThanOrEqual(24);
    const bookShapes = filledPaths.filter((path) => path.length === 4
      && Math.min(...path.map((point) => point.x)) < 360
      && Math.max(...path.map((point) => point.x)) < 380
      && Math.min(...path.map((point) => point.y)) > 800
      && Math.max(...path.map((point) => point.y)) < 840);
    expect(bookShapes.length).toBeGreaterThanOrEqual(2);
    expect(harness.calls.some((call) => call.name === 'fillCircle' && call.args[0] === 400 && call.args[2] === 26)).toBe(true);
    expect(harness.calls.filter((call) => call.name === 'fillCircle').length).toBeGreaterThanOrEqual(25);
    const allPoints = filledPaths.flat();
    const visualWidth = Math.max(...allPoints.map((point) => point.x)) - Math.min(...allPoints.map((point) => point.x));
    const visualHeight = Math.max(...allPoints.map((point) => point.y)) - Math.min(...allPoints.map((point) => point.y));
    expect(visualWidth).toBeLessThan(90); // The body and props are compact around the round head.
    expect(visualHeight).toBeLessThan(170); // About 1.5x shorter than the previous monument.
    const topmostY = Math.min(...allPoints.map((point) => point.y));
    expect(topmostY).toBeLessThan(750); // The crown and mohawk sit above the round head.

    // The oversized hand remains a distinct, readable 20-point fist/thumb silhouette.
    const hand = getGestureHand(harness.calls);
    expect(hand).toBeDefined();
    expect(renderer.activate('statue-a')).toBe(true);
    expect(renderer.activate('statue-a')).toBe(false);

    const drawCountBeforeAnimation = harness.calls.filter((call) => call.name === 'clear').length;
    renderer.update(720);
    const drawCountAfterAnimation = harness.calls.filter((call) => call.name === 'clear').length;
    expect(drawCountAfterAnimation).toBeGreaterThan(drawCountBeforeAnimation);

    renderer.destroy();
  });

  it('shows a clear thumbs-down before activation and a clear thumbs-up afterwards', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.create('statue-a', 400, 900);

    const dislikeHand = getGestureHand(harness.calls);
    expect(dislikeHand).toBeDefined();
    // Vertex 7 is the thumb tip: it points down before the statue is activated.
    expect(dislikeHand![7].y).toBeGreaterThan(900 - 105 + 18);

    renderer.activate('statue-a');
    renderer.update(720);
    const lastDrawStart = harness.calls.map((call) => call.name).lastIndexOf('clear');
    const likeHand = getGestureHand(harness.calls.slice(lastDrawStart));
    expect(likeHand).toBeDefined();
    // The exact same thumb tip now points upwards.
    expect(likeHand![7].y).toBeLessThan(900 - 105 - 18);
    renderer.destroy();
  });

  it('applies the thumbs-up pose immediately when reduced motion is enabled', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.setReducedMotion(true);
    renderer.create('statue-a', 400, 900);

    expect(renderer.activate('statue-a')).toBe(true);
    const drawCountBeforeUpdate = harness.calls.filter((call) => call.name === 'clear').length;
    renderer.update(720);
    expect(harness.calls.filter((call) => call.name === 'clear')).toHaveLength(drawCountBeforeUpdate);

    const lastDrawStart = harness.calls.map((call) => call.name).lastIndexOf('clear');
    const hand = getGestureHand(harness.calls.slice(lastDrawStart));
    expect(hand).toBeDefined();
    expect(hand![7].y).toBeLessThan(900 - 105 - 18);
    renderer.destroy();
  });
});
