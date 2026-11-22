import { describe, expect, it } from 'vitest';
import { PlatformSwitchRenderer } from '../../src/rendering/PlatformSwitchRenderer';

type DrawCommand = [name: string, ...args: unknown[]];

function createHarness() {
  const graphics: DrawCommand[][] = [];
  let textCalls = 0;

  const makeGraphics = () => {
    const commands: DrawCommand[] = [];
    const api: Record<string, unknown> = {};
    const methods = [
      'clear', 'setDepth', 'fillStyle', 'fillRect', 'lineStyle', 'strokeRect',
      'lineBetween', 'fillCircle', 'fillEllipse', 'strokeEllipse',
      'beginPath', 'moveTo', 'lineTo', 'closePath', 'fillPath', 'destroy',
    ];
    for (const method of methods) {
      api[method] = (...args: unknown[]) => {
        commands.push([method, ...args]);
        return api;
      };
    }
    graphics.push(commands);
    return api;
  };

  const scene = {
    add: {
      graphics: makeGraphics,
      text: () => {
        textCalls += 1;
        throw new Error('Platform switch must not create an ON/OFF text label');
      },
    },
  };

  return { scene, graphics, get textCalls() { return textCalls; } };
}

describe('PlatformSwitchRenderer', () => {
  it('uses a checkpoint-style oval metal pedestal and no ON/OFF label', () => {
    const harness = createHarness();
    const renderer = new PlatformSwitchRenderer(
      harness.scene as never,
      'test-switch',
      { x: 120, y: 200 },
      160,
      'metal',
      48,
      false,
    );

    renderer.update(16, { x: 240, y: 300 });

    const leverCommands = harness.graphics[1] ?? [];
    expect(leverCommands).toContainEqual(['fillEllipse', 120, 208, 42, 7]);
    expect(leverCommands).toContainEqual(['fillEllipse', 120, 202, 38, 12]);
    expect(leverCommands).toContainEqual(['strokeEllipse', 120, 202, 38, 12]);
    expect(leverCommands).toContainEqual(['fillEllipse', 120, 199, 28, 5]);
    expect(leverCommands.some(([name]) => name === 'fillRect' || name === 'strokeRect')).toBe(false);
    expect(harness.textCalls).toBe(0);

    renderer.setEnabled(true);
    renderer.update(16, { x: 240, y: 300 });
    expect(harness.textCalls).toBe(0);
    expect(leverCommands).toContainEqual(['fillStyle', 0xff6662, 1]);
    expect(leverCommands).toContainEqual(['fillStyle', 0x62e58b, 1]);
    renderer.dispose();
  });
});
