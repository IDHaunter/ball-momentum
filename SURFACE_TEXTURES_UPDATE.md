# Procedural Surface Textures — Feature Update

## What changed

- Added a shared surface texture type and Zod validation for named patterns or per-solid options (`density`, `opacity`, `seed`).
- Added the `SURFACE_TEXTURE_CATALOG` reference with 10 documented pattern presets.
- Added a deterministic CanvasTexture generator. Every generated canvas is clipped to the exact box or polygon outline.
- Split terrain fill and outline rendering into separate depth layers so textures remain inside the fill and never cover borders or spring markers.
- Added synchronized texture overlays for movable boxes; the pattern follows the Matter body position and rotation and is released when the block is removed or falls below the kill plane.
- Applied example textures across level 01 and Physics Sandbox. The Sandbox includes stone, ice, rubber, glass, concrete and wood patterns.

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
    "pattern": "ice-crystals",
    "density": 1.1,
    "opacity": 0.5,
    "seed": 23
  }
}
```

The texture is visual only. It does not modify the physics material, collision geometry, mass, spring impulse, breakable threshold, or movable-block impact threshold.

## Verification

- 10/10 procedural pattern smoke checks passed using a CanvasTexture-compatible runtime harness.
- Strict TypeScript check passed for changed production modules and related tests with narrow Phaser/Zod/Vitest API declarations.
- Syntax transpile passed for all 116 TypeScript source and test files.
- `level-01.json`: valid JSON, 10 solids, 10 textured solids.
- `physics-sandbox.json`: valid JSON, 15 solids, 15 textured solids.
- Unit suite now contains 161 test cases across 28 files. The full Vitest suite and Vite production build were not run in this environment because project npm dependencies are not installed here.
