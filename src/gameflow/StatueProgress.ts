export interface StatueProgressSnapshot {
  completed: number;
  total: number;
  remaining: number;
  complete: boolean;
}

/** Tracks one-shot statue objectives for the currently loaded level. */
export class StatueProgress {
  private readonly requiredIds: Set<string>;
  private readonly activatedIds = new Set<string>();

  constructor(statueIds: readonly string[] = []) {
    this.requiredIds = new Set(statueIds);
  }

  activate(id: string): boolean {
    if (!this.requiredIds.has(id) || this.activatedIds.has(id)) return false;
    this.activatedIds.add(id);
    return true;
  }

  get snapshot(): StatueProgressSnapshot {
    const total = this.requiredIds.size;
    const completed = this.activatedIds.size;
    return {
      completed,
      total,
      remaining: Math.max(0, total - completed),
      complete: completed === total,
    };
  }
}
