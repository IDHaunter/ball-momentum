import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { PhysicsEvent, Vector2 } from '../../src/physics/PhysicsTypes';

type TestBody = MatterBodyLike & { isStatic?: boolean; destroyed?: boolean; options?: Record<string, unknown>; width?: number; height?: number };
type TestVisual = {
  kind: 'circle' | 'rectangle'; x: number; y: number; fillColor: number; alpha: number;
  scaleX: number; scaleY: number; rotation: number; visible: boolean; destroyed: boolean;
  strokeWidth?: number; strokeColor?: number; strokeAlpha?: number;
};

function createHarness() {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  const labels: Array<{ text: string; destroyed: boolean; x: number; y: number; color: string }> = [];
  const visuals: TestVisual[] = [];
  const images: Array<{ x: number; y: number; texture: string; width?: number; height?: number; depth?: number; rotation?: number; destroyed: boolean }> = [];
  const gradientStops: string[] = [];
  const canvasTextureKeys: string[] = [];
  const textureKeySet = new Set<string>();
  const makeVisual = (kind: TestVisual['kind'], x: number, y: number, fillColor: number, alpha = 1) => {
    const state: TestVisual = { kind, x, y, fillColor, alpha, scaleX: 1, scaleY: 1, rotation: 0, visible: true, destroyed: false };
    visuals.push(state);
    return {
      setStrokeStyle(width: number, color: number, strokeAlpha = 1) {
        state.strokeWidth = width;
        state.strokeColor = color;
        state.strokeAlpha = strokeAlpha;
        return this;
      },
      setDepth() { return this; },
      setPosition(px: number, py: number) { state.x = px; state.y = py; return this; },
      setRotation(value: number) { state.rotation = value; return this; },
      setScale(sx: number, sy = sx) { state.scaleX = sx; state.scaleY = sy; return this; },
      setAlpha(value: number) { state.alpha = value; return this; },
      setVisible(value: boolean) { state.visible = value; return this; },
      destroy() { state.destroyed = true; },
    };
  };
  const makeBody = (x: number, y: number, label: string, options: Record<string, unknown> = {}, width?: number, height?: number): TestBody => {
    const body: TestBody = {
      position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
      label, isStatic: Boolean(options.isStatic), destroyed: false, options, width, height,
    };
    bodies.push(body);
    return body;
  };
  const scene = {
    add: {
      zone: () => ({}),
      circle: (x: number, y: number, _radius: number, fillColor: number, alpha = 1) => makeVisual('circle', x, y, fillColor, alpha),
      rectangle: (x: number, y: number, _width: number, _height: number, fillColor: number, alpha = 1) => makeVisual('rectangle', x, y, fillColor, alpha),
      graphics: () => ({
        lineStyle() { return this; }, lineBetween() { return this; },
        setDepth() { return this; }, setOrigin() { return this; },
        setPosition() { return this; }, setRotation() { return this; }, destroy() {},
      }),
      text: (x: number, y: number, text = '') => {
        const state = { text, destroyed: false, x, y, color: '' };
        labels.push(state);
        return {
          setOrigin() { return this; },
          setDepth() { return this; },
          setPosition(px: number, py: number) { state.x = px; state.y = py; return this; },
          setRotation() { return this; },
          setText(value: string) { state.text = value; return this; },
          setColor(value: string) { state.color = value; return this; },
          setScale() { return this; },
          setAlpha() { return this; },
          destroy() { state.destroyed = true; },
        };
      },
      image: (x: number, y: number, texture: string) => {
        const visual = makeVisual('circle', x, y, 0);
        const state = { x, y, texture, width: 0, height: 0, depth: 0, rotation: 0, destroyed: false };
        images.push(state);
        return {
          setDisplaySize(width: number, height: number) { state.width = width; state.height = height; return this; },
          setDepth(depth: number) { state.depth = depth; return this; },
          setPosition(px: number, py: number) { state.x = px; state.y = py; visual.setPosition(px, py); return this; },
          setRotation(value: number) { state.rotation = value; visual.setRotation(value); return this; },
          destroy() { state.destroyed = true; visual.destroy(); },
        };
      },
    },
    textures: {
      exists: (key: string) => textureKeySet.has(key),
      createCanvas: (key: string) => {
        canvasTextureKeys.push(key);
        textureKeySet.add(key);
        const gradient = { addColorStop(_offset: number, color: string) { gradientStops.push(color); } };
        const context = {
          clearRect() {}, save() {}, beginPath() {}, arc() {}, closePath() {}, clip() {}, fillRect() {}, fill() {}, restore() {}, ellipse() {},
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
        rectangle(x: number, y: number, width: number, height: number, options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''), options, width, height);
        },
        fromVertices(x: number, y: number, _vertices: Vector2[][], options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''), options);
        },
        gameObject(visual: object, body: MatterBodyLike): MatterGameObjectLike {
          const testBody = body as TestBody;
          return {
            body,
            setPosition(px: number, py: number) { body.position.x = px; body.position.y = py; return this; },
            setVelocity(vx: number, vy: number) { body.velocity.x = vx; body.velocity.y = vy; return this; },
            setAngularVelocity(value: number) { body.angularVelocity = value; return this; },
            setAwake() { return this; },
            setStatic(value: boolean) { testBody.isStatic = value; return this; },
            destroy() {
              testBody.destroyed = true;
              (visual as { destroy?: () => void }).destroy?.();
              return this;
            },
          };
        },
      },
    },
  };
  const world = new MatterPhysicsWorld(scene as never);
  const events: PhysicsEvent[] = [];
  world.onPhysicsEvent((event) => events.push(event));
  return { world, handlers, bodies, labels, visuals, images, gradientStops, canvasTextureKeys, events };
}

