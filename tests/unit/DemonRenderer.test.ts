import { describe, expect, it } from 'vitest';
import { DemonRenderer, type DemonGraphicsLike, type DemonRendererSceneLike } from '../../src/rendering/DemonRenderer';

function createScene() {
  const graphics: Array<{ commands: string[]; destroyed: boolean }> = [];
  const scene: DemonRendererSceneLike = {
    add: {
      graphics: () => {
        const state = { commands: [] as string[], destroyed: false };
        graphics.push(state);
        const record = (name: string) => { state.commands.push(name); return api; };
        const api: DemonGraphicsLike = {
          clear() { return record('clear'); }, setDepth() { return api; },
          fillStyle() { return record('fillStyle'); }, lineStyle() { return record('lineStyle'); },
          fillEllipse() { return record('fillEllipse'); }, strokeEllipse() { return record('strokeEllipse'); },
          beginPath() { return record('beginPath'); }, moveTo() { return record('moveTo'); }, lineTo() { return record('lineTo'); },
          closePath() { return record('closePath'); }, fillPath() { return record('fillPath'); }, strokePath() { return record('strokePath'); },
          destroy() { state.destroyed = true; },
        };
        return api;
      },
    },
  };
  return { scene, graphics };
}

/** True when something was drawn after the most recent clear(). */
function hasLiveArtwork(state: { commands: string[] } | undefined): boolean {
  if (!state) return false;
  const lastClear = state.commands.lastIndexOf('clear');
  return state.commands.slice(lastClear + 1).some((command) => command === 'fillPath' || command === 'strokePath');
}

describe('DemonRenderer', () => {
  it('shows teleport warning lightning before the body becomes visible', () => {
    const harness = createScene();
    const renderer = new DemonRenderer(harness.scene, 18, 'devil', 120, 180);
    renderer.update(80, { x: 120, y: 180 }, 0, 'telegraph');
    expect(renderer.isVisible).toBe(false);
    expect(hasLiveArtwork(harness.graphics[0])).toBe(false);
    expect(hasLiveArtwork(harness.graphics[1])).toBe(true);
    expect(harness.graphics[1]?.commands).toContain('strokeEllipse');
    expect(harness.graphics[1]?.commands).toContain('lineTo');
    renderer.dispose();
  });

  it('draws the round purple body, horns, bat wings, eyes and trident while active', () => {
    const harness = createScene();
    const renderer = new DemonRenderer(harness.scene, 18, 'devil', 120, 180);
    renderer.onMaterialize({ x: 120, y: 180 });
    renderer.update(80, { x: 120, y: 180 }, 0.2, 'active');
    expect(renderer.isVisible).toBe(true);
    expect(hasLiveArtwork(harness.graphics[0])).toBe(true);
    // Ellipses are emitted as world-space polygons: the Graphics object itself is never moved or hidden.
    expect(harness.graphics[0]?.commands.filter((command) => command === 'fillPath').length).toBeGreaterThan(10);
    expect(harness.graphics[0]?.commands).toContain('strokePath');
    renderer.dispose();
  });

  it('keeps the lightning strike visible long enough to read after materialization', () => {
    const harness = createScene();
    const renderer = new DemonRenderer(harness.scene, 18, 'devil', 120, 180);
    renderer.onStrike({ x: 120, y: 180 }, { x: 260, y: 150 });
    renderer.update(80, { x: 120, y: 180 }, 0, 'active');
    renderer.update(80, { x: 120, y: 180 }, 0, 'active');
    renderer.update(80, { x: 120, y: 180 }, 0, 'active');
    renderer.update(80, { x: 120, y: 180 }, 0, 'active');
    renderer.update(80, { x: 120, y: 180 }, 0, 'active');
    expect(hasLiveArtwork(harness.graphics[2])).toBe(true);
    renderer.dispose();
  });

  it('draws a separate lightning strike and cleans up teleport and strike graphics', () => {
    const harness = createScene();
    const renderer = new DemonRenderer(harness.scene, 18, 'devil', 120, 180);
    renderer.onStrike({ x: 120, y: 180 }, { x: 260, y: 150 });
    renderer.update(40, { x: 120, y: 180 }, 0, 'active');
    expect(harness.graphics[2]?.commands).toContain('lineTo');
    expect(hasLiveArtwork(harness.graphics[2])).toBe(true);
    renderer.update(80, { x: 120, y: 180 }, 0, 'vanishing');
    expect(harness.graphics[1]?.commands).toContain('strokeEllipse');
    renderer.dispose();
    expect(harness.graphics[1]?.destroyed).toBe(true);
    expect(harness.graphics[2]?.destroyed).toBe(true);
  });

  it('hides the body by drawing nothing and translates artwork to the body position', () => {
    const calls: Array<[number, number]> = [];
    const harness = createScene();
    const original = harness.scene.add.graphics;
    let index = 0;
    harness.scene.add.graphics = () => {
      const api = original();
      if (index++ === 0) {
        const moveTo = api.moveTo.bind(api);
        api.moveTo = (x: number, y: number) => { calls.push([x, y]); return moveTo(x, y); };
      }
      return api;
    };
    const renderer = new DemonRenderer(harness.scene, 18, 'devil', 0, 0);
    renderer.onMaterialize({ x: 500, y: 400 });
    renderer.update(80, { x: 500, y: 400 }, 0, 'active');
    expect(calls.length).toBeGreaterThan(10);
    expect(calls.every(([x, y]) => Math.abs(x - 500) < 60 && Math.abs(y - 400) < 60)).toBe(true);
    renderer.update(80, { x: 500, y: 400 }, 0, 'vanishing');
    expect(hasLiveArtwork(harness.graphics[0])).toBe(false);
    renderer.dispose();
  });

  it('draws nothing for the body when the physics position is not finite', () => {
    const harness = createScene();
    const renderer = new DemonRenderer(harness.scene, 18, 'devil', 0, 0);
    renderer.update(80, { x: Number.NaN, y: 10 }, 0, 'active');
    expect(hasLiveArtwork(harness.graphics[0])).toBe(false);
    renderer.dispose();
  });
});
