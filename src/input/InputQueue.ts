import type { PlayerAction } from './PlayerAction';

export class InputQueue {
  private actions: PlayerAction[] = [];
  push(action: PlayerAction): void { this.actions.push(action); }
  drain(): PlayerAction[] { const batch = this.actions; this.actions = []; return batch; }
  clear(): void { this.actions = []; }
}
