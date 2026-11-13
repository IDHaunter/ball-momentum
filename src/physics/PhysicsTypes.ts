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

export interface StaticBoxOptions {
  id: string; x: number; y: number; width: number; height: number;
  friction: number; frictionStatic: number; restitution: number;
}

export interface StaticPolygonOptions {
  id: string; vertices: Vector2[];
  friction: number; frictionStatic: number; restitution: number;
}

export interface SensorOptions {
  id: string; type: 'hazard' | 'checkpoint' | 'goal';
  x: number; y: number; width: number; height: number;
}

export type PhysicsEvent =
  | { type: 'BALL_TERRAIN_CONTACT_STARTED' | 'BALL_TERRAIN_CONTACT_ACTIVE'; terrainId: string; supportNormal: Vector2; impactSpeed: number }
  | { type: 'BALL_TERRAIN_CONTACT_ENDED'; terrainId: string }
  | { type: 'BALL_WALL_IMPACT'; terrainId: string; normal: Vector2; incomingVelocity: Vector2; contactPoint: Vector2; impactSpeed: number; penetrationDepth: number }
  | { type: 'BALL_ENTERED_TRIGGER'; triggerId: string; triggerType: 'hazard' | 'checkpoint' | 'goal' }
  | { type: 'BALL_EXITED_TRIGGER'; triggerId: string };
