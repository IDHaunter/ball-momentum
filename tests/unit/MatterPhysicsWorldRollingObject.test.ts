import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { MovableBoxOptions, PhysicsEvent, RollingObjectPhysicsOptions, StaticBoxOptions, Vector2 } from '../../src/physics/PhysicsTypes';

interface TestBody extends MatterBodyLike { destroyed?: boolean; isStatic?: boolean; }

function createHarness(appearance: 'stone' | 'snow' = 'stone') {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  const circleOptions: Array<Record<string, unknown>> = [];
  const images: Array<{ x: number; y: number; texture: string; width: number; height: number; depth: number; destroyed: boolean }> = [];
  const events: PhysicsEvent[] = [];
  const textures = new Set<string>();
  let pendingCollision: CollisionEventLike | null = null;
  let pendingCollisionPhase: 'collisionstart' | 'collisionactive' = 'collisionstart';
  const canvasContext = new Proxy({}, {
    get: (_target, property) => {
      if (property === 'createLinearGradient' || property === 'createRadialGradient') {
        return () => ({ addColorStop() {} });
      }
      return () => undefined;
    },
  }) as CanvasRenderingContext2D;
  const makeBody = (x: number, y: number, label: string, options: Record<string, unknown> = {}): TestBody => {
    const body: TestBody = {
      position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
      label, isStatic: Boolean(options.isStatic), destroyed: false,
    };
    bodies.push(body);
    return body;
  };

  const scene = {
    add: {
      zone: () => ({}),
      rectangle: () => ({ setDepth() { return this; } }),
      graphics: () => ({
        setDepth() { return this; },
        setPosition() { return this; },
        setRotation() { return this; },
        lineStyle() { return this; },
        lineBetween() { return this; },
        fillStyle() { return this; },
        fillEllipse() { return this; },
        strokeEllipse() { return this; },
        fillPoints() { return this; },
        destroy() {},
      }),
      image: (x: number, y: number, texture: string) => {
        const state = { x, y, texture, width: 0, height: 0, depth: 0, destroyed: false };
        images.push(state);
        return {
          setDisplaySize(width: number, height: number) { state.width = width; state.height = height; return this; },
          setDepth(depth: number) { state.depth = depth; return this; },
          setPosition(px: number, py: number) { state.x = px; state.y = py; return this; },
          setRotation() { return this; },
          destroy() { state.destroyed = true; },
        };
      },
    },
    textures: {
      exists: (key: string) => textures.has(key),
      createCanvas: (key: string) => {
        textures.add(key);
        return { getContext: () => canvasContext, refresh() { return this; } };
      },
      remove: (key: string) => { textures.delete(key); },
    },
    matter: {
      world: {
        autoUpdate: true,
        engine: { timing: { timeScale: 1 } },
        on(event: string, listener: (event: CollisionEventLike) => void) { handlers.set(event, listener); },
        off(event: string) { handlers.delete(event); },
        step() {
          if (pendingCollision) {
            handlers.get(pendingCollisionPhase)?.(pendingCollision);
            pendingCollision = null;
          }
        },
        setGravity() {},
      },
      add: {
        circle(x: number, y: number, _radius: number, options: Record<string, unknown>) {
          circleOptions.push(options);
          const body = makeBody(x, y, String(options.label ?? ''), options);
          body.circleRadius = _radius;
          return body;
        },
        rectangle(x: number, y: number, _width: number, _height: number, options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''), options);
        },
        fromVertices(x: number, y: number, _vertices: Vector2[][], options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''), options);
        },
        gameObject(_gameObject: object, body: MatterBodyLike): MatterGameObjectLike {
          const testBody = body as TestBody;
          return {
            body,
            setPosition(x: number, y: number) { body.position.x = x; body.position.y = y; return this; },
            setVelocity(x: number, y: number) { body.velocity.x = x; body.velocity.y = y; return this; },
            setAngularVelocity(value: number) { body.angularVelocity = value; return this; },
            setAwake() { return this; },
            setStatic(value: boolean) { testBody.isStatic = value; return this; },
            destroy() { testBody.destroyed = true; return this; },
          };
        },
      },
    },
  };

  const physics = new MatterPhysicsWorld(scene as never);
  physics.onPhysicsEvent((event) => events.push(event));
  const glass: StaticBoxOptions = {
    id: 'glass-wall', x: 200, y: 0, width: 40, height: 220,
    friction: 0.08, frictionStatic: 0.12, restitution: 0.34,
    breakable: true, breakableThresholdEnergy: 420_000, breakableVelocityRetention: 0.72,
  };
  physics.createStaticBox(glass);
  const rolling: RollingObjectPhysicsOptions = {
    id: 'rolling-stone', x: 160, y: 100, radius: 38, mass: 7.5,
    appearance, friction: 0.56, restitution: 0.08, killPlaneY: 500,
  };
  physics.createRollingObject(rolling);
  const movable: MovableBoxOptions = {
    id: 'movable-crate', x: 320, y: 60, width: 60, height: 60, mass: 2,
    minimumImpactEnergy: 20_000, killPlaneY: 500, friction: 0.4, frictionStatic: 0.5, restitution: 0.25,
  };
  physics.createMovableBox(movable);
  const terrainBody = bodies.find((body) => body.label === 'glass-wall')!;
  const rollingBody = bodies.find((body) => body.label === 'ROLLING_OBJECT:rolling-stone')!;
  const movableBody = bodies.find((body) => body.label === 'MOVABLE:movable-crate')!;

  return {
    physics, bodies, circleOptions, images, events, rollingBody, movableBody,
    collide(velocityPxPerSecond: Vector2, phase: 'start' | 'active' = 'start', target: 'glass' | 'movable' = 'glass') {
      const velocity = PhysicsAdapter.toMatterVelocity(velocityPxPerSecond);
      pendingCollisionPhase = phase === 'active' ? 'collisionactive' : 'collisionstart';
      rollingBody.velocity.x = velocity.x;
      rollingBody.velocity.y = velocity.y;
      const targetBody = target === 'movable' ? movableBody : terrainBody;
      pendingCollision = {
        // Rock is body A. The SAT normal points toward the target; the outward
        // contact normal must point back toward the incoming side of the rock.
        pairs: [{ bodyA: rollingBody, bodyB: targetBody, collision: { normal: { x: 1, y: 0 }, depth: 2 } }],
      };
    },
    get rollingVisual() { return images[0]; },
  };
}

