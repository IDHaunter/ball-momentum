import type { SurfaceTexturePattern } from '../level/SurfaceTextureTypes';

export interface SurfaceTextureCatalogEntry {
  label: string;
  description: string;
  suggestedMaterials: readonly string[];
  defaultDensity: number;
  defaultOpacity: number;
}

/** Central library of procedural patterns. Add new patterns here and in the generator switch. */
export const SURFACE_TEXTURE_CATALOG: Record<SurfaceTexturePattern, SurfaceTextureCatalogEntry> = {
  'stone-fragments': {
    label: 'Stone fragments',
    description: 'Irregular rock chips, mineral flecks and shallow fractures.',
    suggestedMaterials: ['stone', 'normal'],
    defaultDensity: 0.9,
    defaultOpacity: 0.42,
  },
  'stone-strata': {
    label: 'Stone strata',
    description: 'Layered, uneven sediment lines carved into the surface.',
    suggestedMaterials: ['stone', 'normal'],
    defaultDensity: 0.85,
    defaultOpacity: 0.34,
  },
  'ice-strata': {
    label: 'Snow drifts & ice chips',
    description: 'Soft miniature snow mounds scattered between translucent blue-white ice chunks.',
    suggestedMaterials: ['ice'],
    defaultDensity: 1.15,
    defaultOpacity: 0.88,
  },
  'asphalt-pavers': {
    label: 'Concrete paving blocks',
    description: 'Neat staggered concrete pavers with gentle warm, cool and mineral-grey colour variation between slabs.',
    suggestedMaterials: ['normal', 'stone'],
    defaultDensity: 1.05,
    defaultOpacity: 0.92,
  },
  'metal-sheen': {
    label: 'Smooth polished metal',
    description: 'A calm continuous metal face with broad soft reflections and restrained specular glints.',
    suggestedMaterials: ['metal', 'normal'],
    defaultDensity: 0.9,
    defaultOpacity: 0.76,
  },
  'brick-masonry': {
    label: 'Brick masonry',
    description: 'Warm terracotta bricks in staggered courses with visible mortar and softly bevelled faces.',
    suggestedMaterials: ['brick', 'stone'],
    defaultDensity: 0.92,
    defaultOpacity: 0.9,
  },
  'glass-facets': {
    label: 'Glass facets',
    description: 'Soft translucent triangular colour planes and isolated specular glints, without drawn seam lines.',
    suggestedMaterials: ['glass'],
    defaultDensity: 1,
    defaultOpacity: 0.58,
  },
  'concrete-grain': {
    label: 'Concrete grain',
    description: 'Fine aggregate speckles and short mineral scratches.',
    suggestedMaterials: ['normal', 'stone'],
    defaultDensity: 1,
    defaultOpacity: 0.28,
  },
  'wood-grain': {
    label: 'Wood grain',
    description: 'Warm honey-brown timber planks with flowing fibres and occasional knots.',
    suggestedMaterials: ['wood'],
    defaultDensity: 0.85,
    defaultOpacity: 0.86,
  },
  'sand-specks': {
    label: 'Sand specks',
    description: 'Fine warm grains and tiny pebbles.',
    suggestedMaterials: ['sand', 'normal'],
    defaultDensity: 1.2,
    defaultOpacity: 0.3,
  },
  'stone-masonry': {
    label: 'Stone fragments (legacy alias)',
    description: 'Legacy key retained for old levels; rendered as stone-fragments.',
    suggestedMaterials: ['stone', 'normal'],
    defaultDensity: 0.9,
    defaultOpacity: 0.42,
  },
  'ice-crystals': {
    label: 'Snow drifts & ice chips (legacy alias)',
    description: 'Legacy key retained for old levels; rendered as ice-strata.',
    suggestedMaterials: ['ice'],
    defaultDensity: 1.15,
    defaultOpacity: 0.88,
  },
  'ice-facets': {
    label: 'Stone fragments (legacy alias)',
    description: 'Legacy key retained for old levels; rendered as stone-fragments.',
    suggestedMaterials: ['stone', 'normal'],
    defaultDensity: 0.9,
    defaultOpacity: 0.42,
  },
  'asphalt-masonry': {
    label: 'Concrete paving blocks (legacy alias)',
    description: 'Legacy key retained for old levels; rendered as asphalt-pavers.',
    suggestedMaterials: ['normal', 'stone'],
    defaultDensity: 1.05,
    defaultOpacity: 0.92,
  },
  'metal-polish': {
    label: 'Smooth polished metal (legacy alias)',
    description: 'Legacy key retained for old levels; rendered as metal-sheen.',
    suggestedMaterials: ['metal', 'normal'],
    defaultDensity: 0.9,
    defaultOpacity: 0.76,
  },
  'rubber-dots': {
    label: 'Brick masonry (legacy alias)',
    description: 'Legacy key retained for old levels; rendered as brick-masonry.',
    suggestedMaterials: ['brick', 'stone'],
    defaultDensity: 0.92,
    defaultOpacity: 0.9,
  },
  'rubber-chevrons': {
    label: 'Brick masonry (legacy alias)',
    description: 'Legacy key retained for old levels; rendered as brick-masonry.',
    suggestedMaterials: ['brick', 'stone'],
    defaultDensity: 0.92,
    defaultOpacity: 0.9,
  },
};

export function describeSurfaceTexture(pattern: SurfaceTexturePattern): SurfaceTextureCatalogEntry {
  return SURFACE_TEXTURE_CATALOG[pattern];
}

/** FNV-1a string hash gives stable texture variation across reloads. */
export function hashSurfaceTextureSeed(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Deterministic pseudo-random values keep procedural motifs stable between runs. */
export function createSurfaceTextureRandom(seed: number): () => number {
  let state = seed >>> 0 || 0x6d2b79f5;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}
