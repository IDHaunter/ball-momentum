import type { RespawnPoint } from './CheckpointManager';

export class RespawnManager {
  private remainingMs = 0;
  private target: RespawnPoint | null = null;
  private active = false;

  start(target: RespawnPoint, delayMs = 420): void {
    if (this.active) return;
    this.target = { ...target };
    this.remainingMs = delayMs;
    this.active = true;
  }

  advance(stepMs: number): RespawnPoint | null {
    if (!this.active) return null;
    this.remainingMs -= stepMs;
    if (this.remainingMs > 0) return null;
    this.active = false;
    const target = this.target;
    this.target = null;
    return target;
  }

  reset(): void { this.remainingMs = 0; this.target = null; this.active = false; }
  get isActive(): boolean { return this.active; }
}
