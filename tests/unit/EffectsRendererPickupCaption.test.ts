import { describe, expect, it } from 'vitest';
import { resolvePickupCaption } from '../../src/rendering/EffectsRenderer';

describe('pickup captions', () => {
  it('does not create text when the JSON message is absent or blank', () => {
    expect(resolvePickupCaption()).toBeNull();
    expect(resolvePickupCaption('')).toBeNull();
    expect(resolvePickupCaption('   ')).toBeNull();
  });

  it('trims and preserves a configured caption', () => {
    expect(resolvePickupCaption('  Упс!  ')).toBe('Упс!');
  });
});
