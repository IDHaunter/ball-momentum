import { COLLISION_CATEGORIES } from './CollisionCategories';
import type { IPhysicsWorld } from './IPhysicsWorld';
import { MatterCollisionMapper, type CollisionEventLike, type PhysicsBodyMetadata } from './MatterCollisionMapper';
import { MatterPhysicsBody, type MatterBodyLike, type MatterGameObjectLike } from './MatterPhysicsBody';
import type { BallPhysicsOptions, MovableBoxOptions, PhysicsEvent, SensorOptions, StaticBoxOptions, StaticPolygonOptions, Vector2 } from './PhysicsTypes';
import { polygonCentroid } from '../utils/GeometryUtils';
import { PhysicsAdapter } from './PhysicsAdapter';
import { calculateMovableBlockImpact } from './MovableBlockImpact';

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
    rectangle(x: number, y: number, width: number, height: number, fillColor: number, fillAlpha?: number): MatterRectangleVisualLike;
    text(x: number, y: number, text: string, style: Record<string, unknown>): MatterTextLike;
  };
  matter: { world: MatterWorldLike; add: MatterFactoryLike };
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
    const velocity = this.ballObject?.body.velocity;
    this.preStepBallVelocity = velocity ? PhysicsAdapter.fromMatterVelocity(velocity) : null;
    try {
      this.world.step(fixedStepMs);
    } finally {
      this.preStepBallVelocity = null;
    }
    this.updateMovableBlocks();
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
      collisionFilter: { category: COLLISION_CATEGORIES.BALL, mask: COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.TRIGGER | COLLISION_CATEGORIES.MOVABLE },
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
        collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.MOVABLE },
      },
    );
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(definition.x + definition.width / 2, definition.y + definition.height / 2, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'terrain', id: definition.id, breakable: definition.breakable, springSurfaces: definition.springSurfaces });
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
      collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.MOVABLE },
    }, true);
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(center.x, center.y, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'terrain', id: definition.id, breakable: definition.breakable, springSurfaces: definition.springSurfaces });
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
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE,
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
