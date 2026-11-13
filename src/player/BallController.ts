import type { PhysicsConfig } from '../config/config.types';
import type { GameClock } from '../core/GameClock';
import type { PlayerAction } from '../input/PlayerAction';
import type { IPhysicsBody } from '../physics/IPhysicsBody';
import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { PhysicsEvent } from '../physics/PhysicsTypes';
import { GroundContactTracker } from '../physics/GroundContactTracker';
import { clamp, exponentialDecay, isFiniteVector, lerp } from '../utils/MathUtils';
import { FIXED_STEP_SECONDS } from '../utils/TimeUtils';
import { AirBoostController } from './AirBoostController';
import { createBallState, type BallState } from './BallModel';
import { JumpController } from './JumpController';

export class BallController {
  readonly state: BallState = createBallState();
  private body: IPhysicsBody;
  private readonly contacts: GroundContactTracker;
  private readonly jump: JumpController;
  private readonly airBoost: AirBoostController;
  private lastGrounded = false;
  private pendingWallImpact: Extract<PhysicsEvent, { type: 'BALL_WALL_IMPACT' }> | null = null;
  private readonly wallBounceContacts = new Set<string>();
  private prePhysicsVelocity: { x: number; y: number } | null = null;
  private landingBouncesRemaining = 0;
  private readonly unsubscribePhysicsEvents: () => void;

  constructor(
    private readonly world: IPhysicsWorld,
    private readonly config: PhysicsConfig,
    private readonly clock: GameClock,
    spawn: { x: number; y: number },
  ) {
    this.contacts = new GroundContactTracker(config);
    this.unsubscribePhysicsEvents = this.world.onPhysicsEvent((event) => {
      this.contacts.handle(event, this.clock.nowMs);
      if (event.type === 'BALL_TERRAIN_CONTACT_ENDED') this.wallBounceContacts.delete(event.terrainId);
      if (event.type === 'BALL_WALL_IMPACT'
        && !this.wallBounceContacts.has(event.terrainId)
        && event.impactSpeed >= this.config.wallBounce.minimumImpactSpeed) {
        this.pendingWallImpact = event;
        this.wallBounceContacts.add(event.terrainId);
      }
    });
    this.jump = new JumpController(config, this.state);
    this.airBoost = new AirBoostController(config, this.state);
    this.body = this.createBody(spawn);
  }

  get snapshot() { return this.body.getSnapshot(); }
  get currentBody(): IPhysicsBody { return this.body; }

  stepBeforePhysics(actions: PlayerAction[]): boolean {
    const now = this.clock.nowMs;
    for (const action of actions) {
      if (action.type === 'MOVE_LEFT' || action.type === 'MOVE_RIGHT') this.applyHorizontal(action, now);
      else if (action.type === 'JUMP') this.jump.requestJump(action.strength, now);
      else if (action.type === 'AIR_BOOST') this.airBoost.apply(action.strength, now, this.body);
    }

    const launched = this.jump.updateBeforePhysics(now, this.body);
    if (launched) {
      this.contacts.clear();
      this.landingBouncesRemaining = 0;
    }

    const snapshot = this.body.getSnapshot();
    const drag = this.state.grounded
      ? this.config.drag.groundHorizontalDragPerSecond
      : this.config.drag.airHorizontalDragPerSecond;
    const decay = exponentialDecay(drag, FIXED_STEP_SECONDS);
    let vx = snapshot.velocity.x * decay;
    if (Math.sign(vx) !== Math.sign(snapshot.velocity.x)) vx = 0;
    const vy = clamp(snapshot.velocity.y, -this.config.limits.maxUpwardSpeed, this.config.limits.maxDownwardSpeed);
    vx = clamp(vx, -this.config.limits.maxHorizontalSpeed, this.config.limits.maxHorizontalSpeed);
    if (!isFiniteVector({ x: vx, y: vy }) || !isFiniteVector(snapshot.position)) {
      this.resetAt(snapshot.position.x || 0, snapshot.position.y || 0);
      return launched;
    }
    this.prePhysicsVelocity = { x: vx, y: vy };
    this.body.setVelocity({ x: vx, y: vy });
    return launched;
  }

