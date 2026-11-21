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
  const labels: Array<{ text: string; style: Record<string, unknown>; destroyed: boolean; x: number; y: number; rotation: number }> = [];
  const circles: Array<{ x: number; y: number; radius: number; color: number; alpha: number; strokeWidth?: number; strokeColor?: number; strokeAlpha?: number; depth?: number; rotation?: number; scaleX?: number; scaleY?: number; visible?: boolean; destroyed?: boolean }> = [];
  const images: Array<{ x: number; y: number; texture: string; width?: number; height?: number; depth?: number; rotation?: number; destroyed?: boolean }> = [];
  const gradientStops: string[] = [];
  let gradientTextureCreated = false;
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
      circle: (x: number, y: number, radius: number, color: number, alpha = 1) => {
        const state: (typeof circles)[number] = { x, y, radius, color, alpha, destroyed: false };
        circles.push(state);
        return {
          setStrokeStyle(width: number, strokeColor: number, strokeAlpha = 1) {
            state.strokeWidth = width;
            state.strokeColor = strokeColor;
            state.strokeAlpha = strokeAlpha;
            return this;
          },
          setDepth(depth: number) { state.depth = depth; return this; },
          setPosition(px: number, py: number) { state.x = px; state.y = py; return this; },
          setRotation(value: number) { state.rotation = value; return this; },
          setScale(scaleX: number, scaleY = scaleX) { state.scaleX = scaleX; state.scaleY = scaleY; return this; },
          setAlpha(value: number) { state.alpha = value; return this; },
          setVisible(value: boolean) { state.visible = value; return this; },
          destroy() { state.destroyed = true; },
        };
      },
      rectangle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; } }),
      image: (x: number, y: number, texture: string) => {
        const state: (typeof images)[number] = { x, y, texture, destroyed: false, rotation: 0 };
        images.push(state);
        return {
          setDisplaySize(width: number, height: number) { state.width = width; state.height = height; return this; },
          setDepth(depth: number) { state.depth = depth; return this; },
          setPosition(px: number, py: number) { state.x = px; state.y = py; return this; },
          setRotation(value: number) { state.rotation = value; return this; },
          destroy() { state.destroyed = true; },
        };
      },
      text: (x: number, y: number, text = '', style: Record<string, unknown> = {}) => {
        const state = { text, style, destroyed: false, x, y, rotation: 0 };
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
    textures: {
      exists: () => gradientTextureCreated,
      createCanvas: () => {
        gradientTextureCreated = true;
        const gradient = { addColorStop: (_offset: number, color: string) => gradientStops.push(color) };
        const context = {
          clearRect() {}, save() {}, beginPath() {}, arc() {}, closePath() {}, clip() {}, fillRect() {}, fill() {}, restore() {},
          ellipse() {},
          createLinearGradient: () => gradient,
          createRadialGradient: () => gradient,
          set fillStyle(_value: unknown) {},
        };
        return { getContext: () => context as unknown as CanvasRenderingContext2D, refresh() {} };
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
  const events: import('../../src/physics/PhysicsTypes').PhysicsEvent[] = [];
  world.onPhysicsEvent((event) => events.push(event));
  return { world, handlers, bodies, labels, circles, images, gradientStops, events };
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

  it('uses a thin dark outline, a shared glossy gradient shell, and larger facial features', () => {
    const harness = createHarness();
    harness.world.createBot(botDefinition);
    harness.world.createBot({ ...botDefinition, id: 'second-bot', x: 210 });

    expect(harness.circles[0]).toMatchObject({
      x: botDefinition.x,
      y: botDefinition.y,
      radius: botDefinition.radius,
      color: 0xd65d86,
      strokeWidth: 1.1,
      strokeColor: 0x5b2637,
      strokeAlpha: 0.94,
    });
    expect(harness.images).toHaveLength(2);
    expect(harness.images[0]).toMatchObject({
      texture: 'ball-momentum-bot-shell-gradient-v1',
      width: botDefinition.radius * 1.88,
      height: botDefinition.radius * 1.88,
      depth: 6.5,
    });
    expect(harness.gradientStops).toContain('#f58ba8');
    expect(harness.gradientStops).toContain('#9b315b');

    // Each bot contributes one outlined body plus two layered eyes (sclera,
    // pupil and highlight per eye). Two created bots therefore add 14 circles.
    expect(harness.circles).toHaveLength(14);
    expect(harness.circles[1]).toMatchObject({ radius: botDefinition.radius * 0.215, color: 0xfffbf7, depth: 7 });
    expect(harness.circles[2]).toMatchObject({ radius: botDefinition.radius * 0.112, color: 0x21131d, depth: 8 });
    expect(harness.circles[3]).toMatchObject({ radius: botDefinition.radius * 0.038, color: 0xffffff, depth: 9 });
    expect(harness.circles[7]).toMatchObject({ x: 210, y: botDefinition.y, radius: botDefinition.radius, color: 0xd65d86 });
    expect(harness.circles[8]).toMatchObject({ radius: botDefinition.radius * 0.215, color: 0xfffbf7, depth: 7 });
    const [mouth] = harness.labels;
    expect(Number.parseFloat(String(mouth.style.fontSize))).toBeCloseTo(botDefinition.radius * 0.93, 6);
    expect(mouth.style.stroke).toBe('#6d2543');

    const botBody = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    botBody.position.x = 171;
    botBody.position.y = 190;
    botBody.angle = 0.42;
    harness.world.step(1000 / 60);
    expect(harness.images[0]).toMatchObject({ x: 171, y: 190, rotation: 0.42 });
    const expectedEyeX = 171 + (-botDefinition.radius * 0.27) * Math.cos(0.42) - (-botDefinition.radius * 0.25) * Math.sin(0.42);
    const expectedEyeY = 190 + (-botDefinition.radius * 0.27) * Math.sin(0.42) + (-botDefinition.radius * 0.25) * Math.cos(0.42);
    expect(harness.circles[1]?.x).toBeCloseTo(expectedEyeX, 5);
    expect(harness.circles[1]?.y).toBeCloseTo(expectedEyeY, 5);
    const mouthOffsetY = botDefinition.radius * 0.42;
    expect(mouth.x).toBe(171);
    expect(mouth.y).toBeCloseTo(190 + mouthOffsetY, 5);
    expect(mouth.rotation).toBeCloseTo(0.42, 5);
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
    expect(harness.circles.slice(1).every((circle) => circle.destroyed)).toBe(true);
    expect(harness.labels.every((label) => label.destroyed)).toBe(true);
    expect(harness.images[0]?.destroyed).toBe(true);
    harness.world.dispose();
  });
});


describe('MatterPhysicsWorld bot poop boosts', () => {
  it('allows bots to overlap poop sensors and emits a bot trigger event only on entry', () => {
    const harness = createHarness();
    harness.world.createBot(botDefinition);
    harness.world.createSensor({ id: 'poop-boost', type: 'poop', x: 120, y: 160, width: 38, height: 38 });
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    const sensor = harness.bodies.find((body) => body.label === 'poop-boost')!;
    const botMask = (bot.options?.collisionFilter as { mask: number }).mask;
    const sensorMask = (sensor.options?.collisionFilter as { mask: number }).mask;

    expect(botMask & 0x0004).toBeTruthy();
    expect(sensorMask & 0x0010).toBeTruthy();

    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: bot, bodyB: sensor, collision: { normal: { x: 1, y: 0 } } }],
    });
    harness.handlers.get('collisionactive')?.({
      pairs: [{ bodyA: bot, bodyB: sensor, collision: { normal: { x: 1, y: 0 } } }],
    });
    // A second entry callback for the same one-shot sensor cannot grant a duplicate boost.
    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: bot, bodyB: sensor, collision: { normal: { x: 1, y: 0 } } }],
    });

    expect(harness.events).toEqual([{
      type: 'BOT_ENTERED_TRIGGER', botId: 'patrol-bot', triggerId: 'poop-boost', triggerType: 'poop',
    }]);
    harness.world.dispose();
  });

  it('permanently increases bot patrol speed and angular velocity by configured percentages', () => {
    const harness = createHarness();
    harness.world.createBot(botDefinition);
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    bot.velocity.x = PhysicsAdapter.toMatterVelocity({ x: 120, y: 0 }).x;
    bot.angularVelocity = 0.5;

    const result = harness.world.applyBotSpeedSpinBoost('patrol-bot', 25, 45);
    expect(result).not.toBeNull();
    expect(result?.speedBefore).toBeCloseTo(120, 6);
    expect(result?.speedAfter).toBeCloseTo(150, 6);
    expect(result?.spinBefore).toBeCloseTo(0.5, 6);
    expect(result?.spinAfter).toBeCloseTo(0.725, 6);
    expect(bot.angularVelocity).toBeCloseTo(0.725, 6);

    // The boosted patrol speed must persist when the bot AI writes its velocity.
    harness.world.step(1000 / 60);
    expect(PhysicsAdapter.fromMatterVelocity(bot.velocity).x).toBeCloseTo(150, 6);
    harness.world.dispose();
  });

  it('seeds a rolling spin when the enemy was not rotating before collection', () => {
    const harness = createHarness();
    harness.world.createBot(botDefinition);
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    bot.velocity.x = PhysicsAdapter.toMatterVelocity({ x: 120, y: 0 }).x;

    const result = harness.world.applyBotSpeedSpinBoost('patrol-bot', 20, 50);
    expect(result?.spinAfter).toBeGreaterThan(0);
    expect(bot.angularVelocity).toBeCloseTo(result!.spinAfter, 8);
    harness.world.dispose();
  });
});
