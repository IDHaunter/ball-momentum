import { describe, expect, it } from 'vitest';
import { getPartyPopperLayout } from '../../src/rendering/PartyPopperRenderer';

describe('PartyPopperRenderer layout', () => {
  it('rests the scaled cone on the pickup surface line', () => {
    const definition = { x: 790, y: 681, radius: 19 };
    const layout = getPartyPopperLayout(definition);
    const visualBottom = layout.y + 19 * layout.scale;

    expect(layout.x).toBe(definition.x);
    expect(layout.groundY).toBe(definition.y + definition.radius);
    expect(visualBottom).toBeCloseTo(layout.groundY, 8);
  });

  it('keeps the ground contact aligned when the configured radius changes', () => {
    for (const radius of [12, 19, 24, 32]) {
      const layout = getPartyPopperLayout({ x: 100, y: 200, radius });
      expect(layout.y + 19 * layout.scale).toBeCloseTo(200 + radius, 8);
    }
  });
});
