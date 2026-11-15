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
| `stone-fragments` | stone, normal | Irregular rock chips, mineral flecks and small fractures |
| `stone-strata` | stone, normal | Uneven sediment layers |
| `ice-strata` | ice | Compressed horizontal layers, subtle fractures and trapped air pockets |
| `ice-crystals` | ice | Legacy alias; now renders as pressed ice strata for backward compatibility |
| `ice-facets` | ice, glass | Angular translucent facets |
| `rubber-dots` | rubber | Raised dimples and grip grooves |
| `rubber-chevrons` | rubber | Repeated V-shaped traction grooves |
| `glass-facets` | glass, ice | Soft triangular colour planes with isolated highlights; no crossing seam strokes |
| `concrete-grain` | normal, stone | Fine aggregate speckles and scratches |
| `wood-grain` | wood, stone, normal | Flowing grain lines and occasional knots |
| `sand-specks` | sand, normal | Warm grains and tiny pebbles |

There are 10 distinct visual patterns. `ice-crystals` is accepted only as a backwards-compatible alias for `ice-strata`; it no longer draws snowflakes.

The catalog metadata lives in `src/rendering/SurfaceTextureCatalog.ts`; rendering algorithms live in `src/rendering/SurfaceTextureGenerator.ts`. Add a new ID to `src/level/SurfaceTextureTypes.ts`, add metadata to the catalog, implement its drawing case in the generator, and add schema/catalog tests.

## Sandbox texture gallery

The end of `physics-sandbox` contains a labelled display row for every unique built-in visual pattern: stone fragments, stone strata, pressed ice strata, ice facets, rubber dots, rubber chevrons, glass facets, concrete grain, wood grain, and sand specks. The goal trigger is placed after the gallery so players can inspect every sample before finishing the level.
