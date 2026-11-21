import { describe, expect, it } from 'vitest';
import { VomitEnemyRenderer, type VomitContainerLike, type VomitGraphicsLike, type VomitRendererSceneLike } from '../../src/rendering/VomitEnemyRenderer';

function createHarness() {
  const graphics: Array<{ commands: string[]; destroyed: boolean }> = [];
  const containers: Array<{ x: number; y: number; rotation: number; children: object[]; destroyed: boolean }> = [];
  const makeGraphics = (): VomitGraphicsLike => {
    const state = { commands: [] as string[], destroyed: false };
    graphics.push(state);
    const record = (name: string) => { state.commands.push(name); return api; };
    const api: VomitGraphicsLike = {
      clear() { return record('clear'); }, setDepth() { return api; },
      fillStyle() { return record('fillStyle'); }, lineStyle() { return record('lineStyle'); },
      fillEllipse() { return record('fillEllipse'); }, strokeEllipse() { return record('strokeEllipse'); },
      beginPath() { return record('beginPath'); }, moveTo() { return record('moveTo'); },
      lineTo() { return record('lineTo'); }, closePath() { return record('closePath'); },
      fillPath() { return record('fillPath'); }, strokePath() { return record('strokePath'); },
      destroy() { state.destroyed = true; },
    };
    return api;
  };
  const scene: VomitRendererSceneLike = {
    add: {
      container(x: number, y: number): VomitContainerLike {
        const state = { x, y, rotation: 0, children: [] as object[], destroyed: false };
        containers.push(state);
        return {
          add(child: object) { state.children.push(child); return this; },
          setDepth() { return this; }, setSize() { return this; },
          setRotation(value: number) { state.rotation = value; return this; },
          setPosition(nextX: number, nextY: number) { state.x = nextX; state.y = nextY; return this; },
          destroy() { state.destroyed = true; },
        };
      },
      graphics: makeGraphics,
    },
  };
  return { scene, graphics, containers };
}

describe('VomitEnemyRenderer', () => {
  it('draws a green emoji-like face at a player-sized visual scale and follows its physics body', () => {
    const harness = createHarness();
    const renderer = new VomitEnemyRenderer(harness.scene, 24, 'gremlin', 120, 180);
    renderer.update(16, { x: 130, y: 190 }, 0.2, null);

    expect(harness.containers[0]).toMatchObject({ x: 130, y: 190, rotation: 0.2 });
    expect(harness.graphics[0]?.commands).toContain('fillEllipse');
    expect(harness.graphics[0]?.commands.filter((command) => command === 'fillEllipse').length).toBeGreaterThan(10);
    renderer.dispose();
    expect(harness.graphics[1]?.destroyed).toBe(true);
  });

  it('animates gagging and emits a deterministic stream of green droplets', () => {
    const a = createHarness();
    const b = createHarness();
    const first = new VomitEnemyRenderer(a.scene, 24, 'same-seed', 100, 100);
    const second = new VomitEnemyRenderer(b.scene, 24, 'same-seed', 100, 100);
    first.update(16, { x: 100, y: 100 }, 0, { x: 220, y: 100 });
    second.update(16, { x: 100, y: 100 }, 0, { x: 220, y: 100 });
    first.onVomitPulse({ x: 100, y: 100 }, { x: 220, y: 100 }, 0, 190);
    second.onVomitPulse({ x: 100, y: 100 }, { x: 220, y: 100 }, 0, 190);

    expect(first.isGagging).toBe(true);
    expect(first.activeDropletCount).toBeGreaterThanOrEqual(10);
    first.update(80, { x: 100, y: 100 }, 0, { x: 220, y: 100 });
    second.update(80, { x: 100, y: 100 }, 0, { x: 220, y: 100 });
    expect(a.graphics[1]?.commands).toEqual(b.graphics[1]?.commands);
    expect(a.graphics[1]?.commands.filter((command) => command === 'fillEllipse').length).toBeGreaterThan(20);
    expect(a.graphics[1]?.commands).not.toContain('lineTo');
    expect(a.graphics[1]?.commands).not.toContain('strokePath');
    expect(a.graphics[1]?.commands.every((command) => command !== 'lineTo' && command !== 'strokePath')).toBe(true);

    for (let frame = 0; frame < 16; frame += 1) first.update(80, { x: 100, y: 100 }, 0, null);
    expect(first.activeDropletCount).toBe(0);
    first.dispose();
    second.dispose();
  });
});
