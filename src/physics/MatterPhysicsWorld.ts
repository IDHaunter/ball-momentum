import { COLLISION_CATEGORIES } from './CollisionCategories';
import type { IPhysicsWorld } from './IPhysicsWorld';
import { MatterCollisionMapper, type CollisionEventLike, type PhysicsBodyMetadata } from './MatterCollisionMapper';
import { MatterPhysicsBody, type MatterBodyLike, type MatterGameObjectLike } from './MatterPhysicsBody';
import type { BallPhysicsOptions, BotPhysicsOptions, MovableBoxOptions, PatrolGeometry, PhysicsEvent, SensorOptions, StaticBoxOptions, StaticPolygonOptions, Vector2 } from './PhysicsTypes';
import { polygonCentroid } from '../utils/GeometryUtils';
import { PhysicsAdapter } from './PhysicsAdapter';
import { calculateMovableBlockImpact } from './MovableBlockImpact';
import { directionFromVelocity, hasPatrolEdgeAhead, hasPatrolObstacleAhead } from './BotPatrol';

interface MatterWorldLike {
  autoUpdate: boolean;
  engine: { timing: { timeScale: number } };
  on(event: string, listener: (event: CollisionEventLike) => void): void;
  off(event: string, listener: (event: CollisionEventLike) => void): void;
  step(delta?: number): void;
  setGravity(x: number, y: number, scale?: number): void;
}
interface MatterFactoryLike {
  circle(x: number, y: number, radius: number, options: Record<string, unknown>): MatterBodyLike;
  rectangle(x: number, y: number, width: number, height: number, options: Record<string, unknown>): MatterBodyLike;
  fromVertices(x: number, y: number, vertices: Vector2[][], options: Record<string, unknown>, flagInternal?: boolean): MatterBodyLike;
  gameObject(gameObject: object, body: MatterBodyLike, addToWorld?: boolean): MatterGameObjectLike;
}
interface MatterRectangleVisualLike {
  setStrokeStyle(lineWidth: number, color: number, alpha?: number): MatterRectangleVisualLike;
  setDepth(depth: number): MatterRectangleVisualLike;
}
interface MatterCircleVisualLike {
  setStrokeStyle(lineWidth: number, color: number, alpha?: number): MatterCircleVisualLike;
  setDepth(depth: number): MatterCircleVisualLike;
}
interface MatterTextLike {
  setOrigin(x: number, y?: number): MatterTextLike;
  setDepth(depth: number): MatterTextLike;
  setPosition(x: number, y: number): MatterTextLike;
  setRotation(value: number): MatterTextLike;
  destroy(): void;
}
interface MatterSceneLike {
  add: {
    zone(x: number, y: number, width: number, height: number): object;
    circle(x: number, y: number, radius: number, fillColor: number, fillAlpha?: number): MatterCircleVisualLike;
    rectangle(x: number, y: number, width: number, height: number, fillColor: number, fillAlpha?: number): MatterRectangleVisualLike;
    text(x: number, y: number, text: string, style: Record<string, unknown>): MatterTextLike;
  };
  matter: { world: MatterWorldLike; add: MatterFactoryLike };
}

interface BotRecord {
  object: MatterGameObjectLike;
  eyes: MatterTextLike;
  mouth: MatterTextLike;
  radius: number;
  mass: number;
  speed: number;
  direction: -1 | 1;
  killPlaneY: number;
  patrolMinX?: number;
  patrolMaxX?: number;
  recoverySteps: number;
  turnCooldownSteps: number;
}

interface MovableBlockRecord {
  object: MatterGameObjectLike;
  marker: MatterTextLike;
  mass: number;
  minimumImpactEnergy: number;
  restitution: number;
  killPlaneY: number;
  activated: boolean;
}

