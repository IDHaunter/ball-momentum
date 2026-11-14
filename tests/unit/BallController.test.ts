import { describe, expect, it } from 'vitest';
import { createPhysicsConfig } from '../../src/config/physics.defaults';
import { GameClock } from '../../src/core/GameClock';
import type { PlayerAction } from '../../src/input/PlayerAction';
import { BallController } from '../../src/player/BallController';
import type { IPhysicsBody } from '../../src/physics/IPhysicsBody';
import type { IPhysicsWorld } from '../../src/physics/IPhysicsWorld';
import type { BallPhysicsOptions, MovableBoxOptions, PhysicsEvent, SensorOptions, StaticBoxOptions, StaticPolygonOptions, Vector2 } from '../../src/physics/PhysicsTypes';

class FakeBody implements IPhysicsBody {
  position: Vector2;
  velocity: Vector2 = { x: 0, y: 0 };
  angle = 0;
  angularVelocity = 0;
  destroyed = false;
  constructor(position: Vector2) { this.position = { ...position }; }
  getSnapshot() { return { position: { ...this.position }, velocity: { ...this.velocity }, angle: this.angle, angularVelocity: this.angularVelocity }; }
  setPosition(value: Vector2): void { this.position = { ...value }; }
  setVelocity(value: Vector2): void { this.velocity = { ...value }; }
  addVelocityDelta(value: Vector2): void { this.velocity.x += value.x; this.velocity.y += value.y; }
  setAngularVelocity(value: number): void { this.angularVelocity = value; }
  setAwake(): void {}
  destroy(): void { this.destroyed = true; }
}

class FakeWorld implements IPhysicsWorld {
  body: FakeBody | null = null;
  private readonly listeners = new Set<(event: PhysicsEvent) => void>();
  step(): void {}
  createBall(position: Vector2, _options: BallPhysicsOptions): IPhysicsBody { this.body = new FakeBody(position); return this.body; }
  createStaticBox(_definition: StaticBoxOptions): void {}
  createStaticPolygon(_definition: StaticPolygonOptions): void {}
  createMovableBox(_definition: MovableBoxOptions): void {}
  createBot(): void {}
  removeTerrainBody(_id: string): void {}
  createSensor(_definition: SensorOptions): void {}
  removeLevelBodies(): void {}
  setGravity(): void {}
  setTimeScale(): void {}
  onPhysicsEvent(listener: (event: PhysicsEvent) => void): () => void { this.listeners.add(listener); return () => this.listeners.delete(listener); }
  emit(event: PhysicsEvent): void { for (const listener of this.listeners) listener(event); }
}

const action = (type: 'MOVE_LEFT' | 'MOVE_RIGHT', strength: number): PlayerAction => ({
  type, strength, source: 'keyboard', timestamp: 0,
});

