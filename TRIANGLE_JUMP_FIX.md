# First-level triangle jump fix

## Root cause

The first-level `triangle-ramp` has vertices `(2500, 850)`, `(2650, 630)`, and `(2800, 850)`. Its two sloped faces are approximately `55.713°` from horizontal. `GroundContactTracker` previously allowed a maximum ground angle of `55°`, so contacts on those faces were physically detected but rejected as ground support. The Sandbox triangle is slightly shallower (approximately `54.736°`), which is why jumping there worked.

## Change

- Raised `groundContact.maxGroundAngleDegrees` from `55` to `60` in `PHYSICS_DEFAULTS`.
- Updated the `GameApplication` fallback defaults to `60` as well, so the Developer Panel's reset action preserves the fix.
- Did not change the level geometry, materials, collision mapping, jump strength, or Sandbox layout.

## Regression coverage

- `GroundContactTracker.test.ts` derives the outward normal of each sloped edge of the actual first-level triangle and verifies both qualify as ground support.
- `BallController.test.ts` emits support contact events for both actual triangle edges, verifies the ball becomes grounded, then requests a jump and verifies upward launch.

## Validation performed in this environment

- Strict TypeScript check passed for the changed gameplay dependency chain and both changed unit-test files (Vitest declarations supplied as a temporary local type shim because package dependencies are not installed in this environment).
- Runtime harness using the compiled project classes passed for both triangle edges: each contact was grounded and each jump launched.
- Syntax transpilation passed for all 107 TypeScript files.
- JSON parsing passed for all level JSON files.
- Full Vitest and Vite production build were not run in this environment because `node_modules` are not present.
