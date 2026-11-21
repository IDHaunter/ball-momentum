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
| `pavers` | normal, stone | Neat staggered concrete pavers in restrained warm, cool and mineral-grey tones; the matching `pavers` edge uses one larger, gently irregular top course and compact regular side/bottom blocks |
| `metal-sheen` | metal, normal | Smooth continuous metal with broad soft reflections and restrained glints |
| `brick-masonry` | brick, stone | Warm terracotta bricks in staggered courses with visible mortar |
| `glass-facets` | glass | Soft translucent triangular colour planes and isolated glints, without drawn cross-seams |
| `concrete-grain` | normal, stone | Fine aggregate speckles and scratches |
| `wood-grain` | wood | Warm brown timber boards with visible fibres and knots |
| `sand-specks` | sand, normal | Warm grains and tiny pebbles |

The catalog metadata lives in `src/rendering/SurfaceTextureCatalog.ts`; rendering algorithms live in `src/rendering/SurfaceTextureGenerator.ts`. Add a new ID to `src/level/SurfaceTextureTypes.ts`, add metadata to the catalog, implement its drawing case in the generator, and add schema/catalog tests.

## Stone top-edge coating

Stone-style upper edges (`borders.top: "stone"` on boxes or a stone-styled polygon edge with an upward-facing outward normal) receive an additional shallow layer of rounded, varied pebbles. The coating is drawn by the border renderer as a deterministic visual overlay; it does not alter the solid polygon, Matter body, contact height, friction, restitution, or rolling behavior. Existing face textures such as `stone-fragments` remain unchanged. Side and bottom stone borders retain their previous engraved-chip treatment.

## Sandbox texture gallery

## Ice top-edge coating

Ice-style upper edges (`borders.top: "ice"` on boxes or an ice-styled polygon edge with an upward-facing outward normal) receive an additional playful crust of rounded blue-white ice chunks, small faceted crystals and occasional snowflake sparkles. Like the stone coating, it is a deterministic decorative overlay only: the original edge remains the sole rolling/contact plane, and the Matter body, geometry, friction, restitution and ball movement are unchanged. Existing face textures such as `ice-strata` remain unchanged. Side and bottom ice borders keep their existing smooth icy rim and glint treatment.

The end of `physics-sandbox` contains a labelled ten-sample display row covering every current gallery pattern: stone fragments, stone strata, snow drifts and ice chips, concrete paving blocks, polished metal, brick masonry, glass facets, concrete grain, warm wood grain, and sand specks. The goal trigger is placed after the gallery so players can inspect every sample before finishing the level. The brick and wood samples use their own material base colours, while the concrete paver and metal samples use the neutral material so their appearance remains independent of physical material tuning.

## Glass border finish

Glass solids can use `borders: { top: "glass", right: "glass", ... }` (or polygon edge assignments with `style: "glass"`). This is a separate, visual-only border style: it uses a subdued graphite blue-grey palette and low opacity so the edge blends into the darker translucent glass facets. Sparse soft oval reflections add a restrained glass sheen; there are no bright cyan bands, diagonal ice-like strokes, snow or crystal shapes. It does not alter the glass material's friction, restitution, breakability, collision shape or impact behavior. Existing JSON using `ice` remains valid and keeps its original ice appearance.


## Terracotta brick border

Brick-style edges (`borders: { top: "brick", right: "brick", bottom: "brick", left: "brick" }` or polygon edge assignments with `style: "brick"`) use miniature chamfered terracotta blocks with warm dark mortar joints. Upward-facing edges use one course of larger, individually skewed hand-laid bricks, with occasional raised corners and subtle height variation; vertical and bottom edges retain their compact, neat single course. The palette matches the fired-clay tones used by `brick-masonry`. This is a decorative overlay only and does not affect the solid geometry, Matter body, friction, restitution, spring behavior or movement.


### Stone and metal edge details

Stone keeps its established two-row rounded-pebble coat along upper edges. Side and bottom edges use a single row of slightly irregular rounded pebbles instead of diagonal scratch marks. Metal borders remain smooth continuous bands without repeated rivet-like points, and the `metal-sheen` face uses broad soft reflection bands without isolated bright dots. These are visual-only details and do not affect collision geometry or material physics.

## Dangerous spike borders

Use `spikes` on any box side or polygon edge to create a visibly raised lethal edge:

```json
"borders": { "top": "spikes", "right": "none", "bottom": "none", "left": "none" }
```

The default spike height is 28 px. The renderer and Matter sensors share the same triangle geometry, so the lethal volume matches the visible teeth. Contact with the protruding triangles kills the main player (respawn at the current checkpoint) or removes an enemy character. Contact with the base solid outside the raised triangles does not trigger death. Static boxes and polygons create fixed sensors; movable boxes keep their spike sensors synchronized with their translation and rotation. A short ghost/soul effect plays at the contact point. Spikes are gameplay geometry, not a friction or restitution material.