const ballOptions = {
  radiusPx: 18, mass: 1, restitution: 0.05, friction: 0.8,
  frictionStatic: 0.8, frictionAir: 0, fixedRotation: false,
};
const bombOptions = {
  id: 'timer-bomb', x: 150, y: 100, radius: 18, mass: 1.5,
  fuseSeconds: 1, explosionRadius: 300, explosionEnergy: 30000,
  restitution: 0.58, friction: 0.08, killPlaneY: 500,
};

describe('MatterPhysicsWorld bombs and statues', () => {
  it('creates a static high-restitution statue and activates it only on the first ball contact', () => {
    const harness = createHarness();
    harness.world.createStatue({ id: 'liberty-statue', x: 220, y: 300 });
    harness.world.createBall({ x: 120, y: 220 }, ballOptions);

    const statue = harness.bodies.find((body) => body.label === 'STATUE:liberty-statue')!;
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    expect(statue.isStatic).toBe(true);
    expect(statue.width).toBe(104);
    expect(statue.height).toBe(132);
    expect(statue.options?.restitution).toBe(0.64);
    const filter = statue.options?.collisionFilter as { category: number; mask: number };
    expect(filter.category).toBe(0x0002);
    expect(filter.mask & 0x0001).toBeTruthy();

    const collision = {
      pairs: [{ bodyA: ball, bodyB: statue, collision: { normal: { x: -1, y: 0 } } }],
    } as CollisionEventLike;
    harness.handlers.get('collisionstart')?.(collision);
    harness.handlers.get('collisionstart')?.(collision);

    expect(harness.events.filter((event) => event.type === 'STATUE_ACTIVATED')).toEqual([
      { type: 'STATUE_ACTIVATED', statueId: 'liberty-statue' },
    ]);
    harness.world.dispose();
  });

  it('creates a static bomb that collides with the player and autonomous bots', () => {
    const harness = createHarness();
    harness.world.createBomb(bombOptions);
    const bomb = harness.bodies.find((body) => body.label === 'BOMB:timer-bomb')!;
    expect(bomb.isStatic).toBe(true);
    const filter = bomb.options?.collisionFilter as { category: number; mask: number };
    expect(filter.category).toBe(0x0020);
    expect(filter.mask & 0x0001).toBeTruthy();
    expect(filter.mask & 0x0010).toBeTruthy();
    harness.world.dispose();
  });

  it('uses a shared glossy graphite gradient shell that follows the bomb body', () => {
    const harness = createHarness();
    harness.world.createBomb(bombOptions);
    harness.world.createBomb({ ...bombOptions, id: 'second-bomb', x: 260 });

    expect(harness.canvasTextureKeys).toEqual(['ball-momentum-bomb-shell-gradient-v1']);
    expect(harness.visuals[0]).toMatchObject({
      fillColor: 0x15171d,
      strokeWidth: Math.max(1.1, bombOptions.radius * 0.06),
      strokeColor: 0x2e3238,
      strokeAlpha: 0.9,
    });
    // The outline is deliberately low-contrast: only slightly lighter than
    // the graphite fill, rather than a prominent separate rim.
    expect(harness.visuals[0].strokeColor).toBeGreaterThan(harness.visuals[0].fillColor);
    expect(harness.images).toHaveLength(2);
    expect(harness.images[0]).toMatchObject({
      x: bombOptions.x,
      y: bombOptions.y,
      texture: 'ball-momentum-bomb-shell-gradient-v1',
      width: bombOptions.radius * 1.84,
      height: bombOptions.radius * 1.84,
      depth: 7.5,
    });
    expect(harness.gradientStops).toContain('#87939f');
    expect(harness.gradientStops).toContain('#171d25');

    const bombBody = harness.bodies.find((body) => body.label === 'BOMB:timer-bomb')!;
    bombBody.position.x = 185;
    bombBody.position.y = 125;
    bombBody.angle = 0.4;
    harness.world.step(16);
    expect(harness.images[0]).toMatchObject({ x: 185, y: 125, rotation: 0.4 });
    expect(harness.images[1]).toMatchObject({ x: 260, y: 100, rotation: 0 });

    harness.world.dispose();
    expect(harness.images.every((image) => image.destroyed)).toBe(true);
  });

  it('starts the fuse when hit by the player and pushes nearby movable and glass objects on detonation', () => {
    const harness = createHarness();
    harness.world.createStaticBox({
      id: 'glass-target', x: 220, y: 90, width: 40, height: 20,
      friction: 0.08, frictionStatic: 0.12, restitution: 0.34,
      breakable: true, breakableThresholdEnergy: 1000,
    });
    harness.world.createMovableBox({
      id: 'push-target', x: 190, y: 90, width: 20, height: 20,
      mass: 2, minimumImpactEnergy: 100, killPlaneY: 500,
      friction: 0.3, frictionStatic: 0.5, restitution: 0.1,
    });
    harness.world.createBall({ x: 100, y: 100 }, ballOptions);
    const bombVisualStart = harness.visuals.length;
    harness.world.createBomb(bombOptions);

    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    const bomb = harness.bodies.find((body) => body.label === 'BOMB:timer-bomb')!;
    const block = harness.bodies.find((body) => body.label === 'MOVABLE:push-target')!;
    ball.velocity.x = PhysicsAdapter.toMatterVelocity({ x: 240, y: 0 }).x;
    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: ball, bodyB: bomb, collision: { normal: { x: 1, y: 0 } } }],
    });

    expect(bomb.isStatic).toBe(false);
    expect(harness.labels.some((label) => label.text === '1')).toBe(true);
    harness.world.step(1000);
    harness.world.step(120);

    const explosion = harness.events.find((event) => event.type === 'BOMB_EXPLODED');
    expect(explosion?.type).toBe('BOMB_EXPLODED');
    if (explosion?.type !== 'BOMB_EXPLODED') throw new Error('Bomb did not explode');
    expect(explosion.breakableIds).toContain('glass-target');
    expect(block.isStatic).toBe(false);
    expect(Math.hypot(...[PhysicsAdapter.fromMatterVelocity(block.velocity).x, PhysicsAdapter.fromMatterVelocity(block.velocity).y])).toBeGreaterThan(0);
    expect(ball.destroyed).toBe(false);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeLessThan(0);
    expect(bomb.destroyed).toBe(true);
    expect(harness.labels.filter((label) => label.text === '1').every((label) => label.destroyed)).toBe(true);
    expect(harness.visuals.slice(bombVisualStart).every((visual) => visual.destroyed)).toBe(true);
    harness.world.dispose();
  });

  it('lights a layered flame on impact and animates the bomb face while the fuse burns', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 100, y: 100 }, ballOptions);
    harness.world.createBomb(bombOptions);
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    ball.velocity.x = PhysicsAdapter.toMatterVelocity({ x: 240, y: 0 }).x;

    const flameColors = [0xff762e, 0xff6327, 0xffb52e, 0xfff0a1];
    const flameLayers = harness.visuals.filter((visual) => flameColors.includes(visual.fillColor));
    expect(flameLayers.length).toBe(4);
    expect(flameLayers.every((visual) => !visual.visible)).toBe(true);

    const pupils = harness.visuals.filter((visual) => visual.fillColor === 0x11151d);
    expect(pupils.length).toBe(2);
    const initialPupilPositions = pupils.map((pupil) => ({ x: pupil.x, y: pupil.y }));

    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: ball, bodyB: harness.bodies.find((body) => body.label === 'BOMB:timer-bomb')!, collision: { normal: { x: 1, y: 0 } } }],
    });
    expect(flameLayers.every((visual) => visual.visible)).toBe(true);
    const initialFlameScale = flameLayers[1].scaleX;
    harness.world.step(16);
    expect(pupils.some((pupil, index) => pupil.x !== initialPupilPositions[index].x || pupil.y !== initialPupilPositions[index].y)).toBe(true);
    expect(flameLayers[1].scaleX === initialFlameScale).toBe(false);
    harness.world.dispose();
  });

  it('starts its fuse when an autonomous bot hits it', () => {
    const harness = createHarness();
    harness.world.createBomb(bombOptions);
    harness.world.createBot({
      id: 'patrol-bot', x: 100, y: 100, radius: 14, mass: 1.2,
      speed: 120, direction: 1, restitution: 0.82, friction: 0.015, killPlaneY: 500,
    });
    const bot = harness.bodies.find((body) => body.label === 'BOT:patrol-bot')!;
    const bomb = harness.bodies.find((body) => body.label === 'BOMB:timer-bomb')!;
    bot.velocity.x = PhysicsAdapter.toMatterVelocity({ x: 120, y: 0 }).x;
    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: bot, bodyB: bomb, collision: { normal: { x: 1, y: 0 } } }],
    });
    expect(bomb.isStatic).toBe(false);
    expect(harness.labels.some((label) => label.text === '1')).toBe(true);
    harness.world.dispose();
  });

  it('handles the reversed Matter body order when the player hits the bomb', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 200, y: 100 }, ballOptions);
    harness.world.createBomb(bombOptions);
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    const bomb = harness.bodies.find((body) => body.label === 'BOMB:timer-bomb')!;
    ball.velocity.x = PhysicsAdapter.toMatterVelocity({ x: -240, y: 0 }).x;
    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: bomb, bodyB: ball, collision: { normal: { x: 1, y: 0 } } }],
    });
    expect(bomb.isStatic).toBe(false);
    expect(PhysicsAdapter.fromMatterVelocity(bomb.velocity).x).toBeLessThan(0);
    harness.world.dispose();
  });

  it('does not activate when a new contact is already separating', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 100, y: 100 }, ballOptions);
    harness.world.createBomb(bombOptions);
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    const bomb = harness.bodies.find((body) => body.label === 'BOMB:timer-bomb')!;
    ball.velocity.x = PhysicsAdapter.toMatterVelocity({ x: -100, y: 0 }).x;
    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: ball, bodyB: bomb, collision: { normal: { x: 1, y: 0 } } }],
    });
    expect(bomb.isStatic).toBe(true);
    const flameColors = [0xff762e, 0xff6327, 0xffb52e, 0xfff0a1];
    const flameLayers = harness.visuals.filter((visual) => flameColors.includes(visual.fillColor));
    expect(flameLayers.length).toBe(4);
    expect(flameLayers.every((visual) => !visual.visible)).toBe(true);
    harness.world.dispose();
  });

  it('removes an activated bomb that is pushed into the kill plane without detonating', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 100, y: 100 }, ballOptions);
    harness.world.createBomb(bombOptions);
    const ball = harness.bodies.find((body) => body.label === 'BALL')!;
    const bomb = harness.bodies.find((body) => body.label === 'BOMB:timer-bomb')!;
    ball.velocity.x = PhysicsAdapter.toMatterVelocity({ x: 240, y: 0 }).x;
    harness.handlers.get('collisionstart')?.({
      pairs: [{ bodyA: ball, bodyB: bomb, collision: { normal: { x: 1, y: 0 } } }],
    });
    expect(bomb.isStatic).toBe(false);
    bomb.position.y = 510;
    harness.world.step(1000 / 60);
    expect(bomb.destroyed).toBe(true);
    expect(harness.events.some((event) => event.type === 'BOMB_EXPLODED')).toBe(false);
    harness.world.dispose();
  });
});
