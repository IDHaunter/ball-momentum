import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { COLLISION_CATEGORIES } from '../../src/physics/CollisionCategories';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { PhysicsEvent } from '../../src/physics/PhysicsTypes';

type TestBody = MatterBodyLike & {
  destroyed?: boolean;
  isSensor?: boolean;
  isStatic?: boolean;
  collisionFilter?: { category?: number; mask?: number };
};

function createHarness() {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  const makeBody = (x: number, y: number, options: Record<string, unknown>): TestBody => {
    const collisionFilter = options.collisionFilter as TestBody['collisionFilter'];
    const body: TestBody = {
      position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
      label: String(options.label ?? ''), destroyed: false,
      isSensor: Boolean(options.isSensor), isStatic: Boolean(options.isStatic), collisionFilter,
    };
    bodies.push(body);
    return body;
  };

  const scene = {
    add: { zone: () => ({}) },
    matter: {
      world: {
        autoUpdate: true,
        engine: { timing: { timeScale: 1 } },
        on: (event: string, listener: (value: CollisionEventLike) => void) => handlers.set(event, listener),
        off: (event: string) => { handlers.delete(event); },
        step: () => undefined,
        setGravity: () => undefined,
      },
      add: {
        circle: (x: number, y: number, _radius: number, options: Record<string, unknown>) => makeBody(x, y, options),
        rectangle: (x: number, y: number, _width: number, _height: number, options: Record<string, unknown>) => makeBody(x, y, options),
        fromVertices: (x: number, y: number, _vertices: unknown, options: Record<string, unknown>) => makeBody(x, y, options),
        gameObject: (_visual: object, body: MatterBodyLike): MatterGameObjectLike => ({
          body,
          setPosition(x: number, y: number) { body.position.x = x; body.position.y = y; return this; },
          setVelocity(x: number, y: number) { body.velocity.x = x; body.velocity.y = y; return this; },
          setAngularVelocity(value: number) { body.angularVelocity = value; return this; },
          setAwake() { return this; },
          setStatic(value: boolean) { (body as TestBody).isStatic = value; return this; },
          destroy() { (body as TestBody).destroyed = true; return this; },
        }),
      },
    },
  };

  const world = new MatterPhysicsWorld(scene as never);
  return { world, handlers, bodies };
}

describe('MatterPhysicsWorld raised spike sensors', () => {
  it('creates a sensor with ball-like collision filters and emits one player death event', () => {
    const harness = createHarness();
    const events: PhysicsEvent[] = [];
    harness.world.onPhysicsEvent((event) => events.push(event));
    harness.world.createBall({ x: 80, y: 90 }, {
      radiusPx: 18, mass: 1, restitution: 0, friction: 0.5,
      frictionStatic: 0.5, frictionAir: 0, fixedRotation: false,
    });
    harness.world.createStaticBox({
      id: 'spike-floor', x: 40, y: 100, width: 100, height: 40,
      friction: 0.4, frictionStatic: 0.6, restitution: 0,
    });
    harness.world.createSpikeSensor({
      id: 'spike-floor:spike:top:0', parentTerrainId: 'spike-floor',
      vertices: [{ x: 72, y: 100 }, { x: 80, y: 72 }, { x: 88, y: 100 }],
    });

    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    const spike = harness.bodies.find((body) => body.label === 'SPIKE:spike-floor:spike:top:0')!;
    expect(spike.isSensor).toBe(true);
    expect(spike.collisionFilter?.category).toBe(COLLISION_CATEGORIES.TRIGGER);
    expect(spike.collisionFilter?.mask).toBe(
      COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BIRD
        | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY
        | COLLISION_CATEGORIES.RADIATION_ENEMY,
    );

    const pair = { bodyA: ball, bodyB: spike, collision: { normal: { x: 0, y: -1 } } };
    harness.handlers.get('collisionstart')?.({ pairs: [pair] });
    harness.handlers.get('collisionstart')?.({ pairs: [pair] });

    expect(events).toEqual([
      expect.objectContaining({ type: 'SPIKE_ENTITY_HIT', spikeId: 'spike-floor:spike:top:0', entityKind: 'player', entityId: 'ball' }),
    ]);
  });

  it('removes spike sensors together with their parent terrain solid', () => {
    const harness = createHarness();
    harness.world.createStaticBox({
      id: 'spike-wall', x: 100, y: 50, width: 30, height: 120,
      friction: 0.4, frictionStatic: 0.6, restitution: 0,
    });
    harness.world.createSpikeSensor({
      id: 'spike-wall:spike:left:0', parentTerrainId: 'spike-wall',
      vertices: [{ x: 100, y: 55 }, { x: 72, y: 62 }, { x: 100, y: 69 }],
    });
    const wall = harness.bodies.find((body) => body.label === 'spike-wall')!;
    const spike = harness.bodies.find((body) => body.label === 'SPIKE:spike-wall:spike:left:0')!;

    harness.world.removeTerrainBody('spike-wall');

    expect(wall.destroyed).toBe(true);
    expect(spike.destroyed).toBe(true);
  });
});
