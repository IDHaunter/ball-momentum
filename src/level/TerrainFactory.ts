import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { BoxSolidDefinition, LevelDefinition, PolygonSolidDefinition, SolidDefinition, TerrainMaterialDefinition } from './LevelTypes';
import { polygonEdgeOutwardNormal } from '../utils/GeometryUtils';
import type { TerrainRenderer } from '../rendering/TerrainRenderer';

const DEFAULT_MATERIAL: TerrainMaterialDefinition = { friction: 0.35, frictionStatic: 0.55, restitution: 0.02 };

const BOX_SURFACE_NORMALS = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
} as const;

function getBoxSpringSurfaces(solid: BoxSolidDefinition) {
  return (solid.springSurfaces ?? []).map((surface) => ({
    id: `${solid.id}:spring:${surface.side}`,
    normal: BOX_SURFACE_NORMALS[surface.side],
    impulse: surface.impulse,
  }));
}

function getPolygonSpringSurfaces(
  solid: PolygonSolidDefinition,
  collisionVertices: { x: number; y: number }[],
) {
  return (solid.springSurfaces ?? []).map((surface) => ({
    id: `${solid.id}:spring:edge-${surface.edge}`,
    normal: polygonEdgeOutwardNormal(collisionVertices, surface.edge),
    impulse: surface.impulse,
  }));
}

export class TerrainFactory {
  constructor(private readonly world: IPhysicsWorld, private readonly renderer: TerrainRenderer) {}

  build(level: LevelDefinition): void {
    for (const solid of level.solids) {
      const material = level.materials?.[solid.material ?? 'normal'] ?? DEFAULT_MATERIAL;
      if (solid.type === 'box') {
        if (solid.movable) {
          this.world.createMovableBox({
            id: solid.id, x: solid.x, y: solid.y, width: solid.width, height: solid.height,
            mass: solid.movable.mass,
            minimumImpactEnergy: solid.movable.minimumImpactEnergy,
            killPlaneY: level.world.killPlaneY,
            friction: material.friction,
            frictionStatic: material.frictionStatic,
            restitution: material.restitution,
          });
        } else {
          this.world.createStaticBox({
            id: solid.id, x: solid.x, y: solid.y, width: solid.width, height: solid.height,
            friction: material.friction, frictionStatic: material.frictionStatic, restitution: material.restitution,
            breakable: Boolean(solid.breakable),
            springSurfaces: solid.material === 'glass' ? [] : getBoxSpringSurfaces(solid),
          });
        }
      } else {
        const collisionVertices = getCollisionVertices(solid, level.solids);
        this.world.createStaticPolygon({
          id: solid.id,
          vertices: collisionVertices,
          friction: material.friction, frictionStatic: material.frictionStatic, restitution: material.restitution,
          breakable: Boolean(solid.breakable),
          springSurfaces: solid.material === 'glass' ? [] : getPolygonSpringSurfaces(solid, collisionVertices),
        });
      }
    }
    this.renderer.render(level);
  }

  remove(id: string): void {
    this.world.removeTerrainBody(id);
  }
}


/**
 * Returns collider vertices for a sloped floor polygon. If the polygon joins
 * boxes on either side, its lower side corners are moved slightly inside those
 * boxes. The visible terrain keeps the original vertices; only hidden collider
 * side walls are removed, preventing a rolling ball from catching on seams.
 */
export function getCollisionVertices(
  solid: PolygonSolidDefinition,
  allSolids: SolidDefinition[],
  overlapPx = 24,
): { x: number; y: number }[] {
  const vertices = solid.vertices.map(([x, y]) => ({ x, y }));
  if (vertices.length !== 4 || overlapPx <= 0) return vertices;

  const [surfaceStart, surfaceEnd, lowerRight, lowerLeft] = vertices;
  const epsilon = 0.5;
  const leftNeighbor = allSolids.find((candidate): candidate is BoxSolidDefinition =>
    candidate.type === 'box'
      && Math.abs(candidate.x + candidate.width - surfaceStart.x) <= epsilon
      && Math.abs(candidate.y - surfaceStart.y) <= epsilon
      && candidate.y + candidate.height >= lowerLeft.y - epsilon,
  );
  const rightNeighbor = allSolids.find((candidate): candidate is BoxSolidDefinition =>
    candidate.type === 'box'
      && Math.abs(candidate.x - surfaceEnd.x) <= epsilon
      && Math.abs(candidate.y - surfaceEnd.y) <= epsilon
      && candidate.y + candidate.height >= lowerRight.y - epsilon,
  );

  if (leftNeighbor) {
    lowerLeft.x = surfaceStart.x - Math.min(overlapPx, leftNeighbor.width * 0.5);
  }
  if (rightNeighbor) {
    lowerRight.x = surfaceEnd.x + Math.min(overlapPx, rightNeighbor.width * 0.5);
  }
  return vertices;
}
