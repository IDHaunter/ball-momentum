# Per-edge surface borders

Every box or polygon may now define its visible boundary independently from its physical material and interior texture. Border styling is render-only: it does not change collision geometry, friction, restitution, spring impulse, breakable energy, or mass.

## Box sides

Use `borders` as a partial object. Unspecified sides keep the standard grey outline.

```json
{
  "id": "grass-platform",
  "type": "box",
  "x": 300,
  "y": 700,
  "width": 420,
  "height": 100,
  "material": "normal",
  "texture": "stone-fragments",
  "borders": {
    "top": "grass",
    "right": "stone",
    "bottom": "none",
    "left": "metal"
  }
}
```

## Polygon edges

For polygons, edge `0` is `vertices[0] -> vertices[1]`; subsequent edge indexes follow the vertex order and the final edge wraps to vertex `0`.

```json
{
  "id": "trimmed-ramp",
  "type": "polygon",
  "vertices": [[700, 760], [1050, 850], [1050, 1280], [700, 1280]],
  "material": "stone",
  "borders": [
    { "edge": 0, "style": "grass" },
    { "edge": 1, "style": "stone" },
    { "edge": 2, "style": "none" },
    { "edge": 3, "style": "metal" }
  ]
}
```

## Built-in styles

- `default`: standard grey edge (glass uses its cyan default).
- `none`: hide that edge completely.
- `grass`: layered green turf lip with short grass blades outside the shape.
- `asphalt`: dark road shoulder with short pale dashed markings.
- `stone`: layered rock rim with small irregular seam marks.
- `metal`: dark steel rim with bright highlights and rivet marks.
- `ice`: cyan frozen rim with small crystalline glints.
- `wood`: warm wood-colored rim with grain ticks.

The same edge styles work on movable boxes. Their border overlay follows translation and rotation and is destroyed with the block.

## Spring surfaces

A configured `springSurfaces` edge is rendered on top of its border style as wide black-and-yellow hazard tape with diagonal dark bands and a pale highlight. This override is intentional: players can recognize a spring surface immediately even if the shape also has `borders` configuration. Glass still ignores spring behavior and does not render spring tape.

## Validation

Polygon border indexes must refer to existing edges and may be assigned only once. Box sides are schema-validated. A side that is not listed defaults to `default`.