  stepAfterPhysics(): { landed: boolean; grounded: boolean } {
    this.applyPendingWallBounce();
    const now = this.clock.nowMs;
    const contactGrounded = this.contacts.isGrounded(now);
    const supportNormal = contactGrounded ? this.contacts.getSupportNormal(now) : null;
    const incomingVelocity = this.prePhysicsVelocity ?? this.body.getSnapshot().velocity;
    const supportVelocity = supportNormal
      ? incomingVelocity.x * supportNormal.x + incomingVelocity.y * supportNormal.y
      : 0;
    // Matter can keep a pair active for a frame after we have kicked the ball
    // away from the surface. Do not mistake that separating contact for a new
    // landing, otherwise the solver cancels the next hop in the sequence.
    let grounded = contactGrounded && supportVelocity <= 2;
    const landed = grounded && !this.lastGrounded;

    if (landed) {
      // Only a jump landing starts a new hop sequence. The following smaller
      // contacts consume the remaining count even though takeoffAtMs is reset.
      if (this.state.takeoffAtMs !== null) {
        this.landingBouncesRemaining = this.config.landingBounce.maxBounces;
      }
      const bounced = this.landingBouncesRemaining > 0
        && supportNormal !== null
        && this.applyLandingBounce(supportNormal);
      if (bounced) {
        this.landingBouncesRemaining -= 1;
        this.contacts.clear();
        grounded = false;
      } else {
        this.landingBouncesRemaining = 0;
      }
      this.jump.onLanding(now);
    } else if (grounded) {
      this.state.lastGroundedAtMs = now;
    }

    this.state.grounded = grounded;
    if (!grounded && this.state.pendingJumpUntilMs !== null && this.state.pendingJumpUntilMs < now) {
      this.state.pendingJumpUntilMs = null;
      this.state.pendingJumpStrength = 0.5;
    }
    const snapshot = this.body.getSnapshot();
    const capped = {
      x: clamp(snapshot.velocity.x, -this.config.limits.maxHorizontalSpeed, this.config.limits.maxHorizontalSpeed),
      y: clamp(snapshot.velocity.y, -this.config.limits.maxUpwardSpeed, this.config.limits.maxDownwardSpeed),
    };
    if (capped.x !== snapshot.velocity.x || capped.y !== snapshot.velocity.y) this.body.setVelocity(capped);
    this.lastGrounded = grounded;
    this.prePhysicsVelocity = null;
    return { landed, grounded };
  }

  resetAt(x: number, y: number): void {
    this.body.setPosition({ x, y });
    this.body.setVelocity({ x: 0, y: 0 });
    this.body.setAngularVelocity(0);
    this.body.setAwake();
    this.contacts.clear();
    this.pendingWallImpact = null;
    this.wallBounceContacts.clear();
    this.prePhysicsVelocity = null;
    this.landingBouncesRemaining = 0;
    this.jump.reset();
    this.state.grounded = false;
    this.state.lastGroundedAtMs = -Infinity;
    this.state.horizontalActionReadyAtMs = this.clock.nowMs;
    this.lastGrounded = false;
  }

  rebuildBody(radiusPx: number): void {
    const current = this.body.getSnapshot();
    this.body.destroy();
    this.body = this.createBody(current.position, radiusPx);
    this.body.setVelocity(current.velocity);
    this.body.setAngularVelocity(current.angularVelocity);
  }

  dispose(): void { this.unsubscribePhysicsEvents(); this.body.destroy(); this.contacts.clear(); }

