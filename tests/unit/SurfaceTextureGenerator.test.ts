import { describe, expect, it, vi } from 'vitest';
import { SURFACE_TEXTURE_NAMES } from '../../src/level/SurfaceTextureTypes';
import { createSurfaceTextureCanvas, normalizeSurfaceTexture } from '../../src/rendering/SurfaceTextureGenerator';

function createTextureHarness() {
  const calls: string[] = [];
  const context = new Proxy({}, {
    get(_target, property) {
      if (typeof property === 'string') {
        return (..._args: unknown[]) => { calls.push(property); };
      }
      return undefined;
    },
  }) as CanvasRenderingContext2D;
  const texture = { getContext: () => context, refresh: vi.fn() };
  const textures = {
    exists: vi.fn(() => false),
    createCanvas: vi.fn(() => texture),
  };
  const scene = { textures } as unknown as Parameters<typeof createSurfaceTextureCanvas>[0];
  return { scene, textures, texture, calls };
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

  it('renders pressed ice strata as layered seams and cracks instead of snowflakes', () => {
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

    expect(harness.calls).toContain('lineTo');
    expect(harness.calls).toContain('ellipse');
    expect(harness.calls).not.toContain('arc');
    expect(harness.calls).toContain('stroke');
  });

  it('keeps glass facets while removing the crossing seam strokes', () => {
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
    expect(harness.calls).not.toContain('stroke');
  });

  it('keeps the old ice-crystals key as a snowflake-free compatibility alias', () => {
    const current = createTextureHarness();
    const legacy = createTextureHarness();
    const polygon = [{ x: 0, y: 0 }, { x: 140, y: 0 }, { x: 140, y: 90 }, { x: 0, y: 90 }];
    createSurfaceTextureCanvas(current.scene, 'ice-current', 140, 90, polygon, 'ice-strata', 7);
    createSurfaceTextureCanvas(legacy.scene, 'ice-legacy', 140, 90, polygon, 'ice-crystals', 7);

    expect(legacy.calls).toEqual(current.calls);
    expect(legacy.calls).not.toContain('arc');
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
    expect(normalizeSurfaceTexture({ pattern: 'rubber-dots', density: 8, opacity: 0.75, seed: 12 }, 5)).toEqual({
      pattern: 'rubber-dots', density: 3, opacity: 0.75, seed: 12,
    });
  });
});
