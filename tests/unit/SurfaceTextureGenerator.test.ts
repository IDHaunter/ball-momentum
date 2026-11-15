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
