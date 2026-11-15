import { describe, expect, it } from 'vitest';
import { SettingsNavigation } from '../../src/ui/SettingsNavigation';

describe('SettingsNavigation', () => {
  it('returns to the menu that opened Settings', () => {
    const origins = ['main-menu', 'pause', 'complete'] as const;
    for (const origin of origins) {
      const navigation = new SettingsNavigation();
      navigation.openFrom(origin);
      expect(navigation.closeTo()).toBe(origin);
    }
  });

  it('resets the origin after closing Settings', () => {
    const navigation = new SettingsNavigation();
    navigation.openFrom('pause');
    expect(navigation.closeTo()).toBe('pause');
    expect(navigation.closeTo()).toBe('main-menu');
  });
});
