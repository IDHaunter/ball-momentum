export interface TerrainMaterialDefinition {
  friction: number;
  frictionStatic: number;
  restitution: number;
}

export interface BoxSolidDefinition {
  id: string; type: 'box'; x: number; y: number; width: number; height: number; material?: string;
}

export interface PolygonSolidDefinition {
  id: string; type: 'polygon'; vertices: [number, number][]; material?: string;
}

export type SolidDefinition = BoxSolidDefinition | PolygonSolidDefinition;
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
