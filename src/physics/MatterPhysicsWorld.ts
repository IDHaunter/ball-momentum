import type Phaser from 'phaser';
import { COLLISION_CATEGORIES } from './CollisionCategories';
import type { IPhysicsWorld } from './IPhysicsWorld';
import { MatterCollisionMapper, type CollisionEventLike, type PhysicsBodyMetadata } from './MatterCollisionMapper';
import { MatterPhysicsBody, type MatterBodyLike, type MatterGameObjectLike } from './MatterPhysicsBody';
import type { BallPhysicsOptions, PhysicsEvent, SensorOptions, StaticBoxOptions, StaticPolygonOptions, Vector2 } from './PhysicsTypes';
import { polygonCentroid } from '../utils/GeometryUtils';

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
interface MatterSceneLike {
  add: { zone(x: number, y: number, width: number, height: number): object };
  matter: { world: MatterWorldLike; add: MatterFactoryLike };
}

export class MatterPhysicsWorld implements IPhysicsWorld {
  private readonly metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>();
  private readonly mapper = new MatterCollisionMapper(this.metadata);
  private readonly levelObjects: MatterGameObjectLike[] = [];
  private ballObject: MatterGameObjectLike | null = null;
  private readonly listeners = new Set<(event: PhysicsEvent) => void>();
  private readonly activeTriggers = new Set<string>();
  private readonly collisionStart = (event: CollisionEventLike) => this.handleCollision(event, 'start');
  private readonly collisionActive = (event: CollisionEventLike) => this.handleCollision(event, 'active');
  private readonly collisionEnd = (event: CollisionEventLike) => this.handleCollision(event, 'end');
  private readonly world: MatterWorldLike;
  private readonly factory: MatterFactoryLike;

  constructor(private readonly scene: Phaser.Scene) {
    const matter = (scene as unknown as MatterSceneLike).matter;
    this.world = matter.world;
    this.factory = matter.add;
    this.world.autoUpdate = false;
    this.world.on('collisionstart', this.collisionStart);
    this.world.on('collisionactive', this.collisionActive);
    this.world.on('collisionend', this.collisionEnd);
  }

  step(fixedStepMs: number): void { this.world.step(fixedStepMs); }
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
      collisionFilter: { category: COLLISION_CATEGORIES.BALL, mask: COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.TRIGGER },
    });
    rawBody.label = 'BALL';
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(position.x, position.y, 1, 1), rawBody, true);
    object.body.label = 'BALL';
    this.ballObject = object;
    this.metadata.set(object.body, { kind: 'ball', id: 'ball' });
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
        collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL },
      },
    );
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(definition.x + definition.width / 2, definition.y + definition.height / 2, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'terrain', id: definition.id });
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
      collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL },
    }, true);
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(center.x, center.y, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'terrain', id: definition.id });
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

  removeLevelBodies(): void {
    for (const object of this.levelObjects) {
      this.metadata.delete(object.body);
      object.destroy();
    }
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
      const mapped = this.mapper.mapPair(pair, phase);
      for (const item of mapped) {
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
}
