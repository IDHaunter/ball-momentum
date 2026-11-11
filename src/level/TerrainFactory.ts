import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { BoxSolidDefinition, LevelDefinition, PolygonSolidDefinition, SolidDefinition, TerrainMaterialDefinition } from './LevelTypes';
import type { TerrainRenderer } from '../rendering/TerrainRenderer';

const DEFAULT_MATERIAL: TerrainMaterialDefinition = { friction: 0.35, frictionStatic: 0.55, restitution: 0.02 };

export class TerrainFactory {
  constructor(private readonly world: IPhysicsWorld, private readonly renderer: TerrainRenderer) {}

  build(level: LevelDefinition): void {
    for (const solid of level.solids) {
      const material = level.materials?.[solid.material ?? 'normal'] ?? DEFAULT_MATERIAL;
      if (solid.type === 'box') {
        this.world.createStaticBox({
          id: solid.id, x: solid.x, y: solid.y, width: solid.width, height: solid.height,
          friction: material.friction, frictionStatic: material.frictionStatic, restitution: material.restitution,
        });
      } else {
        this.world.createStaticPolygon({
          id: solid.id,
          vertices: getCollisionVertices(solid, level.solids),
          friction: material.friction, frictionStatic: material.frictionStatic, restitution: material.restitution,
        });
      }
    }
    this.renderer.render(level);
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
