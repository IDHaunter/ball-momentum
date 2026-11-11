import type { GameState } from '../core/GameState';
import { GameStateMachine } from '../core/GameStateMachine';
import type { EventBus } from '../core/EventBus';

export class GameFlowController {
  readonly machine = new GameStateMachine();
  constructor(private readonly events: EventBus) {
    this.machine.subscribe((state, previous) => this.events.emit('stateChanged', { state, previous }));
  }
  get state(): GameState { return this.machine.state; }
  transition(next: GameState): void { this.machine.transition(next); }
}
