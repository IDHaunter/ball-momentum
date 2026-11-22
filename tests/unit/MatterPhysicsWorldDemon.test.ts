import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';
import { COLLISION_CATEGORIES } from '../../src/physics/CollisionCategories';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { DemonPhysicsOptions, Vector2 } from '../../src/physics/PhysicsTypes';
import type { DemonGraphicsLike, DemonContainerLike } from '../../src/rendering/DemonRenderer';

type TestBody = MatterBodyLike & {
  isStatic?: boolean;
  destroyed?: boolean;
  options?: Record<string, unknown>;
  collisionFilter?: { category: number; mask: number };
  setVelocityCalls?: number;
};

function createHarness() {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  const graphics: Array<{ commands: string[]; destroyed: boolean }> = [];
  const makeGraphics = (): DemonGraphicsLike => {
    const state = { commands: [] as string[], destroyed: false };
    graphics.push(state);
    const record = (name: string) => { state.commands.push(name); return api; };
    const api: DemonGraphicsLike = {
      clear() { return record('clear'); }, setDepth() { return api; }, fillStyle() { return record('fillStyle'); },
      lineStyle() { return record('lineStyle'); }, fillEllipse() { return record('fillEllipse'); }, strokeEllipse() { return record('strokeEllipse'); },
      beginPath() { return record('beginPath'); }, moveTo() { return record('moveTo'); }, lineTo() { return record('lineTo'); },
      closePath() { return record('closePath'); }, fillPath() { return record('fillPath'); }, strokePath() { return record('strokePath'); },
      destroy() { state.destroyed = true; },
    };
    return api;
  };
  const makeBody = (x: number, y: number, label: string, options: Record<string, unknown> = {}): TestBody => {
    const body: TestBody = {
      position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
      label, isStatic: Boolean(options.isStatic), destroyed: false, options, setVelocityCalls: 0,
      circleRadius: typeof options.circleRadius === 'number' ? options.circleRadius : undefined,
      collisionFilter: options.collisionFilter as { category: number; mask: number } | undefined,
    };
    bodies.push(body);
    return body;
  };
  const scene = {
    add: {
      zone: () => ({}), graphics: makeGraphics,
      container: () => ({
        add() { return this; }, setDepth() { return this; }, setSize() { return this; }, setRotation() { return this; },
        setPosition() { return this; }, setVisible() { return this; }, setScale() { return this; }, destroy() { return this; },
      } satisfies DemonContainerLike),
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
            setVelocity(x: number, y: number) {
              body.velocity.x = x; body.velocity.y = y;
              (body as TestBody).setVelocityCalls = ((body as TestBody).setVelocityCalls ?? 0) + 1;
              return this;
            },
            setAngularVelocity(value: number) { body.angularVelocity = value; return this; },
            setAwake() { return this; },
            setStatic(value: boolean) { (body as TestBody).isStatic = value; return this; },
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
const demonDefinition: DemonPhysicsOptions = {
  id: 'purple-devil',
  spawnArea: { minX: 80, minY: 80, maxX: 320, maxY: 160 },
  spawnPoints: [{ x: 100, y: 100 }, { x: 220, y: 100 }, { x: 300, y: 100 }],
  radius: 18,
  mass: 1.35,
  respawnIntervalSeconds: 3.8,
  telegraphSeconds: 1,
  attackDelaySeconds: 0.5,
  activeSeconds: 1.5,
  attackRadius: 80,
  lightningImpulse: 220,
  restitution: 0.14,
  friction: 0.48,
  killPlaneY: 800,
};

function bodyFor(harness: ReturnType<typeof createHarness>, label: string): TestBody {
  const body = harness.bodies.find((item) => item.label === label);
  if (!body) throw new Error(`Missing test body ${label}`);
  return body;
}

describe('MatterPhysicsWorld teleporting demon', () => {
  it('starts dormant with collisions disabled, then materializes as a dynamic pushable body', () => {
    const harness = createHarness();
    harness.world.createDemonEnemy(demonDefinition);
    const demon = bodyFor(harness, 'DEMON:purple-devil');
    expect(demon.isStatic).toBe(true);
    expect(demon.collisionFilter?.category).toBe(COLLISION_CATEGORIES.DEMON_ENEMY);
    expect(demon.collisionFilter?.mask).toBe(0);

    harness.world.step(1000);
    expect(demon.isStatic).toBe(false);
    expect(demon.collisionFilter?.mask).toBeGreaterThan(0);
    expect(demon.collisionFilter!.mask & COLLISION_CATEGORIES.BALL).toBeTruthy();
    expect(demon.collisionFilter!.mask & COLLISION_CATEGORIES.TRIGGER).toBeTruthy();
    expect(harness.graphics[0]?.commands).toContain('fillEllipse');
    harness.world.dispose();
  });

  it('strikes the player once after the configured delay only when it is inside attackRadius', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 150, y: 100 }, ballOptions);
    harness.world.createDemonEnemy({
      ...demonDefinition,
      // The first point is safe but slightly farther from the player.
      spawnPoints: [{ x: 70, y: 100 }, { x: 220, y: 100 }, { x: 300, y: 100 }],
    });
    const demon = bodyFor(harness, 'DEMON:purple-devil');
    const ball = bodyFor(harness, 'BALL');

    harness.world.step(16); // choose the nearest safe point for the initial warning
    expect(demon.position).toEqual({ x: 220, y: 100 });
    harness.world.step(1000); // complete the warning and materialize
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBe(0);
    harness.world.step(500); // first zap
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(-220, 4);
    expect(ball.setVelocityCalls).toBe(1);
    expect(harness.graphics[2]?.commands).toContain('strokePath');
    harness.world.step(500);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(-220, 4);
    harness.world.dispose();
  });

  it('moves a live warning and restarts the full telegraph when the player approaches it', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 45, y: 100 }, ballOptions);
    harness.world.createDemonEnemy(demonDefinition);
    const demon = bodyFor(harness, 'DEMON:purple-devil');

    harness.world.step(100);
    expect(demon.position).toEqual({ x: 100, y: 100 });

    const ball = bodyFor(harness, 'BALL');
    ball.position.x = 100;
    harness.world.step(16);
    expect(demon.position).toEqual({ x: 220, y: 100 });
    expect(demon.isStatic).toBe(true);

    harness.world.step(999);
    expect(demon.isStatic).toBe(true);
    harness.world.step(1);
    expect(demon.isStatic).toBe(false);
    harness.world.dispose();
  });

  it('defers materialization while the player occupies every available spawn point', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 150, y: 100 }, ballOptions);
    harness.world.createDemonEnemy({ ...demonDefinition, spawnPoints: [{ x: 150, y: 100 }] });
    const demon = bodyFor(harness, 'DEMON:purple-devil');

    harness.world.step(1000);
    expect(demon.isStatic).toBe(true);
    expect(demon.collisionFilter?.mask).toBe(0);

    // Once the player leaves, the demon starts a fresh telegraph at that point.
    const ball = bodyFor(harness, 'BALL');
    ball.position.x = 300;
    harness.world.step(250);
    expect(demon.isStatic).toBe(true);
    harness.world.step(1000);
    expect(demon.isStatic).toBe(false);
    harness.world.dispose();
  });

  it('keeps the zap armed outside attackRadius and strikes once the player enters it', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 500, y: 100 }, ballOptions);
    harness.world.createDemonEnemy({
      ...demonDefinition,
      spawnPoints: [{ x: 220, y: 100 }],
      attackRadius: 100,
      activeSeconds: 4,
    });
    const demon = bodyFor(harness, 'DEMON:purple-devil');
    const ball = bodyFor(harness, 'BALL');

    harness.world.step(1000); // materialize
    harness.world.step(500); // first attack check: still outside range
    expect(ball.setVelocityCalls).toBe(0);
    expect(demon.isStatic).toBe(false);

    ball.position.x = 300; // enter the 100 px attack radius
    harness.world.step(120);
    expect(ball.setVelocityCalls).toBe(1);
    expect(Math.hypot(
      PhysicsAdapter.fromMatterVelocity(ball.velocity).x,
      PhysicsAdapter.fromMatterVelocity(ball.velocity).y,
    )).toBeCloseTo(220, 4);
    expect(harness.graphics[2]?.commands).toContain('strokePath');

    harness.world.step(500);
    expect(ball.setVelocityCalls).toBe(1);
    harness.world.dispose();
  });

  it('remains materialized for the configured active window', () => {
    const harness = createHarness();
    harness.world.createDemonEnemy({ ...demonDefinition, activeSeconds: 4 });
    const demon = bodyFor(harness, 'DEMON:purple-devil');

    harness.world.step(1000);
    expect(demon.isStatic).toBe(false);
    harness.world.step(3000);
    expect(demon.isStatic).toBe(false);
    harness.world.step(999);
    expect(demon.isStatic).toBe(false);
    harness.world.step(1);
    expect(demon.isStatic).toBe(true);
    harness.world.dispose();
  });

  it('still zaps a player exactly at its center using a deterministic fallback direction', () => {
    const harness = createHarness();
    harness.world.createDemonEnemy({ ...demonDefinition, spawnPoints: [{ x: 150, y: 100 }] });
    const demon = bodyFor(harness, 'DEMON:purple-devil');
    harness.world.step(1000);
    expect(demon.isStatic).toBe(false);

    harness.world.createBall({ x: 150, y: 100 }, ballOptions);
    const ball = bodyFor(harness, 'BALL');
    harness.handlers.get('collisionstart')?.({ pairs: [{
      bodyA: ball,
      bodyB: demon,
      collision: { normal: { x: -1, y: 0 }, supports: [] },
    }] });

    harness.world.step(500);
    const velocity = PhysicsAdapter.fromMatterVelocity(ball.velocity);
    expect(ball.setVelocityCalls).toBe(1);
    expect(Math.hypot(velocity.x, velocity.y)).toBeCloseTo(220, 4);
    harness.world.dispose();
  });

  it('does not strike a player outside the configurable attack radius', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 260, y: 100 }, ballOptions);
    harness.world.createDemonEnemy({ ...demonDefinition, attackRadius: 80 });
    const ball = bodyFor(harness, 'BALL');
    harness.world.step(1000);
    harness.world.step(500);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity)).toEqual({ x: 0, y: 0 });
    expect(ball.setVelocityCalls).toBe(0);
    harness.world.dispose();
  });

  it('teleports away after its active window if it has not been physically challenged', () => {
    const harness = createHarness();
    harness.world.createDemonEnemy({ ...demonDefinition, activeSeconds: 1.5 });
    const demon = bodyFor(harness, 'DEMON:purple-devil');
    harness.world.step(1000);
    expect(demon.isStatic).toBe(false);
    harness.world.step(1500);
    expect(demon.isStatic).toBe(true);
    expect(demon.collisionFilter?.mask).toBe(0);
    harness.world.dispose();
  });

  it('chooses another safe surface for its next appearance', () => {
    const harness = createHarness();
    harness.world.createDemonEnemy(demonDefinition);
    const demon = bodyFor(harness, 'DEMON:purple-devil');
    const firstPosition = { ...demon.position };

    harness.world.step(1000); // materialize
    harness.world.step(1500); // vanish after the active window
    harness.world.step(260); // finish vanishing and enter cooldown
    harness.world.step(3800); // choose a new supported surface and show warning lightning

    expect(demon.position).not.toEqual(firstPosition);
    expect(demon.isStatic).toBe(true);
    expect(harness.graphics[1]?.commands).toContain('lineTo');
    harness.world.dispose();
  });

  it('is removed when a raised spike sensor reports a demon hit', () => {
    const harness = createHarness();
    harness.world.createDemonEnemy(demonDefinition);
    const demon = bodyFor(harness, 'DEMON:purple-devil');
    harness.world.step(1000);

    harness.world.removeEnemyAfterSpikeHit('demon', 'purple-devil');

    expect(demon.destroyed).toBe(true);
    expect(harness.graphics[1]?.destroyed).toBe(true);
    expect(harness.graphics[2]?.destroyed).toBe(true);
    harness.world.dispose();
  });

  it('stays physical after being rammed so it can be knocked into a pit or spikes', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 150, y: 100 }, ballOptions);
    harness.world.createDemonEnemy(demonDefinition);
    const demon = bodyFor(harness, 'DEMON:purple-devil');
    const ball = bodyFor(harness, 'BALL');
    harness.world.step(16); // choose a point clear of the stationary player
    harness.world.step(1000); // materialize
    ball.velocity.x = PhysicsAdapter.toMatterVelocity({ x: 300, y: 0 }).x;
    harness.handlers.get('collisionstart')?.({ pairs: [{
      bodyA: ball, bodyB: demon, collision: { normal: { x: -1, y: 0 }, supports: [] },
    }] });
    harness.world.step(500); // the ram does not consume the scheduled zap
    expect(ball.setVelocityCalls).toBe(1);
    expect(harness.graphics[2]?.commands).toContain('strokePath');
    harness.world.step(1500);
    expect(demon.isStatic).toBe(false);
    expect(demon.destroyed).toBe(false);
    demon.position.y = demonDefinition.killPlaneY + 1;
    harness.world.step(1000 / 60);
    expect(demon.destroyed).toBe(true);
    harness.world.dispose();
  });
});
