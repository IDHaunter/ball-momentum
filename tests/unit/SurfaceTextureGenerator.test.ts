import { describe, expect, it, vi } from 'vitest';
import { SURFACE_TEXTURE_NAMES } from '../../src/level/SurfaceTextureTypes';
import { createSurfaceTextureCanvas, normalizeSurfaceTexture } from '../../src/rendering/SurfaceTextureGenerator';

function createTextureHarness() {
  const calls: string[] = [];
  const fillStyles: string[] = [];
  const context = new Proxy({}, {
    get(_target, property) {
      if (property === 'createLinearGradient') {
        return (..._args: unknown[]) => ({ addColorStop: (..._stopArgs: unknown[]) => { calls.push('addColorStop'); } });
      }
      if (typeof property === 'string') {
        return (..._args: unknown[]) => { calls.push(property); };
      }
      return undefined;
    },
    set(_target, property, value) {
      if (property === 'fillStyle') fillStyles.push(String(value));
      return true;
    },
  }) as CanvasRenderingContext2D;
  const texture = { getContext: () => context, refresh: vi.fn() };
  const textures = {
    exists: vi.fn(() => false),
    createCanvas: vi.fn(() => texture),
  };
  const scene = { textures } as unknown as Parameters<typeof createSurfaceTextureCanvas>[0];
  return { scene, textures, texture, calls, fillStyles };
}

describe('SurfaceTextureGenerator', () => {
  it('clips every catalog pattern to the supplied solid polygon and refreshes its canvas', () => {
    for (const pattern of SURFACE_TEXTURE_NAMES) {
      const harness = createTextureHarness();
      createSurfaceTextureCanvas(
        harness.scene,
        `test-${pattern}`,
        120,
        80,
        [{ x: 0, y: 0 }, { x: 120, y: 0 }, { x: 80, y: 80 }, { x: 20, y: 80 }],
        pattern,
        99,
      );
      expect(harness.textures.createCanvas).toHaveBeenCalledOnce();
      expect(harness.calls).toContain('clip');
      expect(harness.texture.refresh).toHaveBeenCalledOnce();
    }
  });

  it('renders ice as scattered snow mounds and translucent ice chips', () => {
    const harness = createTextureHarness();
    createSurfaceTextureCanvas(
      harness.scene,
      'pressed-ice',
      180,
      120,
      [{ x: 0, y: 0 }, { x: 180, y: 0 }, { x: 180, y: 120 }, { x: 0, y: 120 }],
      'ice-strata',
      42,
    );

    expect(harness.calls).toContain('quadraticCurveTo');
    expect(harness.calls).toContain('ellipse');
    expect(harness.calls).toContain('arc');
    expect(harness.calls).toContain('stroke');
  });

  it('restores the original soft triangular glass panes without drawn seam strokes', () => {
    const harness = createTextureHarness();
    createSurfaceTextureCanvas(
      harness.scene,
      'soft-glass-facets',
      180,
      120,
      [{ x: 0, y: 0 }, { x: 180, y: 0 }, { x: 180, y: 120 }, { x: 0, y: 120 }],
      'glass-facets',
      17,
    );

    expect(harness.calls).toContain('fill');
    expect(harness.calls).toContain('lineTo');
    expect(harness.calls).not.toContain('stroke');
  });

  it('renders metal with broad smooth reflections and no isolated bright dots', () => {
    const harness = createTextureHarness();
    createSurfaceTextureCanvas(
      harness.scene,
      'smooth-metal-sheen',
      220,
      140,
      [{ x: 0, y: 0 }, { x: 220, y: 0 }, { x: 220, y: 140 }, { x: 0, y: 140 }],
      'metal-sheen',
      27,
    );

    expect(harness.calls.filter((call) => call === 'addColorStop').length).toBeGreaterThan(5);
    expect(harness.calls.filter((call) => call === 'fillRect').length).toBeGreaterThan(2);
    expect(harness.calls).not.toContain('ellipse');
    expect(harness.calls).not.toContain('arc');
  });

  it('renders concrete pavers with a restrained mix of warm, cool and mineral grey slabs', () => {
    const harness = createTextureHarness();
    createSurfaceTextureCanvas(
      harness.scene,
      'varied-concrete-pavers',
      220,
      140,
      [{ x: 0, y: 0 }, { x: 220, y: 0 }, { x: 220, y: 140 }, { x: 0, y: 140 }],
      { pattern: 'pavers', seed: 31 },
    );

    expect(harness.fillStyles).toContain('rgba(57,67,73,0.86)');
    const slabColours = harness.fillStyles.filter((style) => /^rgba\(\d+,\d+,\d+,0\.97\)$/.test(style));
    expect(new Set(slabColours).size).toBeGreaterThan(4);
    expect(slabColours.some((style) => {
      const [, red, green, blue] = style.match(/^rgba\((\d+),(\d+),(\d+),/) ?? [];
      return red !== undefined && Number(red) > Number(green) + 3 && Number(green) > Number(blue);
    })).toBe(true); // Warm greige slab.
    expect(slabColours.some((style) => {
      const [, red, green, blue] = style.match(/^rgba\((\d+),(\d+),(\d+),/) ?? [];
      return red !== undefined && Number(blue) > Number(red) + 5;
    })).toBe(true); // Cool blue-grey slab.
    expect(harness.calls.filter((call) => call === 'fillRect').length).toBeGreaterThan(20);
    expect(harness.calls).toContain('arc');
  });

  it('renders wood as warm planks and brick as staggered masonry rather than grey grain or purple grip', () => {
    const polygon = [{ x: 0, y: 0 }, { x: 160, y: 0 }, { x: 160, y: 100 }, { x: 0, y: 100 }];
    const wood = createTextureHarness();
    const brick = createTextureHarness();
    createSurfaceTextureCanvas(wood.scene, 'wood-sample', 160, 100, polygon, 'wood-grain', 9);
    createSurfaceTextureCanvas(brick.scene, 'brick-sample', 160, 100, polygon, 'brick-masonry', 9);
    expect(wood.calls).toContain('fillRect');
    expect(wood.calls).toContain('stroke');
    expect(wood.fillStyles).toContain('rgba(113,65,36,0.94)');
    expect(wood.fillStyles).toContain('rgba(166,101,53,0.96)');
    expect(brick.calls).toContain('fillRect');
    expect(brick.calls).toContain('lineTo');
    expect(brick.fillStyles).toContain('rgba(69,57,49,0.94)');
    expect(brick.fillStyles).toContain('rgba(177,91,57,0.96)');
  });

  it('reuses an existing cached texture without redrawing it', () => {
    const harness = createTextureHarness();
    harness.textures.exists = vi.fn(() => true);
    createSurfaceTextureCanvas(
      harness.scene,
      'already-cached',
      100,
      60,
      [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 60 }, { x: 0, y: 60 }],
      'stone-fragments',
    );
    expect(harness.textures.createCanvas).not.toHaveBeenCalled();
    expect(harness.texture.refresh).not.toHaveBeenCalled();
  });

  it('clamps runtime overrides and keeps the selected seed deterministic', () => {
    expect(normalizeSurfaceTexture({ pattern: 'brick-masonry', density: 8, opacity: 0.75, seed: 12 }, 5)).toEqual({
      pattern: 'brick-masonry', density: 3, opacity: 0.75, seed: 12,
    });
  });
});
