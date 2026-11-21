import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { Vector2 } from '../../src/physics/PhysicsTypes';

type TestBody = MatterBodyLike & { isStatic?: boolean; destroyed?: boolean; options?: Record<string, unknown> };

function createHarness() {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  const visuals: Array<{ text: string; destroyed: boolean; scaleX: number; scaleY: number; rotation: number; flipX: boolean }> = [];
  const makeBody = (x: number, y: number, label: string, options: Record<string, unknown> = {}): TestBody => {
    const body: TestBody = {
      position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
      label, isStatic: Boolean(options.isStatic), destroyed: false, options,
      circleRadius: typeof options.circleRadius === 'number' ? options.circleRadius : undefined,
    };
    bodies.push(body);
    return body;
  };
  const scene = {
    add: {
      zone: () => ({}),
      circle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; } }),
      rectangle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; } }),
      text: (_x: number, _y: number, text = '') => {
        const state = { text, destroyed: false, scaleX: 1, scaleY: 1, rotation: 0, flipX: false };
        visuals.push(state);
        return {
          setOrigin() { return this; },
          setDepth() { return this; },
          setPosition() { return this; },
          setRotation(value: number) { state.rotation = value; return this; },
          setScale(x: number, y = x) { state.scaleX = x; state.scaleY = y; return this; },
          setFlipX(value: boolean) { state.flipX = value; return this; },
          setColor() { return this; },
          destroy() { state.destroyed = true; },
        };
      },
    },
    matter: {
      world: {
        autoUpdate: true,
        engine: { timing: { timeScale: 1 } },
        on(event: string, listener: (event: CollisionEventLike) => void) { handlers.set(event, listener); },
        off(event: string) { handlers.delete(event); },
        step() {},
        setGravity() {},
      },
      add: {
        circle(x: number, y: number, radius: number, options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''), { ...options, circleRadius: radius });
        },
        rectangle(x: number, y: number, _width: number, _height: number, options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''), options);
        },
        fromVertices(x: number, y: number, _vertices: Vector2[][], options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''), options);
        },
        gameObject(_visual: object, body: MatterBodyLike): MatterGameObjectLike {
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
  const world = new MatterPhysicsWorld(scene as never);
  return { world, handlers, bodies, visuals };
}

const birdDefinition = {
  id: 'nest-guardian', x: 200, y: 180, radius: 17, mass: 1.35,
  patrolSpeed: 95, attackSpeed: 260, aggressive: true, detectionRadius: 100, attackImpulse: 150,
  direction: 1 as const, restitution: 0.48, friction: 0.02,
  killPlaneY: 700, patrolMinX: 100, patrolMaxX: 300,
};
const ballOptions = {
  radiusPx: 18, mass: 1, restitution: 0.05, friction: 0.8,
  frictionStatic: 0.8, frictionAir: 0, fixedRotation: false,
};

