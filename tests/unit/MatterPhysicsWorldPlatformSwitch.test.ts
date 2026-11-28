import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';
import { COLLISION_CATEGORIES } from '../../src/physics/CollisionCategories';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { BallPhysicsOptions, PlatformSwitchPhysicsOptions, Vector2 } from '../../src/physics/PhysicsTypes';

type TestBody = MatterBodyLike & { label?: string; options?: Record<string, unknown>; destroyed?: boolean };

function createHarness() {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  const textObjects: Array<{ value: string; color: string; setText(value: string): unknown; setColor(value: string): unknown }> = [];
  let pendingPairs: CollisionEventLike['pairs'] = [];
  let pendingPostCollisionVelocity: Vector2 | undefined;

  const makeGraphics = () => {
    const api: Record<string, unknown> = {};
    const chain = () => api;
    for (const method of ['clear', 'setDepth', 'fillStyle', 'fillRect', 'lineStyle', 'strokeRect', 'lineBetween', 'fillCircle', 'fillEllipse', 'strokeEllipse', 'beginPath', 'moveTo', 'lineTo', 'closePath', 'fillPath', 'destroy']) {
      api[method] = chain;
    }
    return api;
  };
  const makeBody = (x: number, y: number, options: Record<string, unknown> = {}): TestBody => {
    const body: TestBody = { position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0, label: String(options.label ?? ''), options };
    bodies.push(body);
    return body;
  };
  const scene = {
    add: {
      zone: () => ({ kind: 'zone' }),
      graphics: makeGraphics,
      text: (_x: number, _y: number, initial: string, style: { color?: string }) => {
        const state = {
          value: initial,
          color: style.color ?? '',
          setText(value: string) { state.value = value; return state; },
          setColor(value: string) { state.color = value; return state; },
          setOrigin() { return state; },
          setDepth() { return state; },
          destroy() {},
        };
        textObjects.push(state);
        return state;
      },
    },
    matter: {
      world: {
        autoUpdate: true,
        engine: { timing: { timeScale: 1 } },
        on(event: string, listener: (event: CollisionEventLike) => void) { handlers.set(event, listener); },
        off(event: string) { handlers.delete(event); },
        step() {
          if (pendingPairs.length) {
            const ball = pendingPairs.flatMap((pair) => [pair.bodyA, pair.bodyB])
              .find((body) => body.label === 'BALL');
            if (ball && pendingPostCollisionVelocity) {
              const resolved = PhysicsAdapter.toMatterVelocity(pendingPostCollisionVelocity);
              ball.velocity.x = resolved.x;
              ball.velocity.y = resolved.y;
            }
            handlers.get('collisionstart')?.({ pairs: pendingPairs });
            pendingPairs = [];
            pendingPostCollisionVelocity = undefined;
          }
        },
        setGravity() {},
      },
      add: {
        circle(x: number, y: number, _radius: number, options: Record<string, unknown>) { return makeBody(x, y, options); },
        rectangle(x: number, y: number, width: number, height: number, options: Record<string, unknown>) { return makeBody(x, y, { ...options, width, height }); },
        fromVertices(x: number, y: number, _vertices: Vector2[][], options: Record<string, unknown>) { return makeBody(x, y, options); },
        gameObject(_visual: object, body: MatterBodyLike): MatterGameObjectLike {
          return {
            body,
            setPosition(x: number, y: number) { body.position.x = x; body.position.y = y; return this; },
            setRotation(value: number) { body.angle = value; return this; },
            setVelocity(x: number, y: number) { body.velocity.x = x; body.velocity.y = y; return this; },
            setAngularVelocity(value: number) { body.angularVelocity = value; return this; },
            setAwake() { return this; },
            setStatic() { return this; },
            destroy() { (body as TestBody).destroyed = true; return this; },
          };
        },
      },
    },
  };
  const world = new MatterPhysicsWorld(scene as never);
  return {
    world,
    bodies,
    textObjects,
    collide(ball: TestBody, lever: TestBody) {
      pendingPairs = [{ bodyA: ball, bodyB: lever, collision: { normal: { x: -1, y: 0 }, supports: [] } }];
    },
    collideWithResolvedVelocity(ball: TestBody, lever: TestBody, resolvedVelocity: Vector2) {
      pendingPairs = [{ bodyA: ball, bodyB: lever, collision: { normal: { x: -1, y: 0 }, supports: [] } }];
      pendingPostCollisionVelocity = resolvedVelocity;
    },
  };
}

const ballOptions: BallPhysicsOptions = {
  radiusPx: 18, mass: 1, restitution: 0.05, friction: 0.8,
  frictionStatic: 0.8, frictionAir: 0, fixedRotation: false,
};
const switchOptions: PlatformSwitchPhysicsOptions = {
  id: 'rocket-bridge', leverX: 420, leverY: 200, leverHeight: 48, minimumImpactSpeed: 240,
  initiallyEnabled: false, platformWidth: 160, platformSurface: 'metal', platformSpeed: 140,
  platformPoints: [{ x: 500, y: 500 }, { x: 700, y: 500 }],
};

function bodyFor(harness: ReturnType<typeof createHarness>, label: string): TestBody {
  const body = harness.bodies.find((item) => item.label === label);
  if (!body) throw new Error(`Missing body ${label}`);
  return body;
}

describe('MatterPhysicsWorld paired platform switch', () => {
  it('requires the configured impact speed and uses impact direction to start and stop the platform', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 200, y: 100 }, ballOptions);
    harness.world.createPlatformSwitch(switchOptions);
    const ball = bodyFor(harness, 'BALL');
    const lever = bodyFor(harness, 'PLATFORM_LEVER:rocket-bridge');
    const platform = bodyFor(harness, 'MOVING_PLATFORM:rocket-bridge');

    expect(lever.options?.isSensor).toBe(false);
    expect(lever.options).toMatchObject({ width: 14, height: 48 });
    expect(lever.options?.collisionFilter).toMatchObject({
      category: COLLISION_CATEGORIES.TERRAIN,
      mask: COLLISION_CATEGORIES.BALL
        | COLLISION_CATEGORIES.RADIATION_ENEMY
        | COLLISION_CATEGORIES.RADIATION_FRAGMENT,
    });

    ball.velocity = PhysicsAdapter.toMatterVelocity({ x: 200, y: 0 });
    harness.collideWithResolvedVelocity(ball, lever, { x: -60, y: 0 });
    harness.world.step(16);
    expect(harness.textObjects).toHaveLength(0);

    ball.velocity = PhysicsAdapter.toMatterVelocity({ x: 300, y: 0 });
    harness.collideWithResolvedVelocity(ball, lever, { x: -90, y: 0 });
    harness.world.step(16);
    expect(lever.angle).toBeCloseTo(0.5, 4);
    harness.world.step(16);
    expect(PhysicsAdapter.fromMatterVelocity(platform.velocity).x).toBeCloseTo(140, 4);

    for (let index = 0; index < 27; index += 1) harness.world.step(16);
    ball.velocity = PhysicsAdapter.toMatterVelocity({ x: -300, y: 0 });
    harness.collideWithResolvedVelocity(ball, lever, { x: 90, y: 0 });
    harness.world.step(16);
    expect(harness.textObjects).toHaveLength(0);
    expect(lever.angle).toBeCloseTo(-0.5, 4);
    harness.world.step(16);
    expect(platform.velocity).toEqual({ x: 0, y: 0 });
    harness.world.dispose();
  });
});