export class MatterPhysicsWorld implements IPhysicsWorld {
  private readonly metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>();
  private readonly mapper = new MatterCollisionMapper(this.metadata);
  private readonly levelObjects: MatterGameObjectLike[] = [];
  private ballObject: MatterGameObjectLike | null = null;
  private readonly listeners = new Set<(event: PhysicsEvent) => void>();
  private readonly activeTriggers = new Set<string>();
  private readonly movableBlocks = new Map<string, MovableBlockRecord>();
  private readonly bots = new Map<string, BotRecord>();
  private readonly collisionStart = (event: CollisionEventLike) => this.handleCollision(event, 'start');
  private readonly collisionActive = (event: CollisionEventLike) => this.handleCollision(event, 'active');
  private readonly collisionEnd = (event: CollisionEventLike) => this.handleCollision(event, 'end');
  private readonly world: MatterWorldLike;
  private readonly factory: MatterFactoryLike;
  private preStepBallVelocity: Vector2 | null = null;

  constructor(private readonly scene: object) {
    const matter = (scene as unknown as MatterSceneLike).matter;
    this.world = matter.world;
    this.factory = matter.add;
    this.world.autoUpdate = false;
    this.world.on('collisionstart', this.collisionStart);
    this.world.on('collisionactive', this.collisionActive);
    this.world.on('collisionend', this.collisionEnd);
  }

  step(fixedStepMs: number): void {
    this.updateBotsBeforeStep();
    const velocity = this.ballObject?.body.velocity;
    this.preStepBallVelocity = velocity ? PhysicsAdapter.fromMatterVelocity(velocity) : null;
    try {
      this.world.step(fixedStepMs);
    } finally {
      this.preStepBallVelocity = null;
    }
    this.updateMovableBlocks();
    this.updateBotsAfterStep();
  }
  setGravity(x: number, y: number, scale: number): void { this.world.setGravity(x, y, scale); }
  setTimeScale(value: number): void { this.world.engine.timing.timeScale = Math.max(0, value); }

