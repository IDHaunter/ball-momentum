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
    harness.world.dispose();
  });

  it('strikes the player once after the configured delay only when it is inside attackRadius', () => {
    const harness = createHarness();
    harness.world.createBall({ x: 150, y: 100 }, ballOptions);
    harness.world.createDemonEnemy(demonDefinition);
    const ball = bodyFor(harness, 'BALL');

    harness.world.step(1000); // pre-spawn lightning, then materialization
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBe(0);
    harness.world.step(500); // first zap
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(220, 4);
    expect(ball.setVelocityCalls).toBe(1);
    harness.world.step(500);
    expect(PhysicsAdapter.fromMatterVelocity(ball.velocity).x).toBeCloseTo(220, 4);
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
    harness.world.createDemonEnemy(demonDefinition);
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
    harness.world.step(1000);
    harness.handlers.get('collisionstart')?.({ pairs: [{
      bodyA: ball, bodyB: demon, collision: { normal: { x: -1, y: 0 }, supports: [] },
    }] });
    harness.world.step(2000);
    expect(demon.isStatic).toBe(false);
    expect(demon.destroyed).toBe(false);
    demon.position.y = demonDefinition.killPlaneY + 1;
    harness.world.step(1000 / 60);
    expect(demon.destroyed).toBe(true);
    harness.world.dispose();
  });
});
