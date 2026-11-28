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

function getLatestFilledPaths(
  calls: GraphicsCall[],
  objectId: number,
): Array<Array<{ x: number; y: number }>> {
  const layerCalls = calls.filter((call) => call.objectId === objectId);
  const latestClear = layerCalls.map((call) => call.name).lastIndexOf('clear');
  return getFilledPaths(layerCalls.slice(latestClear), objectId);
}

function getThumbIcon(calls: GraphicsCall[]): Array<{ x: number; y: number }> | undefined {
  const matchingPaths = getFilledPaths(calls, 0).filter((path) => {
    // The compact horizontal hand is sampled from thirteen cubic curves into a 53-point silhouette.
    if (path.length !== 53) return false;
    const width = Math.max(...path.map((point) => point.x)) - Math.min(...path.map((point) => point.x));
    const height = Math.max(...path.map((point) => point.y)) - Math.min(...path.map((point) => point.y));
    const centerX = (Math.max(...path.map((point) => point.x)) + Math.min(...path.map((point) => point.x))) / 2;
    return width >= 35 && width <= 40 && height >= 31 && height <= 36 && centerX > 440;
  });
  // The main, highlighted hand is drawn after its subtle shadow copy.
  return matchingPaths.at(-1);
}

describe('LibertyStatueRenderer', () => {
  it('draws a compact octopus with a smoking inactive torch, eight tentacles and a punk-spiked crown', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);

    renderer.create('statue-a', 400, 900);

    const bodyPaths = getFilledPaths(harness.calls, 0);
    const tentaclePaths = getFilledPaths(harness.calls, 3);
    const headPaths = getFilledPaths(harness.calls, 4);
    const initialTorchPaths = getFilledPaths(harness.calls, 1);
    expect(initialTorchPaths).toHaveLength(0);
    const smokeStrokes = harness.calls.filter((call) => call.objectId === 1 && call.name === 'strokePath');
    expect(smokeStrokes.length).toBeGreaterThan(0);
    const initialTorchColors = harness.calls
      .filter((call) => call.objectId === 1 && call.name === 'fillStyle')
      .map((call) => call.args[0]);
    expect(initialTorchColors).not.toContain(0xff922f);

    // The six animated lower tentacles and two upper arms live on separate layers.
    expect(tentaclePaths.filter((path) => path.length === 26)).toHaveLength(6);
    expect(bodyPaths.filter((path) => path.length === 26)).toHaveLength(2);
    expect(headPaths.length).toBeGreaterThan(0);

    // Activation immediately replaces the smoke with the same checkpoint-style flame.
    expect(renderer.activate('statue-a')).toBe(true);
    const torchCalls = harness.calls.filter((call) => call.objectId === 1);
    const lastTorchDrawStart = torchCalls.map((call) => call.name).lastIndexOf('clear');
    const activeTorchCalls = torchCalls.slice(lastTorchDrawStart);
    const flamePaths = getFilledPaths(activeTorchCalls, 1);
    const flameColors = activeTorchCalls
      .filter((call) => call.name === 'fillStyle')
      .map((call) => call.args[0]);
    expect(flameColors).toContain(0xff922f);
    expect(flameColors).toContain(0xffd95e);
    expect(flameColors).toContain(0xfff8bd);
    expect(flamePaths.map((path) => path.length)).toEqual(expect.arrayContaining([9, 6, 5]));

    // The flame extends above the torch cup, while the body and pedestal stay compact.
    const allPoints = [...bodyPaths.flat(), ...tentaclePaths.flat(), ...headPaths.flat(), ...flamePaths.flat()];
    const visualWidth = Math.max(...allPoints.map((point) => point.x)) - Math.min(...allPoints.map((point) => point.x));
    const visualHeight = Math.max(...allPoints.map((point) => point.y)) - Math.min(...allPoints.map((point) => point.y));
    // The clearer horizontal reaction widens the silhouette slightly, while keeping it compact.
    expect(visualWidth).toBeLessThan(115);
    expect(visualHeight).toBeLessThan(200);
    expect(Math.min(...allPoints.map((point) => point.y))).toBeLessThan(710);
    expect(harness.calls.some((call) => call.objectId === 4
      && call.name === 'fillCircle' && call.args[0] === 400 && call.args[2] === 26)).toBe(true);

    const thumbIcon = getThumbIcon(harness.calls);
    expect(thumbIcon).toBeDefined();
    expect(renderer.activate('statue-a')).toBe(false);
    renderer.destroy();
  });

  it('shows a recognisable thumbs-down and vertically mirrors the same hand into thumbs-up', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.create('statue-a', 400, 900);

    const dislikeIcon = getThumbIcon(harness.calls);
    expect(dislikeIcon).toBeDefined();
    const handLeft = Math.min(...dislikeIcon!.map((point) => point.x));
    const handRight = Math.max(...dislikeIcon!.map((point) => point.x));
    const handTop = Math.min(...dislikeIcon!.map((point) => point.y));
    const handBottom = Math.max(...dislikeIcon!.map((point) => point.y));
    // The wrist is on the left beside the octopus head; the fist extends out horizontally.
    expect(handRight - handLeft).toBeGreaterThan(handBottom - handTop);
    expect(handRight - handLeft).toBeLessThan(40);
    // Its cuff starts just outside the head contour, not above or below the fist.
    expect(handLeft).toBeGreaterThan(426);
    expect(handLeft).toBeLessThan(430);
    const iconCenterY = 900 - 119;
    // The thumb tip is the lowest vertex before activation.
    expect(Math.max(...dislikeIcon!.map((point) => point.y))).toBeGreaterThan(iconCenterY + 21.5);

    renderer.activate('statue-a');
    renderer.update(720);
    const bodyCalls = harness.calls.filter((call) => call.objectId === 0);
    const lastDrawStart = bodyCalls.map((call) => call.name).lastIndexOf('clear');
    const likeIcon = getThumbIcon(bodyCalls.slice(lastDrawStart));
    expect(likeIcon).toBeDefined();
    // The exact same thumb tip now becomes the highest vertex.
    expect(Math.min(...likeIcon!.map((point) => point.y))).toBeLessThan(iconCenterY - 21.5);
    expect(likeIcon).toHaveLength(dislikeIcon!.length);
    likeIcon!.forEach((point, index) => {
      // A mirror flip preserves every X coordinate and reflects Y around the hand's centerline.
      expect(point.x).toBeCloseTo(dislikeIcon![index].x, 6);
      expect(point.y + dislikeIcon![index].y).toBeCloseTo(iconCenterY * 2, 6);
    });
    renderer.destroy();
  });

  it('keeps the torch smoking before activation and lights it immediately after activation', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.create('statue-a', 400, 900);

    const inactiveCalls = harness.calls.filter((call) => call.objectId === 1);
    expect(inactiveCalls.some((call) => call.name === 'strokePath')).toBe(true);
    expect(getFilledPaths(inactiveCalls, 1)).toHaveLength(0);
    expect(inactiveCalls.some((call) => call.name === 'fillStyle' && call.args[0] === 0xff922f)).toBe(false);

    renderer.update(480);
    const smokeCallsAfterUpdate = harness.calls.filter((call) => call.objectId === 1);
    expect(smokeCallsAfterUpdate.some((call) => call.name === 'strokePath')).toBe(true);
    expect(getFilledPaths(smokeCallsAfterUpdate, 1)).toHaveLength(0);
    expect(smokeCallsAfterUpdate.some((call) => call.name === 'fillStyle' && call.args[0] === 0xff922f)).toBe(false);

    expect(renderer.activate('statue-a')).toBe(true);
    const activeCalls = harness.calls.filter((call) => call.objectId === 1);
    const lastDrawStart = activeCalls.map((call) => call.name).lastIndexOf('clear');
    const flameCalls = activeCalls.slice(lastDrawStart);
    expect(getFilledPaths(flameCalls, 1).length).toBeGreaterThan(0);
    expect(flameCalls.some((call) => call.name === 'fillStyle' && call.args[0] === 0xff922f)).toBe(true);
    const activeTorchDraws = harness.calls.filter((call) => call.objectId === 1 && call.name === 'clear').length;
    renderer.update(160);
    expect(harness.calls.filter((call) => call.objectId === 1 && call.name === 'clear'))
      .toHaveLength(activeTorchDraws + 1);
    const updatedFlameCalls = harness.calls.filter((call) => call.objectId === 1);
    expect(getFilledPaths(updatedFlameCalls, 1).length).toBeGreaterThan(0);
    expect(renderer.activate('statue-a')).toBe(false);
    renderer.destroy();
  });

  it('animates the unactivated tentacles, smoke and eyes on independent layers', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.create('statue-a', 400, 900);

    const bodyDrawsBefore = harness.calls.filter((call) => call.objectId === 0 && call.name === 'clear').length;
    const torchDrawsBefore = harness.calls.filter((call) => call.objectId === 1 && call.name === 'clear').length;
    const faceDrawsBefore = harness.calls.filter((call) => call.objectId === 2 && call.name === 'clear').length;
    const tentacleDrawsBefore = harness.calls.filter((call) => call.objectId === 3 && call.name === 'clear').length;
    const legsBefore = getLatestFilledPaths(harness.calls, 3).filter((path) => path.length === 26);

    renderer.update(420);

    expect(harness.calls.filter((call) => call.objectId === 0 && call.name === 'clear'))
      .toHaveLength(bodyDrawsBefore);
    expect(harness.calls.filter((call) => call.objectId === 1 && call.name === 'clear'))
      .toHaveLength(torchDrawsBefore + 1);
    expect(harness.calls.filter((call) => call.objectId === 2 && call.name === 'clear'))
      .toHaveLength(faceDrawsBefore + 1);
    expect(harness.calls.filter((call) => call.objectId === 3 && call.name === 'clear'))
      .toHaveLength(tentacleDrawsBefore + 1);
    const legsAfter = getLatestFilledPaths(harness.calls, 3).filter((path) => path.length === 26);
    expect(legsAfter).toHaveLength(6);
    expect(legsAfter).not.toEqual(legsBefore);

    // The lower tentacles keep moving after the statue is activated too.
    renderer.activate('statue-a');
    const activeLegsBefore = legsAfter;
    renderer.update(420);
    const activeLegsAfter = getLatestFilledPaths(harness.calls, 3).filter((path) => path.length === 26);
    expect(activeLegsAfter).not.toEqual(activeLegsBefore);
    renderer.destroy();
  });

  it('keeps the lower tentacles still when reduced motion is enabled', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.setReducedMotion(true);
    renderer.create('statue-a', 400, 900);

    const tentacleDrawsBefore = harness.calls.filter((call) => call.objectId === 3 && call.name === 'clear').length;
    const legsBefore = getLatestFilledPaths(harness.calls, 3);
    renderer.update(900);
    expect(harness.calls.filter((call) => call.objectId === 3 && call.name === 'clear'))
      .toHaveLength(tentacleDrawsBefore);
    expect(getLatestFilledPaths(harness.calls, 3)).toEqual(legsBefore);
    renderer.destroy();
  });


  it('animates the pupils, blinks periodically and keeps the happy mouth as a two-tooth smile without blush', () => {
    const harness = createHarness();
    const renderer = new LibertyStatueRenderer(harness.scene);
    renderer.create('statue-a', 400, 900);

    const faceCallsBefore = harness.calls.filter((call) => call.objectId === 2);
    expect(faceCallsBefore.filter((call) => call.name === 'fillStyle').map((call) => call.args[0]))
      .not.toContain(0xf08a76);
    const initialPupils = faceCallsBefore
      .filter((call) => call.name === 'fillCircle' && call.args[2] === 2.65)
      .map((call) => call.args.slice(0, 2));
    expect(initialPupils).toHaveLength(2);

    renderer.update(420);
    const movingPupils = harness.calls
      .filter((call) => call.objectId === 2 && call.name === 'fillCircle' && call.args[2] === 2.65)
      .slice(-2)
      .map((call) => call.args.slice(0, 2));
    expect(movingPupils).toHaveLength(2);
    expect(movingPupils).not.toEqual(initialPupils);

    renderer.update(2155); // elapsed 2575 ms: midpoint of the periodic blink.
    const blinkEyes = harness.calls.filter((call) => call.objectId === 2
      && call.name === 'fillEllipse' && call.args[2] === 12.6);
    expect(blinkEyes.slice(-2).every((call) => Number(call.args[3]) < 2)).toBe(true);

    renderer.activate('statue-a');
    renderer.update(720);
    const happyFaceStyles = harness.calls
      .filter((call) => call.objectId === 2 && call.name === 'fillStyle')
      .map((call) => call.args[0]);
    expect(happyFaceStyles).toContain(0xfff0cf); // two small front teeth
    expect(happyFaceStyles).toContain(0x493d50); // dark crescent smile
    expect(happyFaceStyles).not.toContain(0xf08a76); // no cheek blush
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
    expect(Math.min(...thumbIcon!.map((point) => point.y))).toBeLessThan(iconCenterY - 21.5);
    renderer.destroy();
  });
});
