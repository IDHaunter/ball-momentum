import { describe, expect, it } from 'vitest';
import { MatterCollisionMapper, type CollisionPairLike, type PhysicsBodyMetadata } from '../../src/physics/MatterCollisionMapper';
import type { MatterBodyLike } from '../../src/physics/MatterPhysicsBody';

function body(x: number, y: number): MatterBodyLike {
  return { position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0 };
}

describe('MatterCollisionMapper', () => {
  it('reports an upward support normal when the ball is bodyA on top of terrain', () => {
    const ball = body(100, 100);
    const terrain = body(100, 160);
    const metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [terrain, { kind: 'terrain', id: 'ground' }],
    ]);
    const mapper = new MatterCollisionMapper(metadata);
    const pair: CollisionPairLike = { bodyA: ball, bodyB: terrain, collision: { normal: { x: 0, y: -1 } } };

    expect(mapper.mapPair(pair, 'active')).toEqual([
      expect.objectContaining({ type: 'BALL_TERRAIN_CONTACT_ACTIVE', supportNormal: { x: 0, y: -1 } }),
    ]);
  });

  it('reports an upward support normal when the ball is bodyB on top of terrain', () => {
    const terrain = body(100, 160);
    const ball = body(100, 100);
    const metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [terrain, { kind: 'terrain', id: 'ground' }],
    ]);
    const mapper = new MatterCollisionMapper(metadata);
    const pair: CollisionPairLike = { bodyA: terrain, bodyB: ball, collision: { normal: { x: 0, y: 1 } } };

    expect(mapper.mapPair(pair, 'active')).toEqual([
      expect.objectContaining({ type: 'BALL_TERRAIN_CONTACT_ACTIVE', supportNormal: { x: 0, y: -1 } }),
    ]);
  });

  it('keeps an underside contact pointing downward', () => {
    const ball = body(100, 180);
    const ceiling = body(100, 120);
    const metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [ceiling, { kind: 'terrain', id: 'ceiling' }],
    ]);
    const mapper = new MatterCollisionMapper(metadata);
    const pair: CollisionPairLike = { bodyA: ball, bodyB: ceiling, collision: { normal: { x: 0, y: 1 } } };

    expect(mapper.mapPair(pair, 'active')).toEqual([
      expect.objectContaining({ type: 'BALL_TERRAIN_CONTACT_ACTIVE', supportNormal: { x: 0, y: 1 } }),
    ]);
  });
});


describe('MatterCollisionMapper wall impacts', () => {
  it('captures an incoming horizontal impact and its contact point', () => {
    const ball = body(100, 100);
    ball.velocity = { x: 10, y: 2 };
    ball.circleRadius = 18;
    const wall = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [wall, { kind: 'terrain', id: 'right-wall' }],
    ]));
    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: wall,
      collision: { normal: { x: -1, y: 0 }, supports: [{ x: 118, y: 95 }, { x: 118, y: 105 }, { x: 999, y: 999 }], supportCount: 2 },
    }, 'start');

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'BALL_WALL_IMPACT',
        terrainId: 'right-wall',
        normal: { x: -1, y: 0 },
        incomingVelocity: { x: 600, y: 120 },
        contactPoint: { x: 118, y: 100 },
        impactSpeed: 600,
      }),
    ]));
  });

  it('maps the wall normal correctly when the ball is bodyB', () => {
    const wall = body(130, 100);
    const ball = body(100, 100);
    ball.velocity = { x: 8, y: 0 };
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [wall, { kind: 'terrain', id: 'right-wall' }],
      [ball, { kind: 'ball', id: 'ball' }],
    ]));
    const events = mapper.mapPair({ bodyA: wall, bodyB: ball, collision: { normal: { x: 1, y: 0 } } }, 'start');
    const impact = events.find((event) => event.type === 'BALL_WALL_IMPACT');

    expect(impact).toEqual(expect.objectContaining({
      type: 'BALL_WALL_IMPACT',
      normal: { x: -1, y: 0 },
      incomingVelocity: { x: 480, y: 0 },
      impactSpeed: 480,
    }));
  });

  it('does not create wall impacts for floor contacts or movement away from a wall', () => {
    const ball = body(100, 100);
    ball.velocity = { x: -5, y: 0 };
    const wall = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [wall, { kind: 'terrain', id: 'wall' }],
    ]));

    const movingAway = mapper.mapPair({ bodyA: ball, bodyB: wall, collision: { normal: { x: -1, y: 0 } } }, 'start');
    const floor = mapper.mapPair({ bodyA: ball, bodyB: wall, collision: { normal: { x: 0, y: -1 } } }, 'start');
    expect(movingAway.some((event) => event.type === 'BALL_WALL_IMPACT')).toBe(false);
    expect(floor.some((event) => event.type === 'BALL_WALL_IMPACT')).toBe(false);
  });


  it('detects a wall impact during an already-active contact using pre-step velocity', () => {
    const ball = body(100, 100);
    // Matter may have resolved the previous frame to nearly zero velocity.
    ball.velocity = { x: 0, y: 0 };
    const wall = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [wall, { kind: 'terrain', id: 'right-wall' }],
    ]));
    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: wall,
      collision: { normal: { x: -1, y: 0 }, depth: 3 },
    }, 'active', { x: 55, y: 0 });

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'BALL_WALL_IMPACT',
        incomingVelocity: { x: 55, y: 0 },
        impactSpeed: 55,
        penetrationDepth: 3,
      }),
    ]));
  });


  it('reports normal impact speed for an angled polygon surface', () => {
    const ball = body(100, 100);
    const ramp = body(130, 130);
    ball.velocity = { x: 8, y: 0 };
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [ramp, { kind: 'terrain', id: 'glass-ramp', breakable: true }],
    ]));
    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: ramp,
      collision: { normal: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }, supports: [{ x: 116, y: 116 }], supportCount: 1 },
    }, 'start');
    const impact = events.find((event) => event.type === 'BALL_TERRAIN_IMPACT');
    expect(impact?.type).toBe('BALL_TERRAIN_IMPACT');
    if (impact?.type === 'BALL_TERRAIN_IMPACT') {
      expect(impact.terrainId).toBe('glass-ramp');
      expect(impact.impactSpeed).toBeCloseTo(8 * Math.SQRT1_2 * 60, 5);
    }
  });

});


