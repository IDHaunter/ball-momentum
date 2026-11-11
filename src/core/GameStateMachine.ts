import type { GameState } from './GameState';

const TRANSITIONS: Record<GameState, GameState[]> = {
  BOOT: ['MAIN_MENU'],
  MAIN_MENU: ['LOADING_LEVEL'],
  LOADING_LEVEL: ['PLAYING', 'MAIN_MENU'],
  PLAYING: ['PAUSED', 'RESPAWNING', 'LEVEL_COMPLETE', 'LOADING_LEVEL', 'MAIN_MENU'],
  PAUSED: ['PLAYING', 'LOADING_LEVEL', 'MAIN_MENU'],
  RESPAWNING: ['PLAYING', 'LOADING_LEVEL', 'MAIN_MENU'],
  LEVEL_COMPLETE: ['LOADING_LEVEL', 'MAIN_MENU'],
};

export class GameStateMachine {
  private current: GameState = 'BOOT';
  private readonly listeners = new Set<(next: GameState, previous: GameState) => void>();

  get state(): GameState { return this.current; }

  transition(next: GameState): void {
    if (next === this.current) return;
    if (!TRANSITIONS[this.current].includes(next)) {
      throw new Error(`Illegal game state transition: ${this.current} -> ${next}`);
    }
    const previous = this.current;
    this.current = next;
    for (const listener of this.listeners) listener(next, previous);
  }

  subscribe(listener: (next: GameState, previous: GameState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}
