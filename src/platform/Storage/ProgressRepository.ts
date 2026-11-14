import type { BallSkin } from '../../player/BallSkin';

export interface PlayerPreferences {
  soundEnabled: boolean;
  reducedMotion: boolean;
  ballSkin: BallSkin;
}

export interface ProgressRepository {
  getCompletedLevelIds(): string[];
  markLevelCompleted(levelId: string, elapsedMs?: number): void;
  getPreferences(): PlayerPreferences;
  savePreferences(preferences: PlayerPreferences): void;
}
