import { COLLISION_CATEGORIES } from './CollisionCategories';
import type { IPhysicsWorld } from './IPhysicsWorld';
import { MatterCollisionMapper, type CollisionEventLike, type PhysicsBodyMetadata } from './MatterCollisionMapper';
import { MatterPhysicsBody, type MatterBodyLike, type MatterGameObjectLike } from './MatterPhysicsBody';
import type { BallPhysicsOptions, BirdPhysicsOptions, BombPhysicsOptions, BotPhysicsOptions, DemonPhysicsOptions, MovableBoxOptions, PatrolGeometry, PhysicsEvent, SensorOptions, SpikeEntityKind, SpikeSensorOptions, StaticBoxOptions, StaticPolygonOptions, Vector2, SpeedSpinBoostResult, VomitEnemyPhysicsOptions } from './PhysicsTypes';
import { polygonCentroid } from '../utils/GeometryUtils';
import { PhysicsAdapter } from './PhysicsAdapter';
import { calculateMovableBlockImpact } from './MovableBlockImpact';
import { directionFromVelocity, hasPatrolEdgeAhead, hasPatrolObstacleAhead } from './BotPatrol';
import { getBirdAttackInterceptPoint, getBirdChaseVelocity, getBirdGuardZone, getBirdTerritoryEgressDirection, isPointInsideBirdGuardZone } from './BirdPatrol';
import { calculateBlastEnergy, calculateBlastVelocityDelta, distanceToPatrolGeometry } from './BombExplosion';
import type Phaser from 'phaser';
import { createSurfaceTextureCanvas, createSurfaceTextureKey } from '../rendering/SurfaceTextureGenerator';
import { hashSurfaceTextureSeed } from '../rendering/SurfaceTextureCatalog';
import { drawBoxBorders, getBoxBorderSegments, getSpikeTriangles } from '../rendering/SurfaceBorderRenderer';
import { BirdRenderer, type BirdRendererSceneLike } from '../rendering/BirdRenderer';
import { VomitEnemyRenderer, type VomitRendererSceneLike } from '../rendering/VomitEnemyRenderer';
import { FIXED_STEP_SECONDS } from '../utils/TimeUtils';
import { BOT_GRADIENT_TEXTURE_KEY, BOT_GRADIENT_TEXTURE_SIZE, drawBotGradient } from '../rendering/BotGradient';
import { BOMB_GRADIENT_TEXTURE_KEY, BOMB_GRADIENT_TEXTURE_SIZE, drawBombGradient } from '../rendering/BombGradient';
import { DemonRenderer, type DemonRendererSceneLike, type DemonVisualPhase } from '../rendering/DemonRenderer';

const DEMON_SPAWN_RETRY_MS = 250;
const DEMON_ATTACK_RETRY_MS = 120;

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
interface MatterImageVisualLike {
  setDisplaySize(width: number, height: number): MatterImageVisualLike;
  setDepth(depth: number): MatterImageVisualLike;
  setPosition(x: number, y: number): MatterImageVisualLike;
  setRotation(value: number): MatterImageVisualLike;
  destroy(): void;
}
interface MatterCanvasTextureLike {
  getContext(): CanvasRenderingContext2D;
  refresh(): void;
}
interface MatterTextureManagerLike {
  exists(key: string): boolean;
  createCanvas(key: string, width: number, height: number): MatterCanvasTextureLike | null;
}
interface MatterTextLike {
  setOrigin(x: number, y?: number): MatterTextLike;
  setDepth(depth: number): MatterTextLike;
  setPosition(x: number, y: number): MatterTextLike;
  setRotation(value: number): MatterTextLike;
  setScale(x: number, y?: number): MatterTextLike;
  setFlipX(value: boolean): MatterTextLike;
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
    image(x: number, y: number, texture: string): MatterImageVisualLike;
  };
  textures: MatterTextureManagerLike;
  matter: { world: MatterWorldLike; add: MatterFactoryLike };
}

interface BotEyeRecord {
  sclera: MatterCircleVisualLike;
  pupil: MatterCircleVisualLike;
  highlight: MatterCircleVisualLike;
  offsetX: number;
  offsetY: number;
  pupilOffsetX: number;
  pupilOffsetY: number;
}

interface BotRecord {
  object: MatterGameObjectLike;
  shell: MatterImageVisualLike;
  eyes: BotEyeRecord[];
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

interface BirdRecord {
  object: MatterGameObjectLike;
  renderer: BirdRenderer;
  id: string;
  radius: number;
  mass: number;
  patrolSpeed: number;
  attackSpeed: number;
  aggressive: boolean;
  detectionRadius: number;
  attackImpulse: number;
  direction: -1 | 1;
  patrolMinX: number;
  patrolMaxX: number;
  patrolY: number;
  killPlaneY: number;
  recoveryMs: number;
  attackCooldownMs: number;
  attacking: boolean;
  pendingAttackImpulse: { ballBody: MatterBodyLike; direction: Vector2 } | null;
  pendingDirectionUpdate: boolean;
  turnCooldownSteps: number;
}

interface VomitEnemyRecord {
  object: MatterGameObjectLike;
  renderer: VomitEnemyRenderer;
  id: string;
  radius: number;
  mass: number;
  detectionRadius: number;
  pulseImpulse: number;
  pulseIntervalMs: number;
  pulseRemainingMs: number;
  playerInRange: boolean;
  killPlaneY: number;
}

interface DemonRecord {
  object: MatterGameObjectLike;
  renderer: DemonRenderer;
  id: string;
  radius: number;
  mass: number;
  spawnPoints: Vector2[];
  spawnPoint: Vector2;
  spawnIndex: number;
  spawnCycle: number;
  initialSpawnSelectionPending: boolean;
  phase: DemonVisualPhase;
  phaseRemainingMs: number;
  respawnIntervalMs: number;
  telegraphMs: number;
  attackDelayMs: number;
  activeMs: number;
  attackRadius: number;
  lightningImpulse: number;
  collisionImpulse: number;
  attackRemainingMs: number;
  attacked: boolean;
  disrupted: boolean;
  killPlaneY: number;
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
  shell: MatterImageVisualLike;
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

interface MovableSpikeSensorRecord { object: MatterGameObjectLike; localCenter: Vector2; }

interface MovableBlockRecord {
  object: MatterGameObjectLike;
  spikeSensors: MovableSpikeSensorRecord[];
  marker: MatterTextLike;
  textureOverlay: Phaser.GameObjects.Image | null;
  borderOverlay: Phaser.GameObjects.Graphics;
  textureKey: string | null;
  mass: number;
  minimumImpactEnergy: number;
  restitution: number;
  killPlaneY: number;
  activated: boolean;
}

function rotateBotFaceOffset(x: number, y: number, offsetX: number, offsetY: number, angle: number): Vector2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x + offsetX * cos - offsetY * sin, y: y + offsetX * sin + offsetY * cos };
}