describe('BallController', () => {
  it('converts direction changes into additive horizontal momentum', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const ball = new BallController(world, createPhysicsConfig(), clock, { x: 20, y: 20 });
    ball.state.grounded = true;
    ball.stepBeforePhysics([action('MOVE_RIGHT', 0.5)]);
    expect(ball.snapshot.velocity.x).toBeGreaterThan(0);
    clock.advance(100);
    ball.stepBeforePhysics([action('MOVE_LEFT', 1)]);
    expect(ball.snapshot.velocity.x).toBeLessThan(0);
    ball.dispose();
  });

  it('launches a jump after receiving an upward terrain support contact', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const ball = new BallController(world, createPhysicsConfig(), clock, { x: 20, y: 20 });
    world.emit({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE',
      terrainId: 'floor',
      supportNormal: { x: 0, y: -1 },
      impactSpeed: 0,
    });
    ball.stepAfterPhysics();
    expect(ball.state.grounded).toBe(true);

    const jump: PlayerAction = { type: 'JUMP', strength: 1, source: 'keyboard', timestamp: 0 };
    clock.advance(1000 / 60);
    ball.stepBeforePhysics([jump]);
    let launched = false;
    for (let i = 0; i < 4; i += 1) {
      clock.advance(1000 / 60);
      launched = ball.stepBeforePhysics([]) || launched;
    }

    expect(launched).toBe(true);
    expect(ball.snapshot.velocity.y).toBeLessThan(0);
    expect(ball.state.airBoostAvailable).toBe(true);
    ball.dispose();
  });

  it('bounces away from a vertical wall while preserving part of the tangential speed', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, clock, { x: 20, y: 20 });
    ball.currentBody.setVelocity({ x: 600, y: 120 });

    world.emit({
      type: 'BALL_WALL_IMPACT',
      terrainId: 'wall',
      normal: { x: -1, y: 0 },
      incomingVelocity: { x: 600, y: 120 },
      contactPoint: { x: 118, y: 100 },
      impactSpeed: 600,
      penetrationDepth: 2,
    });
    ball.stepAfterPhysics();

    expect(ball.snapshot.velocity.x).toBeCloseTo(-600 * config.wallBounce.restitution);
    expect(ball.snapshot.velocity.y).toBeCloseTo(120 * config.wallBounce.tangentRetention);
    ball.dispose();
  });

  it('reverses the ball spin when it bounces off a vertical wall', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, clock, { x: 20, y: 20 });
    ball.currentBody.setVelocity({ x: 500, y: 0 });
    ball.currentBody.setAngularVelocity(8);

    world.emit({
      type: 'BALL_WALL_IMPACT',
      terrainId: 'wall',
      normal: { x: -1, y: 0 },
      incomingVelocity: { x: 500, y: 0 },
      contactPoint: { x: 118, y: 100 },
      impactSpeed: 500,
      penetrationDepth: 1,
    });
    ball.stepAfterPhysics();

    expect(ball.snapshot.angularVelocity).toBeCloseTo(-8 * config.wallBounce.spinRetention);
    ball.dispose();
  });

  it('performs three progressively smaller hops after landing from a jump', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, clock, { x: 20, y: 20 });
    ball.state.takeoffAtMs = 0;

    const landWithDownwardSpeed = (speed: number) => {
      ball.currentBody.setVelocity({ x: 0, y: speed });
      ball.stepBeforePhysics([]);
      // Matter's collision solver has stopped the inward velocity by the time
      // BallController processes the contact event.
      ball.currentBody.setVelocity({ x: 0, y: 0 });
      world.emit({
        type: 'BALL_TERRAIN_CONTACT_ACTIVE',
        terrainId: 'floor',
        supportNormal: { x: 0, y: -1 },
        impactSpeed: speed,
      });
      clock.advance(1000 / 60);
      return ball.stepAfterPhysics();
    };

    const firstLanding = landWithDownwardSpeed(500);
    const firstHopSpeed = Math.abs(ball.snapshot.velocity.y);
    expect(firstLanding.landed).toBe(true);
    expect(firstLanding.grounded).toBe(false);
    expect(ball.snapshot.velocity.y).toBeLessThan(0);

    // Matter may report one more active contact immediately after takeoff.
    // A separating (upward) frame must not consume or cancel the next hop.
    ball.currentBody.setVelocity({ x: 0, y: -firstHopSpeed });
    ball.stepBeforePhysics([]);
    world.emit({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE', terrainId: 'floor',
      supportNormal: { x: 0, y: -1 }, impactSpeed: firstHopSpeed,
    });
    clock.advance(1000 / 60);
    const separatingContact = ball.stepAfterPhysics();
    expect(separatingContact.landed).toBe(false);
    expect(separatingContact.grounded).toBe(false);

    const secondLanding = landWithDownwardSpeed(firstHopSpeed);
    const secondHopSpeed = Math.abs(ball.snapshot.velocity.y);
    expect(secondLanding.landed).toBe(true);
    expect(secondHopSpeed).toBeLessThan(firstHopSpeed);

    const thirdLanding = landWithDownwardSpeed(secondHopSpeed);
    const thirdHopSpeed = Math.abs(ball.snapshot.velocity.y);
    expect(thirdLanding.landed).toBe(true);
    expect(thirdHopSpeed).toBeLessThan(secondHopSpeed);
    expect(thirdHopSpeed).toBeGreaterThan(config.landingBounce.minimumOutgoingSpeed);

    const finalLanding = landWithDownwardSpeed(thirdHopSpeed);
    expect(finalLanding.landed).toBe(true);
    expect(finalLanding.grounded).toBe(true);
    expect(ball.snapshot.velocity.y).toBeCloseTo(0);
    ball.dispose();
  });

  it('bounces along an inclined support normal after a jump landing', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const ball = new BallController(world, createPhysicsConfig(), clock, { x: 20, y: 20 });
    const normal = { x: -0.4, y: -Math.sqrt(1 - 0.4 ** 2) };
    const incoming = { x: -normal.x * 400, y: -normal.y * 400 };
    ball.state.takeoffAtMs = 0;
    ball.currentBody.setVelocity(incoming);
    ball.stepBeforePhysics([]);
    ball.currentBody.setVelocity({ x: 0, y: 0 });
    world.emit({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE',
      terrainId: 'ramp',
      supportNormal: normal,
      impactSpeed: 400,
    });
    clock.advance(1000 / 60);
    const result = ball.stepAfterPhysics();
    const outgoing = ball.snapshot.velocity;

    expect(result.landed).toBe(true);
    expect(outgoing.x * normal.x + outgoing.y * normal.y).toBeGreaterThan(0);
    expect(outgoing.y).toBeLessThan(0);
    ball.dispose();
  });

  it('bounces visibly even on a low-speed wall touch', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, clock, { x: 20, y: 20 });
    ball.currentBody.setVelocity({ x: 70, y: 0 });

    world.emit({
      type: 'BALL_WALL_IMPACT',
      terrainId: 'wall',
      normal: { x: -1, y: 0 },
      incomingVelocity: { x: 70, y: 0 },
      contactPoint: { x: 118, y: 100 },
      impactSpeed: 70,
      penetrationDepth: 1,
    });
    ball.stepAfterPhysics();

    expect(ball.snapshot.velocity.x).toBeLessThan(0);
    expect(Math.abs(ball.snapshot.velocity.x)).toBeGreaterThanOrEqual(config.wallBounce.minimumOutgoingSpeed);
    expect(ball.snapshot.position.x).toBeLessThan(20);
    ball.dispose();
  });

  it('bounces only once while a wall contact remains active, then re-arms after separation', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, clock, { x: 20, y: 20 });
    const impact = {
      type: 'BALL_WALL_IMPACT' as const,
      terrainId: 'wall',
      normal: { x: -1, y: 0 },
      incomingVelocity: { x: 500, y: 0 },
      contactPoint: { x: 118, y: 100 },
      impactSpeed: 500,
      penetrationDepth: 1,
    };

    world.emit(impact);
    ball.stepAfterPhysics();
    const firstBounce = ball.snapshot.velocity.x;
    expect(firstBounce).toBeLessThan(0);

    ball.currentBody.setVelocity({ x: 300, y: 0 });
    world.emit(impact);
    ball.stepAfterPhysics();
    expect(ball.snapshot.velocity.x).toBe(300);

    world.emit({ type: 'BALL_TERRAIN_CONTACT_ENDED', terrainId: 'wall' });
    world.emit({ ...impact, incomingVelocity: { x: 300, y: 0 }, impactSpeed: 300 });
    ball.stepAfterPhysics();
    expect(ball.snapshot.velocity.x).toBeLessThan(0);
    ball.dispose();
  });

  it('clears velocity and transient jump state after a reset', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const ball = new BallController(world, createPhysicsConfig(), clock, { x: 20, y: 20 });
    ball.currentBody.setVelocity({ x: 400, y: -200 });
    ball.state.takeoffAtMs = 50;
    ball.state.airBoostAvailable = true;
    ball.resetAt(300, 120);
    expect(ball.snapshot.position).toEqual({ x: 300, y: 120 });
    expect(ball.snapshot.velocity).toEqual({ x: 0, y: 0 });
    expect(ball.state.takeoffAtMs).toBe(null);
    expect(ball.state.airBoostAvailable).toBe(false);
    ball.dispose();
  });

  it('keeps the incoming direction while piercing a broken solid', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const ball = new BallController(world, createPhysicsConfig(), clock, { x: 20, y: 20 });
    ball.currentBody.setPosition({ x: 120, y: 100 });
    ball.breakThroughTerrain({ x: 700, y: -120 }, { x: -1, y: 0 }, 0.7, 5);
    expect(ball.snapshot.position).toEqual({ x: 115, y: 100 });
    expect(ball.snapshot.velocity.x).toBeCloseTo(490, 10);
    expect(ball.snapshot.velocity.y).toBeCloseTo(-84, 10);
    ball.dispose();
  });


  it('applies a fixed spring launch speed while preserving tangential motion', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, clock, { x: 20, y: 20 });
    const springImpact = {
      type: 'BALL_SPRING_IMPACT' as const,
      terrainId: 'spring-floor',
      surfaceId: 'spring-floor:spring:top',
      normal: { x: 0, y: -1 },
      incomingVelocity: { x: 360, y: 0 },
      contactPoint: { x: 20, y: 2 },
      impactSpeed: 0,
      impulse: 640,
    };

    ball.state.takeoffAtMs = 10;
    ball.state.airBoostAvailable = true;
    ball.currentBody.setVelocity(springImpact.incomingVelocity);
    world.emit(springImpact);
    ball.stepAfterPhysics();
    expect(ball.snapshot.velocity.x).toBeCloseTo(360 * config.springSurface.tangentRetention);
    expect(ball.snapshot.velocity.y).toBe(-640);
    expect(ball.snapshot.position.y).toBeCloseTo(20 - config.springSurface.separationDistancePx);
    expect(ball.state.grounded).toBe(false);
    expect(ball.state.takeoffAtMs).toBe(null);
    expect(ball.state.airBoostAvailable).toBe(false);
    ball.dispose();
  });

  it('arms damped landing bounces after a spring launch onto a movable block', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, clock, { x: 20, y: 20 });

    ball.currentBody.setVelocity({ x: 140, y: 0 });
    world.emit({
      type: 'BALL_SPRING_IMPACT', terrainId: 'spring-step', surfaceId: 'spring-step:top',
      normal: { x: 0, y: -1 }, incomingVelocity: { x: 140, y: 0 },
      contactPoint: { x: 20, y: 2 }, impactSpeed: 0, impulse: 520,
    });
    ball.stepAfterPhysics();
    expect(ball.snapshot.velocity.y).toBe(-520);
    expect(ball.state.takeoffAtMs).toBeNull();

    // Simulate the falling ball touching the top of a movable crate. The
    // mapper reports movable tops as ordinary upward support contacts.
    ball.currentBody.setVelocity({ x: 140, y: 500 });
    ball.stepBeforePhysics([]);
    ball.currentBody.setVelocity({ x: 0, y: 0 });
    world.emit({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE',
      terrainId: 'sandbox-movable-crate',
      supportNormal: { x: 0, y: -1 },
      impactSpeed: 500,
    });
    clock.advance(1000 / 60);
    const landing = ball.stepAfterPhysics();

    expect(landing.landed).toBe(true);
    expect(landing.grounded).toBe(false);
    expect(ball.snapshot.velocity.y).toBeCloseTo(-500 * config.landingBounce.restitution, 6);
    ball.dispose();
  });

  it('reverses spin on a vertical spring surface using wall spin retention', () => {
    const world = new FakeWorld();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, new GameClock(), { x: 20, y: 20 });
    ball.currentBody.setAngularVelocity(8);
    ball.currentBody.setVelocity({ x: -500, y: 0 });

    world.emit({
      type: 'BALL_SPRING_IMPACT', terrainId: 'spring-step', surfaceId: 'spring-step:right',
      normal: { x: 1, y: 0 }, incomingVelocity: { x: -500, y: 0 },
      contactPoint: { x: 30, y: 20 }, impactSpeed: 500, impulse: 440,
    });
    ball.stepAfterPhysics();

    expect(ball.snapshot.velocity.x).toBe(440);
    expect(ball.snapshot.angularVelocity).toBeCloseTo(-8 * config.wallBounce.spinRetention);
    ball.dispose();
  });

  it('reverses spin on an inclined spring surface', () => {
    const world = new FakeWorld();
    const config = createPhysicsConfig();
    const ball = new BallController(world, config, new GameClock(), { x: 20, y: 20 });
    const normal = { x: -0.6, y: -0.8 };
    ball.currentBody.setAngularVelocity(-6);
    ball.currentBody.setVelocity({ x: 300, y: 400 });

    world.emit({
      type: 'BALL_SPRING_IMPACT', terrainId: 'spring-ramp', surfaceId: 'spring-ramp:edge-1',
      normal, incomingVelocity: { x: 300, y: 400 },
      contactPoint: { x: 30, y: 20 }, impactSpeed: 500, impulse: 560,
    });
    ball.stepAfterPhysics();

    expect(ball.snapshot.angularVelocity).toBeCloseTo(6 * config.wallBounce.spinRetention);
    ball.dispose();
  });

  it('preserves spin on a horizontal spring surface', () => {
    const world = new FakeWorld();
    const ball = new BallController(world, createPhysicsConfig(), new GameClock(), { x: 20, y: 20 });
    ball.currentBody.setAngularVelocity(7);
    ball.currentBody.setVelocity({ x: 360, y: 0 });

    world.emit({
      type: 'BALL_SPRING_IMPACT', terrainId: 'spring-floor', surfaceId: 'spring-floor:top',
      normal: { x: 0, y: -1 }, incomingVelocity: { x: 360, y: 0 },
      contactPoint: { x: 20, y: 2 }, impactSpeed: 0, impulse: 640,
    });
    ball.stepAfterPhysics();

    expect(ball.snapshot.angularVelocity).toBe(7);
    ball.dispose();
  });

  it('repeats the same spring launch energy without accumulating it', () => {
    const world = new FakeWorld();
    const clock = new GameClock();
    const ball = new BallController(world, createPhysicsConfig(), clock, { x: 20, y: 20 });
    const impact = {
      type: 'BALL_SPRING_IMPACT' as const, terrainId: 'spring-pad', surfaceId: 'top',
      normal: { x: 0, y: -1 }, incomingVelocity: { x: 0, y: 0 },
      contactPoint: { x: 20, y: 2 }, impactSpeed: 0, impulse: 520,
    };

    world.emit(impact);
    ball.stepAfterPhysics();
    const firstLaunchSpeed = Math.abs(ball.snapshot.velocity.y);
    ball.currentBody.setVelocity({ x: 0, y: 0 });
    world.emit({ ...impact, incomingVelocity: { x: 0, y: 300 } });
    ball.stepAfterPhysics();

    expect(firstLaunchSpeed).toBe(520);
    expect(Math.abs(ball.snapshot.velocity.y)).toBe(520);
    ball.dispose();
  });

});
