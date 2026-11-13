import { describe, expect, it } from 'vitest';
import { BreakableTerrainManager } from '../../src/level/BreakableTerrainManager';
import type { SolidDefinition } from '../../src/level/LevelTypes';

const stack: SolidDefinition[] = [
  { id: 'base', type: 'box', x: 100, y: 300, width: 80, height: 80, material: 'glass', breakable: { thresholdEnergy: 100 } },
  { id: 'top', type: 'box', x: 100, y: 220, width: 80, height: 80, material: 'glass', breakable: { thresholdEnergy: 90 } },
];

describe('BreakableTerrainManager', () => {
  it('breaks the complete stack when its supporting lower piece is broken', () => {
    const manager = new BreakableTerrainManager(stack);
    expect(manager.break('base').map((solid) => solid.id)).toEqual(['base', 'top']);
    expect(manager.break('base')).toEqual([]);
    expect(manager.isBroken('top')).toBe(true);
  });

  it('keeps the lower piece intact when only the top piece is broken', () => {
    const manager = new BreakableTerrainManager(stack);
    expect(manager.break('top').map((solid) => solid.id)).toEqual(['top']);
    expect(manager.isBroken('base')).toBe(false);
    expect(manager.break('base').map((solid) => solid.id)).toEqual(['base']);
  });

  it('does not cascade to a separate non-overlapping piece', () => {
    const manager = new BreakableTerrainManager([
      ...stack,
      { id: 'separate', type: 'box', x: 240, y: 220, width: 80, height: 80, material: 'glass', breakable: { thresholdEnergy: 90 } },
    ]);
    expect(manager.break('base').map((solid) => solid.id)).toEqual(['base', 'top']);
    expect(manager.isBroken('separate')).toBe(false);
  });
});
