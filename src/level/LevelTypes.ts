import type { SurfaceTextureAssignment } from './SurfaceTextureTypes';

export interface TerrainMaterialDefinition {
  friction: number;
  frictionStatic: number;
  restitution: number;
}

export type BoxSurfaceSide = 'top' | 'right' | 'bottom' | 'left';

/** Visual-only style applied to one exposed shape edge. */
export type BorderStyle = 'default' | 'none' | 'grass' | 'pavers' | 'stone' | 'metal' | 'ice' | 'glass' | 'brick' | 'wood';
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
  bombs?: BombDefinition[];
  poopPickups?: PoopPickupDefinition[];
  materials?: Record<string, TerrainMaterialDefinition>;
  decorations?: DecorationDefinition[];
  camera?: { followOffsetX?: number; smoothing?: number; minX?: number; maxX?: number };
}
