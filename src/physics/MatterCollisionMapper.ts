import type { MatterBodyLike } from './MatterPhysicsBody';
import type { PhysicsEvent, Vector2 } from './PhysicsTypes';

export interface CollisionPairLike {
  bodyA: MatterBodyLike;
  bodyB: MatterBodyLike;
  collision: { normal: Vector2; depth?: number };
}

export interface CollisionEventLike { pairs: CollisionPairLike[]; }

export interface PhysicsBodyMetadata {
  kind: 'ball' | 'terrain' | 'trigger';
  id: string;
  triggerType?: 'hazard' | 'checkpoint' | 'goal';
}

export class MatterCollisionMapper {
  constructor(private readonly metadata: Map<MatterBodyLike, PhysicsBodyMetadata>) {}

  mapPair(pair: CollisionPairLike, phase: 'start' | 'active' | 'end'): PhysicsEvent[] {
    const bodyA = pair.bodyA.parent && pair.bodyA.parent !== pair.bodyA ? pair.bodyA.parent : pair.bodyA;
    const bodyB = pair.bodyB.parent && pair.bodyB.parent !== pair.bodyB ? pair.bodyB.parent : pair.bodyB;
    const metaA = this.metadata.get(bodyA);
    const metaB = this.metadata.get(bodyB);
    if (!metaA || !metaB) return [];

    const ballIsA = metaA.kind === 'ball';
    const ballMeta = ballIsA ? metaA : metaB;
    const otherMeta = ballIsA ? metaB : metaA;
    if (ballMeta.kind !== 'ball') return [];

    if (otherMeta.kind === 'terrain') {
      if (phase === 'end') return [{ type: 'BALL_TERRAIN_CONTACT_ENDED', terrainId: otherMeta.id }];
      const n = pair.collision.normal;
      // Matter's collision.normal points in the direction bodyA must move to
      // separate from bodyB. Convert it to the outward support normal for the
      // ball, regardless of whether the ball is bodyA or bodyB.
      const supportNormal = {
        x: (ballIsA ? n.x : -n.x) || 0,
        y: (ballIsA ? n.y : -n.y) || 0,
      };
      const speed = Math.hypot(ballIsA ? pair.bodyA.velocity.x : pair.bodyB.velocity.x, ballIsA ? pair.bodyA.velocity.y : pair.bodyB.velocity.y) * 60;
      return [{
        type: phase === 'start' ? 'BALL_TERRAIN_CONTACT_STARTED' : 'BALL_TERRAIN_CONTACT_ACTIVE',
        terrainId: otherMeta.id,
        supportNormal,
        impactSpeed: speed,
      }];
    }

    if (otherMeta.kind === 'trigger') {
      if (phase === 'start' && otherMeta.triggerType) {
        return [{ type: 'BALL_ENTERED_TRIGGER', triggerId: otherMeta.id, triggerType: otherMeta.triggerType }];
      }
      if (phase === 'end') return [{ type: 'BALL_EXITED_TRIGGER', triggerId: otherMeta.id }];
    }
    return [];
  }
}
