/** Built-in procedural surface patterns available to level JSON files. */
export const SURFACE_TEXTURE_GALLERY_NAMES = [
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
] as const;

/** All supported texture patterns. Kept as a named export for schema consumers. */
export const SURFACE_TEXTURE_NAMES = SURFACE_TEXTURE_GALLERY_NAMES;

export type SurfaceTexturePattern = (typeof SURFACE_TEXTURE_NAMES)[number];
export type SurfaceTextureGalleryPattern = (typeof SURFACE_TEXTURE_GALLERY_NAMES)[number];

export interface SurfaceTextureOptions {
  pattern: SurfaceTexturePattern;
  /** Motif density multiplier. 1 is the default pattern spacing. */
  density?: number;
  /** Overall pattern alpha, from 0.05 to 1. */
  opacity?: number;
  /** Stable per-solid variation seed. */
  seed?: number;
}

/** A short string is the convenient default; an object allows per-solid tuning. */
export type SurfaceTextureAssignment = SurfaceTexturePattern | SurfaceTextureOptions;
