import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { LevelDefinition, SolidDefinition, TerrainMaterialDefinition } from './LevelTypes';
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
          vertices: solid.vertices.map(([x, y]) => ({ x, y })),
          friction: material.friction, frictionStatic: material.frictionStatic, restitution: material.restitution,
        });
      }
    }
    this.renderer.render(level);
  }
}
