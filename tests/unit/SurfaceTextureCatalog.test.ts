import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LevelValidator } from '../../src/level/LevelValidator';
import { SURFACE_TEXTURE_CATALOG, createSurfaceTextureRandom, hashSurfaceTextureSeed } from '../../src/rendering/SurfaceTextureCatalog';
import { normalizeSurfaceTexture } from '../../src/rendering/SurfaceTextureGenerator';
import { SURFACE_TEXTURE_GALLERY_NAMES, SURFACE_TEXTURE_NAMES } from '../../src/level/SurfaceTextureTypes';

describe('SurfaceTextureCatalog', () => {
  it('defines only the current canonical texture identifiers', () => {
    expect(SURFACE_TEXTURE_NAMES).toEqual([
      'stone-fragments',
      'stone-strata',
      'ice-strata',
      'pavers',
      'metal-sheen',
      'brick-masonry',
      'glass-facets',
      'concrete-grain',
      'wood-grain',
      'sand-specks',
    ]);
    expect(SURFACE_TEXTURE_NAMES).toBe(SURFACE_TEXTURE_GALLERY_NAMES);
    for (const pattern of SURFACE_TEXTURE_NAMES) {
      expect(SURFACE_TEXTURE_CATALOG[pattern].label.length).toBeGreaterThan(0);
      expect(SURFACE_TEXTURE_CATALOG[pattern].description.length).toBeGreaterThan(0);
      expect(SURFACE_TEXTURE_CATALOG[pattern].suggestedMaterials.length).toBeGreaterThan(0);
    }
    expect(SURFACE_TEXTURE_CATALOG.pavers.label).toBe('Concrete paving blocks');
    expect(SURFACE_TEXTURE_CATALOG['ice-strata'].label).toBe('Snow drifts & ice chips');
    expect(SURFACE_TEXTURE_CATALOG['brick-masonry'].label).toBe('Brick masonry');
  });

  it('shows every unique texture pattern in the Physics Sandbox gallery', () => {
    const sandbox = JSON.parse(readFileSync(resolve(process.cwd(), 'public/levels/physics-sandbox.json'), 'utf8')) as {
      world: { width: number };
      camera: { maxX: number };
      solids: Array<{ id: string; x: number; width: number; material?: string; texture?: string | { pattern: string }; borders?: Record<string, string> }>;
      triggers: Array<{ id: string; x: number; width: number }>;
      materials: Record<string, { friction: number; frictionStatic: number; restitution: number }>;
    };
    const gallery = sandbox.solids.filter((solid) => solid.id.startsWith('gallery-'));
    const galleryPatterns = gallery.map((solid) => typeof solid.texture === 'string' ? solid.texture : solid.texture?.pattern);
    const expectedPatterns = SURFACE_TEXTURE_GALLERY_NAMES;
    const goal = sandbox.triggers.find((trigger) => trigger.id === 'sandbox-goal');
    const galleryRightEdge = gallery.reduce((rightmost, solid) => Math.max(rightmost, solid.x + solid.width), 0);

    expect(gallery).toHaveLength(expectedPatterns.length);
    expect(new Set(galleryPatterns)).toEqual(new Set(expectedPatterns));
    expect(gallery.map((solid) => solid.material)).toContain('brick');
    expect(gallery.map((solid) => solid.material)).toContain('wood');
    const paverSample = gallery.find((solid) => solid.id === 'gallery-pavers');
    expect(paverSample?.texture).toMatchObject({
      pattern: 'pavers',
      density: 1.05,
      opacity: 0.92,
      seed: 52,
    });
    expect(paverSample?.material).toBe('normal');
    expect(paverSample?.borders).toEqual({ top: 'pavers', right: 'pavers', bottom: 'pavers', left: 'pavers' });
    const metalSample = gallery[galleryPatterns.indexOf('metal-sheen')];
    expect(metalSample).toBeDefined();
    expect(metalSample?.texture).toMatchObject({ pattern: 'metal-sheen' });
    expect(metalSample?.material).toBe('normal');
    expect(sandbox.materials.normal).toEqual({ friction: 0.35, frictionStatic: 0.55, restitution: 0.02 });
    expect(sandbox.materials.brick).toEqual(sandbox.materials.rubber);
    expect(sandbox.materials.wood).toEqual(sandbox.materials.stone);
    expect(goal).toBeDefined();
    expect(sandbox.world.width).toBe(sandbox.camera.maxX);
    expect(goal!.x).toBeGreaterThan(galleryRightEdge);
  });

  it('keeps both shipped levels valid with canonical texture and border identifiers', () => {
    const validator = new LevelValidator();
    for (const filename of ['level-01.json', 'physics-sandbox.json']) {
      const level = JSON.parse(readFileSync(resolve(process.cwd(), 'public/levels', filename), 'utf8')) as unknown;
      expect(() => validator.validate(level, filename)).not.toThrow();
    }
  });

  it('produces stable seeded procedural variations', () => {
    const first = createSurfaceTextureRandom(hashSurfaceTextureSeed('level-a:stone-wall'));
    const second = createSurfaceTextureRandom(hashSurfaceTextureSeed('level-a:stone-wall'));
    expect(Array.from({ length: 8 }, first)).toEqual(Array.from({ length: 8 }, second));
  });

  it('uses sensible defaults and clamps per-solid overrides', () => {
    expect(normalizeSurfaceTexture('pavers', 12)).toMatchObject({
      pattern: 'pavers',
      density: SURFACE_TEXTURE_CATALOG.pavers.defaultDensity,
      opacity: SURFACE_TEXTURE_CATALOG.pavers.defaultOpacity,
      seed: 12,
    });
    expect(normalizeSurfaceTexture({ pattern: 'stone-fragments', density: 8, opacity: 0.8 }, 7)).toMatchObject({
      density: 3,
      opacity: 0.8,
      seed: 7,
    });
  });
});
