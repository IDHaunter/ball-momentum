# Build and verification report

Date: 2026-11-11

## Project assembly

- Reconstructed the project from `BALL_GAME_IMPLEMENTATION.md`.
- Extracted all 96 files that have content blocks in the specification.
- Preserved the directory layout, level JSON files, configuration, source modules, and supplied tests.
- Applied the supplied Air Boost boundary correction in `src/player/AirBoostController.ts`: the latest boost boundary is exclusive (`elapsedMs >= latestAfterTakeoffMs` is rejected), matching the supplied unit-test expectation.

## Follow-up fixes

### Phaser typecheck fixes

1. Removed the unsupported `gravity.scale` property from the Matter gravity vector in `src/app/createGame.ts`. The gravity scale is passed separately through `Matter.World.setGravity(x, y, scale)`.
2. Renamed the custom `GameplayScene.registry` member to `gameRegistry` to avoid shadowing `Phaser.Scene.registry`.
3. Renamed the custom `GameplayScene.physics` getter to `physicsSettings` to avoid overriding `Phaser.Scene.physics`.
4. Updated the relevant consumers in `src/app/GameApplication.ts`.

### Gameplay fixes

1. Corrected the support-normal orientation in `src/physics/MatterCollisionMapper.ts`. Matter's raw collision normal is the minimum-translation direction for `bodyA`; the mapper now converts it to the normal pointing outward from terrain toward the ball.
2. Updated `src/input/KeyboardInputAdapter.ts` so a focused button does not swallow gameplay keystrokes. Text inputs, selects, textareas, and editable content still retain keyboard focus behavior.
3. Updated `src/level/TerrainFactory.ts` to bury the side faces of sloped polygon colliders 24 px inside adjacent platform boxes. The source level vertices remain unchanged, so the visible ramp profile is preserved.
4. Clarified keyboard and swipe directions in the main menu and README.
5. Added nine unit regression cases across `BallController`, `MatterCollisionMapper`, `GroundContactTracker`, and `TerrainFactory`.

## Checks completed in this environment for this gameplay patch

| Check | Result |
|---|---|
| TypeScript syntax parsing (87 `.ts` files; global TypeScript compiler API) | Passed; zero syntax diagnostics |
| Manual regression harness: Matter normal orientation in both body orders | Passed |
| Manual regression harness: floor vs. underside contact detection and grace interval | Passed |
| Manual regression harness: grounded jump launches and enables Air Boost | Passed |
| Manual regression harness: collider side overlap and untouched triangle geometry | Passed |
| Manual regression harness: Space key works while a UI button has focus | Passed |
| Manual regression harness: swipe direction mapping | Passed |
| JSON parsing for both level files and package configuration | Passed |
| ZIP archive integrity | Passed |

The manual harness ran 10 focused checks. It is not a substitute for running Vitest or the browser physics simulation against the actual Phaser runtime.

## User-reported checks on the previous gameplay build

The project owner reported that, before this gameplay patch, their local Mac environment passed:

- `npm run typecheck`
- `npm run test` — 8 test files, 23 tests passed
- `npm run build` — passed (with non-fatal Zod/Rollup annotation and chunk-size warnings)

Their Playwright run did not start because the Chromium executable was not installed. This report does not claim those commands have been rerun after the current gameplay changes.

## Ramp floating-contact follow-up fix

- Corrected `MatterPhysicsWorld.createStaticPolygon` to position each `fromVertices` collider at the polygon's area-weighted centroid, not its bounding-box centre. Matter's `Bodies.fromVertices` re-centres vertices around the body centre of mass; the previous mismatch shifted asymmetric ramp and triangle colliders away from the visible geometry.
- Added four `polygonCentroid` regression tests covering the adjusted tutorial ramp, the triangle ramp, winding direction, and zero-area input.
- Manual geometry regression checked all 4 polygon colliders across both level JSON files. Reconstructed world vertices matched their source coordinates with zero offset. The former bounding-box placement would have shifted the colliders vertically by 26.82 px (tutorial ramp), 36.67 px (tutorial triangle), 47.82 px (sandbox slope), and 40 px (sandbox triangle).
- TypeScript syntax parsing passed for all 84 source and test `.ts` files. The standalone `GeometryUtils.ts` strict typecheck also passed. ZIP integrity check passed.
- The existing 24 px overlap at ramp side walls remains in place to avoid seam catching.
- Dependency-backed Vitest, full project typecheck, Vite build, and browser E2E were not rerun in this environment because project dependencies are not installed here.

## Checks not completed for this archive

A dependency-backed `npm run typecheck`, `npm run test`, `npm run build`, and `npm run test:e2e` could not be rerun in this environment: `npm install` timed out while attempting to reach the npm registry, and project `node_modules` is absent.

After extracting this archive on the development machine, run:

```bash
npm install
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

For manual gameplay verification, check the level start platform, both ends of the first ramp, the sandbox ramp, and the checkpoint/goal sequence. On flat ground, use Space or S, or swipe down. W / Up / swipe up is an air boost and only works after takeoff.
