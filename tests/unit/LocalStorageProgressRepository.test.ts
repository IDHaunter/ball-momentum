import { afterEach, describe, expect, it, vi } from 'vitest';
import { LocalStorageProgressRepository } from '../../src/platform/Storage/LocalStorageProgressRepository';

function installMemoryStorage(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
    clear: () => values.clear(),
  };
  vi.stubGlobal('localStorage', storage);
  return values;
}

afterEach(() => vi.unstubAllGlobals());

describe('LocalStorageProgressRepository ball skin preferences', () => {
  it('defaults older saves without a ball skin to the smiley', () => {
    installMemoryStorage({
      'ball-momentum.preferences.v1': JSON.stringify({ soundEnabled: false, reducedMotion: true }),
    });
    const preferences = new LocalStorageProgressRepository().getPreferences();
    expect(preferences).toEqual({ soundEnabled: false, reducedMotion: true, ballSkin: 'smiley' });
  });

  it('restores a selected built-in skin', () => {
    installMemoryStorage({
      'ball-momentum.preferences.v1': JSON.stringify({ soundEnabled: true, reducedMotion: false, ballSkin: 'basketball' }),
    });
    expect(new LocalStorageProgressRepository().getPreferences().ballSkin).toBe('basketball');
  });

  it('falls back safely when stored skin data is unknown', () => {
    installMemoryStorage({
      'ball-momentum.preferences.v1': JSON.stringify({ soundEnabled: true, reducedMotion: false, ballSkin: 'not-a-real-skin' }),
    });
    expect(new LocalStorageProgressRepository().getPreferences().ballSkin).toBe('smiley');
  });

  it('persists the selected skin together with the other preferences', () => {
    const values = installMemoryStorage();
    const repository = new LocalStorageProgressRepository();
    repository.savePreferences({ soundEnabled: false, reducedMotion: true, ballSkin: 'eye' });
    expect(JSON.parse(values.get('ball-momentum.preferences.v1') ?? '{}')).toEqual({
      soundEnabled: false,
      reducedMotion: true,
      ballSkin: 'eye',
    });
  });
});
