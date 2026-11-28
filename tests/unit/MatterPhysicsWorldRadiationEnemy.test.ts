import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { Vector2 } from '../../src/physics/PhysicsTypes';
import type { RadiationGraphicsLike, RadiationContainerLike, RadiationTextLike } from '../../src/rendering/RadiationEnemyRenderer';

type TestBody = MatterBodyLike & {
  isStatic?: boolean;
  destroyed?: boolean;
  options?: Record<string, unknown>;
  setVelocityCalls?: number;
  awakeCalls?: number;
};

function createHarness() {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  const graphicsStates: Array<{ commands: string[]; destroyed: boolean }> = [];

  const makeGraphics = (): RadiationGraphicsLike => {
    const state = { commands: [] as string[], destroyed: false };
    graphicsStates.push(state);
    const record = (command: string) => { state.commands.push(command); return api; };
    const api: RadiationGraphicsLike = {
      clear() { return record('clear'); },
      setDepth() { return api; },
      fillStyle() { return record('fillStyle'); },
      lineStyle() { return record('lineStyle'); },
      fillEllipse() { return record('fillEllipse'); },
      strokeEllipse() { return record('strokeEllipse'); },
      beginPath() { return record('beginPath'); },
      moveTo() { return record('moveTo'); },
      lineTo() { return record('lineTo'); },
      closePath() { return record('closePath'); },
      fillPath() { return record('fillPath'); },
      strokePath() { return record('strokePath'); },
      destroy() { state.destroyed = true; },
    };
    return api;
  };

  const makeBody = (x: number, y: number, label: string, options: Record<string, unknown> = {}): TestBody => {
    const body: TestBody = {
      position: { x, y },
      velocity: { x: 0, y: 0 },
      angle: 0,
      angularVelocity: 0,
      label,
      isStatic: Boolean(options.isStatic),
      destroyed: false,
      options,
      setVelocityCalls: 0,
      awakeCalls: 0,
      circleRadius: typeof options.circleRadius === 'number' ? options.circleRadius : undefined,
    };
    bodies.push(body);
    return body;
  };

  const scene = {
    add: {
      zone: () => ({}),
      graphics: makeGraphics,
      container: (_x: number, _y: number): RadiationContainerLike => ({
        add() { return this; },
        setDepth() { return this; },
        setPosition() { return this; },
        setRotation() { return this; },
        destroy() {},
      }),
      text: (): RadiationTextLike => ({
        setOrigin() { return this; },
        setDepth() { return this; },
        setPosition() { return this; },
        setText() { return this; },
        setColor() { return this; },
        setScale() { return this; },
        setVisible() { return this; },
        destroy() {},
      }),
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
          return {
            body,
            setPosition(x: number, y: number) { body.position.x = x; body.position.y = y; return this; },
            setVelocity(x: number, y: number) {
              body.velocity.x = x;
              body.velocity.y = y;
              const testBody = body as TestBody;
              testBody.setVelocityCalls = (testBody.setVelocityCalls ?? 0) + 1;
              return this;
            },
            setAngularVelocity(value: number) { body.angularVelocity = value; return this; },
            setAwake() {
              const testBody = body as TestBody;
              testBody.awakeCalls = (testBody.awakeCalls ?? 0) + 1;
              return this;
            },
            setStatic(value: boolean) { (body as TestBody).isStatic = value; return this; },
            destroy() { (body as TestBody).destroyed = true; return this; },
          };
        },
      },
    },
  };

  const world = new MatterPhysicsWorld(scene as never);
  return { world, bodies, graphicsStates, handlers };
}

const ballOptions = {
  radiusPx: 18,
  mass: 1,
  restitution: 0.05,
  friction: 0.8,
  frictionStatic: 0.8,
  frictionAir: 0,
  fixedRotation: false,
};

