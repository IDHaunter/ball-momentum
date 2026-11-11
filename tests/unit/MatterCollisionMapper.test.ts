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
});