  private applyPendingWallBounce(): void {
    const impact = this.pendingWallImpact;
    this.pendingWallImpact = null;
    if (!impact || impact.impactSpeed < this.config.wallBounce.minimumImpactSpeed) return;

    const { x: nx, y: ny } = impact.normal;
    const incoming = impact.incomingVelocity;
    const normalVelocity = incoming.x * nx + incoming.y * ny;
    if (normalVelocity >= 0) return;

    const normalX = normalVelocity * nx;
    const normalY = normalVelocity * ny;
    const tangentX = incoming.x - normalX;
    const tangentY = incoming.y - normalY;
    const outgoingNormalSpeed = Math.max(
      impact.impactSpeed * this.config.wallBounce.restitution,
      this.config.wallBounce.minimumOutgoingSpeed,
    );

    // Move a few pixels away from the contact manifold. Without this small
    // separation, Matter can keep the ball in the same active pair and its
    // solver may cancel the rebound on the next frame.
    const position = this.body.getSnapshot().position;
    const separation = Math.max(
      this.config.wallBounce.separationDistancePx,
      Math.min(8, impact.penetrationDepth + this.config.wallBounce.separationDistancePx),
    );
    this.body.setPosition({ x: position.x + nx * separation, y: position.y + ny * separation });
    this.body.setVelocity({
      x: tangentX * this.config.wallBounce.tangentRetention + nx * outgoingNormalSpeed,
      y: tangentY * this.config.wallBounce.tangentRetention + ny * outgoingNormalSpeed,
    });
    // A wall collision reverses the ball's spin as well as its travel
    // direction, preventing the old rolling spin from driving it back into
    // the wall after the next ground contact.
    const angularVelocity = this.body.getSnapshot().angularVelocity;
    this.body.setAngularVelocity(-angularVelocity * this.config.wallBounce.spinRetention);
    this.body.setAwake();
  }

  private applyLandingBounce(normal: { x: number; y: number }): boolean {
    const incoming = this.prePhysicsVelocity ?? this.body.getSnapshot().velocity;
    const normalVelocity = incoming.x * normal.x + incoming.y * normal.y;
    const impactSpeed = -normalVelocity;
    if (impactSpeed < this.config.landingBounce.minimumImpactSpeed) return false;

    const outgoingNormalSpeed = impactSpeed * this.config.landingBounce.restitution;
    if (outgoingNormalSpeed < this.config.landingBounce.minimumOutgoingSpeed) return false;

    const normalX = normalVelocity * normal.x;
    const normalY = normalVelocity * normal.y;
    const tangentX = incoming.x - normalX;
    const tangentY = incoming.y - normalY;
    const position = this.body.getSnapshot().position;
    this.body.setPosition({
      x: position.x + normal.x * this.config.landingBounce.separationDistancePx,
      y: position.y + normal.y * this.config.landingBounce.separationDistancePx,
    });
    this.body.setVelocity({
      x: tangentX * this.config.landingBounce.tangentRetention + normal.x * outgoingNormalSpeed,
      y: tangentY * this.config.landingBounce.tangentRetention + normal.y * outgoingNormalSpeed,
    });
    this.body.setAwake();
    return true;
  }

  private applyHorizontal(action: Extract<PlayerAction, { type: 'MOVE_LEFT' | 'MOVE_RIGHT' }>, nowMs: number): void {
    if (nowMs < this.state.horizontalActionReadyAtMs) return;
    const amount = lerp(
      this.config.horizontalControl.minVelocityDelta,
      this.config.horizontalControl.maxVelocityDelta,
      clamp(action.strength, 0, 1),
    );
    const airMultiplier = this.state.grounded ? 1 : this.config.horizontalControl.airControlMultiplier;
    const direction = action.type === 'MOVE_RIGHT' ? 1 : -1;
    const current = this.body.getSnapshot().velocity;
    const nextX = clamp(
      current.x + direction * amount * airMultiplier,
      -this.config.horizontalControl.maxHorizontalSpeed,
      this.config.horizontalControl.maxHorizontalSpeed,
    );
    this.body.setVelocity({ x: nextX, y: current.y });
    this.body.setAwake();
    this.state.horizontalActionReadyAtMs = nowMs + this.config.horizontalControl.actionCooldownMs;
  }

  private createBody(position: { x: number; y: number }, radiusPx = this.config.ball.radiusPx): IPhysicsBody {
    return this.world.createBall(position, {
      radiusPx, mass: this.config.ball.mass, restitution: this.config.ball.restitution,
      friction: this.config.ball.friction, frictionStatic: this.config.ball.frictionStatic,
      frictionAir: this.config.ball.frictionAir, fixedRotation: this.config.ball.fixedRotation,
    });
  }
}
