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

  mapPair(pair: CollisionPairLike, phase: 'start' | 'active' | 'end', preStepBallVelocity?: Vector2 | null): PhysicsEvent[] {
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
      let normalX = sign * n.x / length;
      let normalY = sign * n.y / length;
      const ballBody = ballIsA ? bodyA : bodyB;
      const terrainBody = ballIsA ? bodyB : bodyA;
      // Keep the normal pointing from the terrain toward the ball. This also
      // guards against body-order changes and reversed SAT normals.
      const centerDeltaX = ballBody.position.x - terrainBody.position.x;
      const centerDeltaY = ballBody.position.y - terrainBody.position.y;
      if (normalX * centerDeltaX + normalY * centerDeltaY < 0) {
        normalX *= -1;
        normalY *= -1;
      }
      const supportNormal = { x: normalX || 0, y: normalY || 0 };
      // Phaser/Matter body.velocity is the velocity at the start of the
      // current fixed step, before the solver can cancel the wall-directed
      // component. During a sustained contact, collisionActive needs this
      // pre-step sample too; reading velocity from the resolved contact would
      // incorrectly report zero and suppress the bounce.
      const incomingVelocity = preStepBallVelocity ? { ...preStepBallVelocity } : {
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

      // Detect a wall-directed approach on both collisionStart and
      // collisionActive. A low-speed first touch must not hide a later,
      // stronger push while the pair remains active.
      const normalImpactSpeed = -(
        incomingVelocity.x * supportNormal.x + incomingVelocity.y * supportNormal.y
      );
      if (Math.abs(supportNormal.x) >= 0.88 && normalImpactSpeed > 0.1) {
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
          penetrationDepth: Math.max(0, pair.collision.depth ?? 0),
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