export class MatterPhysicsWorld implements IPhysicsWorld {
  private readonly metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>();
  private readonly mapper = new MatterCollisionMapper(this.metadata);
  private readonly levelObjects: MatterGameObjectLike[] = [];
  private ballObject: MatterGameObjectLike | null = null;
  private readonly listeners = new Set<(event: PhysicsEvent) => void>();
  private readonly activeTriggers = new Set<string>();
  private readonly spikeVictims = new Set<string>();
  private readonly movableBlocks = new Map<string, MovableBlockRecord>();
  private readonly bots = new Map<string, BotRecord>();
  private readonly birds = new Map<string, BirdRecord>();
  private readonly bombs = new Map<string, BombRecord>();
  private readonly vomitEnemies = new Map<string, VomitEnemyRecord>();
  private readonly demons = new Map<string, DemonRecord>();
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
    this.updateBirdsBeforeStep(fixedStepMs);
    this.updateVomitEnemiesBeforeStep(fixedStepMs);
    this.updateDemonEnemiesBeforeStep(fixedStepMs);
    this.updateBotsBeforeStep();
    this.preStepVelocities.clear();
    for (const [body, meta] of this.metadata.entries()) {
      if (meta.kind === 'ball' || meta.kind === 'bot' || meta.kind === 'bird' || meta.kind === 'movable' || meta.kind === 'bomb' || meta.kind === 'vomitEnemy' || meta.kind === 'demon') {
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
    this.applyPendingBirdImpulses();
    this.updateMovableBlocks();
    this.updateBotsAfterStep();
    this.updateBirdsAfterStep(fixedStepMs);
    this.updateVomitEnemiesAfterStep(fixedStepMs);
    this.updateDemonEnemiesAfterStep(fixedStepMs);
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
      collisionFilter: { category: COLLISION_CATEGORIES.BALL, mask: COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.TRIGGER | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB | COLLISION_CATEGORIES.BIRD | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY },
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
        collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB | COLLISION_CATEGORIES.BIRD | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY },
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
      collisionFilter: { category: COLLISION_CATEGORIES.TERRAIN, mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB | COLLISION_CATEGORIES.BIRD | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY },
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
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY,
      },
    });
    rawBody.label = `MOVABLE:${definition.id}`;

    // Keep the crate fill, configurable edge treatment, texture and ↔ marker
    // as separate visuals so each can follow the Matter body's transform.
    const visual = (this.scene as unknown as MatterSceneLike).add
      .rectangle(centerX, centerY, definition.width, definition.height, 0x397f8d, 0.98)
      .setDepth(4);
    const phaserScene = this.scene as Phaser.Scene;
    const borderOverlay = phaserScene.add.graphics().setDepth(4.75);
    drawBoxBorders(borderOverlay, -definition.width / 2, -definition.height / 2, definition.width, definition.height, definition.borders, 0xf0c66d);
    // Phaser Graphics has a nominal origin of (0, 0), so local coordinates
    // centered around the body origin rotate around the physical box center.
    borderOverlay.setPosition(centerX, centerY);
    let textureOverlay: Phaser.GameObjects.Image | null = null;
    let textureKey: string | null = null;
    if (definition.texture) {
      textureKey = createSurfaceTextureKey('movable', definition.id, definition.texture);
      createSurfaceTextureCanvas(
        phaserScene,
        textureKey,
        definition.width,
        definition.height,
        [
          { x: 0, y: 0 },
          { x: definition.width, y: 0 },
          { x: definition.width, y: definition.height },
          { x: 0, y: definition.height },
        ],
        definition.texture,
        hashSurfaceTextureSeed(`movable:${definition.id}`),
      );
      textureOverlay = phaserScene.add.image(centerX, centerY, textureKey)
        .setDisplaySize(definition.width, definition.height)
        .setDepth(4.5);
    }
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
    const spikeSensors: MovableSpikeSensorRecord[] = [];
    const movableEdges = getBoxBorderSegments(definition.x, definition.y, definition.width, definition.height);
    for (const edge of movableEdges) {
      if (definition.borders?.[edge.side!] !== 'spikes') continue;
      for (const [index, triangle] of getSpikeTriangles(edge).entries()) {
        const sensorId = `${definition.id}:spike:${edge.side}:${index}`;
        const sensorObject = this.createSpikeSensorObject({ id: sensorId, parentTerrainId: definition.id, vertices: triangle.points });
        const localCenter = polygonCentroid(triangle.points.map((point) => ({
          x: point.x - centerX,
          y: point.y - centerY,
        })));
        spikeSensors.push({ object: sensorObject, localCenter });
      }
    }
    this.movableBlocks.set(definition.id, {
      object,
      spikeSensors,
      marker,
      textureOverlay,
      borderOverlay,
      textureKey,
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
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.TRIGGER | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB | COLLISION_CATEGORIES.BIRD | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY,
      },
    });
    rawBody.label = `BOT:${definition.id}`;
    const scene = this.scene as unknown as MatterSceneLike;
    const visual = scene.add.circle(definition.x, definition.y, definition.radius, 0xd65d86, 0.98)
      .setStrokeStyle(Math.max(1.1, definition.radius * 0.06), 0x5b2637, 0.94)
      .setDepth(6);
    const object = this.factory.gameObject(visual, rawBody, true);
    object.body.label = `BOT:${definition.id}`;

    // Share one radial CanvasTexture across bots; the slightly inset shell leaves
    // the existing thin dark body outline visible as a clean outer rim.
    if (!scene.textures.exists(BOT_GRADIENT_TEXTURE_KEY)) {
      const texture = scene.textures.createCanvas(BOT_GRADIENT_TEXTURE_KEY, BOT_GRADIENT_TEXTURE_SIZE, BOT_GRADIENT_TEXTURE_SIZE);
      if (!texture) throw new Error(`Unable to create bot gradient texture: ${BOT_GRADIENT_TEXTURE_KEY}`);
      drawBotGradient(texture.getContext(), BOT_GRADIENT_TEXTURE_SIZE);
      texture.refresh();
    }
    const shell = scene.add.image(definition.x, definition.y, BOT_GRADIENT_TEXTURE_KEY)
      .setDisplaySize(definition.radius * 1.88, definition.radius * 1.88)
      .setDepth(6.5);

    // Oversized, slightly inward-looking pupils give the bots their manic,
    // hypnotised expression while keeping the eyes readable at 36 px.
    const eyeDefinitions = [
      { offsetX: -definition.radius * 0.27, offsetY: -definition.radius * 0.25, pupilOffsetX: definition.radius * 0.065, pupilOffsetY: definition.radius * 0.025 },
      { offsetX: definition.radius * 0.27, offsetY: -definition.radius * 0.25, pupilOffsetX: -definition.radius * 0.065, pupilOffsetY: definition.radius * 0.025 },
    ];
    const eyes: BotEyeRecord[] = eyeDefinitions.map((eye) => {
      const sclera = scene.add.circle(
        definition.x + eye.offsetX, definition.y + eye.offsetY,
        definition.radius * 0.215, 0xfffbf7, 1,
      ).setStrokeStyle(Math.max(0.55, definition.radius * 0.022), 0x6d2543, 0.72).setDepth(7);
      const pupil = scene.add.circle(
        definition.x + eye.offsetX + eye.pupilOffsetX,
        definition.y + eye.offsetY + eye.pupilOffsetY,
        definition.radius * 0.112, 0x21131d, 1,
      ).setDepth(8);
      const highlight = scene.add.circle(
        definition.x + eye.offsetX + eye.pupilOffsetX - definition.radius * 0.035,
        definition.y + eye.offsetY + eye.pupilOffsetY - definition.radius * 0.04,
        definition.radius * 0.038, 0xffffff, 0.96,
      ).setDepth(9);
      return { sclera, pupil, highlight, ...eye };
    });
    // Keep the mouth on its own lower-face track instead of orbiting with the
    // eyes as the body rolls. A modest inset keeps it clear of the outer rim.
    const mouthOffsetY = definition.radius * 0.42;
    const mouth = scene.add.text(definition.x, definition.y + mouthOffsetY, '⌣', {
      fontFamily: 'Arial, sans-serif', fontSize: `${Math.max(15, definition.radius * 0.93)}px`,
      color: '#fff8fb', fontStyle: 'bold', stroke: '#6d2543', strokeThickness: 2.3,
    }).setOrigin(0.5).setDepth(7);

    this.registerLevelObject(object, { kind: 'bot', id: definition.id, mass: definition.mass });
    this.bots.set(definition.id, {
      object, shell, eyes, mouth,
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

  applyBotSpeedSpinBoost(id: string, speedBoostPercent: number, spinBoostPercent: number): SpeedSpinBoostResult | null {
    const bot = this.bots.get(id);
    if (!bot) return null;

    const body = bot.object.body;
    const currentVelocity = PhysicsAdapter.fromMatterVelocity(body.velocity);
    const speedBefore = Math.hypot(currentVelocity.x, currentVelocity.y);
    const speedFactor = 1 + Math.max(0, Math.min(200, speedBoostPercent)) / 100;
    const spinFactor = 1 + Math.max(0, Math.min(300, spinBoostPercent)) / 100;

    // Bot patrol logic reapplies its configured horizontal speed every step,
    // so update the persistent patrol speed as well as the instantaneous body.
    bot.speed = Math.min(2000, bot.speed * speedFactor);
    const boostedVelocity = {
      x: bot.direction * bot.speed,
      y: Math.max(-2000, Math.min(2000, currentVelocity.y * speedFactor)),
    };
    const matterVelocity = PhysicsAdapter.toMatterVelocity(boostedVelocity);
    bot.object.setVelocity(matterVelocity.x, matterVelocity.y);

    const spinBefore = body.angularVelocity;
    const spinSeedSpeed = Math.max(speedBefore, bot.speed);
    const rollingSpin = spinBoostPercent > 0 && spinSeedSpeed > 1
      ? Math.sign(currentVelocity.x || currentVelocity.y || bot.direction)
        * (spinSeedSpeed / Math.max(1, bot.radius)) * FIXED_STEP_SECONDS
      : 0;
    const spinBase = Math.abs(spinBefore) > 0.0001 ? spinBefore : rollingSpin;
    const spinAfter = spinBase * spinFactor;
    bot.object.setAngularVelocity(spinAfter);
    bot.object.setAwake();
    bot.recoverySteps = 0;
    bot.turnCooldownSteps = 0;

    return {
      speedBefore,
      speedAfter: Math.hypot(boostedVelocity.x, boostedVelocity.y),
      spinBefore,
      spinAfter,
    };
  }

  createBird(definition: BirdPhysicsOptions): void {
    const rawBody = this.factory.circle(definition.x, definition.y, definition.radius, {
      label: `BIRD:${definition.id}`,
      isStatic: false,
      mass: definition.mass,
      friction: definition.friction,
      frictionStatic: definition.friction,
      frictionAir: 0.006,
      restitution: definition.restitution,
      collisionFilter: {
        category: COLLISION_CATEGORIES.BIRD,
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.TRIGGER | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY,
      },
    });
    rawBody.label = `BIRD:${definition.id}`;
    const renderer = new BirdRenderer(this.scene as unknown as BirdRendererSceneLike, definition.radius, definition.id, definition.x, definition.y);
    const object = this.factory.gameObject(renderer.container, rawBody, true);
    object.body.label = `BIRD:${definition.id}`;
    this.registerLevelObject(object, { kind: 'bird', id: definition.id, mass: definition.mass });
    this.birds.set(definition.id, {
      object,
      renderer,
      id: definition.id,
      radius: definition.radius,
      mass: definition.mass,
      patrolSpeed: definition.patrolSpeed,
      attackSpeed: definition.attackSpeed,
      aggressive: definition.aggressive,
      detectionRadius: definition.detectionRadius,
      attackImpulse: definition.attackImpulse,
      direction: definition.direction,
      patrolMinX: definition.patrolMinX,
      patrolMaxX: definition.patrolMaxX,
      patrolY: definition.y,
      killPlaneY: definition.killPlaneY,
      recoveryMs: 0,
      attackCooldownMs: 0,
      attacking: false,
      pendingAttackImpulse: null,
      pendingDirectionUpdate: false,
      turnCooldownSteps: 0,
    });
  }

  createVomitEnemy(definition: VomitEnemyPhysicsOptions): void {
    const rawBody = this.factory.circle(definition.x, definition.y, definition.radius, {
      label: `VOMIT_ENEMY:${definition.id}`,
      isStatic: false,
      mass: definition.mass,
      friction: definition.friction,
      frictionStatic: Math.min(1, definition.friction * 1.15),
      frictionAir: 0.018,
      restitution: definition.restitution,
      collisionFilter: {
        category: COLLISION_CATEGORIES.VOMIT_ENEMY,
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE
          | COLLISION_CATEGORIES.TRIGGER | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB | COLLISION_CATEGORIES.BIRD | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY,
      },
    });
    rawBody.label = `VOMIT_ENEMY:${definition.id}`;
    const renderer = new VomitEnemyRenderer(
      this.scene as unknown as VomitRendererSceneLike,
      definition.radius,
      definition.id,
      definition.x,
      definition.y,
    );
    const object = this.factory.gameObject(renderer.container, rawBody, true);
    object.body.label = `VOMIT_ENEMY:${definition.id}`;
    this.registerLevelObject(object, { kind: 'vomitEnemy', id: definition.id, mass: definition.mass });
    this.vomitEnemies.set(definition.id, {
      object,
      renderer,
      id: definition.id,
      radius: definition.radius,
      mass: definition.mass,
      detectionRadius: definition.detectionRadius,
      pulseImpulse: definition.pulseImpulse,
      pulseIntervalMs: definition.pulseIntervalSeconds * 1000,
      pulseRemainingMs: 0,
      playerInRange: false,
      killPlaneY: definition.killPlaneY,
    });
  }

  createDemonEnemy(definition: DemonPhysicsOptions): void {
    if (definition.spawnPoints.length === 0) {
      throw new Error(`Demon "${definition.id}" has no safe spawn surfaces in its configured spawn area`);
    }
    const spawnPoint = { ...definition.spawnPoints[0]! };
    const rawBody = this.factory.circle(spawnPoint.x, spawnPoint.y, definition.radius, {
      label: `DEMON:${definition.id}`,
      // Created dynamic and frozen below via setStatic(true), exactly like
      // bombs and movable crates. Creating it with isStatic:true plus an
      // explicit mass leaves Matter with inconsistent mass/inertia values
      // that are restored when the demon later turns dynamic.
      isStatic: false,
      mass: definition.mass,
      friction: definition.friction,
      frictionStatic: Math.min(1, definition.friction * 1.15),
      frictionAir: 0.012,
      restitution: definition.restitution,
      collisionFilter: { category: COLLISION_CATEGORIES.DEMON_ENEMY, mask: 0 },
    });
    rawBody.label = `DEMON:${definition.id}`;
    const renderer = new DemonRenderer(
      this.scene as unknown as DemonRendererSceneLike,
      definition.radius,
      definition.id,
      spawnPoint.x,
      spawnPoint.y,
    );
    // Keep the Matter body on a non-rendering Zone. The demon artwork is
    // rendered by standalone world-space Graphics, so Matter's GameObject
    // lifecycle cannot hide or replace it when the body switches static/dynamic.
    const physicsZone = (this.scene as unknown as MatterSceneLike).add.zone(spawnPoint.x, spawnPoint.y, 1, 1);
    const object = this.factory.gameObject(physicsZone, rawBody, true);
    object.body.label = `DEMON:${definition.id}`;
    object.setStatic(true);
    this.setDemonCollisionActive(object.body, false);
    this.registerLevelObject(object, { kind: 'demon', id: definition.id, mass: definition.mass });

    const telegraphMs = definition.telegraphSeconds * 1000;
    this.demons.set(definition.id, {
      object,
      renderer,
      id: definition.id,
      radius: definition.radius,
      mass: definition.mass,
      spawnPoints: definition.spawnPoints.map((point) => ({ ...point })),
      spawnPoint,
      spawnIndex: 0,
      spawnCycle: 0,
      initialSpawnSelectionPending: true,
      phase: 'telegraph',
      phaseRemainingMs: telegraphMs,
      respawnIntervalMs: definition.respawnIntervalSeconds * 1000,
      telegraphMs,
      attackDelayMs: definition.attackDelaySeconds * 1000,
      activeMs: definition.activeSeconds * 1000,
      attackRadius: definition.attackRadius,
      lightningImpulse: definition.lightningImpulse,
      collisionImpulse: definition.collisionImpulse,
      attackRemainingMs: definition.attackDelaySeconds * 1000,
      attacked: false,
      disrupted: false,
      killPlaneY: definition.killPlaneY,
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
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.MOVABLE | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY,
      },
    });
    rawBody.label = `BOMB:${definition.id}`;
    const scene = this.scene as unknown as MatterSceneLike;
    const radius = definition.radius;
    const visual = scene.add.circle(definition.x, definition.y, radius, 0x15171d, 1)
      // Keep the bomb outline as subtle as the player/bot outlines: a thin,
      // low-contrast graphite edge that barely separates the shell from the scene.
      .setStrokeStyle(Math.max(1.1, radius * 0.06), 0x2e3238, 0.9)
      .setDepth(7);
    const object = this.factory.gameObject(visual, rawBody, true);
    object.body.label = `BOMB:${definition.id}`;
    object.setStatic(true);

    // Reuse one glossy graphite CanvasTexture across all bombs. The inset shell
    // leaves the dark metallic outline visible, matching the bot shell treatment
    // while keeping the bomb's existing face, fuse and flame layers untouched.
    if (!scene.textures.exists(BOMB_GRADIENT_TEXTURE_KEY)) {
      const texture = scene.textures.createCanvas(BOMB_GRADIENT_TEXTURE_KEY, BOMB_GRADIENT_TEXTURE_SIZE, BOMB_GRADIENT_TEXTURE_SIZE);
      if (!texture) throw new Error(`Unable to create bomb gradient texture: ${BOMB_GRADIENT_TEXTURE_KEY}`);
      drawBombGradient(texture.getContext(), BOMB_GRADIENT_TEXTURE_SIZE);
      texture.refresh();
    }
    const shell = scene.add.image(definition.x, definition.y, BOMB_GRADIENT_TEXTURE_KEY)
      .setDisplaySize(radius * 1.84, radius * 1.84)
      .setDepth(7.5);

    // Separate world-space details follow the body's transform. This keeps the
    // physical circle untouched while giving the bomb an animated face and a
    // layered flame that is lit only after activation.
    const shellHighlight = scene.add.circle(definition.x, definition.y, radius * 0.34, 0xb8c4d2, 0.12)
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
      shell,
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

  createSpikeSensor(definition: SpikeSensorOptions): void {
    this.createSpikeSensorObject(definition);
  }

  private createSpikeSensorObject(definition: SpikeSensorOptions): MatterGameObjectLike {
    const center = polygonCentroid(definition.vertices);
    const local = definition.vertices.map((point) => ({ x: point.x - center.x, y: point.y - center.y }));
    const rawBody = this.factory.fromVertices(center.x, center.y, [local], {
      label: `SPIKE:${definition.id}`,
      isStatic: true,
      isSensor: true,
      friction: 0,
      frictionStatic: 0,
      restitution: 0,
      collisionFilter: {
        category: COLLISION_CATEGORIES.TRIGGER,
        mask: COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BIRD | COLLISION_CATEGORIES.VOMIT_ENEMY | COLLISION_CATEGORIES.DEMON_ENEMY,
      },
    }, true);
    rawBody.label = `SPIKE:${definition.id}`;
    const scene = this.scene as unknown as MatterSceneLike;
    const object = this.factory.gameObject(scene.add.zone(center.x, center.y, 1, 1), rawBody, true);
    object.body.label = `SPIKE:${definition.id}`;
    this.registerLevelObject(object, { kind: 'spike', id: definition.id, spikeParentId: definition.parentTerrainId });
    return object;
  }

  createSensor(definition: SensorOptions): void {
    const rawBody = this.factory.rectangle(
      definition.x + definition.width / 2,
      definition.y + definition.height / 2,
      definition.width,
      definition.height,
      {
        label: definition.id, isStatic: true, isSensor: true,
        collisionFilter: {
          category: COLLISION_CATEGORIES.TRIGGER,
          mask: COLLISION_CATEGORIES.BALL | (definition.type === 'poop' ? COLLISION_CATEGORIES.BOT : 0),
        },
      },
    );
    rawBody.label = definition.id;
    const object = this.factory.gameObject((this.scene as unknown as MatterSceneLike).add.zone(definition.x + definition.width / 2, definition.y + definition.height / 2, 1, 1), rawBody, true);
    object.body.label = definition.id;
    this.registerLevelObject(object, { kind: 'trigger', id: definition.id, triggerType: definition.type });
  }

  removeSensor(id: string): void {
    const index = this.levelObjects.findIndex((object) => {
      const meta = this.metadata.get(object.body);
      return meta?.kind === 'trigger' && meta.id === id;
    });
    this.activeTriggers.delete(id);
    if (index < 0) return;
    const [object] = this.levelObjects.splice(index, 1);
    this.metadata.delete(object.body);
    object.destroy();
  }

  removeEnemyAfterSpikeHit(kind: Exclude<SpikeEntityKind, 'player'>, id: string): void {
    if (kind === 'bot') this.removeBot(id);
    else if (kind === 'bird') this.removeBird(id);
    else if (kind === 'vomitEnemy') this.removeVomitEnemy(id);
    else if (kind === 'demon') this.removeDemonEnemy(id);
    this.spikeVictims.delete(`${kind}:${id}`);
  }

  clearSpikeVictim(kind: SpikeEntityKind, id: string): void {
    this.spikeVictims.delete(`${kind}:${id}`);
  }

  removeTerrainBody(id: string): void {
    const index = this.levelObjects.findIndex((object) => {
      const meta = this.metadata.get(object.body);
      return (meta?.kind === 'terrain' || meta?.kind === 'movable') && meta.id === id;
    });
    if (index < 0) return;
    // Remove every lethal sensor attached to this solid as well as its collider.
    for (let sensorIndex = this.levelObjects.length - 1; sensorIndex >= 0; sensorIndex -= 1) {
      const sensor = this.levelObjects[sensorIndex];
      const sensorMeta = this.metadata.get(sensor.body);
      if (sensorMeta?.kind !== 'spike' || sensorMeta.spikeParentId !== id) continue;
      this.levelObjects.splice(sensorIndex, 1);
      this.metadata.delete(sensor.body);
      sensor.destroy();
    }
    const [object] = this.levelObjects.splice(index, 1);
    this.metadata.delete(object.body);
    const movable = this.movableBlocks.get(id);
    movable?.marker.destroy();
    movable?.textureOverlay?.destroy();
    movable?.borderOverlay.destroy();
    if (movable?.textureKey) {
      const textures = (this.scene as Phaser.Scene).textures;
      if (textures.exists(movable.textureKey)) textures.remove(movable.textureKey);
    }
    this.movableBlocks.delete(id);
    object.destroy();
  }

  removeLevelBodies(): void {
    for (const object of this.levelObjects) {
      this.metadata.delete(object.body);
      object.destroy();
    }
    for (const block of this.movableBlocks.values()) {
      block.marker.destroy();
      block.textureOverlay?.destroy();
      block.borderOverlay.destroy();
      if (block.textureKey) {
        const textures = (this.scene as Phaser.Scene).textures;
        if (textures.exists(block.textureKey)) textures.remove(block.textureKey);
      }
    }
    this.movableBlocks.clear();
    for (const bot of this.bots.values()) {
      bot.shell.destroy();
      for (const eye of bot.eyes) { eye.sclera.destroy(); eye.pupil.destroy(); eye.highlight.destroy(); }
      bot.mouth.destroy();
    }
    this.bots.clear();
    for (const bird of this.birds.values()) bird.renderer.dispose();
    this.birds.clear();
    for (const enemy of this.vomitEnemies.values()) enemy.renderer.dispose();
    this.vomitEnemies.clear();
    for (const demon of this.demons.values()) demon.renderer.dispose();
    this.demons.clear();
    for (const bomb of this.bombs.values()) this.destroyBombVisuals(bomb);
    this.bombs.clear();
    this.preStepVelocities.clear();
    this.levelObjects.length = 0;
    this.activeTriggers.clear();
    this.spikeVictims.clear();
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
      this.handleBirdCollision(pair, phase);
      this.handleDemonCollision(pair, phase);
      this.handleBombCollision(pair, phase);
      this.handleBotCollision(pair, phase);
      const mapped = this.mapper.mapPair(pair, phase, this.preStepBallVelocity, this.preStepVelocities);
      for (const item of mapped) {
        if (item.type === 'SPIKE_ENTITY_HIT') {
          const victimKey = `${item.entityKind}:${item.entityId}`;
          if (this.spikeVictims.has(victimKey)) continue;
          this.spikeVictims.add(victimKey);
        }
        if (item.type === 'BALL_MOVABLE_IMPACT') {
          this.activateMovableBlock(item);
          continue;
        }
        if (item.type === 'BALL_ENTERED_TRIGGER' || item.type === 'BOT_ENTERED_TRIGGER') {
          if (this.activeTriggers.has(item.triggerId)) continue;
          this.activeTriggers.add(item.triggerId);
        } else if (item.type === 'BALL_EXITED_TRIGGER') {
          this.activeTriggers.delete(item.triggerId);
        }
        for (const listener of this.listeners) listener(item);
      }
    }
  }

  private handleDemonCollision(pair: CollisionEventLike['pairs'][number], phase: 'start' | 'active' | 'end'): void {
    if (phase !== 'start') return;
    const bodyA = pair.bodyA.parent && pair.bodyA.parent !== pair.bodyA ? pair.bodyA.parent : pair.bodyA;
    const bodyB = pair.bodyB.parent && pair.bodyB.parent !== pair.bodyB ? pair.bodyB.parent : pair.bodyB;
    const metaA = this.metadata.get(bodyA);
    const metaB = this.metadata.get(bodyB);
    if (!metaA || !metaB) return;
    const demonMeta = metaA.kind === 'demon' ? metaA : metaB.kind === 'demon' ? metaB : null;
    if (!demonMeta) return;
    const otherMeta = metaA.kind === 'demon' ? metaB : metaA;
    if (!['ball', 'bot', 'bird', 'vomitEnemy', 'movable', 'bomb'].includes(otherMeta.kind)) return;
    const demon = this.demons.get(demonMeta.id);
    if (!demon || demon.phase !== 'active') return;

    const demonBody = metaA.kind === 'demon' ? bodyA : bodyB;
    const otherBody = metaA.kind === 'demon' ? bodyB : bodyA;
    if (otherMeta.kind === 'ball') {
      // The contact burst is deliberately stronger and more readable than the
      // ordinary Matter collision: apply one configurable, equal-and-opposite
      // momentum impulse along the centre-to-centre contact normal.
      const dx = otherBody.position.x - demonBody.position.x;
      const dy = otherBody.position.y - demonBody.position.y;
      const distance = Math.hypot(dx, dy);
      let nx = distance > 0.001 ? dx / distance : 1;
      let ny = distance > 0.001 ? dy / distance : 0;
      if (distance <= 0.001) {
        const relative = this.preStepVelocities.get(otherBody)
          ?? PhysicsAdapter.fromMatterVelocity(otherBody.velocity);
        const speed = Math.hypot(relative.x, relative.y);
        if (speed > 0.001) { nx = -relative.x / speed; ny = -relative.y / speed; }
      }

      if (demon.collisionImpulse > 0) {
        const ballMass = otherMeta.mass ?? 1;
        const demonMass = demonMeta.mass ?? demon.mass;
        const ballVelocity = PhysicsAdapter.fromMatterVelocity(otherBody.velocity);
        const demonVelocity = PhysicsAdapter.fromMatterVelocity(demonBody.velocity);
        const ballNext = {
          x: ballVelocity.x + nx * demon.collisionImpulse / ballMass,
          y: ballVelocity.y + ny * demon.collisionImpulse / ballMass,
        };
        const demonNext = {
          x: demonVelocity.x - nx * demon.collisionImpulse / demonMass,
          y: demonVelocity.y - ny * demon.collisionImpulse / demonMass,
        };
        const ballMatter = PhysicsAdapter.toMatterVelocity(ballNext);
        const demonMatter = PhysicsAdapter.toMatterVelocity(demonNext);
        if (this.ballObject) {
          this.ballObject.setVelocity(ballMatter.x, ballMatter.y);
          this.ballObject.setAwake();
        }
        const demonObject = demon.object;
        demonObject.setVelocity(demonMatter.x, demonMatter.y);
        demonObject.setAwake();
      }
      demon.renderer.onContact(demonBody.position, otherBody.position, demon.collisionImpulse);
    }

    // Physical contact interrupts the teleport cycle, leaving the demon as a
    // normal pushable body. The scheduled zap remains armed for a later pass.
    demon.disrupted = true;
    demon.renderer.onKnockback();
  }

  private handleBirdCollision(pair: CollisionEventLike['pairs'][number], phase: 'start' | 'active' | 'end'): void {
    if (phase !== 'start') return;
    const bodyA = pair.bodyA.parent && pair.bodyA.parent !== pair.bodyA ? pair.bodyA.parent : pair.bodyA;
    const bodyB = pair.bodyB.parent && pair.bodyB.parent !== pair.bodyB ? pair.bodyB.parent : pair.bodyB;
    const metaA = this.metadata.get(bodyA);
    const metaB = this.metadata.get(bodyB);
    if (!metaA || !metaB) return;

    const birdIsA = metaA.kind === 'bird';
    const birdMeta = birdIsA ? metaA : metaB.kind === 'bird' ? metaB : null;
    if (!birdMeta) return;
    const birdBody = birdIsA ? bodyA : bodyB;
    const otherBody = birdIsA ? bodyB : bodyA;
    const otherMeta = birdIsA ? metaB : metaA;
    const bird = this.birds.get(birdMeta.id);
    if (!bird) return;

    if (otherMeta.kind === 'ball') {
      const ballVelocityForVisual = this.preStepVelocities.get(otherBody)
        ?? PhysicsAdapter.fromMatterVelocity(otherBody.velocity);
      const birdVelocityForVisual = this.preStepVelocities.get(birdBody)
        ?? PhysicsAdapter.fromMatterVelocity(birdBody.velocity);
      const visualImpactSpeed = Math.hypot(
        ballVelocityForVisual.x - birdVelocityForVisual.x,
        ballVelocityForVisual.y - birdVelocityForVisual.y,
      );
      bird.renderer.onImpact(birdBody.position, visualImpactSpeed);
      if (bird.attacking && bird.attackImpulse > 0) {
        const delta = {
          x: otherBody.position.x - birdBody.position.x,
          y: otherBody.position.y - birdBody.position.y,
        };
        const length = Math.hypot(delta.x, delta.y) || 1;
        const towardBall = { x: delta.x / length, y: delta.y / length };
        const ballVelocity = this.preStepVelocities.get(otherBody)
          ?? PhysicsAdapter.fromMatterVelocity(otherBody.velocity);
        const birdVelocity = this.preStepVelocities.get(birdBody)
          ?? PhysicsAdapter.fromMatterVelocity(birdBody.velocity);
        const relativeVelocity = {
          x: ballVelocity.x - birdVelocity.x,
          y: ballVelocity.y - birdVelocity.y,
        };
        const closingSpeed = -(relativeVelocity.x * towardBall.x + relativeVelocity.y * towardBall.y);
        if (closingSpeed > 0.1) {
          const zone = getBirdGuardZone(bird.patrolMinX, bird.patrolMaxX, bird.patrolY, bird.detectionRadius);
          bird.pendingAttackImpulse = {
            ballBody: otherBody,
            direction: getBirdTerritoryEgressDirection(otherBody.position, zone),
          };
        }
      }
      bird.attacking = false;
      bird.recoveryMs = 520;
      bird.attackCooldownMs = 780;
      bird.pendingDirectionUpdate = true;
      return;
    }

    if (otherMeta.kind !== 'terrain' && otherMeta.kind !== 'movable') return;
    if (bird.turnCooldownSteps > 0) return;
    const sign = birdIsA ? 1 : -1;
    const length = Math.hypot(pair.collision.normal.x, pair.collision.normal.y) || 1;
    let normalX = sign * pair.collision.normal.x / length;
    let normalY = sign * pair.collision.normal.y / length;
    const dx = birdBody.position.x - otherBody.position.x;
    const dy = birdBody.position.y - otherBody.position.y;
    if (normalX * dx + normalY * dy < 0) normalX *= -1, normalY *= -1;
    const velocity = PhysicsAdapter.fromMatterVelocity(birdBody.velocity);
    const closingSpeed = velocity.x * normalX + velocity.y * normalY;
    if (Math.abs(normalX) >= 0.55 && closingSpeed < -1) {
      bird.direction = normalX > 0 ? 1 : -1;
      bird.turnCooldownSteps = 10;
      bird.recoveryMs = 160;
      bird.attacking = false;
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

      if (meta.kind !== 'ball' && meta.kind !== 'bot' && meta.kind !== 'movable' && meta.kind !== 'vomitEnemy') continue;
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
    bomb.shell.setPosition(x, y).setRotation(angle);

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
    bomb.shell.destroy();
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

  private applyPendingBirdImpulses(): void {
    for (const bird of this.birds.values()) {
      const pending = bird.pendingAttackImpulse;
      if (!pending) {
        if (bird.pendingDirectionUpdate) {
          bird.direction = directionFromVelocity(bird.object.body.velocity.x, bird.direction);
          bird.pendingDirectionUpdate = false;
        }
        continue;
      }

      const ballMass = this.metadata.get(pending.ballBody)?.mass ?? 1;
      const birdVelocity = PhysicsAdapter.fromMatterVelocity(bird.object.body.velocity);
      const ballVelocity = PhysicsAdapter.fromMatterVelocity(pending.ballBody.velocity);
      const impulse = bird.attackImpulse;
      const nextBallMatter = PhysicsAdapter.toMatterVelocity({
        x: ballVelocity.x + (pending.direction.x * impulse) / ballMass,
        y: ballVelocity.y + (pending.direction.y * impulse) / ballMass,
      });
      const nextBirdVelocity = {
        x: birdVelocity.x - (pending.direction.x * impulse) / bird.mass,
        y: birdVelocity.y - (pending.direction.y * impulse) / bird.mass,
      };
      const nextBirdMatter = PhysicsAdapter.toMatterVelocity(nextBirdVelocity);
      pending.ballBody.velocity.x = nextBallMatter.x;
      pending.ballBody.velocity.y = nextBallMatter.y;
      bird.object.body.velocity.x = nextBirdMatter.x;
      bird.object.body.velocity.y = nextBirdMatter.y;
      bird.direction = directionFromVelocity(nextBirdVelocity.x, bird.direction);
      bird.pendingAttackImpulse = null;
      bird.pendingDirectionUpdate = false;
    }
  }

  private updateBirdsBeforeStep(stepMs: number): void {
    const ballBody = this.ballObject?.body;
    const ballMeta = ballBody ? this.metadata.get(ballBody) : undefined;
    const geometries = [...this.metadata.entries()]
      .filter(([, meta]) => (meta.kind === 'terrain' || meta.kind === 'movable') && !meta.dynamic && meta.patrolGeometry)
      .map(([, meta]) => meta.patrolGeometry as PatrolGeometry);

    for (const bird of this.birds.values()) {
      const body = bird.object.body;
      if (body.position.y > bird.killPlaneY) continue;
      bird.attackCooldownMs = Math.max(0, bird.attackCooldownMs - stepMs);
      if (bird.turnCooldownSteps > 0) bird.turnCooldownSteps -= 1;

      if (bird.recoveryMs > 0) {
        bird.recoveryMs = Math.max(0, bird.recoveryMs - stepMs);
        const current = PhysicsAdapter.fromMatterVelocity(body.velocity);
        const verticalCorrection = Math.max(-110, Math.min(110, (bird.patrolY - body.position.y) * 1.25));
        const recovered = PhysicsAdapter.toMatterVelocity({
          x: current.x * 0.985,
          y: current.y * 0.92 + verticalCorrection * 0.08,
        });
        bird.object.setVelocity(recovered.x, recovered.y);
        bird.object.setAwake();
        bird.attacking = false;
        continue;
      }

      const ballPosition = ballBody?.position;
      const zone = getBirdGuardZone(bird.patrolMinX, bird.patrolMaxX, bird.patrolY, bird.detectionRadius);
      const withinTerritory = Boolean(ballPosition && isPointInsideBirdGuardZone(ballPosition, zone));
      const distanceToBall = ballPosition
        ? Math.hypot(ballPosition.x - body.position.x, ballPosition.y - body.position.y)
        : Number.POSITIVE_INFINITY;
      const canDetectBall = bird.aggressive && withinTerritory && distanceToBall <= bird.detectionRadius;

      if (ballBody && ballMeta?.kind === 'ball' && canDetectBall && bird.attackCooldownMs <= 0) {
        bird.attacking = true;
        const ballRadius = ballBody.circleRadius ?? 18;
        const egress = getBirdTerritoryEgressDirection(ballPosition!, zone);
        const intercept = getBirdAttackInterceptPoint(ballPosition!, ballRadius, bird.radius, egress);
        const velocity = getBirdChaseVelocity(body.position, intercept, bird.attackSpeed);
        const matterVelocity = PhysicsAdapter.toMatterVelocity(velocity);
        bird.object.setVelocity(matterVelocity.x, matterVelocity.y);
        bird.object.setAwake();
        continue;
      }

      bird.attacking = false;
      const currentX = body.position.x;
      if (currentX >= bird.patrolMaxX) bird.direction = -1;
      else if (currentX <= bird.patrolMinX) bird.direction = 1;
      const obstacleAhead = hasPatrolObstacleAhead(currentX, body.position.y, bird.direction, bird.radius, geometries);
      if (obstacleAhead && bird.turnCooldownSteps <= 0) {
        bird.direction = bird.direction === 1 ? -1 : 1;
        bird.turnCooldownSteps = 10;
      }

      const verticalVelocity = Math.max(-90, Math.min(90, (bird.patrolY - body.position.y) * 1.8));
      const patrolVelocity = PhysicsAdapter.toMatterVelocity({ x: bird.direction * bird.patrolSpeed, y: verticalVelocity });
      bird.object.setVelocity(patrolVelocity.x, patrolVelocity.y);
      bird.object.setAwake();
    }
  }

  private updateBirdsAfterStep(stepMs: number): void {
    for (const [id, bird] of [...this.birds.entries()]) {
      const position = bird.object.body.position;
      if (position.y > bird.killPlaneY) {
        this.removeBird(id);
        continue;
      }
      bird.renderer.update(stepMs, bird.direction, bird.attacking, bird.object.body.angle);
    }
  }

  private removeBird(id: string): void {
    const bird = this.birds.get(id);
    if (!bird) return;
    this.birds.delete(id);
    bird.renderer.dispose();
    const entry = this.levelObjects.findIndex((object) => object.body === bird.object.body);
    if (entry >= 0) this.levelObjects.splice(entry, 1);
    this.metadata.delete(bird.object.body);
    bird.object.destroy();
  }

  private updateVomitEnemiesBeforeStep(stepMs: number): void {
    const ballBody = this.ballObject?.body;
    if (!ballBody) {
      for (const enemy of this.vomitEnemies.values()) {
        enemy.playerInRange = false;
        enemy.pulseRemainingMs = 0;
      }
      return;
    }

    const ballMass = this.metadata.get(ballBody)?.mass ?? 1;
    for (const enemy of this.vomitEnemies.values()) {
      const body = enemy.object.body;
      if (body.position.y > enemy.killPlaneY) continue;
      const dx = ballBody.position.x - body.position.x;
      const dy = ballBody.position.y - body.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance > enemy.detectionRadius) {
        enemy.playerInRange = false;
        enemy.pulseRemainingMs = 0;
        continue;
      }

      const enteredRange = !enemy.playerInRange;
      enemy.playerInRange = true;
      if (enteredRange) enemy.pulseRemainingMs = 0;
      else enemy.pulseRemainingMs = Math.max(0, enemy.pulseRemainingMs - stepMs);

      if (enemy.pulseRemainingMs > 0 || enemy.pulseImpulse <= 0) continue;
      const length = distance || 1;
      const direction = { x: dx / length, y: dy / length };
      const ballVelocity = PhysicsAdapter.fromMatterVelocity(ballBody.velocity);
      const nextVelocity = {
        x: ballVelocity.x + direction.x * enemy.pulseImpulse / ballMass,
        y: ballVelocity.y + direction.y * enemy.pulseImpulse / ballMass,
      };
      const matterVelocity = PhysicsAdapter.toMatterVelocity(nextVelocity);
      // Use the Matter GameObject setter rather than mutating body.velocity.
      // Matter derives velocity from position/positionPrev during Body.update;
      // direct writes can be discarded on the next integration step.
      this.ballObject?.setVelocity(matterVelocity.x, matterVelocity.y);
      this.ballObject?.setAwake();
      enemy.renderer.onVomitPulse(body.position, ballBody.position, body.angle, enemy.pulseImpulse);
      enemy.pulseRemainingMs = enemy.pulseIntervalMs;
    }
  }

  private updateVomitEnemiesAfterStep(stepMs: number): void {
    const ballPosition = this.ballObject?.body.position;
    for (const [id, enemy] of [...this.vomitEnemies.entries()]) {
      const body = enemy.object.body;
      if (body.position.y > enemy.killPlaneY) {
        this.removeVomitEnemy(id);
        continue;
      }
      const dx = ballPosition ? ballPosition.x - body.position.x : 0;
      const dy = ballPosition ? ballPosition.y - body.position.y : 0;
      const target = ballPosition && Math.hypot(dx, dy) <= enemy.detectionRadius ? ballPosition : null;
      enemy.renderer.update(stepMs, body.position, body.angle, target);
    }
  }

  private removeVomitEnemy(id: string): void {
    const enemy = this.vomitEnemies.get(id);
    if (!enemy) return;
    this.vomitEnemies.delete(id);
    enemy.renderer.dispose();
    const entry = this.levelObjects.findIndex((object) => object.body === enemy.object.body);
    if (entry >= 0) this.levelObjects.splice(entry, 1);
    this.metadata.delete(enemy.object.body);
    enemy.object.destroy();
  }

  private updateDemonEnemiesBeforeStep(stepMs: number): void {
    const ballBody = this.ballObject?.body;
    const ballMass = ballBody ? this.metadata.get(ballBody)?.mass ?? 1 : 1;
    for (const [id, demon] of [...this.demons.entries()]) {
      const body = demon.object.body;
      this.recoverDemonBodyIfInvalid(demon);
      if (demon.phase === 'active' && body.position.y > demon.killPlaneY) {
        this.removeDemonEnemy(id);
        continue;
      }

      demon.phaseRemainingMs = Math.max(0, demon.phaseRemainingMs - stepMs);
      if (demon.phase === 'telegraph') {
        // Level construction creates the demon before the player body. On the
        // first simulation step, select the closest safe point to the player
        // instead of blindly using the leftmost point in the spawn list.
        if (ballBody && demon.initialSpawnSelectionPending) {
          demon.initialSpawnSelectionPending = false;
          const nearestSafePoint = this.chooseDemonSpawnPoint(demon, ballBody, false);
          if (!nearestSafePoint) {
            demon.phase = 'cooldown';
            demon.phaseRemainingMs = DEMON_SPAWN_RETRY_MS;
            continue;
          }
          if (nearestSafePoint.x !== demon.spawnPoint.x || nearestSafePoint.y !== demon.spawnPoint.y) {
            demon.spawnPoint = nearestSafePoint;
            demon.object.setPosition(nearestSafePoint.x, nearestSafePoint.y);
            demon.phaseRemainingMs = demon.telegraphMs;
            continue;
          }
        }

        // The player body is created after level geometry. Re-check the
        // telegraph location every step so it can never materialize directly
        // on top of a player who rolled into the marked spot during the warning.
        if (ballBody && !this.isDemonSpawnPointSafe(demon, demon.spawnPoint, ballBody)) {
          const alternative = this.chooseDemonSpawnPoint(demon, ballBody, true);
          if (!alternative) {
            demon.phase = 'cooldown';
            demon.phaseRemainingMs = DEMON_SPAWN_RETRY_MS;
            continue;
          }
          demon.spawnPoint = alternative;
          demon.object.setPosition(alternative.x, alternative.y);
          // Give the new location a complete warning period rather than
          // materializing immediately after moving the teleport marker.
          demon.phaseRemainingMs = demon.telegraphMs;
          continue;
        }

        if (demon.phaseRemainingMs <= 0) {
          demon.object.setPosition(demon.spawnPoint.x, demon.spawnPoint.y);
          demon.object.setStatic(false);
          this.setDemonCollisionActive(body, true);
          demon.object.setVelocity(0, 0);
          demon.object.setAngularVelocity(0);
          demon.object.setAwake();
          demon.phase = 'active';
          demon.phaseRemainingMs = demon.activeMs;
          demon.attackRemainingMs = demon.attackDelayMs;
          demon.attacked = false;
          demon.disrupted = false;
          demon.renderer.onMaterialize(demon.spawnPoint);
        }
        continue;
      }

      if (demon.phase === 'active') {
        // Keep the zap armed until the player is actually inside its radius.
        // This also allows a short approach after materialization instead of
        // consuming the only attack while the player is still out of range.
        if (!demon.attacked && demon.phaseRemainingMs > 0) {
          demon.attackRemainingMs = Math.max(0, demon.attackRemainingMs - stepMs);
          if (demon.attackRemainingMs <= 0) {
            if (ballBody && this.ballObject) {
              const dx = ballBody.position.x - body.position.x;
              const dy = ballBody.position.y - body.position.y;
              const distance = Math.hypot(dx, dy);
              const ballRadius = Math.max(10, ballBody.circleRadius ?? 18);
              // attackRadius describes the free gap between the two circular
              // bodies, not merely the distance between their centres.
              const edgeDistance = Math.max(0, distance - demon.radius - ballRadius);
              if (edgeDistance <= demon.attackRadius) {
                const direction = distance > 0.001
                  ? { x: dx / distance, y: dy / distance }
                  : this.getDemonOverlapZapDirection(demon);

                if (demon.lightningImpulse > 0) {
                  const current = PhysicsAdapter.fromMatterVelocity(ballBody.velocity);
                  const impulseDelta = demon.lightningImpulse / ballMass;
                  const next = {
                    x: Math.max(-2200, Math.min(2200, current.x + direction.x * impulseDelta)),
                    y: Math.max(-2200, Math.min(2200, current.y + direction.y * impulseDelta)),
                  };
                  const matterVelocity = PhysicsAdapter.toMatterVelocity(next);
                  this.ballObject.setVelocity(matterVelocity.x, matterVelocity.y);
                  this.ballObject.setAwake();
                }

                // If both centers coincide, start the visible bolt at the edge
                // of the demon rather than drawing a zero-length spark.
                const strikeSource = distance < demon.radius * 0.9
                  ? {
                    x: body.position.x - direction.x * demon.radius * 1.15,
                    y: body.position.y - direction.y * demon.radius * 1.15,
                  }
                  : body.position;
                demon.renderer.onStrike(strikeSource, ballBody.position);
                demon.attacked = true;
              } else {
                // Recheck frequently while the demon is materialized. The zap
                // still fires only once, on the first in-range check. Measuring
                // edge-to-edge distance also avoids missing a player whose
                // collision shell is already inside the configured radius.
                demon.attackRemainingMs = DEMON_ATTACK_RETRY_MS;
              }
            } else {
              demon.attackRemainingMs = DEMON_ATTACK_RETRY_MS;
            }
          }
        }

        if (demon.phaseRemainingMs <= 0) {
          if (!demon.disrupted) {
            this.setDemonCollisionActive(body, false);
            demon.object.setStatic(true);
            demon.object.setVelocity(0, 0);
            demon.object.setAngularVelocity(0);
            demon.phase = 'vanishing';
            demon.phaseRemainingMs = 260;
          } else {
            // A rammed demon remains a physical body, but its attack window is
            // still bounded by activeMs and cannot fire indefinitely.
            demon.attacked = true;
          }
        }
        continue;
      }

      if (demon.phase === 'vanishing') {
        if (demon.phaseRemainingMs <= 0) {
          demon.phase = 'cooldown';
          demon.phaseRemainingMs = demon.respawnIntervalMs;
        }
        continue;
      }

      if (demon.phase === 'cooldown' && demon.phaseRemainingMs <= 0) {
        const nextPoint = this.chooseDemonSpawnPoint(demon, ballBody, true);
        if (!nextPoint) {
          // Do not spawn into the player. Retry once the player has left the
          // configured area instead of repeatedly teleporting under the ball.
          demon.phaseRemainingMs = DEMON_SPAWN_RETRY_MS;
          continue;
        }
        demon.spawnPoint = nextPoint;
        demon.initialSpawnSelectionPending = false;
        demon.object.setPosition(demon.spawnPoint.x, demon.spawnPoint.y);
        demon.phase = 'telegraph';
        demon.phaseRemainingMs = demon.telegraphMs;
        demon.spawnCycle += 1;
      }
    }
  }

  private updateDemonEnemiesAfterStep(stepMs: number): void {
    for (const [id, demon] of [...this.demons.entries()]) {
      const body = demon.object.body;
      this.recoverDemonBodyIfInvalid(demon);
      if (demon.phase === 'active' && body.position.y > demon.killPlaneY) {
        this.removeDemonEnemy(id);
        continue;
      }
      const phasePosition = demon.phase === 'active' ? body.position : demon.spawnPoint;
      const phaseRotation = demon.phase === 'active' ? body.angle : 0;
      demon.renderer.update(stepMs, phasePosition, phaseRotation, demon.phase);
    }
  }

  /**
   * A body whose position, angle or velocity became NaN/Infinity can never be
   * drawn and makes every distance check (the lightning zap included) fail
   * silently. Put it back on its spawn point at rest instead.
   */
  private recoverDemonBodyIfInvalid(demon: DemonRecord): void {
    const body = demon.object.body;
    const finite = Number.isFinite(body.position.x) && Number.isFinite(body.position.y)
      && Number.isFinite(body.angle) && Number.isFinite(body.velocity.x) && Number.isFinite(body.velocity.y);
    if (finite) return;
    console.warn(`Demon "${demon.id}" had an invalid physics state and was reset to its spawn point.`);
    demon.object.setPosition(demon.spawnPoint.x, demon.spawnPoint.y);
    demon.object.setVelocity(0, 0);
    demon.object.setAngularVelocity(0);
    demon.object.setRotation?.(0);
  }

  private isDemonSpawnPointSafe(demon: DemonRecord, point: Vector2, ballBody: MatterBodyLike): boolean {
    const ballRadius = Math.max(10, ballBody.circleRadius ?? 18);
    const minimumDistance = demon.radius + ballRadius + Math.max(14, demon.radius * 0.8);
    return Math.hypot(point.x - ballBody.position.x, point.y - ballBody.position.y) >= minimumDistance;
  }

  private chooseDemonSpawnPoint(
    demon: DemonRecord,
    ballBody: MatterBodyLike | undefined,
    avoidCurrent: boolean,
  ): Vector2 | null {
    const safePoints = demon.spawnPoints
      .map((point, index) => ({ point, index }))
      .filter(({ point }) => !ballBody || this.isDemonSpawnPointSafe(demon, point, ballBody));
    if (safePoints.length === 0) return null;

    const alternatives = avoidCurrent
      ? safePoints.filter(({ point }) => point.x !== demon.spawnPoint.x || point.y !== demon.spawnPoint.y)
      : safePoints;
    const candidates = alternatives.length > 0 ? alternatives : safePoints;

    if (ballBody) {
      // Prefer the closest safe location so the demon remains relevant to the
      // encounter while retaining a non-overlapping buffer around the player.
      candidates.sort((a, b) => {
        const distanceA = Math.hypot(a.point.x - ballBody.position.x, a.point.y - ballBody.position.y);
        const distanceB = Math.hypot(b.point.x - ballBody.position.x, b.point.y - ballBody.position.y);
        return distanceA - distanceB || a.point.x - b.point.x || a.point.y - b.point.y;
      });
      const selected = candidates[0]!;
      demon.spawnIndex = selected.index;
      return { ...selected.point };
    }

    if (candidates.length === 1) {
      const selected = candidates[0]!;
      demon.spawnIndex = selected.index;
      return { ...selected.point };
    }

    // Stable pseudo-random selection varies across cycles but remains
    // deterministic for a given level replay and enemy ID.
    let hash = 2166136261;
    for (let index = 0; index < demon.id.length; index += 1) hash = Math.imul(hash ^ demon.id.charCodeAt(index), 16777619);
    const candidate = (Math.abs(hash >>> 0) + demon.spawnCycle * 2654435761) % candidates.length;
    let selected = candidates[candidate]!;
    if (selected.index === demon.spawnIndex) selected = candidates[(candidate + 1) % candidates.length]!;
    demon.spawnIndex = selected.index;
    return { ...selected.point };
  }

  private getDemonOverlapZapDirection(demon: DemonRecord): Vector2 {
    let hash = 2166136261;
    const seed = `${demon.id}:${demon.spawnCycle}`;
    for (let index = 0; index < seed.length; index += 1) {
      hash = Math.imul(hash ^ seed.charCodeAt(index), 16777619);
    }
    const horizontal = (hash & 1) === 0 ? -0.8 : 0.8;
    return { x: horizontal, y: -0.6 };
  }

  private setDemonCollisionActive(body: MatterBodyLike, active: boolean): void {
    const filter = (body as MatterBodyLike & { collisionFilter?: { category: number; mask: number } }).collisionFilter;
    if (filter) {
      filter.category = COLLISION_CATEGORIES.DEMON_ENEMY;
      filter.mask = active
        ? COLLISION_CATEGORIES.BALL | COLLISION_CATEGORIES.TERRAIN | COLLISION_CATEGORIES.TRIGGER | COLLISION_CATEGORIES.MOVABLE
          | COLLISION_CATEGORIES.BOT | COLLISION_CATEGORIES.BOMB | COLLISION_CATEGORIES.BIRD | COLLISION_CATEGORIES.VOMIT_ENEMY
        : 0;
    }
  }

  private removeDemonEnemy(id: string): void {
    const demon = this.demons.get(id);
    if (!demon) return;
    this.demons.delete(id);
    demon.renderer.dispose();
    const entry = this.levelObjects.findIndex((object) => object.body === demon.object.body);
    if (entry >= 0) this.levelObjects.splice(entry, 1);
    this.metadata.delete(demon.object.body);
    demon.object.destroy();
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
      bot.shell.setPosition(position.x, position.y).setRotation(angle);
      for (const eye of bot.eyes) {
        const sclera = rotateBotFaceOffset(position.x, position.y, eye.offsetX, eye.offsetY, angle);
        const pupil = rotateBotFaceOffset(
          position.x, position.y,
          eye.offsetX + eye.pupilOffsetX,
          eye.offsetY + eye.pupilOffsetY,
          angle,
        );
        const highlight = rotateBotFaceOffset(
          position.x, position.y,
          eye.offsetX + eye.pupilOffsetX - bot.radius * 0.035,
          eye.offsetY + eye.pupilOffsetY - bot.radius * 0.04,
          angle,
        );
        eye.sclera.setPosition(sclera.x, sclera.y).setRotation(angle);
        eye.pupil.setPosition(pupil.x, pupil.y).setRotation(angle);
        eye.highlight.setPosition(highlight.x, highlight.y).setRotation(angle);
      }
      // The mouth deliberately follows a world-vertical offset independent
      // of the rotating eyes, preserving the old loose, goofy expression.
      bot.mouth.setPosition(position.x, position.y + bot.radius * 0.42).setRotation(angle);
    }
  }

  private removeBot(id: string): void {
    const bot = this.bots.get(id);
    if (!bot) return;
    this.bots.delete(id);
    const entry = this.levelObjects.findIndex((object) => object.body === bot.object.body);
    if (entry >= 0) this.levelObjects.splice(entry, 1);
    this.metadata.delete(bot.object.body);
    bot.shell.destroy();
    for (const eye of bot.eyes) { eye.sclera.destroy(); eye.pupil.destroy(); eye.highlight.destroy(); }
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
      block.textureOverlay?.setPosition(position.x, position.y).setRotation(block.object.body.angle);
      block.borderOverlay.setPosition(position.x, position.y).setRotation(block.object.body.angle);
      const angle = block.object.body.angle;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      for (const sensor of block.spikeSensors) {
        const local = sensor.localCenter;
        sensor.object.setPosition(
          position.x + local.x * cos - local.y * sin,
          position.y + local.x * sin + local.y * cos,
        );
        sensor.object.setRotation?.(angle);
      }
    }
  }
}
