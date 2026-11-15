# Procedural Surface Textures — Feature Update

## What changed

- Added a shared surface texture type and Zod validation for named patterns or per-solid options (`density`, `opacity`, `seed`).
- Added the `SURFACE_TEXTURE_CATALOG` reference with 10 unique documented visual presets plus one backwards-compatible legacy alias.
- Added a deterministic CanvasTexture generator. Every generated canvas is clipped to the exact box or polygon outline.
- Split terrain fill and outline rendering into separate depth layers so textures remain inside the fill and never cover borders or spring markers.
- Added synchronized texture overlays for movable boxes; the pattern follows the Matter body position and rotation and is released when the block is removed or falls below the kill plane.
- Applied example textures across level 01 and Physics Sandbox. The Sandbox includes stone, ice, rubber, glass, concrete and wood patterns.
- Replaced active snowflake-style ice fill with pressed `ice-strata` layers and sparse fractures; `ice-crystals` remains as a backwards-compatible alias for existing user levels.
- Removed crossing seam strokes from `glass-facets` while preserving the triangular colour planes and isolated highlights.
- Added a labelled 10-pattern Surface Texture Gallery at the end of Physics Sandbox and moved the goal beyond the samples.

## JSON example

```json
{
  "id": "ice-platform",
  "type": "box",
  "x": 900,
  "y": 700,
  "width": 420,
  "height": 90,
  "material": "ice",
  "texture": {
    "pattern": "ice-strata",
    "density": 1.1,
    "opacity": 0.5,
    "seed": 23
  }
}
```

The Sandbox now has a display gallery for all 10 unique visual patterns. The legacy `ice-crystals` ID still validates but renders the new pressed-ice strata design.

The texture is visual only. It does not modify the physics material, collision geometry, mass, spring impulse, breakable threshold, or movable-block impact threshold.

## Verification

- 10/10 procedural pattern smoke checks passed using a CanvasTexture-compatible runtime harness.
- Strict TypeScript check passed for changed production modules and related tests with narrow Phaser/Zod/Vitest API declarations.
- Syntax transpile passed for all 116 TypeScript source and test files.
- `level-01.json`: valid JSON, 10 solids, 10 textured solids.
- `physics-sandbox.json`: valid JSON, 25 solids, 25 textured solids, with 10 labelled gallery samples and a goal after the gallery.
- The unit suite contains 178 test cases across 29 files. The full Vitest suite and Vite production build were not run in this environment because project npm dependencies are not installed here.
