import type { MatterBodyLike } from './MatterPhysicsBody';
import type { PatrolGeometry, PhysicsEvent, Vector2 } from './PhysicsTypes';

export interface CollisionPairLike {
  bodyA: MatterBodyLike;
  bodyB: MatterBodyLike;
  collision: { normal: Vector2; depth?: number; supports?: Vector2[]; supportCount?: number };
}

export interface CollisionEventLike { pairs: CollisionPairLike[]; }

export interface PhysicsBodyMetadata {
  kind: 'ball' | 'terrain' | 'trigger' | 'movable' | 'bot';
  id: string;
  mass?: number;
  minimumImpactEnergy?: number;
  triggerType?: 'hazard' | 'checkpoint' | 'goal';
  breakable?: boolean;
  springSurfaces?: Array<{ id: string; normal: Vector2; impulse: number }>;
  patrolGeometry?: PatrolGeometry;
  dynamic?: boolean;
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

    if (otherMeta.kind === 'terrain' || otherMeta.kind === 'movable') {
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

      // Movable blocks are only released by side impacts. A ball landing on
      // their top remains a normal support contact and can roll or jump from it.
      const normalImpactSpeed = -(
        incomingVelocity.x * supportNormal.x + incomingVelocity.y * supportNormal.y
      );
      if (otherMeta.kind === 'movable') {
        const ballMass = ballMeta.mass ?? 1;
        const impactEnergy = 0.5 * ballMass * Math.max(0, normalImpactSpeed) ** 2;
        const isSideImpact = Math.abs(supportNormal.x) >= 0.72;
        if (isSideImpact && normalImpactSpeed > 0.1
          && impactEnergy >= (otherMeta.minimumImpactEnergy ?? Number.POSITIVE_INFINITY)) {
          events.push({
            type: 'BALL_MOVABLE_IMPACT',
            movableId: otherMeta.id,
            normal: supportNormal,
            incomingVelocity,
            normalImpactSpeed,
            impactEnergy,
            ballMass,
          });
        }
      }

      // Impact energy is based on velocity along the contact normal. This
      // naturally makes glancing hits weaker than perpendicular hits.
      const supports = pair.collision.supports ?? [];
      const activeSupports = supports.slice(0, pair.collision.supportCount ?? supports.length);
      const contactPoint = activeSupports.length > 0
        ? activeSupports.reduce((sum, point) => ({
          x: sum.x + point.x / activeSupports.length,
          y: sum.y + point.y / activeSupports.length,
        }), { x: 0, y: 0 })
        : {
          x: ballBody.position.x - supportNormal.x * (ballBody.circleRadius ?? 0),
          y: ballBody.position.y - supportNormal.y * (ballBody.circleRadius ?? 0),
        };
      const matchedSpring = (otherMeta.springSurfaces ?? [])
        .map((surface) => ({ surface, alignment: surface.normal.x * supportNormal.x + surface.normal.y * supportNormal.y }))
        .filter((entry) => entry.alignment >= 0.94)
        .sort((a, b) => b.alignment - a.alignment)[0]?.surface;
      const incomingSpeed = Math.hypot(incomingVelocity.x, incomingVelocity.y);
      const velocityAwayFromSpring = matchedSpring
        ? incomingVelocity.x * matchedSpring.normal.x + incomingVelocity.y * matchedSpring.normal.y
        : 0;
      // A rolling ball can acquire a new top-surface contact with almost no
      // normal velocity. Trigger on a new pair if it is moving tangentially,
      // but never launch a ball that is already separating from the surface.
      const springCanActivate = phase === 'start'
        && Boolean(matchedSpring)
        && velocityAwayFromSpring <= 1
        && incomingSpeed >= 8;
      if (springCanActivate && matchedSpring) {
        events.push({
          type: 'BALL_SPRING_IMPACT',
          terrainId: otherMeta.id,
          surfaceId: matchedSpring.id,
          normal: { ...matchedSpring.normal },
          incomingVelocity,
          contactPoint,
          impactSpeed: Math.max(0, -velocityAwayFromSpring),
          impulse: matchedSpring.impulse,
        });
      }

      if (normalImpactSpeed > 0.1) {
        events.push({
          type: 'BALL_TERRAIN_IMPACT',
          terrainId: otherMeta.id,
          normal: supportNormal,
          incomingVelocity,
          contactPoint,
          impactSpeed: normalImpactSpeed,
          penetrationDepth: Math.max(0, pair.collision.depth ?? 0),
        });
      }

      // Keep the dedicated wall event for the existing bounce and dust effect.
      // Breakable walls still use the ordinary bounce if their energy is below
      // the level-defined threshold; a successful break replaces it with a
      // breakthrough using the original incoming velocity.
      const movableImpactAccepted = otherMeta.kind === 'movable'
        && Math.abs(supportNormal.x) >= 0.72
        && normalImpactSpeed > 0.1
        && 0.5 * (ballMeta.mass ?? 1) * normalImpactSpeed ** 2 >= (otherMeta.minimumImpactEnergy ?? Number.POSITIVE_INFINITY);
      if (!springCanActivate && !movableImpactAccepted && Math.abs(supportNormal.x) >= 0.88 && normalImpactSpeed > 0.1) {
        events.push({
          type: 'BALL_WALL_IMPACT',
          terrainId: otherMeta.id,
          normal: supportNormal,
          incomingVelocity,
          contactPoint,
          impactSpeed: normalImpactSpeed,
          penetrationDepth: Math.max(0, pair.collision.depth ?? 0),
          breakable: Boolean(otherMeta.breakable),
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
