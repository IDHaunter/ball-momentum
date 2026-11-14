import { describe, expect, it } from 'vitest';
import { BALL_SKIN_OPTIONS, DEFAULT_BALL_SKIN, isBallSkin, normalizeBallSkin } from '../../src/player/BallSkin';

describe('ball skin catalogue', () => {
  it('provides the requested funny and sports-ball skins', () => {
    expect(BALL_SKIN_OPTIONS.map((option) => option.id)).toEqual([
      'smiley', 'soccer', 'basketball', 'eye', 'alien',
    ]);
    expect(new Set(BALL_SKIN_OPTIONS.map((option) => option.id)).size).toBe(BALL_SKIN_OPTIONS.length);
    for (const option of BALL_SKIN_OPTIONS) {
      expect(option.previewSvg).toContain('<svg');
      expect(option.label.length).toBeGreaterThan(0);
    }
  });

  it('uses the smiley as the default skin', () => {
    expect(DEFAULT_BALL_SKIN).toBe('smiley');
    expect(normalizeBallSkin(undefined)).toBe('smiley');
  });

  it('accepts known skins and safely falls back for unknown stored values', () => {
    expect(isBallSkin('eye')).toBe(true);
    expect(normalizeBallSkin('basketball')).toBe('basketball');
    expect(isBallSkin('dragon')).toBe(false);
    expect(normalizeBallSkin('dragon')).toBe('smiley');
  });
});
