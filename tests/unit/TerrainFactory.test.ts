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
    const captured: Array<Parameters<IPhysicsWorld['createStaticBox']>[0]> = [];
    const world = {
      createStaticBox: (definition: Parameters<IPhysicsWorld['createStaticBox']>[0]) => captured.push(definition),
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

    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      id: 'glass-wall',
      x: 100,
      y: 100,
      width: 40,
      height: 200,
      friction: 0.08,
      frictionStatic: 0.12,
      restitution: 0.34,
      breakable: true,
    });
  });

  it('marks a breakable polygon collider as breakable too', () => {
    const captured: Array<Parameters<IPhysicsWorld['createStaticPolygon']>[0]> = [];
    const world = {
      createStaticBox: () => undefined,
      createStaticPolygon: (definition: Parameters<IPhysicsWorld['createStaticPolygon']>[0]) => captured.push(definition),
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

    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      id: 'glass-triangle',
      vertices: [
        { x: 50, y: 100 },
        { x: 100, y: 30 },
        { x: 150, y: 100 },
      ],
      friction: 0.08,
      frictionStatic: 0.12,
      restitution: 0.34,
      breakable: true,
    });
  });
});


describe('TerrainFactory movable boxes', () => {
  it('creates a dynamic-capable box with mass, energy threshold, and kill plane', () => {
    const captured: Array<Parameters<IPhysicsWorld['createMovableBox']>[0]> = [];
    const world = {
      createStaticBox: () => undefined,
      createStaticPolygon: () => undefined,
      createMovableBox: (definition: Parameters<IPhysicsWorld['createMovableBox']>[0]) => captured.push(definition),
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
    new TerrainFactory(world, renderer).build({
      schemaVersion: 1, id: 'movable-test', title: 'Movable test',
      world: { width: 500, height: 400, killPlaneY: 360 },
      spawn: { x: 20, y: 20 }, triggers: [],
      materials: { stone: { friction: 0.45, frictionStatic: 0.65, restitution: 0.01 } },
      solids: [{
        id: 'crate', type: 'box', x: 100, y: 150, width: 60, height: 50, material: 'stone',
        movable: { mass: 4, minimumImpactEnergy: 32_000 },
      }],
    });

    expect(captured).toEqual([{
      id: 'crate', x: 100, y: 150, width: 60, height: 50,
      mass: 4, minimumImpactEnergy: 32_000, killPlaneY: 360,
      friction: 0.45, frictionStatic: 0.65, restitution: 0.01,
    }]);
  });
});

describe('TerrainFactory spring surfaces', () => {
  function makeWorld(captured: {
    boxes: Array<Parameters<IPhysicsWorld['createStaticBox']>[0]>;
    polygons: Array<Parameters<IPhysicsWorld['createStaticPolygon']>[0]>;
  }): IPhysicsWorld {
    return {
      createStaticBox: (definition: Parameters<IPhysicsWorld['createStaticBox']>[0]) => { captured.boxes.push(definition); },
      createStaticPolygon: (definition: Parameters<IPhysicsWorld['createStaticPolygon']>[0]) => { captured.polygons.push(definition); },
      createMovableBox: () => undefined,
      removeTerrainBody: () => undefined,
      createSensor: () => undefined,
      removeLevelBodies: () => undefined,
      step: () => undefined,
      setGravity: () => undefined,
      setTimeScale: () => undefined,
      onPhysicsEvent: () => () => undefined,
      createBall: () => { throw new Error('not used'); },
    } as unknown as IPhysicsWorld;
  }

  it('maps any configured box sides to their outward normals', () => {
    const captured = { boxes: [] as Array<Parameters<IPhysicsWorld['createStaticBox']>[0]>, polygons: [] as Array<Parameters<IPhysicsWorld['createStaticPolygon']>[0]> };
    new TerrainFactory(makeWorld(captured), { render: () => undefined } as unknown as TerrainRenderer).build({
      schemaVersion: 1, id: 'spring-box', title: 'Spring box',
      world: { width: 300, height: 300, killPlaneY: 280 }, spawn: { x: 20, y: 20 }, triggers: [],
      solids: [{
        id: 'pad', type: 'box', x: 50, y: 60, width: 100, height: 40,
        springSurfaces: [{ side: 'top', impulse: 620 }, { side: 'right', impulse: 440 }, { side: 'left', impulse: 360 }],
      }],
    });

    expect(captured.boxes[0].springSurfaces).toEqual([
      { id: 'pad:spring:top', normal: { x: 0, y: -1 }, impulse: 620 },
      { id: 'pad:spring:right', normal: { x: 1, y: 0 }, impulse: 440 },
      { id: 'pad:spring:left', normal: { x: -1, y: 0 }, impulse: 360 },
    ]);
  });

  it('maps polygon edge indices to the true outward edge normals', () => {
    const captured = { boxes: [] as Array<Parameters<IPhysicsWorld['createStaticBox']>[0]>, polygons: [] as Array<Parameters<IPhysicsWorld['createStaticPolygon']>[0]> };
    new TerrainFactory(makeWorld(captured), { render: () => undefined } as unknown as TerrainRenderer).build({
      schemaVersion: 1, id: 'spring-poly', title: 'Spring polygon',
      world: { width: 300, height: 300, killPlaneY: 280 }, spawn: { x: 20, y: 20 }, triggers: [],
      solids: [{ id: 'triangle', type: 'polygon', vertices: [[10, 50], [50, 10], [90, 50]], springSurfaces: [{ edge: 0, impulse: 560 }] }],
    });

    const spring = captured.polygons[0].springSurfaces?.[0];
    expect(spring?.id).toBe('triangle:spring:edge-0');
    expect(spring?.normal.x).toBeCloseTo(-Math.SQRT1_2, 6);
    expect(spring?.normal.y).toBeCloseTo(-Math.SQRT1_2, 6);
    expect(spring?.impulse).toBe(560);
  });

  it('ignores spring assignments on glass colliders', () => {
    const captured = { boxes: [] as Array<Parameters<IPhysicsWorld['createStaticBox']>[0]>, polygons: [] as Array<Parameters<IPhysicsWorld['createStaticPolygon']>[0]> };
    new TerrainFactory(makeWorld(captured), { render: () => undefined } as unknown as TerrainRenderer).build({
      schemaVersion: 1, id: 'spring-glass', title: 'Glass ignores springs',
      world: { width: 300, height: 300, killPlaneY: 280 }, spawn: { x: 20, y: 20 }, triggers: [],
      materials: { glass: { friction: 0.08, frictionStatic: 0.12, restitution: 0.34 } },
      solids: [{
        id: 'glass', type: 'box', x: 50, y: 60, width: 100, height: 40, material: 'glass',
        breakable: { thresholdEnergy: 1000 }, springSurfaces: [{ side: 'top', impulse: 900 }],
      }],
    });

    expect(captured.boxes[0].breakable).toBe(true);
    expect(captured.boxes[0].springSurfaces).toEqual([]);
  });
});
