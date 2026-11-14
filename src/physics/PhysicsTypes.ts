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

export interface StaticBoxOptions {
  id: string; x: number; y: number; width: number; height: number;
  friction: number; frictionStatic: number; restitution: number; breakable?: boolean; springSurfaces?: SpringSurfacePhysicsDefinition[];
}

export interface StaticPolygonOptions {
  id: string; vertices: Vector2[];
  friction: number; frictionStatic: number; restitution: number; breakable?: boolean; springSurfaces?: SpringSurfacePhysicsDefinition[];
}

export interface MovableBoxOptions {
  id: string; x: number; y: number; width: number; height: number;
  mass: number; minimumImpactEnergy: number;
  killPlaneY: number; friction: number; frictionStatic: number; restitution: number;
}

export interface SensorOptions {
  id: string; type: 'hazard' | 'checkpoint' | 'goal';
  x: number; y: number; width: number; height: number;
}

export type PhysicsEvent =
  | { type: 'BALL_TERRAIN_CONTACT_STARTED' | 'BALL_TERRAIN_CONTACT_ACTIVE'; terrainId: string; supportNormal: Vector2; impactSpeed: number }
  | { type: 'BALL_TERRAIN_CONTACT_ENDED'; terrainId: string }
  | { type: 'BALL_MOVABLE_IMPACT'; movableId: string; normal: Vector2; incomingVelocity: Vector2; normalImpactSpeed: number; impactEnergy: number; ballMass: number }
  | { type: 'BALL_SPRING_IMPACT'; terrainId: string; surfaceId: string; normal: Vector2; incomingVelocity: Vector2; contactPoint: Vector2; impactSpeed: number; impulse: number }
  | { type: 'BALL_WALL_IMPACT'; terrainId: string; normal: Vector2; incomingVelocity: Vector2; contactPoint: Vector2; impactSpeed: number; penetrationDepth: number; breakable?: boolean }
  | { type: 'BALL_TERRAIN_IMPACT'; terrainId: string; normal: Vector2; incomingVelocity: Vector2; contactPoint: Vector2; impactSpeed: number; penetrationDepth: number }
  | { type: 'BALL_ENTERED_TRIGGER'; triggerId: string; triggerType: 'hazard' | 'checkpoint' | 'goal' }
  | { type: 'BALL_EXITED_TRIGGER'; triggerId: string };
