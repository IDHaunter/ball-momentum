export class GameClock {
  private elapsedMs = 0;
  get nowMs(): number { return this.elapsedMs; }
  advance(stepMs: number): void { this.elapsedMs += stepMs; }
  reset(): void { this.elapsedMs = 0; }
}
