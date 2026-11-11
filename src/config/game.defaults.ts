import type { GameConfig } from './config.types';

export const GAME_DEFAULTS: GameConfig = {
  width: 1280,
  height: 720,
  backgroundColor: '#18212f',
  levelIds: ['level-01', 'physics-sandbox'],
  initialLevelId: 'level-01',
  sandboxLevelId: 'physics-sandbox',
};
