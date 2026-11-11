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
      if (event.type === 'BALL_WALL_IMPACT') this.pendingWallImpact = event;
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
    if (launched) this.contacts.clear();

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
    this.body.setVelocity({ x: vx, y: vy });
    return launched;
  }

  stepAfterPhysics(): { landed: boolean; grounded: boolean } {
    this.applyPendingWallBounce();
    const now = this.clock.nowMs;
    const snapshot = this.body.getSnapshot();
    const grounded = this.contacts.isGrounded(now);
    const landed = grounded && !this.lastGrounded;
    this.state.grounded = grounded;
    if (landed) this.jump.onLanding(now);
    else if (grounded) this.state.lastGroundedAtMs = now;
    if (!grounded && this.state.pendingJumpUntilMs !== null && this.state.pendingJumpUntilMs < now) {
      this.state.pendingJumpUntilMs = null;
      this.state.pendingJumpStrength = 0.5;
    }
    const capped = {
      x: clamp(snapshot.velocity.x, -this.config.limits.maxHorizontalSpeed, this.config.limits.maxHorizontalSpeed),
      y: clamp(snapshot.velocity.y, -this.config.limits.maxUpwardSpeed, this.config.limits.maxDownwardSpeed),
    };
    if (capped.x !== snapshot.velocity.x || capped.y !== snapshot.velocity.y) this.body.setVelocity(capped);
    this.lastGrounded = grounded;
    return { landed, grounded };
  }

  resetAt(x: number, y: number): void {
    this.body.setPosition({ x, y });
    this.body.setVelocity({ x: 0, y: 0 });
    this.body.setAngularVelocity(0);
    this.body.setAwake();
    this.contacts.clear();
    this.pendingWallImpact = null;
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
    this.body.setVelocity({
      x: tangentX * this.config.wallBounce.tangentRetention - normalX * this.config.wallBounce.restitution,
      y: tangentY * this.config.wallBounce.tangentRetention - normalY * this.config.wallBounce.restitution,
    });
    this.body.setAwake();
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
