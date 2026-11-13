import { describe, expect, it } from 'vitest';
import { getCollisionVertices } from '../../src/level/TerrainFactory';
import type { BoxSolidDefinition, PolygonSolidDefinition } from '../../src/level/LevelTypes';
import { TerrainFactory } from '../../src/level/TerrainFactory';
import type { IPhysicsWorld } from '../../src/physics/IPhysicsWorld';
import type { TerrainRenderer } from '../../src/rendering/TerrainRenderer';

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

describe('TerrainFactory breakable solids', () => {
  it('marks a glass collider as breakable for impact event mapping', () => {
    const captured: Array<{ id: string; breakable?: boolean }> = [];
    const world = {
      createStaticBox: (definition: { id: string; breakable?: boolean }) => captured.push(definition),
      createStaticPolygon: () => undefined,
      removeTerrainBody: () => undefined,
      createSensor: () => undefined,
      removeLevelBodies: () => undefined,
      step: () => undefined,
      setGravity: () => undefined,
      setTimeScale: () => undefined,
      onPhysicsEvent: () => () => undefined,
      createBall: () => { throw new Error('not used'); },
    } as unknown as IPhysicsWorld;
    const renderer = { render: () => undefined } as unknown as TerrainRenderer;
    const factory = new TerrainFactory(world, renderer);
    factory.build({
      schemaVersion: 1,
      id: 'glass-test',
      title: 'Glass test',
      world: { width: 500, height: 400, killPlaneY: 380 },
      spawn: { x: 20, y: 20 },
      solids: [{ id: 'glass-wall', type: 'box', x: 100, y: 100, width: 40, height: 200, material: 'glass', breakable: { thresholdEnergy: 1000 } }],
      triggers: [],
      materials: { glass: { friction: 0.08, frictionStatic: 0.12, restitution: 0.34 } },
    });

    expect(captured).toEqual([{ id: 'glass-wall', breakable: true }]);
  });

  it('marks a breakable polygon collider as breakable too', () => {
    const captured: Array<{ id: string; breakable?: boolean }> = [];
    const world = {
      createStaticBox: () => undefined,
      createStaticPolygon: (definition: { id: string; breakable?: boolean }) => captured.push(definition),
      removeTerrainBody: () => undefined,
      createSensor: () => undefined,
      removeLevelBodies: () => undefined,
      step: () => undefined,
      setGravity: () => undefined,
      setTimeScale: () => undefined,
      onPhysicsEvent: () => () => undefined,
      createBall: () => { throw new Error('not used'); },
    } as unknown as IPhysicsWorld;
    const renderer = { render: () => undefined } as unknown as TerrainRenderer;
    const factory = new TerrainFactory(world, renderer);
    factory.build({
      schemaVersion: 1,
      id: 'glass-polygon-test',
      title: 'Glass polygon test',
      world: { width: 200, height: 200, killPlaneY: 180 },
      spawn: { x: 20, y: 20 },
      solids: [{
        id: 'glass-triangle',
        type: 'polygon',
        vertices: [[50, 100], [100, 30], [150, 100]],
        material: 'glass',
        breakable: { thresholdEnergy: 1200 },
      }],
      triggers: [],
      materials: { glass: { friction: 0.08, frictionStatic: 0.12, restitution: 0.34 } },
    });

    expect(captured).toEqual([{ id: 'glass-triangle', breakable: true }]);
  });
});
