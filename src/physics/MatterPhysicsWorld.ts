import { COLLISION_CATEGORIES } from './CollisionCategories';
import type { IPhysicsWorld } from './IPhysicsWorld';
import { MatterCollisionMapper, type CollisionEventLike, type PhysicsBodyMetadata } from './MatterCollisionMapper';
import { MatterPhysicsBody, type MatterBodyLike, type MatterGameObjectLike } from './MatterPhysicsBody';
import type { BallPhysicsOptions, BombPhysicsOptions, BotPhysicsOptions, MovableBoxOptions, PatrolGeometry, PhysicsEvent, SensorOptions, StaticBoxOptions, StaticPolygonOptions, Vector2 } from './PhysicsTypes';
import { polygonCentroid } from '../utils/GeometryUtils';
import { PhysicsAdapter } from './PhysicsAdapter';
import { calculateMovableBlockImpact } from './MovableBlockImpact';
import { directionFromVelocity, hasPatrolEdgeAhead, hasPatrolObstacleAhead } from './BotPatrol';
import { calculateBlastEnergy, calculateBlastVelocityDelta, distanceToPatrolGeometry } from './BombExplosion';

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
  setPosition(x: number, y: number): MatterRectangleVisualLike;
  setRotation(value: number): MatterRectangleVisualLike;
  setScale(x: number, y?: number): MatterRectangleVisualLike;
  setAlpha(value: number): MatterRectangleVisualLike;
  setVisible(value: boolean): MatterRectangleVisualLike;
  destroy(): void;
}
interface MatterCircleVisualLike {
  setStrokeStyle(lineWidth: number, color: number, alpha?: number): MatterCircleVisualLike;
  setDepth(depth: number): MatterCircleVisualLike;
  setPosition(x: number, y: number): MatterCircleVisualLike;
  setRotation(value: number): MatterCircleVisualLike;
  setScale(x: number, y?: number): MatterCircleVisualLike;
  setAlpha(value: number): MatterCircleVisualLike;
  setVisible(value: boolean): MatterCircleVisualLike;
  destroy(): void;
}
interface MatterTextLike {
  setOrigin(x: number, y?: number): MatterTextLike;
  setDepth(depth: number): MatterTextLike;
  setPosition(x: number, y: number): MatterTextLike;
  setRotation(value: number): MatterTextLike;
  setScale(x: number, y?: number): MatterTextLike;
  setAlpha(value: number): MatterTextLike;
  setText(value: string): MatterTextLike;
  setColor(value: string): MatterTextLike;
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

interface BombEyeVisual {
  sclera: MatterCircleVisualLike;
  pupil: MatterCircleVisualLike;
  brow: MatterRectangleVisualLike;
  localX: number;
  phase: number;
}

interface BombRecord {
  object: MatterGameObjectLike;
  countdown: MatterTextLike;
  shellHighlight: MatterCircleVisualLike;
  shellGlint: MatterCircleVisualLike;
  leftEye: BombEyeVisual;
  rightEye: BombEyeVisual;
  mouth: MatterCircleVisualLike;
  fuseCord: MatterRectangleVisualLike;
  ember: MatterCircleVisualLike;
  fuseGlow: MatterCircleVisualLike;
  flameOuter: MatterCircleVisualLike;
  flameInner: MatterCircleVisualLike;
  flameCore: MatterCircleVisualLike;
  radius: number;
  mass: number;
  fuseMs: number;
  remainingMs: number;
  visualElapsedMs: number;
  zeroDisplayMs: number | null;
  displayedNumber: number;
  explosionRadius: number;
  explosionEnergy: number;
  killPlaneY: number;
  activated: boolean;
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
  private readonly bombs = new Map<string, BombRecord>();
  private readonly collisionStart = (event: CollisionEventLike) => this.handleCollision(event, 'start');
  private readonly collisionActive = (event: CollisionEventLike) => this.handleCollision(event, 'active');
  private readonly collisionEnd = (event: CollisionEventLike) => this.handleCollision(event, 'end');
  private readonly world: MatterWorldLike;
  private readonly factory: MatterFactoryLike;
  private preStepBallVelocity: Vector2 | null = null;
  private readonly preStepVelocities = new Map<MatterBodyLike, Vector2>();

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
    this.preStepVelocities.clear();
    for (const [body, meta] of this.metadata.entries()) {
      if (meta.kind === 'ball' || meta.kind === 'bot' || meta.kind === 'movable' || meta.kind === 'bomb') {
        this.preStepVelocities.set(body, PhysicsAdapter.fromMatterVelocity(body.velocity));
      }
    }
    const velocity = this.ballObject?.body.velocity;
    this.preStepBallVelocity = velocity ? PhysicsAdapter.fromMatterVelocity(velocity) : null;
    try {
      this.world.step(fixedStepMs);
    } finally {
      this.preStepBallVelocity = null;
      this.preStepVelocities.clear();
    }
    this.updateMovableBlocks();
    this.updateBotsAfterStep();
    this.updateBombs(fixedStepMs);
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
      collisionFilter: { category: COLLISION_CATEGORIES.BALL, mask: COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.TRIGGER | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB },
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
        collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB },
      },
    );
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(definition.x + definition.width / 2, definition.y + definition.height / 2, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'terrain', id: definition.id, breakable: definition.breakable, breakableThresholdEnergy: definition.breakableThresholdEnergy, springSurfaces: definition.springSurfaces, patrolGeometry: { type: 'box', x: definition.x, y: definition.y, width: definition.width, height: definition.height } });
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
      collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB },
    }, true);
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(center.x, center.y, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'terrain', id: definition.id, breakable: definition.breakable, breakableThresholdEnergy: definition.breakableThresholdEnergy, springSurfaces: definition.springSurfaces, patrolGeometry: { type: 'polygon', vertices: definition.vertices.map((point) => ({ ...point })) } });
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
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB,
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
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB,
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

  createBomb(definition: BombPhysicsOptions): void {
    const rawBody = this.factory.circle(definition.x, definition.y, definition.radius, {
      label: `BOMB:${definition.id}`,
      isStatic: false,
      mass: definition.mass,
      friction: definition.friction,
      frictionStatic: definition.friction,
      frictionAir: 0.012,
      restitution: definition.restitution,
      collisionFilter: {
        category: COLLISION_CATEGORIES.BOMB,
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE,
      },
    });
    rawBody.label = `BOMB:${definition.id}`;
    const scene = this.scene as unknown as MatterSceneLike;
    const radius = definition.radius;
    const visual = scene.add.circle(definition.x, definition.y, radius, 0x15171d, 1)
      .setStrokeStyle(Math.max(1.6, radius * 0.105), 0x707984, 1)
      .setDepth(7);
    const object = this.factory.gameObject(visual, rawBody, true);
    object.body.label = `BOMB:${definition.id}`;
    object.setStatic(true);

    // Separate world-space details follow the body's transform. This keeps the
    // physical circle untouched while giving the bomb a readable metal shell,
    // animated face, and a layered flame that is lit only after activation.
    const shellHighlight = scene.add.circle(definition.x, definition.y, radius * 0.34, 0xb8c4d2, 0.16)
      .setScale(1.3, 0.52).setDepth(8);
    const shellGlint = scene.add.circle(definition.x, definition.y, radius * 0.075, 0xf3f7fb, 0.78)
      .setDepth(9);

    const createEye = (localX: number, phase: number): BombEyeVisual => {
      const eyeY = -radius * 0.16;
      const sclera = scene.add.circle(definition.x + localX, definition.y + eyeY, radius * 0.16, 0xf7f8fa, 1)
        .setStrokeStyle(Math.max(0.5, radius * 0.025), 0x5c626d, 0.95).setDepth(9);
      const pupil = scene.add.circle(definition.x + localX, definition.y + eyeY, radius * 0.078, 0x11151d, 1)
        .setDepth(10);
      const brow = scene.add.rectangle(
        definition.x + localX,
        definition.y - radius * 0.37,
        radius * 0.27,
        Math.max(1, radius * 0.055),
        0x090b10,
        1,
      ).setDepth(10);
      return { sclera, pupil, brow, localX, phase };
    };
    const leftEye = createEye(-radius * 0.28, 0.3);
    const rightEye = createEye(radius * 0.28, 2.1);
    const mouth = scene.add.circle(definition.x, definition.y + radius * 0.1, radius * 0.095, 0x080a10, 1)
      .setScale(1.3, 0.42).setDepth(9);

    const fuseCord = scene.add.rectangle(
      definition.x - radius * 0.22,
      definition.y - radius * 0.91,
      Math.max(2, radius * 0.13),
      radius * 0.42,
      0x79523a,
      1,
    ).setStrokeStyle(Math.max(0.5, radius * 0.025), 0x38271f, 1).setDepth(8);
    const ember = scene.add.circle(definition.x - radius * 0.3, definition.y - radius * 1.13, radius * 0.095, 0x8b4b2c, 1)
      .setDepth(10);
    const fuseGlow = scene.add.circle(definition.x - radius * 0.3, definition.y - radius * 1.2, radius * 0.43, 0xff762e, 0.22)
      .setDepth(10).setVisible(false);
    const flameOuter = scene.add.circle(definition.x - radius * 0.3, definition.y - radius * 1.2, radius * 0.27, 0xff6327, 0.98)
      .setDepth(11).setVisible(false);
    const flameInner = scene.add.circle(definition.x - radius * 0.3, definition.y - radius * 1.25, radius * 0.17, 0xffb52e, 1)
      .setDepth(12).setVisible(false);
    const flameCore = scene.add.circle(definition.x - radius * 0.3, definition.y - radius * 1.31, radius * 0.085, 0xfff0a1, 1)
      .setDepth(13).setVisible(false);

    const countdown = scene.add.text(definition.x, definition.y + radius * 0.55, String(Math.ceil(definition.fuseSeconds)), {
      fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(11, radius * 0.62)}px`,
      color: '#fff2d4', fontStyle: 'bold', stroke: '#080a10', strokeThickness: Math.max(2, radius * 0.12),
    }).setOrigin(0.5).setDepth(14);

    this.registerLevelObject(object, { kind: 'bomb', id: definition.id, mass: definition.mass });
    const bomb: BombRecord = {
      object,
      countdown,
      shellHighlight,
      shellGlint,
      leftEye,
      rightEye,
      mouth,
      fuseCord,
      ember,
      fuseGlow,
      flameOuter,
      flameInner,
      flameCore,
      radius,
      mass: definition.mass,
      fuseMs: definition.fuseSeconds * 1000,
      remainingMs: definition.fuseSeconds * 1000,
      visualElapsedMs: 0,
      zeroDisplayMs: null,
      displayedNumber: Math.ceil(definition.fuseSeconds),
      explosionRadius: definition.explosionRadius,
      explosionEnergy: definition.explosionEnergy,
      killPlaneY: definition.killPlaneY,
      activated: false,
    };
    this.bombs.set(definition.id, bomb);
    this.updateBombVisual(bomb);
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
    for (const bomb of this.bombs.values()) this.destroyBombVisuals(bomb);
    this.bombs.clear();
    this.preStepVelocities.clear();
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
      this.handleBombCollision(pair, phase);
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

  private handleBombCollision(pair: CollisionEventLike['pairs'][number], phase: 'start' | 'active' | 'end'): void {
    if (phase !== 'start') return;
    const bodyA = pair.bodyA.parent && pair.bodyA.parent !== pair.bodyA ? pair.bodyA.parent : pair.bodyA;
    const bodyB = pair.bodyB.parent && pair.bodyB.parent !== pair.bodyB ? pair.bodyB.parent : pair.bodyB;
    const metaA = this.metadata.get(bodyA);
    const metaB = this.metadata.get(bodyB);
    if (!metaA || !metaB) return;

    const bombIsA = metaA.kind === 'bomb';
    const bombMeta = bombIsA ? metaA : metaB.kind === 'bomb' ? metaB : null;
    if (!bombMeta) return;
    const sourceMeta = bombIsA ? metaB : metaA;
    if (sourceMeta.kind !== 'ball' && sourceMeta.kind !== 'bot') return;

    const bombBody = bombIsA ? bodyA : bodyB;
    const sourceBody = bombIsA ? bodyB : bodyA;
    const bomb = this.bombs.get(bombMeta.id);
    if (!bomb || bomb.activated) return;

    const deltaX = sourceBody.position.x - bombBody.position.x;
    const deltaY = sourceBody.position.y - bombBody.position.y;
    const normalLength = Math.hypot(pair.collision.normal.x, pair.collision.normal.y) || 1;
    let normal = { x: pair.collision.normal.x / normalLength, y: pair.collision.normal.y / normalLength };
    if (normal.x * deltaX + normal.y * deltaY < 0) normal = { x: -normal.x, y: -normal.y };

    const incomingVelocity = this.preStepVelocities.get(sourceBody)
      ?? PhysicsAdapter.fromMatterVelocity(sourceBody.velocity);
    const sourceMass = sourceMeta.mass ?? 1;
    const closingSpeed = -(incomingVelocity.x * normal.x + incomingVelocity.y * normal.y);
    // A new overlap must be an actual incoming hit. This prevents an already
    // separating ball/bot (or a spawn-time overlap) from lighting the fuse.
    if (closingSpeed <= 0.1) return;

    bomb.activated = true;
    bomb.remainingMs = bomb.fuseMs;
    bomb.zeroDisplayMs = null;
    bomb.displayedNumber = Math.ceil(bomb.remainingMs / 1000);
    bomb.countdown.setText(String(bomb.displayedNumber)).setColor('#fff1c5');
    this.updateBombVisual(bomb);
    bomb.object.setStatic(false);
    bomb.object.setAwake();

    // The body was static during the collision solver. Reconstruct the first
    // two-body impact from the pre-step velocity so the bomb is actually kicked
    // instead of merely starting its fuse while remaining glued in place.
    if (closingSpeed > 0.1) {
      const result = calculateMovableBlockImpact({
        normal,
        incomingVelocity,
        ballMass: sourceMass,
        blockMass: bomb.mass,
        restitution: 0.62,
      });
      bomb.object.setVelocity(
        PhysicsAdapter.toMatterVelocity(result.blockVelocity).x,
        PhysicsAdapter.toMatterVelocity(result.blockVelocity).y,
      );
      const sourceObject = sourceMeta.kind === 'ball'
        ? this.ballObject
        : this.bots.get(sourceMeta.id)?.object;
      if (sourceObject) {
        const sourceMatterVelocity = PhysicsAdapter.toMatterVelocity(result.ballVelocity);
        sourceObject.setVelocity(sourceMatterVelocity.x, sourceMatterVelocity.y);
        sourceObject.setAwake();
      }
      if (sourceMeta.kind === 'bot') {
        const bot = this.bots.get(sourceMeta.id);
        if (bot) {
          bot.direction = directionFromVelocity(result.ballVelocity.x, bot.direction);
          bot.recoverySteps = 16;
          bot.turnCooldownSteps = 8;
        }
      }
    }
  }

  private updateBombs(stepMs: number): void {
    for (const [id, bomb] of [...this.bombs.entries()]) {
      const position = bomb.object.body.position;
      if (position.y > bomb.killPlaneY) {
        this.removeBomb(id);
        continue;
      }

      bomb.visualElapsedMs += stepMs;
      this.updateBombVisual(bomb);

      if (!bomb.activated) continue;
      if (bomb.zeroDisplayMs !== null) {
        bomb.zeroDisplayMs -= stepMs;
        if (bomb.zeroDisplayMs <= 0) this.detonateBomb(id, bomb);
        continue;
      }

      bomb.remainingMs = Math.max(0, bomb.remainingMs - stepMs);
      const displayed = Math.max(0, Math.ceil(bomb.remainingMs / 1000));
      if (displayed !== bomb.displayedNumber) {
        bomb.displayedNumber = displayed;
        bomb.countdown.setText(String(displayed));
        bomb.countdown.setColor(displayed <= 1 ? '#ff725c' : '#fff1c5');
      }
      if (bomb.remainingMs <= 0) {
        bomb.countdown.setText('0').setColor('#ff5549').setScale(1.18, 1.18);
        bomb.zeroDisplayMs = 120;
      }
    }
  }

  private detonateBomb(id: string, bomb: BombRecord): void {
    const origin = { ...bomb.object.body.position };
    const breakableIds: string[] = [];

    for (const [body, meta] of [...this.metadata.entries()]) {
      if (body === bomb.object.body) continue;

      if (meta.kind === 'terrain') {
        if (!meta.breakable || !meta.breakableThresholdEnergy || !meta.patrolGeometry) continue;
        const distance = distanceToPatrolGeometry(origin, meta.patrolGeometry);
        const energy = calculateBlastEnergy(bomb.explosionEnergy, bomb.explosionRadius, distance);
        if (energy >= meta.breakableThresholdEnergy) breakableIds.push(meta.id);
        continue;
      }

      if (meta.kind !== 'ball' && meta.kind !== 'bot' && meta.kind !== 'movable') continue;
      const target = { ...body.position };
      const distance = Math.hypot(target.x - origin.x, target.y - origin.y);
      if (distance >= bomb.explosionRadius) continue;
      const energy = calculateBlastEnergy(bomb.explosionEnergy, bomb.explosionRadius, distance);
      if (energy <= 0) continue;

      if (meta.kind === 'movable') {
        const block = this.movableBlocks.get(meta.id);
        if (!block) continue;
        if (!block.activated) {
          if (energy < block.minimumImpactEnergy) continue;
          block.activated = true;
          meta.dynamic = true;
          block.object.setStatic(false);
        }
      }

      const mass = meta.mass ?? 1;
      const deltaVelocity = calculateBlastVelocityDelta(origin, target, mass, energy);
      const currentVelocity = PhysicsAdapter.fromMatterVelocity(body.velocity);
      const nextVelocity = {
        x: currentVelocity.x + deltaVelocity.x,
        y: currentVelocity.y + deltaVelocity.y,
      };
      const matterVelocity = PhysicsAdapter.toMatterVelocity(nextVelocity);

      if (meta.kind === 'ball') {
        this.ballObject?.setVelocity(matterVelocity.x, matterVelocity.y);
        this.ballObject?.setAwake();
      } else if (meta.kind === 'bot') {
        const bot = this.bots.get(meta.id);
        if (!bot) continue;
        bot.object.setVelocity(matterVelocity.x, matterVelocity.y);
        bot.object.setAwake();
        bot.direction = directionFromVelocity(nextVelocity.x, bot.direction);
        bot.recoverySteps = 36;
        bot.turnCooldownSteps = 8;
      } else {
        const block = this.movableBlocks.get(meta.id);
        if (!block) continue;
        block.object.setVelocity(matterVelocity.x, matterVelocity.y);
        block.object.setAwake();
      }
    }

    this.removeBomb(id);
    const event: PhysicsEvent = {
      type: 'BOMB_EXPLODED',
      bombId: id,
      position: origin,
      radius: bomb.explosionRadius,
      explosionEnergy: bomb.explosionEnergy,
      breakableIds,
    };
    for (const listener of this.listeners) listener(event);
  }

  private removeBomb(id: string): void {
    const bomb = this.bombs.get(id);
    if (!bomb) return;
    this.bombs.delete(id);
    const entry = this.levelObjects.findIndex((object) => object.body === bomb.object.body);
    if (entry >= 0) this.levelObjects.splice(entry, 1);
    this.metadata.delete(bomb.object.body);
    this.destroyBombVisuals(bomb);
    bomb.object.destroy();
  }

  private updateBombVisual(bomb: BombRecord): void {
    const body = bomb.object.body;
    const { x, y } = body.position;
    const angle = body.angle;
    const radius = bomb.radius;
    const time = bomb.visualElapsedMs / 1000;
    const tension = bomb.activated
      ? Math.max(0, Math.min(1, 1 - bomb.remainingMs / bomb.fuseMs))
      : 0;
    const frantic = bomb.activated ? 1 + tension * 2.8 : 0.85;
    const rotateLocal = (localX: number, localY: number): Vector2 => ({
      x: x + localX * Math.cos(angle) - localY * Math.sin(angle),
      y: y + localX * Math.sin(angle) + localY * Math.cos(angle),
    });
    const placeCircle = (visual: MatterCircleVisualLike, localX: number, localY: number): void => {
      const point = rotateLocal(localX, localY);
      visual.setPosition(point.x, point.y).setRotation(angle);
    };

    const highlight = rotateLocal(-radius * 0.28, -radius * 0.39);
    bomb.shellHighlight.setPosition(highlight.x, highlight.y).setRotation(angle)
      .setAlpha(0.13 + Math.sin(time * 1.7) * 0.025);
    const glint = rotateLocal(-radius * 0.36, -radius * 0.53);
    bomb.shellGlint.setPosition(glint.x, glint.y).setAlpha(0.62 + Math.sin(time * 2.4) * 0.12);

    const updateEye = (eye: BombEyeVisual, side: -1 | 1): void => {
      const eyeY = -radius * 0.16 + Math.sin(time * (2.1 + frantic) + eye.phase) * radius * 0.018;
      placeCircle(eye.sclera, eye.localX, eyeY);
      eye.sclera.setScale(1, 1 + tension * 0.18);
      const pupilAmplitude = radius * (0.025 + tension * 0.045);
      const pupilX = eye.localX + Math.sin(time * 4.4 * frantic + eye.phase) * pupilAmplitude;
      const pupilY = eyeY + Math.cos(time * 3.7 * frantic + eye.phase * 1.3) * pupilAmplitude * 0.62;
      placeCircle(eye.pupil, pupilX, pupilY);
      const brow = rotateLocal(eye.localX, -radius * (0.37 - tension * 0.025));
      eye.brow.setPosition(brow.x, brow.y)
        .setRotation(angle + side * (0.12 + tension * 0.28))
        .setScale(1, 1 + tension * 0.35);
    };
    updateEye(bomb.leftEye, -1);
    updateEye(bomb.rightEye, 1);

    const mouthPoint = rotateLocal(0, radius * 0.1);
    const mouthPulse = 0.5 + 0.5 * Math.sin(time * (5 + frantic * 2));
    bomb.mouth.setPosition(mouthPoint.x, mouthPoint.y).setRotation(angle)
      .setScale(1.2 + tension * 0.45, 0.42 + tension * (0.8 + mouthPulse * 0.28));

    const cord = rotateLocal(-radius * 0.22, -radius * 0.91);
    bomb.fuseCord.setPosition(cord.x, cord.y).setRotation(angle - 0.32);
    const flicker = 0.78 + Math.sin(time * 21) * 0.13 + Math.sin(time * 37 + 0.8) * 0.07;
    const flameScale = tension ? 0.92 + tension * 0.34 : 1;
    placeCircle(bomb.ember, -radius * 0.3, -radius * 1.13);
    bomb.ember.setVisible(!bomb.activated).setAlpha(0.65 + Math.sin(time * 4) * 0.08);
    placeCircle(bomb.fuseGlow, -radius * 0.3, -radius * 1.19);
    placeCircle(bomb.flameOuter, -radius * 0.3, -radius * 1.19 + Math.sin(time * 18) * radius * 0.025);
    placeCircle(bomb.flameInner, -radius * 0.3 + Math.sin(time * 23) * radius * 0.025, -radius * 1.25);
    placeCircle(bomb.flameCore, -radius * 0.3, -radius * 1.31 + Math.sin(time * 28) * radius * 0.018);
    const flameVisible = bomb.activated;
    const flameAlpha = flameVisible ? 0.85 + flicker * 0.12 : 0;
    bomb.fuseGlow.setVisible(flameVisible).setScale(0.82 + flicker * 0.28, 0.82 + flicker * 0.36)
      .setAlpha(flameVisible ? 0.14 + flicker * 0.08 : 0);
    bomb.flameOuter.setVisible(flameVisible).setScale(flicker * flameScale, flicker * 1.22 * flameScale)
      .setAlpha(flameAlpha);
    bomb.flameInner.setVisible(flameVisible).setScale((0.88 + flicker * 0.12) * flameScale, (0.98 + flicker * 0.16) * flameScale)
      .setAlpha(flameVisible ? 0.98 : 0);
    bomb.flameCore.setVisible(flameVisible).setScale(0.92 + flicker * 0.1, 1 + flicker * 0.18)
      .setAlpha(flameVisible ? 0.96 : 0);

    bomb.countdown.setPosition(x, y + radius * 0.55).setScale(
      1 + tension * 0.1 + (bomb.zeroDisplayMs !== null ? 0.12 : 0),
      1 + tension * 0.08 + (bomb.zeroDisplayMs !== null ? 0.12 : 0),
    );
  }

  private destroyBombVisuals(bomb: BombRecord): void {
    bomb.countdown.destroy();
    bomb.shellHighlight.destroy();
    bomb.shellGlint.destroy();
    for (const eye of [bomb.leftEye, bomb.rightEye]) {
      eye.sclera.destroy();
      eye.pupil.destroy();
      eye.brow.destroy();
    }
    bomb.mouth.destroy();
    bomb.fuseCord.destroy();
    bomb.ember.destroy();
    bomb.fuseGlow.destroy();
    bomb.flameOuter.destroy();
    bomb.flameInner.destroy();
    bomb.flameCore.destroy();
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
