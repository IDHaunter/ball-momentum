import { describe, expect, it } from 'vitest';
import { MatterPhysicsWorld } from '../../src/physics/MatterPhysicsWorld';
import { PhysicsAdapter } from '../../src/physics/PhysicsAdapter';
import type { MatterBodyLike, MatterGameObjectLike } from '../../src/physics/MatterPhysicsBody';
import type { CollisionEventLike } from '../../src/physics/MatterCollisionMapper';
import type { Vector2 } from '../../src/physics/PhysicsTypes';

type TestBody = MatterBodyLike & { isStatic?: boolean; destroyed?: boolean };

function createHarness() {
  const handlers = new Map<string, (event: CollisionEventLike) => void>();
  const bodies: TestBody[] = [];
  let pendingCollision: CollisionEventLike | null = null;
  const markerStates: Array<{ destroyed: boolean; x: number; y: number; rotation: number }> = [];

  const makeBody = (x: number, y: number, label = ''): TestBody => {
    const value: TestBody = {
      position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0,
      label, isStatic: false, destroyed: false,
    };
    bodies.push(value);
    return value;
  };

  const scene = {
    add: {
      zone: () => ({}),
      rectangle: () => ({ setStrokeStyle() { return this; }, setDepth() { return this; } }),
      text: (x: number, y: number) => {
        const state = { destroyed: false, x, y, rotation: 0 };
        markerStates.push(state);
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
        step() {
          if (pendingCollision) {
            handlers.get('collisionstart')?.(pendingCollision);
            pendingCollision = null;
          }
        },
        setGravity() {},
      },
      add: {
        circle(x: number, y: number, _radius: number, _options: Record<string, unknown>) { return makeBody(x, y, 'BALL'); },
        rectangle(x: number, y: number, _width: number, _height: number, options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''));
        },
        fromVertices(x: number, y: number, _vertices: Vector2[][], options: Record<string, unknown>) {
          return makeBody(x, y, String(options.label ?? ''));
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
  const ball = physics.createBall({ x: 100, y: 100 }, {
    radiusPx: 18, mass: 1, restitution: 0.05, friction: 0.8,
    frictionStatic: 0.8, frictionAir: 0, fixedRotation: false,
  });
  physics.createMovableBox({
    id: 'crate', x: 140, y: 130, width: 40, height: 60,
    mass: 4, minimumImpactEnergy: 20_000, killPlaneY: 500,
    friction: 0.45, frictionStatic: 0.65, restitution: 0.02,
  });
  const ballBody = bodies.find((body) => body.label === 'BALL')!;
  const blockBody = bodies.find((body) => body.label === 'MOVABLE:crate')!;

  return {
    physics,
    ball,
    ballBody,
    blockBody,
    markerStates,
    collide(normal: Vector2) {
      pendingCollision = {
        pairs: [{ bodyA: ballBody, bodyB: blockBody, collision: { normal } }],
      };
    },
  };
}

describe('MatterPhysicsWorld movable blocks', () => {
  it('releases the crate and transfers impact velocity above the energy threshold', () => {
    const harness = createHarness();
    harness.ball.setVelocity({ x: 400, y: 0 });
    harness.collide({ x: 1, y: 0 });
    harness.physics.step(1000 / 60);

    expect(harness.blockBody.isStatic).toBe(false);
    const blockVelocity = PhysicsAdapter.fromMatterVelocity(harness.blockBody.velocity);
    const ballVelocity = PhysicsAdapter.fromMatterVelocity(harness.ballBody.velocity);
    expect(blockVelocity.x).toBeCloseTo(81.6, 5);
    expect(ballVelocity.x).toBeCloseTo(73.6, 5);
    harness.physics.dispose();
  });

  it('keeps the crate fixed below the threshold', () => {
    const harness = createHarness();
    harness.ball.setVelocity({ x: 100, y: 0 });
    harness.collide({ x: 1, y: 0 });
    harness.physics.step(1000 / 60);

    expect(harness.blockBody.isStatic).toBe(true);
    harness.physics.dispose();
  });

  it('does not push the crate when the ball lands on top, and removes it below the kill plane', () => {
    const harness = createHarness();
    harness.ball.setVelocity({ x: 0, y: 500 });
    harness.collide({ x: 0, y: 1 });
    harness.physics.step(1000 / 60);
    expect(harness.blockBody.isStatic).toBe(true);

    harness.blockBody.position.y = 510;
    harness.physics.step(1000 / 60);
    expect(harness.blockBody.destroyed).toBe(true);
    expect(harness.markerStates[0].destroyed).toBe(true);
    harness.physics.dispose();
  });
});
