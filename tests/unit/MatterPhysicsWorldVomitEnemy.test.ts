import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { Vector2 } from '../../src/physics/PhysicsTypes';
import type { VomitGraphicsLike } from '../../src/rendering/VomitEnemyRenderer';

type TestBody = MatterBodyLike & { isStatic?: boolean; destroyed?: boolean; options?: Record<string, unknown>; setVelocityCalls?: number; awakeCalls?: number };

function createHarness() {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  const graphics: Array<{ commands: string[]; destroyed: boolean }> = [];
  const makeGraphics = (): VomitGraphicsLike => {
    const state = { commands: [] as string[], destroyed: false };
    graphics.push(state);
    const record = (name: string) => { state.commands.push(name); return api; };
    const api: VomitGraphicsLike = {
      clear() { return record('clear'); }, setDepth() { return api; }, fillStyle() { return record('fillStyle'); },
      lineStyle() { return record('lineStyle'); }, fillEllipse() { return record('fillEllipse'); },
      strokeEllipse() { return record('strokeEllipse'); }, beginPath() { return record('beginPath'); },
      moveTo() { return record('moveTo'); }, lineTo() { return record('lineTo'); }, closePath() { return record('closePath'); },
      fillPath() { return record('fillPath'); }, strokePath() { return record('strokePath'); },
      destroy() { state.destroyed = true; },
    };
    return api;
  };
  const makeBody = (x: number, y: number, label: string, options: Record<string, unknown> = {}): TestBody => {
    const body: TestBody = {
      position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
      label, isStatic: Boolean(options.isStatic), destroyed: false, options, setVelocityCalls: 0, awakeCalls: 0,
      circleRadius: typeof options.circleRadius === 'number' ? options.circleRadius : undefined,
    };
    bodies.push(body);
    return body;
  };
  const scene = {
    add: {
      zone: () => ({}), graphics: makeGraphics,
      container: (x: number, y: number) => {
        const state = { x, y, rotation: 0, children: [] as object[], destroyed: false };
        return {
          add(child: object) { state.children.push(child); return this; },
          setDepth() { return this; }, setSize() { return this; }, setRotation(value: number) { state.rotation = value; return this; },
          setPosition(px: number, py: number) { state.x = px; state.y = py; return this; },
          destroy() { state.destroyed = true; },
        };
      },
    },
    matter: {
      world: {
        autoUpdate: true, engine: { timing: { timeScale: 1 } },
        on(event: string, listener: (event: CollisionEventLike) => void) { handlers.set(event, listener); },
        off(event: string) { handlers.delete(event); }, step() {}, setGravity() {},
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
            setVelocity(x: number, y: number) { body.velocity.x = x; body.velocity.y = y; (body as TestBody).setVelocityCalls = ((body as TestBody).setVelocityCalls ?? 0) + 1; return this; },
            setAngularVelocity(value: number) { body.angularVelocity = value; return this; },
            setAwake() { (body as TestBody).awakeCalls = ((body as TestBody).awakeCalls ?? 0) + 1; return this; }, setStatic(value: boolean) { (body as TestBody).isStatic = value; return this; },
            destroy() { (body as TestBody).destroyed = true; return this; },
          };
        },
      },
    },
  };
  const world = new MatterPhysicsWorld(scene as never);
  return { world, bodies, graphics, handlers };
}

const ballOptions = {
  radiusPx: 18, mass: 1, restitution: 0.05, friction: 0.8,
  frictionStatic: 0.8, frictionAir: 0, fixedRotation: false,
};
const enemyDefinition = {
  id: 'green-gremlin', x: 100, y: 100, radius: 24, mass: 1.2,
  detectionRadius: 180, pulseImpulse: 190, pulseIntervalSeconds: 0.9,
  restitution: 0.18, friction: 0.62, killPlaneY: 700,
};

describe('MatterPhysicsWorld vomit enemies', () => {
  it('creates a dynamic pushable body with the configured mass and collision masks', () => {
    const harness = createHarness();
    harness.world.createVomitEnemy(enemyDefinition);
    const enemy = harness.bodies.find((body) => body.label === 'VOMIT_ENEMY:green-gremlin')!;
    expect(enemy.options?.mass).toBe(1.2);
    expect(enemy.circleRadius).toBe(24);
    expect(enemy.isStatic).toBe(false);
    const filter = enemy.options?.collisionFilter as { category: number; mask: number };
    expect(filter.category).toBe(0x0080);
    expect(filter.mask & 0x0001).toBeTruthy();
    expect(filter.mask & 0x0002).toBeTruthy();
    harness.world.dispose();
  });

  it('sends an immediate outward impulse and repeats it at the configured interval while the ball stays in range', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 180, y: 100 }, ballOptions);
    harness.world.createVomitEnemy(enemyDefinition);
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;

    harness.world.step(1000 / 60);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(190, 5);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).y).toBeCloseTo(0, 5);
    // The pulse must go through Phaser Matter's setter so positionPrev is
    // synchronized; assigning body.velocity directly is lost by Body.update.
    expect(ball.setVelocityCalls).toBe(1);
    expect(ball.awakeCalls).toBe(1);

    harness.world.step(800);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(190, 5);
    harness.world.step(120);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(380, 5);
    harness.world.dispose();
  });

  it('stops pulsing outside the detection radius and pulses immediately after re-entry', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 140, y: 100 }, ballOptions);
    harness.world.createVomitEnemy({ ...enemyDefinition, detectionRadius: 60 });
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    harness.world.step(1000 / 60);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(190, 5);

    ball.position.x = 300;
    harness.world.step(1000 / 60);
    const outsideVelocity = PhysicsAdapter.fromMatterVelocity(ball.velocity).x;
    harness.world.step(1000);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(outsideVelocity, 5);

    ball.position.x = 140;
    harness.world.step(1000 / 60);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(outsideVelocity + 190, 5);
    harness.world.dispose();
  });

  it('directs the impulse from the green enemy toward the player', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 100, y: 40 }, ballOptions);
    harness.world.createVomitEnemy(enemyDefinition);
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    harness.world.step(1000 / 60);
    const velocity = PhysicsAdapter.fromMatterVelocity(ball.velocity);
    expect(velocity.x).toBeCloseTo(0, 5);
    expect(velocity.y).toBeLessThan(0);
    harness.world.dispose();
  });

  it('removes the green enemy and its effect graphics after it falls below the kill plane', () => {
    const harness = createHarness();
    harness.world.createVomitEnemy(enemyDefinition);
    const enemy = harness.bodies.find((body) => body.label === 'VOMIT_ENEMY:green-gremlin')!;
    enemy.position.y = enemyDefinition.killPlaneY + 1;

    harness.world.step(1000 / 60);

    expect(enemy.destroyed).toBe(true);
    expect(harness.graphics[1]?.destroyed).toBe(true);
    harness.world.dispose();
  });
});