  createBall(position: Vector2, options: BallPhysicsOptions): MatterPhysicsBody {
    if (this.ballObject) {
      this.metadata.delete(this.ballObject.body);
      this.ballObject.destroy();
    }
    const rawBody = this.factory.circle(position.x, position.y, options.radiusPx, {
      label: 'BALL', isStatic: false, restitution: options.restitution,
      friction: options.friction, frictionStatic: options.frictionStatic, frictionAir: options.frictionAir,
      mass: options.mass, inertia: options.fixedRotation ? Infinity : undefined,
      collisionFilter: { category: COLLISION_CATEGORIES.BALL, mask: COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.TRIGGER | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT },
    });
    rawBody.label = 'BALL';
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(position.x, position.y, 1, 1), rawBody, true);
    object.body.label = 'BALL';
    this.ballObject = object;
    this.metadata.set(object.body, { kind: 'ball', id: 'ball', mass: options.mass });
    return new MatterPhysicsBody(object, () => {
      this.metadata.delete(object.body);
      if (this.ballObject === object) this.ballObject = null;
    });
  }

  createStaticBox(definition: StaticBoxOptions): void {
    const rawBody = this.factory.rectangle(
      definition.x + definition.width / 2,
      definition.y + definition.height / 2,
      definition.width,
      definition.height,
      {
        label: definition.id, isStatic: true,
        friction: definition.friction, frictionStatic: definition.frictionStatic, restitution: definition.restitution,
        collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT },
      },
    );
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(definition.x + definition.width / 2, definition.y + definition.height / 2, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'terrain', id: definition.id, breakable: definition.breakable, springSurfaces: definition.springSurfaces, patrolGeometry: { type: 'box', x: definition.x, y: definition.y, width: definition.width, height: definition.height } });
  }

  createStaticPolygon(definition: StaticPolygonOptions): void {
    // Matter re-centres fromVertices geometry around its centre of mass. Passing
    // the bounding-box centre here shifts asymmetric ramps away from the visible
    // polygon. Use the true polygon centroid as body.position instead.
    const center = polygonCentroid(definition.vertices);
    const local = definition.vertices.map((point) => ({
      x: point.x - center.x,
      y: point.y - center.y,
    }));
    const rawBody = this.factory.fromVertices(center.x, center.y, [local], {
      label: definition.id, isStatic: true,
      friction: definition.friction, frictionStatic: definition.frictionStatic, restitution: definition.restitution,
      collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT },
    }, true);
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(center.x, center.y, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'terrain', id: definition.id, breakable: definition.breakable, springSurfaces: definition.springSurfaces, patrolGeometry: { type: 'polygon', vertices: definition.vertices.map((point) => ({ ...point })) } });
  }

  createMovableBox(definition: MovableBoxOptions): void {
    const centerX = definition.x + definition.width / 2;
    const centerY = definition.y + definition.height / 2;
    const rawBody = this.factory.rectangle(centerX, centerY, definition.width, definition.height, {
      label: `MOVABLE:${definition.id}`,
      isStatic: false,
      mass: definition.mass,
      friction: definition.friction,
      frictionStatic: definition.frictionStatic,
      frictionAir: 0.015,
      restitution: definition.restitution,
      collisionFilter: {
        category: COLLISION_CATEGORIES.MOVABLE,
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT,
      },
    });
    rawBody.label = `MOVABLE:${definition.id}`;

    // The object is rendered as a distinct teal crate with an amber outline.
    // Its ↔ marker is updated from the Matter body so it follows translation
    // and rotation while the object moves or falls into a pit.
    const visual = (this.scene as unknown as MatterSceneLike).add
      .rectangle(centerX, centerY, definition.width, definition.height, 0x397f8d, 0.98)
      .setStrokeStyle(3, 0xf0c66d, 1)
      .setDepth(4);
    const object = this.factory.gameObject(visual, rawBody, true);
    object.body.label = `MOVABLE:${definition.id}`;
    // Keep the crate in place until a sufficiently energetic side impact.
    object.setStatic(true);
    const marker = (this.scene as unknown as MatterSceneLike).add
      .text(centerX, centerY, '↔', {
        fontFamily: 'Arial, sans-serif', fontSize: '24px', color: '#f4fbff',
        fontStyle: 'bold', stroke: '#1b3540', strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(5);

    this.registerLevelObject(object, {
      kind: 'movable',
      id: definition.id,
      mass: definition.mass,
      minimumImpactEnergy: definition.minimumImpactEnergy,
      patrolGeometry: { type: 'box', x: definition.x, y: definition.y, width: definition.width, height: definition.height },
    });
    this.movableBlocks.set(definition.id, {
      object,
      marker,
      mass: definition.mass,
      minimumImpactEnergy: definition.minimumImpactEnergy,
      restitution: definition.restitution,
      killPlaneY: definition.killPlaneY,
      activated: false,
    });
  }

  createBot(definition: BotPhysicsOptions): void {
    const rawBody = this.factory.circle(definition.x, definition.y, definition.radius, {
      label: `BOT:${definition.id}`,
      isStatic: false,
      mass: definition.mass,
      friction: definition.friction,
      frictionStatic: definition.friction,
      frictionAir: 0.002,
      restitution: definition.restitution,
      collisionFilter: {
        category: COLLISION_CATEGORIES.BOT,
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT,
      },
    });
    rawBody.label = `BOT:${definition.id}`;
    const scene = this.scene as unknown as MatterSceneLike;
    const visual = scene.add.circle(definition.x, definition.y, definition.radius, 0xd65d86, 0.98)
      .setStrokeStyle(3, 0xffc5d7, 1)
      .setDepth(6);
    const object = this.factory.gameObject(visual, rawBody, true);
    object.body.label = `BOT:${definition.id}`;
    const eyes = scene.add.text(definition.x, definition.y - 2, '••', {
      fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(11, definition.radius * 0.72)}px`,
      color: '#fff8fb', fontStyle: 'bold', stroke: '#6d2543', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(7);
    const mouth = scene.add.text(definition.x, definition.y + definition.radius * 0.32, '⌣', {
      fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(10, definition.radius * 0.62)}px`,
      color: '#fff8fb', fontStyle: 'bold', stroke: '#6d2543', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(7);

    this.registerLevelObject(object, { kind: 'bot', id: definition.id, mass: definition.mass });
    this.bots.set(definition.id, {
      object, eyes, mouth,
      radius: definition.radius,
      mass: definition.mass,
      speed: definition.speed,
      direction: definition.direction,
      killPlaneY: definition.killPlaneY,
      patrolMinX: definition.patrolMinX,
      patrolMaxX: definition.patrolMaxX,
      recoverySteps: 0,
      turnCooldownSteps: 0,
    });
  }

  createSensor(definition: SensorOptions): void {
    const rawBody = this.factory.rectangle(
      definition.x + definition.width / 2,
      definition.y + definition.height / 2,
      definition.width,
      definition.height,
      {
        label: definition.id, isStatic: true, isSensor: true,
        collisionFilter: { category: COLLISION_CATEGORIES.TRIGGER, mask: COLLISION_CATEGORIES.BALL },
      },
    );
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(definition.x + definition.width / 2, definition.y + definition.height / 2, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'trigger', id: definition.id, triggerType: definition.type });
  }

  removeTerrainBody(id: string): void {
    const index = this.levelObjects.findIndex((object) => {
      const meta = this.metadata.get(object.body);
      return (meta?.kind === 'terrain' || meta?.kind === 'movable') && meta.id === id;
    });
    if (index < 0) return;
    const [object] = this.levelObjects.splice(index, 1);
    this.metadata.delete(object.body);
    this.movableBlocks.get(id)?.marker.destroy();
    this.movableBlocks.delete(id);
    object.destroy();
  }

  removeLevelBodies(): void {
    for (const object of this.levelObjects) {
      this.metadata.delete(object.body);
      object.destroy();
    }
    for (const block of this.movableBlocks.values()) block.marker.destroy();
    this.movableBlocks.clear();
    for (const bot of this.bots.values()) { bot.eyes.destroy(); bot.mouth.destroy(); }
    this.bots.clear();
    this.levelObjects.length = 0;
    this.activeTriggers.clear();
  }

  onPhysicsEvent(listener: (event: PhysicsEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  dispose(): void {
    this.removeLevelBodies();
    if (this.ballObject) {
      this.metadata.delete(this.ballObject.body);
      this.ballObject.destroy();
      this.ballObject = null;
    }
    this.world.off('collisionstart', this.collisionStart);
    this.world.off('collisionactive', this.collisionActive);
    this.world.off('collisionend', this.collisionEnd);
    this.listeners.clear();
  }

  private registerLevelObject(object: MatterGameObjectLike, meta: PhysicsBodyMetadata): void {
    this.levelObjects.push(object);
    this.metadata.set(object.body, meta);
  }

  private handleCollision(event: CollisionEventLike, phase: 'start' | 'active' | 'end'): void {
    for (const pair of event.pairs ?? []) {
      this.handleBotCollision(pair, phase);
      const mapped = this.mapper.mapPair(pair, phase, this.preStepBallVelocity);
      for (const item of mapped) {
        if (item.type === 'BALL_MOVABLE_IMPACT') {
          this.activateMovableBlock(item);
          continue;
        }
        if (item.type === 'BALL_ENTERED_TRIGGER') {
          if (this.activeTriggers.has(item.triggerId)) continue;
          this.activeTriggers.add(item.triggerId);
        } else if (item.type === 'BALL_EXITED_TRIGGER') {
          this.activeTriggers.delete(item.triggerId);
        }
        for (const listener of this.listeners) listener(item);
      }
    }
  }

  private activateMovableBlock(impact: Extract<PhysicsEvent, { type: 'BALL_MOVABLE_IMPACT' }>): void {
    const block = this.movableBlocks.get(impact.movableId);
    if (!block || block.activated || impact.impactEnergy < block.minimumImpactEnergy) return;
    block.activated = true;
    const blockMeta = [...this.metadata.entries()].find(([, meta]) => meta.kind === 'movable' && meta.id === impact.movableId)?.[1];
    if (blockMeta) blockMeta.dynamic = true;

    const result = calculateMovableBlockImpact({
      normal: impact.normal,
      incomingVelocity: impact.incomingVelocity,
      ballMass: impact.ballMass,
      blockMass: block.mass,
      restitution: block.restitution,
    });
    const blockMatterVelocity = PhysicsAdapter.toMatterVelocity(result.blockVelocity);
    const ballMatterVelocity = PhysicsAdapter.toMatterVelocity(result.ballVelocity);

    // Phaser dispatches collision events after the Matter engine update. The
    // first collision was therefore resolved against the still-static crate;
    // explicitly release it and apply the two-body impact result for the next
    // fixed step instead of waiting for a second collision to move it.
    block.object.setStatic(false);
    block.object.setVelocity(blockMatterVelocity.x, blockMatterVelocity.y);
    block.object.setAwake();

    if (this.ballObject) {
      this.ballObject.setVelocity(ballMatterVelocity.x, ballMatterVelocity.y);
      this.ballObject.setAwake();
    }
  }

  private handleBotCollision(pair: CollisionEventLike['pairs'][number], phase: 'start' | 'active' | 'end'): void {
    if (phase !== 'start') return;
    const bodyA = pair.bodyA.parent && pair.bodyA.parent !== pair.bodyA ? pair.bodyA.parent : pair.bodyA;
    const bodyB = pair.bodyB.parent && pair.bodyB.parent !== pair.bodyB ? pair.bodyB.parent : pair.bodyB;
    const metaA = this.metadata.get(bodyA);
    const metaB = this.metadata.get(bodyB);
    if (!metaA || !metaB) return;

    const botA = metaA.kind === 'bot' ? this.bots.get(metaA.id) : undefined;
    const botB = metaB.kind === 'bot' ? this.bots.get(metaB.id) : undefined;
    if (botA && botB) {
      const normalLength = Math.hypot(pair.collision.normal.x, pair.collision.normal.y) || 1;
      if (Math.abs(pair.collision.normal.x / normalLength) < 0.55) return;

      // Resolve head-on bot contacts deterministically by their world positions.
      // Blindly toggling both directions can leave them facing the same way
      // after an asymmetric solver correction and pressed together at an edge.
      const aX = botA.object.body.position.x;
      const bX = botB.object.body.position.x;
      const [leftBot, rightBot] = aX < bX || (aX === bX && metaA.id < metaB.id)
        ? [botA, botB]
        : [botB, botA];

      leftBot.direction = -1;
      rightBot.direction = 1;
      leftBot.recoverySteps = 0;
      rightBot.recoverySteps = 0;
      leftBot.turnCooldownSteps = 12;
      rightBot.turnCooldownSteps = 12;

      // Separate any residual overlap horizontally so the next fixed step can
      // move the bots apart instead of letting Matter keep them in a jammed pair.
      const minimumDistance = leftBot.radius + rightBot.radius + 1.5;
      const leftX = leftBot.object.body.position.x;
      const rightX = rightBot.object.body.position.x;
      const currentDistance = rightX - leftX;
      if (currentDistance < minimumDistance) {
        const correction = (minimumDistance - currentDistance) / 2;
        leftBot.object.setPosition(leftX - correction, leftBot.object.body.position.y);
        rightBot.object.setPosition(rightX + correction, rightBot.object.body.position.y);
      }

      // The AI takes over immediately and sends the left bot left and the
      // right bot right. Preserve any vertical velocity from the collision.
      const leftVertical = PhysicsAdapter.fromMatterVelocity(leftBot.object.body.velocity).y;
      const rightVertical = PhysicsAdapter.fromMatterVelocity(rightBot.object.body.velocity).y;
      const leftVelocity = PhysicsAdapter.toMatterVelocity({ x: -leftBot.speed, y: leftVertical });
      const rightVelocity = PhysicsAdapter.toMatterVelocity({ x: rightBot.speed, y: rightVertical });
      leftBot.object.setVelocity(leftVelocity.x, leftVelocity.y);
      leftBot.object.setAwake();
      rightBot.object.setVelocity(rightVelocity.x, rightVelocity.y);
      rightBot.object.setAwake();
      return;
    }

    const bot = botA ?? botB;
    const botBody = botA ? bodyA : bodyB;
    const otherMeta = botA ? metaB : metaA;
    const otherBody = botA ? bodyB : bodyA;
    if (!bot) return;

    if (otherMeta.kind === 'ball') {
      // Preserve the physical separation velocity briefly, then resume patrol
      // in the direction the collision pushed the bot.
      bot.direction = directionFromVelocity(botBody.velocity.x, bot.direction);
      bot.recoverySteps = 14;
      bot.turnCooldownSteps = 8;
      return;
    }

    if (otherMeta.kind !== 'terrain' && otherMeta.kind !== 'movable') return;
    const sign = botA ? 1 : -1;
    const length = Math.hypot(pair.collision.normal.x, pair.collision.normal.y) || 1;
    let normalX = sign * pair.collision.normal.x / length;
    let normalY = sign * pair.collision.normal.y / length;
    const deltaX = botBody.position.x - otherBody.position.x;
    const deltaY = botBody.position.y - otherBody.position.y;
    if (normalX * deltaX + normalY * deltaY < 0) {
      normalX *= -1;
      normalY *= -1;
    }
    const velocity = PhysicsAdapter.fromMatterVelocity(botBody.velocity);
    const closingSpeed = velocity.x * normalX + velocity.y * normalY;
    if (Math.abs(normalX) >= 0.68 && closingSpeed < -2) {
      bot.direction = bot.direction === 1 ? -1 : 1;
      bot.recoverySteps = 5;
      bot.turnCooldownSteps = 8;
    }
  }

  private updateBotsBeforeStep(): void {
    for (const bot of this.bots.values()) {
      const body = bot.object.body;
      if (body.position.y > bot.killPlaneY) continue;
      if (bot.turnCooldownSteps > 0) bot.turnCooldownSteps -= 1;
      if (bot.recoverySteps > 0) {
        bot.recoverySteps -= 1;
        continue;
      }

      const currentX = body.position.x;
      const currentY = body.position.y;
      const patrolGeometries = [...this.metadata.entries()]
        .filter(([, meta]) => (meta.kind === 'terrain' || meta.kind === 'movable') && !meta.dynamic && meta.patrolGeometry)
        .map(([, meta]) => meta.patrolGeometry as PatrolGeometry);

      const reachedConfiguredBound = (bot.direction > 0 && bot.patrolMaxX !== undefined && currentX >= bot.patrolMaxX)
        || (bot.direction < 0 && bot.patrolMinX !== undefined && currentX <= bot.patrolMinX);
      const hitObstacle = hasPatrolObstacleAhead(currentX, currentY, bot.direction, bot.radius, patrolGeometries);
      const reachedEdge = hasPatrolEdgeAhead(
        currentX,
        currentY + bot.radius,
        bot.radius,
        bot.direction,
        patrolGeometries,
      );
      // Cooldown suppresses repeated wall detection while a collision pair
      // settles, but does not suppress configured bounds or a real platform
      // edge. Otherwise a bot pushed to the edge can remain paused there.
      if (reachedConfiguredBound || reachedEdge || (bot.turnCooldownSteps === 0 && hitObstacle)) {
        bot.direction = bot.direction === 1 ? -1 : 1;
        bot.turnCooldownSteps = 9;
      }

      const currentVelocity = PhysicsAdapter.fromMatterVelocity(body.velocity);
      const velocity = PhysicsAdapter.toMatterVelocity({ x: bot.direction * bot.speed, y: currentVelocity.y });
      bot.object.setVelocity(velocity.x, velocity.y);
      bot.object.setAwake();
    }
  }

  private updateBotsAfterStep(): void {
    for (const [id, bot] of [...this.bots.entries()]) {
      const position = bot.object.body.position;
      if (position.y > bot.killPlaneY) {
        this.removeBot(id);
        continue;
      }
      const angle = bot.object.body.angle;
      bot.eyes.setPosition(position.x, position.y - bot.radius * 0.12).setRotation(angle);
      bot.mouth.setPosition(position.x, position.y + bot.radius * 0.34).setRotation(angle);
    }
  }

  private removeBot(id: string): void {
    const bot = this.bots.get(id);
    if (!bot) return;
    this.bots.delete(id);
    const entry = this.levelObjects.findIndex((object) => object.body === bot.object.body);
    if (entry >= 0) this.levelObjects.splice(entry, 1);
    this.metadata.delete(bot.object.body);
    bot.eyes.destroy();
    bot.mouth.destroy();
    bot.object.destroy();
  }

  private updateMovableBlocks(): void {
    for (const [id, block] of [...this.movableBlocks.entries()]) {
      const position = block.object.body.position;
      if (position.y > block.killPlaneY) {
        this.removeTerrainBody(id);
        continue;
      }
      block.marker.setPosition(position.x, position.y).setRotation(block.object.body.angle);
    }
  }
}
