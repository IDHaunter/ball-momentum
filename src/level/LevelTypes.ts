import type { SurfaceTextureAssignment } from './SurfaceTextureTypes';

export interface TerrainMaterialDefinition {
  friction: number;
  frictionStatic: number;
  restitution: number;
}

export type BoxSurfaceSide = 'top' | 'right' | 'bottom' | 'left';

/** Visual-only style applied to one exposed shape edge. */
export type BorderStyle = 'default' | 'none' | 'grass' | 'pavers' | 'stone' | 'metal' | 'ice' | 'glass' | 'brick' | 'wood' | 'spikes';
export type BoxBorderStyles = Partial<Record<BoxSurfaceSide, BorderStyle>>;
export interface PolygonBorderDefinition { edge: number; style: BorderStyle; }

/** Fixed outgoing normal speed (px/s) applied when the ball hits this surface. */
export interface BoxSpringSurfaceDefinition { side: BoxSurfaceSide; impulse: number; }

/** Polygon edge index refers to vertices[edge] -> vertices[(edge + 1) % length]. */
export interface PolygonSpringSurfaceDefinition { edge: number; impulse: number; }

export interface BreakableDefinition {
  /** Required impact energy measured as 0.5 * ballMass * normalImpactSpeed^2. */
  thresholdEnergy: number;
  /** Fraction of incoming velocity retained after the solid is pierced. */
  velocityRetention?: number;
}

export interface MovableDefinition {
  /** Mass of the movable block in Matter world units. */
  mass: number;
  /** Minimum normal impact energy (0.5 * ballMass * normalSpeed^2) required to release it. */
  minimumImpactEnergy: number;
}

export type RollingObjectAppearance = 'stone' | 'snow';

/** Passive dynamic round object that rolls, collides, and can shatter glass. */
export interface RollingObjectDefinition {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  appearance?: RollingObjectAppearance;
  friction?: number;
  restitution?: number;
}

/** Stationary Liberty-inspired objective that changes from dislike to like after the ball hits it. */
export interface StatueDefinition {
  id: string;
  /** Horizontal centre in world pixels. */
  x: number;
  /** Ground/base position in world pixels. */
  y: number;
}

export interface BombDefinition {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  fuseSeconds: number;
  explosionRadius: number;
  explosionEnergy: number;
  restitution?: number;
  friction?: number;
}

export interface BotPatrolRangeDefinition { minX: number; maxX: number; }

export interface BirdPatrolRangeDefinition { minX: number; maxX: number; }

/** Autonomous rolling character. Speed is expressed in pixels per second. */
export interface BotDefinition {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  speed: number;
  direction?: -1 | 1;
  restitution?: number;
  friction?: number;
  patrolRange?: BotPatrolRangeDefinition;
}


export interface RadiationEnemyPatrolRangeDefinition { minX: number; maxX: number; }

/** Yellow radiation-symbol patrol enemy that detonates and launches six guided shards. */
export interface RadiationEnemyDefinition {
  id: string; x: number; y: number; radius: number; mass: number; speed: number; direction?: -1 | 1;
  detectionRadius: number; fuseSeconds: number; explosionRadius: number; explosionEnergy: number;
  fragmentRadius: number; fragmentLaunchSpeed: number; fragmentSpeed: number;
  fragmentArmingDelaySeconds: number; fragmentLifetimeSeconds: number; fragmentHitImpulse: number;
  restitution?: number; friction?: number; patrolRange?: RadiationEnemyPatrolRangeDefinition;
}

/** Flying guardian that patrols a horizontal segment and defends its rectangular territory. */
export interface BirdDefinition {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  patrolSpeed: number;
  attackSpeed: number;
  aggressive?: boolean;
  detectionRadius: number;
  /** Additional momentum impulse (mass * px/s) applied on a successful attack hit. */
  attackImpulse: number;
  direction?: -1 | 1;
  restitution?: number;
  friction?: number;
  patrolRange: BirdPatrolRangeDefinition;
}

/** One-shot pickup that multiplies the ball's current linear and angular velocity. */
export interface PoopPickupDefinition {
  id: string;
  x: number;
  y: number;
  radius: number;
  speedBoostPercent: number;
  spinBoostPercent: number;
}

/** One-shot party popper that launches the player upward and forward on contact. */
export interface PartyPopperDefinition {
  id: string;
  x: number;
  y: number;
  radius: number;
  /** Minimum upward launch speed in px/s; the popper always sends the ball upward. */
  upwardLaunchSpeed: number;
  /** Additional horizontal speed in px/s, applied in the ball's current travel direction. */
  forwardBoost: number;
}

