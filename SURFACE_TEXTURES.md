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
  "texture": "ice-crystals"
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
| `ice-crystals` | ice | Six-armed frost crystals and bright glints |
| `ice-facets` | ice, glass | Angular translucent facets |
| `rubber-dots` | rubber | Raised dimples and grip grooves |
| `rubber-chevrons` | rubber | Repeated V-shaped traction grooves |
| `glass-facets` | glass, ice | Fine triangular facets and fracture seams |
| `concrete-grain` | normal, stone | Fine aggregate speckles and scratches |
| `wood-grain` | wood, stone, normal | Flowing grain lines and occasional knots |
| `sand-specks` | sand, normal | Warm grains and tiny pebbles |

The catalog metadata lives in `src/rendering/SurfaceTextureCatalog.ts`; rendering algorithms live in `src/rendering/SurfaceTextureGenerator.ts`. Add a new ID to `src/level/SurfaceTextureTypes.ts`, add metadata to the catalog, implement its drawing case in the generator, and add schema/catalog tests.
