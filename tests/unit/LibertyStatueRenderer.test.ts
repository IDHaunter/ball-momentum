import { describe, expect, it } from 'vitest';
import type Phaser from 'phaser';
import { LibertyStatueRenderer } from '../../src/rendering/LibertyStatueRenderer';

interface GraphicsCall {
  objectId: number;
  name: string;
  args: unknown[];
}

function createHarness() {
  const calls: GraphicsCall[] = [];
  let nextObjectId = 0;
  const add = {
    graphics: () => {
      const objectId = nextObjectId++;
      let graphics: Phaser.GameObjects.Graphics;
      graphics = new Proxy({}, {
        get: (_target, property) => (...args: unknown[]) => {
          calls.push({ objectId, name: String(property), args });
          return graphics;
        },
      }) as Phaser.GameObjects.Graphics;
      return graphics;
    },
  };
  return {
    scene: { add } as unknown as Phaser.Scene,
    calls,
  };
}

function getFilledPaths(
  calls: GraphicsCall[],
  objectId: number,
): Array<Array<{ x: number; y: number }>> {
  const paths: Array<Array<{ x: number; y: number }>> = [];
  let current: Array<{ x: number; y: number }> = [];
  for (const call of calls) {
    if (call.objectId !== objectId) continue;
    if (call.name === 'beginPath') current = [];
    if (call.name === 'moveTo' || call.name === 'lineTo') {
      const [x, y] = call.args as [number, number];
      current.push({ x, y });
    }
    if (call.name === 'fillPath') paths.push([...current]);
  }
  return paths;
}

function getThumbIcon(calls: GraphicsCall[]): Array<{ x: number; y: number }> | undefined {
  return getFilledPaths(calls, 0).find((path) => {
    if (path.length !== 20) return false;
    const width = Math.max(...path.map((point) => point.x)) - Math.min(...path.map((point) => point.x));
    const height = Math.max(...path.map((point) => point.y)) - Math.min(...path.map((point) => point.y));
    return width >= 21 && width <= 23 && height >= 53 && height <= 55;
  });
}

describe('LibertyStatueRenderer', () => {
  it('draws a compact octopus with a lit torch, eight tentacles and a punk-spiked crown', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);

    renderer.create('statue-a', 400, 900);

    const bodyPaths = getFilledPaths(harness.calls, 0);
    const flamePaths = getFilledPaths(harness.calls, 1);
    // Six lower tentacles, one torch-holding tentacle and one tiny gesture-side tentacle.
    const tentacleRibbons = bodyPaths.filter((path) => path.length === 26);
    expect(tentacleRibbons).toHaveLength(8);

    // The torch flame uses the checkpoint's orange / golden / pale-hot palette.
    const flameColors = harness.calls
      .filter((call) => call.objectId === 1 && call.name === 'fillStyle')
      .map((call) => call.args[0]);
    expect(flameColors).toContain(0xff922f);
    expect(flameColors).toContain(0xffd95e);
    expect(flameColors).toContain(0xfff8bd);
    expect(flamePaths.map((path) => path.length)).toEqual(expect.arrayContaining([9, 6, 5]));

    // The flame extends above the torch cup, while the body and pedestal stay compact.
    const allPoints = [...bodyPaths.flat(), ...flamePaths.flat()];
    const visualWidth = Math.max(...allPoints.map((point) => point.x)) - Math.min(...allPoints.map((point) => point.x));
    const visualHeight = Math.max(...allPoints.map((point) => point.y)) - Math.min(...allPoints.map((point) => point.y));
    expect(visualWidth).toBeLessThan(90);
    expect(visualHeight).toBeLessThan(200);
    expect(Math.min(...allPoints.map((point) => point.y))).toBeLessThan(710);
    expect(harness.calls.some((call) => call.objectId === 0
      && call.name === 'fillCircle' && call.args[0] === 400 && call.args[2] === 26)).toBe(true);

    const thumbIcon = getThumbIcon(harness.calls);
    expect(thumbIcon).toBeDefined();
    expect(renderer.activate('statue-a')).toBe(true);
    expect(renderer.activate('statue-a')).toBe(false);
    renderer.destroy();
  });

  it('shows a clear thumbs-down before activation and rotates the same silhouette into thumbs-up', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.create('statue-a', 400, 900);

    const dislikeIcon = getThumbIcon(harness.calls);
    expect(dislikeIcon).toBeDefined();
    const iconCenterY = 900 - 119;
    // The thumb tip is the lowest vertex before activation.
    expect(Math.max(...dislikeIcon!.map((point) => point.y))).toBeGreaterThan(iconCenterY + 23);

    renderer.activate('statue-a');
    renderer.update(720);
    const bodyCalls = harness.calls.filter((call) => call.objectId === 0);
    const lastDrawStart = bodyCalls.map((call) => call.name).lastIndexOf('clear');
    const likeIcon = getThumbIcon(bodyCalls.slice(lastDrawStart));
    expect(likeIcon).toBeDefined();
    // The exact same thumb tip now becomes the highest vertex.
    expect(Math.min(...likeIcon!.map((point) => point.y))).toBeLessThan(iconCenterY - 23);
    renderer.destroy();
  });

  it('flickers only the torch layer while the rest of the statue remains static', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.create('statue-a', 400, 900);

    const bodyDrawsBefore = harness.calls.filter((call) => call.objectId === 0 && call.name === 'clear').length;
    const flameDrawsBefore = harness.calls.filter((call) => call.objectId === 1 && call.name === 'clear').length;
    renderer.update(160);
    expect(harness.calls.filter((call) => call.objectId === 0 && call.name === 'clear'))
      .toHaveLength(bodyDrawsBefore);
    expect(harness.calls.filter((call) => call.objectId === 1 && call.name === 'clear'))
      .toHaveLength(flameDrawsBefore + 1);
    renderer.destroy();
  });

  it('keeps the torch and gesture static when reduced motion is enabled', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.setReducedMotion(true);
    renderer.create('statue-a', 400, 900);

    expect(renderer.activate('statue-a')).toBe(true);
    const drawCountBeforeUpdate = harness.calls.filter((call) => call.name === 'clear').length;
    renderer.update(720);
    expect(harness.calls.filter((call) => call.name === 'clear')).toHaveLength(drawCountBeforeUpdate);

    const bodyCalls = harness.calls.filter((call) => call.objectId === 0);
    const lastDrawStart = bodyCalls.map((call) => call.name).lastIndexOf('clear');
    const thumbIcon = getThumbIcon(bodyCalls.slice(lastDrawStart));
    expect(thumbIcon).toBeDefined();
    const iconCenterY = 900 - 119;
    expect(Math.min(...thumbIcon!.map((point) => point.y))).toBeLessThan(iconCenterY - 23);
    renderer.destroy();
  });
});
