import { describe, expect, it } from 'vitest';
import type {
  RadiationContainerLike,
  RadiationGraphicsLike,
  RadiationTextLike,
} from '../../src/rendering/RadiationEnemyRenderer';
import { RadiationEnemyRenderer } from '../../src/rendering/RadiationEnemyRenderer';

type GraphicsCall = { name: string; args: number[] };
type GraphicsState = { calls: GraphicsCall[] };
type ContainerState = {
  depth: number;
  x: number;
  y: number;
  rotation: number;
  destroyed: boolean;
};

function createRendererHarness() {
  const containers: ContainerState[] = [];
  const graphics: GraphicsState[] = [];

  const makeGraphics = (): RadiationGraphicsLike => {
    const state: GraphicsState = { calls: [] };
    graphics.push(state);
    const record = (name: string, ...args: number[]) => {
      state.calls.push({ name, args });
      return api;
    };
    const api: RadiationGraphicsLike = {
      clear() { state.calls = []; return api; },
      setDepth() { return api; },
      fillStyle() { return api; },
      lineStyle() { return api; },
      fillEllipse(x, y, width, height) { return record('fillEllipse', x, y, width, height); },
      strokeEllipse(x, y, width, height) { return record('strokeEllipse', x, y, width, height); },
      beginPath() { return record('beginPath'); },
      moveTo(x, y) { return record('moveTo', x, y); },
      lineTo(x, y) { return record('lineTo', x, y); },
      closePath() { return record('closePath'); },
      fillPath() { return record('fillPath'); },
      strokePath() { return record('strokePath'); },
      destroy() {},
    };
    return api;
  };

  const makeContainer = (x: number, y: number): RadiationContainerLike => {
    const state: ContainerState = { depth: 0, x, y, rotation: 0, destroyed: false };
    containers.push(state);
    const api: RadiationContainerLike = {
      add() { return api; },
      setDepth(value) { state.depth = value; return api; },
      setPosition(nextX, nextY) { state.x = nextX; state.y = nextY; return api; },
      setRotation(value) { state.rotation = value; return api; },
      destroy() { state.destroyed = true; },
    };
    return api;
  };

  const scene = {
    add: {
      container: makeContainer,
      graphics: makeGraphics,
      text: (): RadiationTextLike => ({
        setOrigin() { return this; },
        setDepth() { return this; },
        setPosition() { return this; },
        setText() { return this; },
        setColor() { return this; },
        setScale() { return this; },
        setVisible() { return this; },
        destroy() {},
      }),
    },
  };

  return { scene, containers, graphics };
}

describe('RadiationEnemyRenderer snail eyes', () => {
  it('keeps the eyestalks upright while the radioactive body rotates', () => {
    const harness = createRendererHarness();
    const renderer = new RadiationEnemyRenderer(harness.scene, 20, 100, 200);

    renderer.update(16, { x: 340, y: 460 }, 1.2, false, 0);

    expect(harness.containers.map((container) => container.depth)).toEqual([9, 8, 10]);
    expect(harness.containers.map((container) => container.rotation)).toEqual([1.2, 0, 0]);
    expect(harness.containers.map(({ x, y }) => [x, y])).toEqual([
      [340, 460], [340, 460], [340, 460],
    ]);
    expect(harness.graphics[2]!.calls.some((call) => call.name === 'strokePath')).toBe(true);
    expect(harness.graphics[3]!.calls.filter((call) => call.name === 'fillEllipse').length).toBeGreaterThanOrEqual(10);

    renderer.dispose();
    expect(harness.containers.every((container) => container.destroyed)).toBe(true);
  });

  it('animates the pupils independently as the eyes scan around', () => {
    const harness = createRendererHarness();
    const renderer = new RadiationEnemyRenderer(harness.scene, 20, 0, 0);
    const initialPupilX = harness.graphics[3]!.calls
      .filter((call) => call.name === 'fillEllipse')[2]!.args[0];

    for (let frame = 0; frame < 10; frame += 1) {
      renderer.update(80, { x: 0, y: 0 }, 0, false, 0);
    }

    const animatedPupilX = harness.graphics[3]!.calls
      .filter((call) => call.name === 'fillEllipse')[2]!.args[0];
    expect(animatedPupilX).not.toBeCloseTo(initialPupilX, 4);
    renderer.dispose();
  });
});
