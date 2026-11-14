import type { ProgressRepository, PlayerPreferences } from './ProgressRepository';
import { DEFAULT_BALL_SKIN, normalizeBallSkin } from '../../player/BallSkin';

const PROGRESS_KEY = 'ball-momentum.progress.v1';
const PREFERENCES_KEY = 'ball-momentum.preferences.v1';

interface ProgressData { completed: string[]; bestTimes: Record<string, number>; }

export class LocalStorageProgressRepository implements ProgressRepository {
  getCompletedLevelIds(): string[] { return this.readProgress().completed; }

  markLevelCompleted(levelId: string, elapsedMs?: number): void {
    const progress = this.readProgress();
    if (!progress.completed.includes(levelId)) progress.completed.push(levelId);
    if (elapsedMs !== undefined) {
      const previous = progress.bestTimes[levelId];
      if (previous === undefined || elapsedMs < previous) progress.bestTimes[levelId] = elapsedMs;
    }
    this.write(PROGRESS_KEY, progress);
  }

  getPreferences(): PlayerPreferences {
    const stored = this.read<Partial<PlayerPreferences>>(PREFERENCES_KEY);
    return {
      soundEnabled: stored?.soundEnabled ?? true,
      reducedMotion: stored?.reducedMotion ?? false,
      ballSkin: normalizeBallSkin(stored?.ballSkin ?? DEFAULT_BALL_SKIN),
    };
  }

  savePreferences(preferences: PlayerPreferences): void { this.write(PREFERENCES_KEY, preferences); }

  private readProgress(): ProgressData {
    return this.read<ProgressData>(PROGRESS_KEY) ?? { completed: [], bestTimes: {} };
  }

  private read<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) as T : null;
    } catch { return null; }
  }

  private write(key: string, value: unknown): void {
    try { localStorage.setItem(key, JSON.stringify(value)); }
    catch { /* Storage can be unavailable in private or restricted browsing modes. */ }
  }
}