describe('MatterPhysicsWorld flying birds', () => {
  it('creates a dynamic bird body with configured mass and collision filters', () => {
    const harness = createHarness();
    harness.world.createBird(birdDefinition);
    const bird = harness.bodies.find((body) => body.label === 'BIRD:nest-guardian')!;
    expect(bird.options?.mass).toBe(1.35);
    expect(bird.isStatic).toBe(false);
    const filter = bird.options?.collisionFilter as { category: number; mask: number };
    expect(filter.category).toBe(0x0040);
    expect(filter.mask & 0x0001).toBeTruthy();
    expect(filter.mask & 0x0002).toBeTruthy();
    harness.world.dispose();
  });

  it('patrols the configured horizontal interval at patrol speed', () => {
    const harness = createHarness();
    harness.world.createBird(birdDefinition);
    harness.world.step(1000 / 60);
    const bird = harness.bodies.find((body) => body.label === 'BIRD:nest-guardian')!;
    expect(PhysicsAdapter.fromMatterVelocity(bird.velocity).x).toBeCloseTo(95, 6);
    harness.world.dispose();
  });

  it('faces the direction of patrol without scaling the physical body', () => {
    const harness = createHarness();
    harness.world.createBird({ ...birdDefinition, direction: -1 });
    harness.world.step(1000 / 60);
    const bird = harness.bodies.find((body) => body.label === 'BIRD:nest-guardian')!;
    const visual = harness.visuals.find((item) => item.text === '🐦')!;
    expect(visual.flipX).toBe(true);
    expect(visual.scaleX).toBe(1);
    expect(visual.scaleY).toBe(1);
    expect(bird.circleRadius).toBe(17);
    harness.world.dispose();
  });

  it('keeps non-aggressive birds on patrol even when the ball enters their territory', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 200, y: 205 }, ballOptions);
    harness.world.createBird({ ...birdDefinition, aggressive: false });
    harness.world.step(1000 / 60);
    const bird = harness.bodies.find((body) => body.label === 'BIRD:nest-guardian')!;
    expect(PhysicsAdapter.fromMatterVelocity(bird.velocity).x).toBeCloseTo(95, 6);
    expect(PhysicsAdapter.fromMatterVelocity(bird.velocity).y).toBeCloseTo(0, 6);
    harness.world.dispose();
  });

  it('turns around when a solid blocks its forward flight corridor', () => {
    const harness = createHarness();
    harness.world.createStaticBox({
      id: 'flight-wall', x: 218, y: 160, width: 30, height: 40,
      friction: 0.3, frictionStatic: 0.5, restitution: 0,
    });
    harness.world.createBird(birdDefinition);
    harness.world.step(1000 / 60);
    const bird = harness.bodies.find((body) => body.label === 'BIRD:nest-guardian')!;
    expect(Math.abs(PhysicsAdapter.fromMatterVelocity(bird.velocity).x)).toBeCloseTo(95, 6);
    harness.world.dispose();
  });

  it('only starts an attack when the ball is both inside the territory and within bird detection radius', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 200, y: 205 }, ballOptions);
    harness.world.createBird(birdDefinition);
    harness.world.step(1000 / 60);
    const bird = harness.bodies.find((body) => body.label === 'BIRD:nest-guardian')!;
    expect(PhysicsAdapter.fromMatterVelocity(bird.velocity).y).toBeGreaterThan(0);
    harness.world.dispose();

    const distant = createHarness();
    distant.world.createBall({ x: 350, y: 205 }, ballOptions); // in territory, but 150 px away
    distant.world.createBird(birdDefinition);
    distant.world.step(1000 / 60);
    const distantBird = distant.bodies.find((body) => body.label === 'BIRD:nest-guardian')!;
    expect(PhysicsAdapter.fromMatterVelocity(distantBird.velocity).x).toBeCloseTo(95, 6);
    expect(PhysicsAdapter.fromMatterVelocity(distantBird.velocity).y).toBeCloseTo(0, 6);
    distant.world.dispose();
  });

  it('adds a configurable egress impulse to the ball and an equal opposite impulse to the bird', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 200, y: 205 }, ballOptions);
    harness.world.createBird(birdDefinition);
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    const bird = harness.bodies.find((body) => body.label === 'BIRD:nest-guardian')!;
    harness.world.step(1000 / 60);
    const ballBefore = PhysicsAdapter.fromMatterVelocity(ball.velocity);
    const birdBefore = PhysicsAdapter.fromMatterVelocity(bird.velocity);

    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: bird, bodyB: ball, collision: { normal: { x: 0, y: 1 } } }],
    });
    harness.world.step(1000 / 60);

    const ballAfter = PhysicsAdapter.fromMatterVelocity(ball.velocity);
    const birdAfter = PhysicsAdapter.fromMatterVelocity(bird.velocity);
    expect(ballAfter.x - ballBefore.x).toBeCloseTo(-150, 5);
    expect(birdAfter.x).toBeCloseTo(birdBefore.x * 0.985 + 150 / 1.35, 5);
    expect(ballAfter.y).toBeCloseTo(ballBefore.y, 5);

    for (let step = 0; step < 34; step += 1) harness.world.step(1000 / 60);
    expect(Math.abs(PhysicsAdapter.fromMatterVelocity(bird.velocity).x)).toBeCloseTo(95, 6);
    harness.world.dispose();
  });
});
