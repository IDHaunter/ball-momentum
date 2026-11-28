import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { PartyPopperDefinition } from './LevelTypes';
import type { PartyPopperRenderer } from '../rendering/PartyPopperRenderer';

/** Creates one-shot party-popper sensors and owns their remaining level definitions. */
export class PartyPopperFactory {
  private readonly poppers = new Map<string, PartyPopperDefinition>();

  constructor(private readonly world: IPhysicsWorld, private readonly renderer: PartyPopperRenderer) {}

  build(definitions: PartyPopperDefinition[]): void {
    this.clear();
    for (const definition of definitions) {
      this.poppers.set(definition.id, definition);
      this.world.createSensor({
        id: definition.id,
        type: 'partyPopper',
        x: definition.x - definition.radius,
        y: definition.y - definition.radius,
        width: definition.radius * 2,
        height: definition.radius * 2,
      });
    }
    this.renderer.render(definitions);
  }

  collect(id: string): PartyPopperDefinition | null {
    const definition = this.poppers.get(id);
    if (!definition) return null;
    this.poppers.delete(id);
    this.world.removeSensor(id);
    this.renderer.collect(id);
    return definition;
  }

  clear(): void {
    for (const id of this.poppers.keys()) this.world.removeSensor(id);
    this.poppers.clear();
    this.renderer.clear();
  }
}
