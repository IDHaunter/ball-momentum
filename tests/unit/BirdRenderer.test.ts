import { describe, expect, it } from 'vitest';
import { BirdRenderer, type BirdContainerLike, type BirdGraphicsLike, type BirdRendererSceneLike } from '../../src/rendering/BirdRenderer';

interface GraphicsState { commands: Array<{ name: string; args: number[] }>; destroyed: boolean; }

function createScene(): { scene: BirdRendererSceneLike; graphics: GraphicsState[]; container: { x: number; y: number; scaleX: number; scaleY: number; rotation: number; children: object[]; destroyed: boolean } } {
  const graphics: GraphicsState[] = [];
  const containerState = { x: 0, y: 0, scaleX: 1, scaleY: 1, rotation: 0, children: [] as object[], destroyed: false };
  const scene: BirdRendererSceneLike = {
    add: {
      container: (x: number, y: number) => {
        containerState.x = x;
        containerState.y = y;
        const container: BirdContainerLike = {
          add(child: object) { containerState.children.push(child); return this; },
          setDepth() { return this; },
          setSize() { return this; },
          setScale(x: number, y = x) { containerState.scaleX = x; containerState.scaleY = y; return this; },
          setRotation(value: number) { containerState.rotation = value; return this; },
          destroy() { containerState.destroyed = true; },
        };
        return container;
      },
      graphics: () => {
        const state: GraphicsState = { commands: [], destroyed: false };
        graphics.push(state);
        const add = (name: string, ...args: number[]) => { state.commands.push({ name, args }); return api; };
        const api: BirdGraphicsLike = {
          clear() { state.commands = []; return api; },
          setDepth() { return api; },
          fillStyle(color: number, alpha = 1) { return add('fillStyle', color, alpha); },
          lineStyle(width: number, color: number, alpha = 1) { return add('lineStyle', width, color, alpha); },
          fillEllipse(x: number, y: number, width: number, height: number) { return add('fillEllipse', x, y, width, height); },
          strokeEllipse(x: number, y: number, width: number, height: number) { return add('strokeEllipse', x, y, width, height); },
          beginPath() { return add('beginPath'); },
          moveTo(x: number, y: number) { return add('moveTo', x, y); },
          lineTo(x: number, y: number) { return add('lineTo', x, y); },
          closePath() { return add('closePath'); },
          fillPath() { return add('fillPath'); },
          strokePath() { return add('strokePath'); },
          destroy() { state.destroyed = true; },
        };
        return api;
      },
    },
  };
  return { scene, graphics, container: containerState };
}

describe('BirdRenderer', () => {
  it('draws a detailed round bird with animated wings and oversized eyes', () => {
    const harness = createScene();
    const renderer = new BirdRenderer(harness.scene, 36, 'sandbox-nest-guardian');
    renderer.update(16, 1, false);
    const firstFrame = harness.graphics[0]!.commands.map((command) => command.args);
    renderer.update(50, 1, false);
    const secondFrame = harness.graphics[0]!.commands.map((command) => command.args);

    expect(harness.container.children).toHaveLength(1);
    expect(harness.container.x).toBe(0);
    expect(harness.container.y).toBe(0);
    expect(harness.graphics[0]!.commands.filter((command) => command.name === 'fillEllipse').length).toBeGreaterThan(10);
    expect(harness.graphics[0]!.commands.filter((command) => command.name === 'strokePath').length).toBeGreaterThan(8);
    expect(secondFrame).not.toEqual(firstFrame);
    expect(renderer.facingDirection).toBe(1);
    renderer.dispose();
  });

  it('accelerates the wing beat and faces the current travel direction while attacking', () => {
    const harness = createScene();
    const renderer = new BirdRenderer(harness.scene, 36, 'guardian');
    renderer.update(16, -1, true);
    expect(renderer.facingDirection).toBe(-1);
    expect(renderer.isAttacking).toBe(true);
    expect(harness.container.scaleX).toBe(1);
    expect(harness.container.scaleY).toBe(1);
    renderer.dispose();
  });

  it('recovers upright after being flipped and stays upright while the circular body remains inverted', () => {
    const harness = createScene();
    const renderer = new BirdRenderer(harness.scene, 36, 'guardian-upright-recovery');

    // Let the bird react to the collision first, then trigger its self-righting animation.
    for (let frame = 0; frame < 3; frame += 1) renderer.update(80, 1, false, Math.PI);
    expect(Math.abs(harness.container.rotation)).toBeGreaterThan(2.8);

    renderer.update(80, 1, false, Math.PI);
    const rotationAtRecoveryStart = Math.abs(harness.container.rotation);
    for (let frame = 0; frame < 9; frame += 1) renderer.update(80, 1, false, Math.PI);

    expect(Math.abs(harness.container.rotation)).toBeLessThan(0.1);
    expect(Math.abs(harness.container.rotation)).toBeLessThan(rotationAtRecoveryStart);

    // A circular Matter body may keep its accumulated angle; the artwork must not flip back.
    for (let frame = 0; frame < 12; frame += 1) renderer.update(80, 1, false, Math.PI);
    expect(Math.abs(harness.container.rotation)).toBeLessThan(0.1);

    renderer.dispose();
  });

  it('throws a deterministic feather burst that falls and eventually disappears', () => {
    const first = createScene();
    const second = createScene();
    const a = new BirdRenderer(first.scene, 36, 'same-seed');
    const b = new BirdRenderer(second.scene, 36, 'same-seed');
    a.onImpact({ x: 100, y: 150 }, 220);
    b.onImpact({ x: 100, y: 150 }, 220);
    expect(a.activeFeatherCount).toBe(15);
    expect(b.activeFeatherCount).toBe(15);

    a.update(80, 1, false);
    b.update(80, 1, false);
    expect(first.graphics[1]!.commands).toEqual(second.graphics[1]!.commands);
    expect(first.graphics[1]!.commands.filter((command) => command.name === 'fillPath').length).toBe(15);

    for (let frame = 0; frame < 24; frame += 1) a.update(80, 1, false);
    expect(a.activeFeatherCount).toBe(0);
    a.dispose();
    b.dispose();
    expect(first.graphics[1]!.destroyed).toBe(true);
  });
});
