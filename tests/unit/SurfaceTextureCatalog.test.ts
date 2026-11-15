import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

  it('defines pressed ice as the preferred ice pattern and retains the old key', () => {
    expect(SURFACE_TEXTURE_CATALOG['ice-strata']).toMatchObject({
      label: 'Pressed ice strata',
      suggestedMaterials: ['ice'],
    });
    expect(SURFACE_TEXTURE_CATALOG['ice-crystals'].description).toContain('Legacy key');
    expect(normalizeSurfaceTexture('ice-strata', 23).pattern).toBe('ice-strata');
  });

  it('shows every unique texture pattern in the Physics Sandbox gallery', () => {
    const sandbox = JSON.parse(readFileSync(resolve(process.cwd(), 'public/levels/physics-sandbox.json'), 'utf8')) as {
      world: { width: number };
      camera: { maxX: number };
      solids: Array<{ id: string; x: number; width: number; texture?: string | { pattern: string } }>;
      triggers: Array<{ id: string; x: number; width: number }>;
    };
    const gallery = sandbox.solids.filter((solid) => solid.id.startsWith('gallery-'));
    const galleryPatterns = gallery.map((solid) => typeof solid.texture === 'string' ? solid.texture : solid.texture?.pattern);
    const expectedPatterns = SURFACE_TEXTURE_NAMES.filter((pattern) => pattern !== 'ice-crystals');
    const goal = sandbox.triggers.find((trigger) => trigger.id === 'sandbox-goal');
    const galleryRightEdge = gallery.reduce((rightmost, solid) => Math.max(rightmost, solid.x + solid.width), 0);

    expect(gallery).toHaveLength(expectedPatterns.length);
    expect(new Set(galleryPatterns)).toEqual(new Set(expectedPatterns));
    expect(goal).toBeDefined();
    expect(sandbox.world.width).toBe(sandbox.camera.maxX);
    expect(goal!.x).toBeGreaterThan(galleryRightEdge);
  });

  it('produces stable seeded procedural variations', () => {
    const first = createSurfaceTextureRandom(hashSurfaceTextureSeed('level-a:stone-wall'));
    const second = createSurfaceTextureRandom(hashSurfaceTextureSeed('level-a:stone-wall'));
    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second));
  });

  it('uses sensible defaults and clamps per-solid overrides', () => {
    expect(normalizeSurfaceTexture('ice-strata', 12)).toMatchObject({
      pattern: 'ice-strata',
      density: SURFACE_TEXTURE_CATALOG['ice-strata'].defaultDensity,
      opacity: SURFACE_TEXTURE_CATALOG['ice-strata'].defaultOpacity,
      seed: 12,
    });
    expect(normalizeSurfaceTexture({ pattern: 'stone-fragments', density: 8, opacity: 0.8 }, 7)).toMatchObject({
      density: 3,
      opacity: 0.8,
      seed: 7,
    });
  });
});
