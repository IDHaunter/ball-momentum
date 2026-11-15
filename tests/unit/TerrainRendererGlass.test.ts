import { describe, expect, it } from 'vitest';
import { TerrainRenderer } from '../../src/rendering/TerrainRenderer';
import type { LevelDefinition } from '../../src/level/LevelTypes';

function createGraphicsHarness() {
  const calls: string[] = [];
  let graphics: object;
  graphics = new Proxy({}, {
    get(_target, property) {
      if (property === 'setDepth') return () => graphics;
      if (typeof property === 'string') return (..._args: unknown[]) => { calls.push(property); };
      return undefined;
    },
  });
  return { graphics, calls };
}

describe('TerrainRenderer glass overlays', () => {
  it('draws no decorative cross-lines inside glass boxes or polygons', () => {
    const base = createGraphicsHarness();
    const overlay = createGraphicsHarness();
    const graphics = [base, overlay];
    const scene = {
      add: { graphics: () => graphics.shift()!.graphics },
    } as unknown as ConstructorParameters<typeof TerrainRenderer>[0];
    const renderer = new TerrainRenderer(scene);

    const level = {
      id: 'glass-border-regression',
      solids: [
        {
          id: 'glass-box', type: 'box', x: 0, y: 0, width: 120, height: 80, material: 'glass',
          borders: { top: 'none', right: 'none', bottom: 'none', left: 'none' },
        },
        {
          id: 'glass-polygon', type: 'polygon',
          vertices: [[160, 0], [240, 0], [200, 80]], material: 'glass',
          borders: [{ edge: 0, style: 'none' }, { edge: 1, style: 'none' }, { edge: 2, style: 'none' }],
        },
      ],
    } as unknown as LevelDefinition;

    renderer.render(level);
    expect(overlay.calls).not.toContain('lineBetween');
    expect(overlay.calls).not.toContain('lineStyle');
  });
});
