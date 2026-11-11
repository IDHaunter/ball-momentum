import { EventBus } from '../core/EventBus';
import { GameFlowController } from '../gameflow/GameFlowController';
import type { GameplayScene } from '../scenes/GameplayScene';

export class GameRegistry {
  readonly events = new EventBus();
  readonly flow = new GameFlowController(this.events);
  gameplayScene: GameplayScene | null = null;
}
