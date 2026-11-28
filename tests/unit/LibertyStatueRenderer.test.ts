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
  const texts: Array<{
    text: string;
    setOrigin: () => unknown;
    setDepth: () => unknown;
    setAngle: () => unknown;
    setText: (value: string) => unknown;
    destroy: () => void;
  }> = [];
  const add = {
    graphics: () => graphics,
    text: (_x: number, _y: number, initialText: string) => {
      const object = {
        text: initialText,
        setOrigin() { return this; },
        setDepth() { return this; },
        setAngle() { return this; },
        setText(value: string) { this.text = value; return this; },
        destroy() {},
      };
      texts.push(object);
      return object;
    },
  };
  return {
    scene: { add } as unknown as Phaser.Scene,
    calls,
    texts,
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

function getThumbPath(calls: GraphicsCall[]): Array<{ x: number; y: number }> {
  return getFilledPaths(calls).find((path) => {
    const xs = path.map((point) => point.x);
    const ys = path.map((point) => point.y);
    const width = Math.max(...xs) - Math.min(...xs);
    const height = Math.max(...ys) - Math.min(...ys);
    return path.length === 11 && width > 13 && width < 18 && height > 18;
  }) ?? [];
}

describe('LibertyStatueRenderer', () => {
  it('draws the draped robe and seven-ray crown and updates the tablet after activation', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);

    renderer.create('statue-a', 400, 900);

    expect(harness.texts[0].text).toBe('BAD\nVIBES');
    const polygonFillCalls = harness.calls.filter((call) => call.name === 'fillPath');
    const closedPaths = harness.calls.filter((call) => call.name === 'closePath');
    // Gown + seven distinct crown rays + tablet cover.
    expect(polygonFillCalls.length).toBeGreaterThanOrEqual(9);
    expect(closedPaths.length).toBeGreaterThanOrEqual(18);

    expect(renderer.activate('statue-a')).toBe(true);
    expect(renderer.activate('statue-a')).toBe(false);
    expect(harness.texts[0].text).toBe('GOOD\nVIBES');

    const drawCountBeforeAnimation = harness.calls.filter((call) => call.name === 'clear').length;
    renderer.update(720);
    const drawCountAfterAnimation = harness.calls.filter((call) => call.name === 'clear').length;
    expect(drawCountAfterAnimation).toBeGreaterThan(drawCountBeforeAnimation);

    renderer.destroy();
  });

  it('uses a broad separated thumb silhouette for both dislike and like poses', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.create('statue-a', 400, 900);

    // Select the broad 11-point thumb contour independently of other statue
    // polygons. The starting wrist is at y=768 in the dislike pose.
    const dislikeThumb = getThumbPath(harness.calls);
    expect(dislikeThumb).toHaveLength(11);
    expect(Math.max(...dislikeThumb.map((point) => point.y))).toBeGreaterThan(785);
    expect(Math.max(...dislikeThumb.map((point) => point.x))
      - Math.min(...dislikeThumb.map((point) => point.x))).toBeGreaterThan(13);

    renderer.activate('statue-a');
    renderer.update(720);
    const lastDrawStart = harness.calls.map((call) => call.name).lastIndexOf('clear');
    const likeThumb = getThumbPath(harness.calls.slice(lastDrawStart));
    // The wrist has moved to y=743 and the thumb now projects clearly above it.
    expect(likeThumb).toHaveLength(11);
    expect(Math.min(...likeThumb.map((point) => point.y))).toBeLessThan(725);
    renderer.destroy();
  });

  it('applies the final thumbs-up pose immediately when reduced motion is enabled', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.setReducedMotion(true);
    renderer.create('statue-a', 400, 900);

    expect(renderer.activate('statue-a')).toBe(true);
    const drawCountBeforeUpdate = harness.calls.filter((call) => call.name === 'clear').length;
    renderer.update(720);
    expect(harness.calls.filter((call) => call.name === 'clear')).toHaveLength(drawCountBeforeUpdate);
    expect(harness.texts[0].text).toBe('GOOD\nVIBES');
  });
});
