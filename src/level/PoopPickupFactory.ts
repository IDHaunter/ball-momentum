import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { PoopPickupDefinition } from './LevelTypes';
import type { PoopPickupRenderer } from '../rendering/PoopPickupRenderer';

/** Creates one-shot sensor pickups and owns their remaining level definitions. */
export class PoopPickupFactory {
  private readonly pickups = new Map<string, PoopPickupDefinition>();

  constructor(private readonly world: IPhysicsWorld, private readonly renderer: PoopPickupRenderer) {}

  build(definitions: PoopPickupDefinition[]): void {
    this.clear();
    for (const definition of definitions) {
      this.pickups.set(definition.id, definition);
      this.world.createSensor({
        id: definition.id,
        type: 'poop',
        x: definition.x - definition.radius,
        y: definition.y - definition.radius,
        width: definition.radius * 2,
        height: definition.radius * 2,
      });
    }
    this.renderer.render(definitions);
  }

  collect(id: string): PoopPickupDefinition | null {
    const definition = this.pickups.get(id);
    if (!definition) return null;
    this.pickups.delete(id);
    this.world.removeSensor(id);
    this.renderer.collect(id);
    return definition;
  }

  clear(): void {
    for (const id of this.pickups.keys()) this.world.removeSensor(id);
    this.pickups.clear();
    this.renderer.clear();
  }
}