describe('MatterCollisionMapper spring surfaces', () => {
  it('emits a spring impact for a newly acquired top contact while rolling tangentially', () => {
    const ball = body(100, 100);
    const floor = body(100, 160);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [floor, {
        kind: 'terrain', id: 'spring-floor',
        springSurfaces: [{ id: 'spring-floor:spring:top', normal: { x: 0, y: -1 }, impulse: 640 }],
      }],
    ]));

    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: floor,
      collision: { normal: { x: 0, y: -1 }, supports: [{ x: 100, y: 118 }], supportCount: 1 },
    }, 'start', { x: 360, y: 0 });

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'BALL_SPRING_IMPACT', terrainId: 'spring-floor',
        surfaceId: 'spring-floor:spring:top', normal: { x: 0, y: -1 }, impulse: 640,
      }),
    ]));
  });

  it('matches the spring face by its normal when the ball is bodyB', () => {
    const wall = body(130, 100);
    const ball = body(100, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [wall, { kind: 'terrain', id: 'spring-wall', springSurfaces: [{ id: 'spring-wall:left', normal: { x: -1, y: 0 }, impulse: 480 }] }],
      [ball, { kind: 'ball', id: 'ball' }],
    ]));

    const events = mapper.mapPair({
      bodyA: wall,
      bodyB: ball,
      collision: { normal: { x: 1, y: 0 }, supports: [{ x: 118, y: 100 }], supportCount: 1 },
    }, 'start', { x: 240, y: 0 });

    expect(events.some((event) => event.type === 'BALL_SPRING_IMPACT')).toBe(true);
    expect(events.some((event) => event.type === 'BALL_WALL_IMPACT')).toBe(false);
  });

  it('does not retrigger during an active pair or when the ball is separating', () => {
    const ball = body(100, 100);
    const floor = body(100, 160);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [floor, { kind: 'terrain', id: 'spring-floor', springSurfaces: [{ id: 'top', normal: { x: 0, y: -1 }, impulse: 600 }] }],
    ]));
    const pair: CollisionPairLike = { bodyA: ball, bodyB: floor, collision: { normal: { x: 0, y: -1 } } };

    const active = mapper.mapPair(pair, 'active', { x: 100, y: 0 });
    const separating = mapper.mapPair(pair, 'start', { x: 0, y: -120 });
    expect(active.some((event) => event.type === 'BALL_SPRING_IMPACT')).toBe(false);
    expect(separating.some((event) => event.type === 'BALL_SPRING_IMPACT')).toBe(false);
  });
});
