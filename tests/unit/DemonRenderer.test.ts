import { describe, expect, it } from 'vitest';
import { DemonRenderer, type DemonContainerLike, type DemonGraphicsLike, type DemonRendererSceneLike } from '../../src/rendering/DemonRenderer';

function createScene() {
  const graphics: Array<{ commands: string[]; destroyed: boolean }> = [];
  const containers: Array<{ visible: boolean; scale: [number, number]; destroyed: boolean }> = [];
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
      container: () => {
        const state = { visible: false, scale: [1, 1] as [number, number], destroyed: false };
        containers.push(state);
        return {
          add() { return this; }, setDepth() { return this; }, setSize() { return this; }, setRotation() { return this; },
          setPosition() { return this; }, setVisible(value: boolean) { state.visible = value; return this; },
          setScale(x: number, y = x) { state.scale = [x, y]; return this; }, destroy() { state.destroyed = true; },
        } satisfies DemonContainerLike;
      },
    },
  };
  return { scene, graphics, containers };
}

describe('DemonRenderer', () => {
  it('shows teleport warning lightning before the body becomes visible', () => {
    const harness = createScene();
    const renderer = new DemonRenderer(harness.scene, 18, 'devil', 120, 180);
    renderer.update(80, { x: 120, y: 180 }, 0, 'telegraph');
    expect(renderer.isVisible).toBe(false);
    expect(harness.containers[0]?.visible).toBe(false);
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
    expect(harness.containers[0]?.visible).toBe(true);
    expect(harness.graphics[0]?.commands.filter((command) => command === 'fillEllipse').length).toBeGreaterThan(10);
    expect(harness.graphics[0]?.commands).toContain('strokePath');
    expect(harness.containers[0]?.scale[0]).toBeLessThan(1);
    renderer.dispose();
  });

  it('draws a separate lightning strike and cleans up teleport and strike graphics', () => {
    const harness = createScene();
    const renderer = new DemonRenderer(harness.scene, 18, 'devil', 120, 180);
    renderer.onStrike({ x: 120, y: 180 }, { x: 260, y: 150 });
    renderer.update(40, { x: 120, y: 180 }, 0, 'active');
    expect(harness.graphics[2]?.commands).toContain('lineTo');
    renderer.update(80, { x: 120, y: 180 }, 0, 'vanishing');
    expect(harness.graphics[1]?.commands).toContain('strokeEllipse');
    renderer.dispose();
    expect(harness.graphics[1]?.destroyed).toBe(true);
    expect(harness.graphics[2]?.destroyed).toBe(true);
  });
});
