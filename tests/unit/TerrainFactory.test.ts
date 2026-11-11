import { describe, expect, it } from 'vitest';
import { getCollisionVertices } from '../../src/level/TerrainFactory';
import type { BoxSolidDefinition, PolygonSolidDefinition } from '../../src/level/LevelTypes';

describe('getCollisionVertices', () => {
  it('buries the side walls of a ramp inside its neighboring platforms', () => {
    const left: BoxSolidDefinition = { id: 'left', type: 'box', x: 0, y: 760, width: 700, height: 520 };
    const ramp: PolygonSolidDefinition = {
      id: 'ramp', type: 'polygon',
      vertices: [[700, 760], [1050, 850], [1050, 1280], [700, 1280]],
    };
    const right: BoxSolidDefinition = { id: 'right', type: 'box', x: 1050, y: 850, width: 500, height: 430 };

    expect(getCollisionVertices(ramp, [left, ramp, right])).toEqual([
      { x: 700, y: 760 }, { x: 1050, y: 850 },
      { x: 1074, y: 1280 }, { x: 676, y: 1280 },
    ]);
  });

  it('keeps polygons without adjoining boxes unchanged', () => {
    const triangle: PolygonSolidDefinition = {
      id: 'triangle', type: 'polygon', vertices: [[10, 50], [50, 10], [90, 50]],
    };
    expect(getCollisionVertices(triangle, [triangle])).toEqual([
      { x: 10, y: 50 }, { x: 50, y: 10 }, { x: 90, y: 50 },
    ]);
  });
});
