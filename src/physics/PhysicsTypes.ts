import type { SurfaceTextureAssignment } from '../level/SurfaceTextureTypes';
import type { BoxBorderStyles } from '../level/LevelTypes';

export interface Vector2 { x: number; y: number; }

export interface BodySnapshot {
  position: Vector2;
  velocity: Vector2;
  angle: number;
  angularVelocity: number;
}

export interface BallPhysicsOptions {
  radiusPx: number;
  mass: number;
  restitution: number;
  friction: number;
  frictionStatic: number;
  frictionAir: number;
  fixedRotation: boolean;
}

/** `impulse` is the fixed outgoing normal speed in px/s, preventing cumulative spring energy. */
export interface SpringSurfacePhysicsDefinition { id: string; normal: Vector2; impulse: number; }

export interface SpikeSensorOptions { id: string; parentTerrainId: string; vertices: Vector2[]; }

export interface StaticBoxOptions {
  id: string; x: number; y: number; width: number; height: number;
  friction: number; frictionStatic: number; restitution: number; breakable?: boolean; breakableThresholdEnergy?: number; springSurfaces?: SpringSurfacePhysicsDefinition[];
}

export interface StaticPolygonOptions {
  id: string; vertices: Vector2[];
  friction: number; frictionStatic: number; restitution: number; breakable?: boolean; breakableThresholdEnergy?: number; springSurfaces?: SpringSurfacePhysicsDefinition[];
}

export interface BombPhysicsOptions {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  fuseSeconds: number;
  explosionRadius: number;
  explosionEnergy: number;
  restitution: number;
  friction: number;
  killPlaneY: number;
}

export interface VomitEnemyPhysicsOptions {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  detectionRadius: number;
  pulseImpulse: number;
  pulseIntervalSeconds: number;
  restitution: number;
  friction: number;
  killPlaneY: number;
}

export interface DemonSpawnArea { minX: number; minY: number; maxX: number; maxY: number; }

export interface DemonPhysicsOptions {
  id: string;
  spawnArea: DemonSpawnArea;
  spawnPoints: Vector2[];
  radius: number;
  mass: number;
  respawnIntervalSeconds: number;
  telegraphSeconds: number;
  attackDelaySeconds: number;
  activeSeconds: number;
  attackRadius: number;
  lightningImpulse: number;
  /** Momentum impulse shared equally and oppositely by the ball and demon on contact. */
  collisionImpulse: number;
  restitution: number;
  friction: number;
  killPlaneY: number;
}

export interface SpeedSpinBoostResult {
  speedBefore: number;
  speedAfter: number;
  spinBefore: number;
  spinAfter: number;
}

export interface BotPhysicsOptions {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  speed: number;
  direction: -1 | 1;
  restitution: number;
  friction: number;
  killPlaneY: number;
  patrolMinX?: number;
  patrolMaxX?: number;
}

export type PatrolGeometry =
  | { type: 'box'; x: number; y: number; width: number; height: number }
  | { type: 'polygon'; vertices: Vector2[] };


export interface BirdPhysicsOptions {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  patrolSpeed: number;
  attackSpeed: number;
  aggressive: boolean;
  detectionRadius: number;
  attackImpulse: number;
  direction: -1 | 1;
  restitution: number;
  friction: number;
  killPlaneY: number;
  patrolMinX: number;
  patrolMaxX: number;
}

export interface MovableBoxOptions {
  id: string; x: number; y: number; width: number; height: number;
  mass: number; minimumImpactEnergy: number;
  killPlaneY: number; friction: number; frictionStatic: number; restitution: number; texture?: SurfaceTextureAssignment; borders?: BoxBorderStyles;
}

export interface SensorOptions {
  id: string; type: 'hazard' | 'checkpoint' | 'goal' | 'poop';
  x: number; y: number; width: number; height: number;
}

export type SpikeEntityKind = 'player' | 'bot' | 'bird' | 'vomitEnemy' | 'demon';

export type PhysicsEvent =
  | { type: 'SPIKE_ENTITY_HIT'; spikeId: string; entityKind: SpikeEntityKind; entityId: string; position: Vector2 }
  | { type: 'BALL_BOT_IMPACT'; botId: string; normal: Vector2; contactPoint: Vector2; impactSpeed: number }
  | { type: 'BALL_ENEMY_IMPACT'; enemyKind: 'bird' | 'vomitEnemy' | 'demon'; enemyId: string; normal: Vector2; contactPoint: Vector2; impactSpeed: number }
  | { type: 'BALL_TERRAIN_CONTACT_STARTED' | 'BALL_TERRAIN_CONTACT_ACTIVE'; terrainId: string; supportNormal: Vector2; impactSpeed: number }
  | { type: 'BALL_TERRAIN_CONTACT_ENDED'; terrainId: string }
  | { type: 'BALL_MOVABLE_IMPACT'; movableId: string; normal: Vector2; incomingVelocity: Vector2; normalImpactSpeed: number; impactEnergy: number; ballMass: number }
  | { type: 'BALL_SPRING_IMPACT'; terrainId: string; surfaceId: string; normal: Vector2; incomingVelocity: Vector2; contactPoint: Vector2; impactSpeed: number; impulse: number }
  | { type: 'BALL_WALL_IMPACT'; terrainId: string; normal: Vector2; incomingVelocity: Vector2; contactPoint: Vector2; impactSpeed: number; penetrationDepth: number; breakable?: boolean }
  | { type: 'BALL_TERRAIN_IMPACT'; terrainId: string; normal: Vector2; incomingVelocity: Vector2; contactPoint: Vector2; impactSpeed: number; penetrationDepth: number }
  | { type: 'BOMB_EXPLODED'; bombId: string; position: Vector2; radius: number; explosionEnergy: number; breakableIds: string[] }
  | { type: 'BALL_ENTERED_TRIGGER'; triggerId: string; triggerType: 'hazard' | 'checkpoint' | 'goal' | 'poop' }
  | { type: 'BOT_ENTERED_TRIGGER'; botId: string; triggerId: string; triggerType: 'poop' }
  | { type: 'BALL_EXITED_TRIGGER'; triggerId: string };
