# Procedural Surface Texture Library

Surface textures are a visual layer independent of the physics material. They do not change friction, restitution, mass, collision geometry, breakability, or spring behavior.

## JSON usage

Assign a built-in pattern to an individual box or polygon with `texture`:

```json
{
  "id": "ice-platform",
  "type": "box",
  "x": 900,
  "y": 700,
  "width": 420,
  "height": 90,
  "material": "ice",
  "texture": "ice-strata"
}
```

Use an object when a specific solid needs custom density, opacity, or a deterministic variation seed:

```json
"texture": {
  "pattern": "stone-fragments",
  "density": 1.15,
  "opacity": 0.48,
  "seed": 27
}
```

- `pattern` selects an entry from `src/rendering/SurfaceTextureCatalog.ts`.
- `density` is a multiplier from `0.25` to `3`; larger values create more frequent/smaller motifs.
- `opacity` is from `0.05` to `1`.
- `seed` changes motif placement while keeping it stable across reloads.

The texture is drawn procedurally to a cached CanvasTexture and clipped to the exact shape. Polygon patterns never draw outside the polygon. Movable boxes use a synchronized overlay that follows their translation and rotation.

## Built-in catalog

| Pattern | Suggested materials | Visual motif |
|---|---|---|
| `stone-fragments` | stone, normal | Loose scatter of small irregular pebbles, mineral flecks and shallow fractures |
| `stone-strata` | stone, normal | Uneven sediment layers |
| `ice-strata` | ice | Small soft snow drifts mixed with translucent ice chips |
| `asphalt-pavers` | normal, stone | Neat rectangular concrete paving blocks in aligned, subtly staggered rows |
| `metal-sheen` | metal, normal | Smooth continuous metal with broad soft reflections and restrained glints |
| `brick-masonry` | brick, stone | Warm terracotta bricks in staggered courses with visible mortar |
| `glass-facets` | glass | Soft translucent triangular colour planes and isolated glints, without drawn cross-seams |
| `concrete-grain` | normal, stone | Fine aggregate speckles and scratches |
| `wood-grain` | wood | Warm brown timber boards with visible fibres and knots |
| `sand-specks` | sand, normal | Warm grains and tiny pebbles |

Legacy JSON IDs remain accepted and are never rewritten in stored level data. They render as their current visual family and inherit that family's default density and opacity: `ice-crystals` → `ice-strata`; `stone-masonry` and `ice-facets` → `stone-fragments`; `asphalt-masonry` → `asphalt-pavers`; `metal-polish` → `metal-sheen`; `rubber-dots` and `rubber-chevrons` → `brick-masonry`. Explicit per-solid density, opacity, and seed overrides continue to take precedence.

The catalog metadata lives in `src/rendering/SurfaceTextureCatalog.ts`; rendering algorithms live in `src/rendering/SurfaceTextureGenerator.ts`. Add a new ID to `src/level/SurfaceTextureTypes.ts`, add metadata to the catalog, implement its drawing case in the generator, and add schema/catalog tests.

## Sandbox texture gallery

The end of `physics-sandbox` contains a labelled ten-sample display row covering every current gallery pattern: stone fragments, stone strata, snow drifts and ice chips, concrete paving blocks, polished metal, brick masonry, glass facets, concrete grain, warm wood grain, and sand specks. The goal trigger is placed after the gallery so players can inspect every sample before finishing the level. The brick and wood samples use their own material base colours, while the concrete paver and metal samples use the neutral material so their appearance remains independent of physical material tuning.
