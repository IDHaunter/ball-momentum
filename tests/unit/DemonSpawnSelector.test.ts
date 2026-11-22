import { describe, expect, it } from 'vitest';
import { getDemonSpawnPoints } from '../../src/level/DemonSpawnSelector';
import type { SolidDefinition } from '../../src/level/LevelTypes';

const area = { minX: 100, minY: 100, maxX: 500, maxY: 350 };

describe('DemonSpawnSelector', () => {
  it('places demons one radius above safe box tops inside the configured region', () => {
    const solids: SolidDefinition[] = [
      { id: 'safe', type: 'box', x: 80, y: 260, width: 440, height: 30, borders: { top: 'pavers' } },
      { id: 'spikes', type: 'box', x: 120, y: 180, width: 120, height: 24, borders: { top: 'spikes' } },
    ];
    const points = getDemonSpawnPoints(solids, area, 18);
    expect(points.length).toBeGreaterThan(0);
    expect(points.every((point) => point.x >= area.minX && point.x <= area.maxX)).toBe(true);
    expect(points.every((point) => Math.abs(point.y - 241.5) < 1e-5)).toBe(true);
  });

  it('supports upward-facing sloped polygon edges and excludes vertical or spiked edges', () => {
    const solids: SolidDefinition[] = [{
      id: 'slope', type: 'polygon',
      vertices: [[120, 260], [300, 175], [480, 260], [480, 340], [120, 340]],
      borders: [
        { edge: 0, style: 'spikes' },
        { edge: 1, style: 'pavers' },
        { edge: 2, style: 'none' },
        { edge: 3, style: 'none' },
        { edge: 4, style: 'none' },
      ],
    }];
    const points = getDemonSpawnPoints(solids, area, 18);
    expect(points.length).toBeGreaterThan(0);
    expect(points.every((point) => point.x >= area.minX && point.x <= area.maxX)).toBe(true);
    expect(points.some((point) => point.y < 190)).toBe(true);
  });

  it('does not choose movable or breakable solids as cached spawn surfaces', () => {
    const solids: SolidDefinition[] = [
      { id: 'movable', type: 'box', x: 100, y: 220, width: 300, height: 24, movable: { mass: 2, minimumImpactEnergy: 1000 } },
      { id: 'breakable', type: 'polygon', vertices: [[100, 220], [300, 220], [260, 300], [100, 300]], breakable: { thresholdEnergy: 1000 } },
    ];
    expect(getDemonSpawnPoints(solids, area, 18)).toEqual([]);
  });

  it('returns no candidates when the region has no safe upper surface', () => {
    const solids: SolidDefinition[] = [
      { id: 'wall', type: 'box', x: 120, y: 160, width: 40, height: 180, borders: { top: 'spikes' } },
    ];
    expect(getDemonSpawnPoints(solids, area, 18)).toEqual([]);
  });
});
