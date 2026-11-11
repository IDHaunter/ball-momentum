export interface RespawnPoint { x: number; y: number; checkpointId: string | null; }

export class CheckpointManager {
  private checkpoint: RespawnPoint | null = null;
  constructor(private readonly spawn: { x: number; y: number }) {}

  activate(id: string, x: number, y: number): boolean {
    if (this.checkpoint?.checkpointId === id) return false;
    this.checkpoint = { x, y, checkpointId: id };
    return true;
  }

  getRespawnPoint(): RespawnPoint {
    return this.checkpoint ? { ...this.checkpoint } : { ...this.spawn, checkpointId: null };
  }

  get currentCheckpointId(): string | null { return this.checkpoint?.checkpointId ?? null; }
  reset(): void { this.checkpoint = null; }
}