/** Pushable green character that repeatedly vomits impulses at the player inside its detection radius. */
export interface VomitEnemyDefinition {
  id: string;
  x: number;
  y: number;
  radius: number;
  mass: number;
  detectionRadius: number;
  pulseImpulse: number;
  pulseIntervalSeconds: number;
  restitution?: number;
  friction?: number;
}

/** Rectangular world region containing valid surfaces where a teleporting demon may materialize. */
export interface DemonSpawnAreaDefinition {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Purple demon that periodically teleports onto a surface and zaps the player. */
export interface DemonDefinition {
  id: string;
  spawnArea: DemonSpawnAreaDefinition;
  radius: number;
  mass: number;
  /** Time between the end of one appearance and the next warning lightning. */
  respawnIntervalSeconds: number;
  /** Visible lightning warning before materialization. Defaults to one second. */
  telegraphSeconds?: number;
  /** Delay between materialization and the strike. Defaults to 0.5 seconds. */
  attackDelaySeconds?: number;
  /** Time remaining visible after appearing. Defaults to 4 seconds. */
  activeSeconds?: number;
  /** Player-centre distance required for the zap to connect. */
  attackRadius: number;
  /** Momentum impulse applied to the player during a successful zap. */
  lightningImpulse: number;
  /** Equal-and-opposite momentum applied when the ball physically touches the demon. Defaults to 520. */
  collisionImpulse?: number;
  restitution?: number;
  friction?: number;
}

export type MovingPlatformSurface = 'stone' | 'glass' | 'metal' | 'grass';

/** A paired mechanism: the lever is the only control for its moving platform. */
export interface PlatformSwitchDefinition {
  id: string;
  lever: {
    /** Hinge position; y is the top surface the lever is mounted on. */
    x: number;
    y: number;
    /** Physical and visual rod length in pixels. Defaults to 48. */
    height?: number;
    /** Required horizontal ball speed in px/s to move the lever. */
    minimumImpactSpeed: number;
    initialState?: 'on' | 'off';
  };
  platform: {
    width: number;
    surface: MovingPlatformSurface;
    /** Constant travel speed along the waypoint path, in px/s. */
    speed: number;
    /** Platform centre positions. The platform loops through these points. */
    points: { x: number; y: number }[];
  };
}

export interface BoxSolidDefinition {
  id: string; type: 'box'; x: number; y: number; width: number; height: number; material?: string;
  breakable?: BreakableDefinition; springSurfaces?: BoxSpringSurfaceDefinition[]; movable?: MovableDefinition; texture?: SurfaceTextureAssignment; borders?: BoxBorderStyles;
}

export interface PolygonSolidDefinition {
  id: string; type: 'polygon'; vertices: [number, number][]; material?: string; breakable?: BreakableDefinition; springSurfaces?: PolygonSpringSurfaceDefinition[]; texture?: SurfaceTextureAssignment; borders?: PolygonBorderDefinition[];
}

export type SolidDefinition = BoxSolidDefinition | PolygonSolidDefinition;
export type BreakableSolidDefinition = SolidDefinition & { breakable: BreakableDefinition };
export type TriggerType = 'hazard' | 'checkpoint' | 'goal';

export interface TriggerDefinition {
  id: string; type: TriggerType; x: number; y: number; width: number; height: number;
  respawnX?: number; respawnY?: number;
}

export interface DecorationDefinition {
  id: string; type: 'circle' | 'rectangle' | 'line' | 'text';
  x: number; y: number; width?: number; height?: number; radius?: number;
  color?: string; text?: string; depth?: number;
}

export interface LevelDefinition {
  schemaVersion: 1;
  id: string;
  title: string;
  description?: string;
  world: { width: number; height: number; killPlaneY: number; backgroundColor?: string };
  spawn: { x: number; y: number };
  solids: SolidDefinition[];
  triggers: TriggerDefinition[];
  bots?: BotDefinition[];
  birds?: BirdDefinition[];
  radiationEnemies?: RadiationEnemyDefinition[];
  bombs?: BombDefinition[];
  statues?: StatueDefinition[];
  rollingObjects?: RollingObjectDefinition[];
  poopPickups?: PoopPickupDefinition[];
  partyPoppers?: PartyPopperDefinition[];
  vomitEnemies?: VomitEnemyDefinition[];
  demonEnemies?: DemonDefinition[];
  platformSwitches?: PlatformSwitchDefinition[];
  materials?: Record<string, TerrainMaterialDefinition>;
  decorations?: DecorationDefinition[];
  camera?: { followOffsetX?: number; smoothing?: number; minX?: number; maxX?: number };
}
