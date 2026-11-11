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
