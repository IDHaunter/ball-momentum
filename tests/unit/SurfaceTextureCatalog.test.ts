import { describe, expect, it } from 'vitest';
import { SURFACE_TEXTURE_CATALOG, createSurfaceTextureRandom, hashSurfaceTextureSeed } from '../../src/rendering/SurfaceTextureCatalog';
import { normalizeSurfaceTexture } from '../../src/rendering/SurfaceTextureGenerator';
import { SURFACE_TEXTURE_NAMES } from '../../src/level/SurfaceTextureTypes';

describe('SurfaceTextureCatalog', () => {
  it('has a descriptive catalog entry for every schema pattern', () => {
    for (const pattern of SURFACE_TEXTURE_NAMES) {
      expect(SURFACE_TEXTURE_CATALOG[pattern].label.length).toBeGreaterThan(0);
      expect(SURFACE_TEXTURE_CATALOG[pattern].description.length).toBeGreaterThan(0);
      expect(SURFACE_TEXTURE_CATALOG[pattern].suggestedMaterials.length).toBeGreaterThan(0);
    }
  });

  it('produces stable seeded procedural variations', () => {
    const first = createSurfaceTextureRandom(hashSurfaceTextureSeed('level-a:stone-wall'));
    const second = createSurfaceTextureRandom(hashSurfaceTextureSeed('level-a:stone-wall'));
    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second));
  });

  it('uses sensible defaults and clamps per-solid overrides', () => {
    expect(normalizeSurfaceTexture('ice-crystals', 12)).toMatchObject({
      pattern: 'ice-crystals',
      density: SURFACE_TEXTURE_CATALOG['ice-crystals'].defaultDensity,
      opacity: SURFACE_TEXTURE_CATALOG['ice-crystals'].defaultOpacity,
      seed: 12,
    });
    expect(normalizeSurfaceTexture({ pattern: 'stone-fragments', density: 8, opacity: 0.8 }, 7)).toMatchObject({
      density: 3,
      opacity: 0.8,
      seed: 7,
    });
  });
});
