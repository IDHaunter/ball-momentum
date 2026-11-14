export interface TerrainMaterialDefinition {
  friction: number;
  frictionStatic: number;
  restitution: number;
}

export type BoxSurfaceSide = 'top' | 'right' | 'bottom' | 'left';

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

export interface BoxSolidDefinition {
  id: string; type: 'box'; x: number; y: number; width: number; height: number; material?: string;
  breakable?: BreakableDefinition; springSurfaces?: BoxSpringSurfaceDefinition[]; movable?: MovableDefinition;
}

export interface PolygonSolidDefinition {
  id: string; type: 'polygon'; vertices: [number, number][]; material?: string; breakable?: BreakableDefinition; springSurfaces?: PolygonSpringSurfaceDefinition[];
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
  materials?: Record<string, TerrainMaterialDefinition>;
  decorations?: DecorationDefinition[];
  camera?: { followOffsetX?: number; smoothing?: number; minX?: number; maxX?: number };
}
