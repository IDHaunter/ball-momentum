import type { IPhysicsWorld } from '../physics/IPhysicsWorld';
import type { LevelDefinition } from './LevelTypes';
import type { TriggerRenderer } from '../rendering/TriggerRenderer';

export class TriggerFactory {
  constructor(private readonly world: IPhysicsWorld, private readonly renderer: TriggerRenderer) {}

  build(level: LevelDefinition): void {
    for (const trigger of level.triggers) {
      this.world.createSensor({
        id: trigger.id, type: trigger.type,
        x: trigger.x, y: trigger.y, width: trigger.width, height: trigger.height,
      });
    }
    this.renderer.render(level.triggers);
  }
}
