import type { GameState } from './GameState';

export interface GameEventMap {
  stateChanged: { state: GameState; previous: GameState };
  levelLoaded: { id: string; title: string };
  checkpoint: { id: string };
  died: { reason: string };
  completed: { id: string; title: string; hasNext: boolean };
  error: { message: string };
  debugChanged: { enabled: boolean };
  boostChanged: { available: boolean; used: boolean };
}

type Listener<T> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<keyof GameEventMap, Set<Listener<never>>>();

  on<K extends keyof GameEventMap>(event: K, listener: Listener<GameEventMap[K]>): () => void {
    const set = this.listeners.get(event) ?? new Set<Listener<never>>();
    set.add(listener as Listener<never>);
    this.listeners.set(event, set);
    return () => set.delete(listener as Listener<never>);
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    for (const listener of this.listeners.get(event) ?? []) {
      (listener as Listener<GameEventMap[K]>)(payload);
    }
  }

  clear(): void { this.listeners.clear(); }
}
