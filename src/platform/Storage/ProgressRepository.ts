export interface PlayerPreferences { soundEnabled: boolean; reducedMotion: boolean; }

export interface ProgressRepository {
  getCompletedLevelIds(): string[];
  markLevelCompleted(levelId: string, elapsedMs?: number): void;
  getPreferences(): PlayerPreferences;
  savePreferences(preferences: PlayerPreferences): void;
}
