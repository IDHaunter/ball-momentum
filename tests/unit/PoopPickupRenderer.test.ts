import { describe, expect, it } from 'vitest';
import { getPoopPickupCharacterLayout } from '../../src/rendering/PoopPickupRenderer';

describe('PoopPickupRenderer layout', () => {
  it('places the scaled character exactly on the pickup surface line', () => {
    const definition = { x: 4050, y: 861, radius: 19 };
    const layout = getPoopPickupCharacterLayout(definition);
    const visualBottom = layout.y + 19.5 * layout.scale;

    expect(layout.x).toBe(definition.x);
    expect(layout.groundY).toBe(definition.y + definition.radius);
    expect(visualBottom).toBeCloseTo(layout.groundY, 8);
    expect(layout.y).toBeGreaterThan(definition.y);
  });

  it('keeps the baseline aligned when the pickup radius changes', () => {
    for (const radius of [12, 18, 24, 32]) {
      const layout = getPoopPickupCharacterLayout({ x: 100, y: 200, radius });
      expect(layout.y + 19.5 * layout.scale).toBeCloseTo(200 + radius, 8);
    }
  });
});
