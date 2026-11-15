/** Built-in procedural surface patterns available to level JSON files. */
export const SURFACE_TEXTURE_GALLERY_NAMES = [
  'stone-fragments',
  'stone-strata',
  'ice-strata',
  'asphalt-pavers',
  'metal-sheen',
  'brick-masonry',
  'glass-facets',
  'concrete-grain',
  'wood-grain',
  'sand-specks',
] as const;

/**
 * Legacy names remain accepted by the level schema so existing custom levels
 * continue to load. They are aliases rendered with the newer material patterns.
 */
export const SURFACE_TEXTURE_LEGACY_NAMES = [
  /** @deprecated Use ice-strata. */
  'ice-crystals',
  /** @deprecated Use stone-fragments. */
  'stone-masonry',
  /** @deprecated Use stone-fragments. */
  'ice-facets',
  /** @deprecated Use asphalt-pavers. */
  'asphalt-masonry',
  /** @deprecated Use metal-sheen. */
  'metal-polish',
  /** @deprecated Use brick-masonry. */
  'rubber-dots',
  /** @deprecated Use brick-masonry. */
  'rubber-chevrons',
] as const;

export const SURFACE_TEXTURE_NAMES = [
  ...SURFACE_TEXTURE_GALLERY_NAMES,
  ...SURFACE_TEXTURE_LEGACY_NAMES,
] as const;

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
