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
  const labels: Array<{ text: string; destroyed: boolean; x: number; y: number; rotation: number }> = [];
  const makeBody = (x: number, y: number, label: string, options: Record<string, unknown> = {}): TestBody => {
    const body: TestBody = {
      position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
      label, isStatic: Boolean(options.isStatic), destroyed: false, options,
    };
    bodies.push(body);
    return body;
  };
  const scene = {
    add: {
      zone: () => ({}),
      circle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; } }),
      rectangle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; } }),
      text: (x: number, y: number, text = '') => {
        const state = { text, destroyed: false, x, y, rotation: 0 };
        labels.push(state);
        return {
          setOrigin() { return this; },
          setDepth() { return this; },
          setPosition(px: number, py: number) { state.x = px; state.y = py; return this; },
          setRotation(value: number) { state.rotation = value; return this; },
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
        circle(x: number, y: number, _radius: number, options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''), options);
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
  return { world, handlers, bodies, labels };
}

const botDefinition = {
  id: 'patrol-bot', x: 150, y: 184, radius: 16, mass: 1.25,
  speed: 120, direction: 1 as const, restitution: 0.82, friction: 0.015,
  killPlaneY: 500,
};

describe('MatterPhysicsWorld autonomous bots', () => {
  it('creates a dynamic collidable bot with the configured mass and collision mask', () => {
    const harness = createHarness();
    harness.world.createBot(botDefinition);
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    expect(bot.options?.mass).toBe(1.25);
    expect(bot.options?.isStatic).toBe(false);
    expect((bot.options?.collisionFilter as { category: number }).category).toBe(0x0010);
    const botMask = (bot.options?.collisionFilter as { mask: number }).mask;
    expect(botMask & 0x0001).toBeTruthy();
    expect(botMask & 0x0002).toBeTruthy();
    expect(botMask & 0x0010).toBeTruthy();
    harness.world.dispose();
  });

  it('patrols at the configured horizontal speed', () => {
    const harness = createHarness();
    harness.world.createStaticBox({
      id: 'platform', x: 100, y: 200, width: 100, height: 100,
      friction: 0.3, frictionStatic: 0.5, restitution: 0,
    });
    harness.world.createBot(botDefinition);
    harness.world.step(1000 / 60);
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    expect(PhysicsAdapter.fromMatterVelocity(bot.velocity).x).toBeCloseTo(120, 6);
    harness.world.dispose();
  });

  it('turns around when a vertical obstacle blocks the patrol path', () => {
    const harness = createHarness();
    harness.world.createStaticBox({
      id: 'platform', x: 100, y: 200, width: 300, height: 100,
      friction: 0.3, frictionStatic: 0.5, restitution: 0,
    });
    harness.world.createStaticBox({
      id: 'wall', x: 200, y: 150, width: 20, height: 50,
      friction: 0.3, frictionStatic: 0.5, restitution: 0,
    });
    harness.world.createBot({ ...botDefinition, x: 180, y: 184 });
    harness.world.step(1000 / 60);
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    expect(PhysicsAdapter.fromMatterVelocity(bot.velocity).x).toBeCloseTo(-120, 6);
    harness.world.dispose();
  });

  it('turns around before walking off a platform edge', () => {
    const harness = createHarness();
    harness.world.createStaticBox({
      id: 'platform', x: 100, y: 200, width: 100, height: 100,
      friction: 0.3, frictionStatic: 0.5, restitution: 0,
    });
    harness.world.createBot({ ...botDefinition, x: 185, y: 184 });
    harness.world.step(1000 / 60);
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    expect(PhysicsAdapter.fromMatterVelocity(bot.velocity).x).toBeCloseTo(-120, 6);
    harness.world.dispose();
  });

  it('makes two bots turn away from each other after a new head-on collision', () => {
    const harness = createHarness();
    harness.world.createBot({ ...botDefinition, id: 'bot-a', x: 120, direction: 1 });
    harness.world.createBot({ ...botDefinition, id: 'bot-b', x: 170, direction: -1 });
    const botA = harness.bodies.find((body) => body.label === 'BOT:bot-a')!;
    const botB = harness.bodies.find((body) => body.label === 'BOT:bot-b')!;
    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: botA, bodyB: botB, collision: { normal: { x: 1, y: 0 } } }],
    });
    for (let i = 0; i < 11; i += 1) harness.world.step(1000 / 60);
    expect(PhysicsAdapter.fromMatterVelocity(botA.velocity).x).toBeCloseTo(-120, 6);
    expect(PhysicsAdapter.fromMatterVelocity(botB.velocity).x).toBeCloseTo(120, 6);
    harness.world.dispose();
  });

  it('separates head-on bots and assigns outward directions regardless of their previous directions', () => {
    const harness = createHarness();
    harness.world.createBot({ ...botDefinition, id: 'bot-a', x: 120, direction: 1 });
    harness.world.createBot({ ...botDefinition, id: 'bot-b', x: 150, direction: 1 });
    const botA = harness.bodies.find((body) => body.label === 'BOT:bot-a')!;
    const botB = harness.bodies.find((body) => body.label === 'BOT:bot-b')!;

    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: botB, bodyB: botA, collision: { normal: { x: -1, y: 0 } } }],
    });
    expect(botB.position.x - botA.position.x).toBeGreaterThanOrEqual(33.5);

    harness.world.step(1000 / 60);
    expect(PhysicsAdapter.fromMatterVelocity(botA.velocity).x).toBeCloseTo(-120, 6);
    expect(PhysicsAdapter.fromMatterVelocity(botB.velocity).x).toBeCloseTo(120, 6);
    harness.world.dispose();
  });

  it('turns around using the supported rear footprint when the bot centre has passed the edge', () => {
    const harness = createHarness();
    harness.world.createStaticBox({
      id: 'platform', x: 100, y: 200, width: 100, height: 100,
      friction: 0.3, frictionStatic: 0.5, restitution: 0,
    });
    harness.world.createBot({ ...botDefinition, x: 205, y: 184 });
    harness.world.step(1000 / 60);
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    expect(PhysicsAdapter.fromMatterVelocity(bot.velocity).x).toBeCloseTo(-120, 6);
    harness.world.dispose();
  });

  it('adopts the direction of the physical push after the player ball hits a bot', () => {
    const harness = createHarness();
    const ball = harness.world.createBall({ x: 100, y: 100 }, {
      radiusPx: 18, mass: 1, restitution: 0.05, friction: 0.8,
      frictionStatic: 0.8, frictionAir: 0, fixedRotation: false,
    });
    harness.world.createBot(botDefinition);
    const ballBody = harness.bodies.find((body) => body.label === 'BALL')!;
    const botBody = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    botBody.velocity.x = -2;
    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: ballBody, bodyB: botBody, collision: { normal: { x: 1, y: 0 } } }],
    });
    for (let i = 0; i < 15; i += 1) harness.world.step(1000 / 60);
    expect(PhysicsAdapter.fromMatterVelocity(botBody.velocity).x).toBeCloseTo(-120, 6);
    ball.destroy();
    harness.world.dispose();
  });

  it('removes a bot and its face markers after it falls below the level kill plane', () => {
    const harness = createHarness();
    harness.world.createBot(botDefinition);
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    bot.position.y = 510;
    harness.world.step(1000 / 60);
    expect(bot.destroyed).toBe(true);
    expect(harness.labels.filter((label) => label.text === '••' || label.text === '⌣').every((label) => label.destroyed)).toBe(true);
    harness.world.dispose();
  });
});
