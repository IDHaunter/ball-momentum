import type { MatterBodyLike } from './MatterPhysicsBody';
import type { PhysicsEvent, Vector2 } from './PhysicsTypes';

export interface CollisionPairLike {
  bodyA: MatterBodyLike;
  bodyB: MatterBodyLike;
  collision: { normal: Vector2; depth?: number; supports?: Vector2[]; supportCount?: number };
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
      // Convert Matter's pair normal to the outward normal for the ball.
      const sign = ballIsA ? 1 : -1;
      const length = Math.hypot(n.x, n.y) || 1;
      const normalX = sign * n.x / length;
      const normalY = sign * n.y / length;
      const supportNormal = { x: normalX || 0, y: normalY || 0 };
      const ballBody = ballIsA ? bodyA : bodyB;
      const incomingVelocity = {
        x: ballBody.velocity.x * 60,
        y: ballBody.velocity.y * 60,
      };
      const speed = Math.hypot(incomingVelocity.x, incomingVelocity.y);
      const events: PhysicsEvent[] = [{
        type: phase === 'start' ? 'BALL_TERRAIN_CONTACT_STARTED' : 'BALL_TERRAIN_CONTACT_ACTIVE',
        terrainId: otherMeta.id,
        supportNormal,
        impactSpeed: speed,
      }];

      // Wall impacts are captured on collisionstart, before Matter's velocity
      // solver removes the incoming normal velocity. The controller applies a
      // deliberate bounce after the physics step has resolved penetration.
      const normalImpactSpeed = -(
        incomingVelocity.x * supportNormal.x + incomingVelocity.y * supportNormal.y
      );
      if (phase === 'start' && Math.abs(supportNormal.x) >= 0.88 && normalImpactSpeed > 0) {
        const supports = pair.collision.supports ?? [];
        const activeSupports = supports.slice(0, pair.collision.supportCount ?? supports.length);
        const contactPoint = activeSupports.length > 0
          ? activeSupports.reduce((sum, point) => ({ x: sum.x + point.x / activeSupports.length, y: sum.y + point.y / activeSupports.length }), { x: 0, y: 0 })
          : {
            x: ballBody.position.x - supportNormal.x * (ballBody.circleRadius ?? 0),
            y: ballBody.position.y - supportNormal.y * (ballBody.circleRadius ?? 0),
          };
        events.push({
          type: 'BALL_WALL_IMPACT',
          terrainId: otherMeta.id,
          normal: supportNormal,
          incomingVelocity,
          contactPoint,
          impactSpeed: normalImpactSpeed,
        });
      }
      return events;
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