const enemyDefinition = {
  id: 'radioactive-hunter',
  x: 100,
  y: 100,
  radius: 19,
  mass: 1.25,
  speed: 82,
  direction: -1 as const,
  detectionRadius: 180,
  fuseSeconds: 0.5,
  explosionRadius: 250,
  explosionEnergy: 175000,
  fragmentRadius: 5,
  fragmentLaunchSpeed: 205,
  fragmentSpeed: 315,
  fragmentArmingDelaySeconds: 0.24,
  fragmentLifetimeSeconds: 2.3,
  fragmentHitImpulse: 270,
  restitution: 0.38,
  friction: 0.045,
  killPlaneY: 700,
  patrolMinX: 40,
  patrolMaxX: 280,
};

describe('MatterPhysicsWorld radioactive hunter', () => {
  it('creates a patrol body and detonates into exactly six guided fragments after detection and fuse', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 125, y: 100 }, ballOptions);
    harness.world.createRadioactiveEnemy(enemyDefinition);
    const enemy = harness.bodies.find((body) => body.label === 'RADIATION_ENEMY:radioactive-hunter')!;
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    harness.world.onPhysicsEvent((event) => events.push(event));

    harness.world.step(16);
    expect(enemy.isStatic).toBe(false);
    expect(PhysicsAdapter.fromMatterVelocity(enemy.velocity).x).toBeCloseTo(-82, 5);

    harness.world.step(484);
    expect(enemy.destroyed).toBe(false); // The zero is held on screen briefly, like the existing bomb timer.
    harness.world.step(120);
    expect(enemy.destroyed).toBe(true);
    expect(harness.bodies.filter((body) => body.label?.startsWith('RADIATION_FRAGMENT:'))).toHaveLength(6);
    expect(events.some((event) => event.type === 'RADIATION_ENEMY_EXPLODED')).toBe(true);

    const fragment = harness.bodies.find((body) => body.label?.startsWith('RADIATION_FRAGMENT:'))!;
    const fragmentVelocity = PhysicsAdapter.fromMatterVelocity(fragment.velocity);
    expect(Math.hypot(fragmentVelocity.x, fragmentVelocity.y)).toBeGreaterThan(0);
    harness.world.dispose();
  });

  it('self-destructs all remaining fragments when their configured lifetime expires', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 125, y: 100 }, ballOptions);
    harness.world.createRadioactiveEnemy({ ...enemyDefinition, fragmentArmingDelaySeconds: 0 });
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    const events: Array<{ type: string; [key: string]: unknown }> = [];
    harness.world.onPhysicsEvent((event) => events.push(event));

    harness.world.step(16);
    ball.position.x = 500;
    harness.world.step(484);
    harness.world.step(120);
    const fragments = harness.bodies.filter((body) => body.label?.startsWith('RADIATION_FRAGMENT:'));
    expect(fragments).toHaveLength(6);

    harness.world.step(2180);
    expect(fragments.every((fragment) => fragment.destroyed)).toBe(true);
    expect(events.filter((event) => event.type === 'RADIATION_FRAGMENT_EXPLODED')).toHaveLength(6);
    harness.world.dispose();
  });

  it('adds the configured hit impulse to the player and removes the contacting fragment', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 125, y: 100 }, ballOptions);
    harness.world.createRadioactiveEnemy({ ...enemyDefinition, fuseSeconds: 0.3, fragmentArmingDelaySeconds: 0 });
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    harness.world.step(16);
    ball.position.x = 500;
    harness.world.step(284);
    harness.world.step(120);

    const fragment = harness.bodies.find((body) => body.label?.startsWith('RADIATION_FRAGMENT:'))!;
    fragment.position.x = ball.position.x - 25;
    fragment.position.y = ball.position.y;
    const handler = harness.handlers.get('collisionstart')!;
    handler({
      pairs: [{
        bodyA: fragment,
        bodyB: ball,
        collision: { normal: { x: 1, y: 0 }, supports: [], supportCount: 0 },
      }],
    });

    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(270, 5);
    harness.world.step(16);
    expect(fragment.destroyed).toBe(true);
    harness.world.dispose();
  });
});