describe('MatterPhysicsWorld rolling objects', () => {
  it('creates a dynamic round stone with the configured mass, surface response, and matching visual', () => {
    const harness = createHarness();
    expect(harness.rollingBody.isStatic).toBe(false);
    expect(harness.rollingBody.circleRadius).toBe(38);
    expect(harness.circleOptions[0]).toMatchObject({
      label: 'ROLLING_OBJECT:rolling-stone', isStatic: false, mass: 7.5,
      friction: 0.56, restitution: 0.08,
      collisionFilter: { category: 0x0008 },
    });
    const collisionMask = (harness.circleOptions[0].collisionFilter as { mask: number }).mask;
    expect(collisionMask & 0x0002).toBe(0x0002); // static terrain
    expect(collisionMask & 0x0008).toBe(0x0008); // other rolling objects and movable crates
    expect(harness.rollingVisual).toMatchObject({
      texture: 'ball-momentum-rolling-stone-v1', width: 76, height: 76, depth: 5.5,
    });
    harness.physics.dispose();
  });

  it('uses the same round physics body for the future snowball appearance', () => {
    const harness = createHarness('snow');
    expect(harness.rollingBody.circleRadius).toBe(38);
    expect(harness.circleOptions[0]).toMatchObject({ mass: 7.5, friction: 0.56, restitution: 0.08 });
    expect(harness.rollingVisual.texture).toBe('ball-momentum-rolling-snow-v1');
    harness.physics.dispose();
  });

  it('releases a movable crate when the rolling stone hits it with enough side-impact energy', () => {
    const harness = createHarness();
    harness.collide({ x: 300, y: 0 }, 'start', 'movable');
    harness.physics.step(1000 / 60);

    expect(harness.movableBody.isStatic).toBe(false);
    expect(PhysicsAdapter.fromMatterVelocity(harness.movableBody.velocity).x).toBeGreaterThan(0);
    expect(PhysicsAdapter.fromMatterVelocity(harness.rollingBody.velocity).x).toBeGreaterThan(0);
    harness.physics.dispose();
  });

  it('breaks a glass solid when the rolling stone has enough normal impact energy and retains momentum', () => {
    const harness = createHarness();
    harness.collide({ x: 500, y: 0 });
    harness.physics.step(1000 / 60);

    expect(harness.events).toHaveLength(1);
    const impact = harness.events[0];
    expect(impact).toMatchObject({
      type: 'ROLLING_OBJECT_BREAKABLE_IMPACT',
      rollingObjectId: 'rolling-stone',
      terrainId: 'glass-wall',
    });
    if (impact.type !== 'ROLLING_OBJECT_BREAKABLE_IMPACT') throw new Error('Expected a breakable impact');
    // Impact energy is calculated from floating-point Matter velocities.
    expect(impact.impactEnergy).toBeCloseTo(937_500, 7);
    expect(harness.rollingBody.position.x).toBeCloseTo(155, 5);
    expect(PhysicsAdapter.fromMatterVelocity(harness.rollingBody.velocity).x).toBeCloseTo(360, 5);
    harness.physics.dispose();
  });

  it('does not break glass when the rolling stone impact is below the configured energy threshold', () => {
    const harness = createHarness();
    harness.collide({ x: 100, y: 0 });
    harness.physics.step(1000 / 60);

    expect(harness.events).toHaveLength(0);
    expect(harness.rollingBody.position.x).toBe(160);
    expect(PhysicsAdapter.fromMatterVelocity(harness.rollingBody.velocity).x).toBeCloseTo(100, 5);
    harness.physics.dispose();
  });

  it('can break glass after a weak first contact when the rolling stone is pushed harder while still touching it', () => {
    const harness = createHarness();
    harness.collide({ x: 100, y: 0 }, 'start');
    harness.physics.step(1000 / 60);
    expect(harness.events).toHaveLength(0);

    harness.collide({ x: 500, y: 0 }, 'active');
    harness.physics.step(1000 / 60);
    expect(harness.events).toHaveLength(1);
    const impact = harness.events[0];
    expect(impact.type).toBe('ROLLING_OBJECT_BREAKABLE_IMPACT');
    if (impact.type !== 'ROLLING_OBJECT_BREAKABLE_IMPACT') throw new Error('Expected a breakable impact');
    expect(impact.impactEnergy).toBeCloseTo(937_500, 7);
    expect(PhysicsAdapter.fromMatterVelocity(harness.rollingBody.velocity).x).toBeCloseTo(360, 5);
    harness.physics.dispose();
  });

  it('uses only the impact velocity component perpendicular to glass for the break threshold', () => {
    const harness = createHarness();
    harness.collide({ x: 100, y: 400 });
    harness.physics.step(1000 / 60);

    // High tangential speed must not be mistaken for a strong hit against the wall.
    expect(harness.events).toHaveLength(0);
    expect(PhysicsAdapter.fromMatterVelocity(harness.rollingBody.velocity).x).toBeCloseTo(100, 5);
    harness.physics.dispose();
  });

  it('removes a rolling object after it falls below the level kill plane', () => {
    const harness = createHarness();
    harness.rollingBody.position.y = 501;
    harness.physics.step(1000 / 60);
    expect(harness.rollingBody.destroyed).toBe(true);
    harness.physics.dispose();
  });
});
