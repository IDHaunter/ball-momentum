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


## Wall bounce and dust impact patch — 2026-11-11

- Core TypeScript typecheck (physics/controller dependencies): passed using the globally available `tsc`.
- Focused runtime harness: passed (`MatterCollisionMapper` wall impact capture, controller reflection, tangential velocity retention, and minimum-speed filtering).
- Repository TypeScript syntax transpilation: 84 files, 0 syntax errors.
- Added five Vitest regression cases in `MatterCollisionMapper.test.ts` and `BallController.test.ts`; Vitest itself was not run in this environment because project dependencies are absent.
- Production build and Playwright E2E were not run in this environment for the same dependency/browser limitation.

Suggested local verification:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```


## Follow-up corrections from owner validation — 2026-11-11

The owner reported these results from the prior wall-bounce archive:

- `npm run typecheck` reported two `SolidDefinition.width` errors in `TerrainFactory.ts`.
- `npm run test` reported 40 passing tests and one failed `polygonCentroid` expectation.

Corrections in this archive:

1. Added explicit `BoxSolidDefinition` type predicates to both neighbor lookups in `TerrainFactory.ts`. This was checked using the global TypeScript compiler with `strict: true` against the actual `TerrainFactory.ts` and matching project type interfaces; the focused typecheck passed.
2. Corrected the centroid test expectation to match the actual test polygon. A direct execution of the project's transpiled `polygonCentroid` and `getCollisionVertices` functions confirmed the centroid `(868.7157894736843, 1046.8240923163523)` and the expected 24 px side overlap.

The full project `npm run typecheck` and `npm run test` were not run in this packaging environment because `node_modules` and cached Vitest dependencies are absent. Please rerun them locally after extracting this archive. The corrected test suite should still contain 41 tests; this report does not claim a full Vitest pass.

## Reliable wall-bounce follow-up — 2026-11-11

The project now includes 43 unit-test cases. Two new regression cases cover a wall impact detected during an already-active contact and a single bounce per contact with re-arming after separation. The previous low-speed test now asserts a visible reverse velocity and outward position separation.

Checks performed for this follow-up:

| Check | Result |
|---|---|
| Strict TypeScript check of physics, mapper, controller, and EffectsRenderer modules (using a lightweight Phaser type declaration shim) | Passed |
| Integrated compiled runtime harness for `MatterPhysicsWorld` + `MatterCollisionMapper` + `BallController`, including active contact after solver velocity zeroing | Passed |
| Impact velocities tested: 35, 70, 600, and 840 px/s | All reversed direction; low-speed impacts met the configured minimum rebound speed |
| Separation from wall after bounce | Passed |
| TypeScript syntax transpilation (84 files) | Passed; zero syntax diagnostics |
| Full Vitest / Vite build / Playwright E2E | Not run; project dependencies and Chromium are absent in this environment |

The integrated harness used the actual compiled project classes with a mock Matter world; it verifies the adapter/controller event flow and configured velocity math, but it does not replace a browser run against Phaser's real Matter engine. Re-run `npm run typecheck`, `npm run test`, `npm run build`, and `npm run test:e2e` locally after extracting the archive.

## Wall spin reversal and damped landing hops — 2026-11-13

Changes included in this archive:

1. Vertical wall bounces reverse angular velocity and retain 85% of the previous spin magnitude by default. The new `wallBounce.spinRetention` property is available in F3.
2. Jump landings produce up to three damped rebounds along the detected support normal. Defaults: restitution 0.52, tangential retention 0.96, minimum impact 45 px/s, minimum outgoing speed 35 px/s, three rebounds, and 1.5 px support separation.
3. Ground support normals are now available from `GroundContactTracker`, including averaged normals for simultaneous support contacts.
4. A lingering active contact while the ball is moving away from the ground is not interpreted as a landing. This is important for preserving the hop sequence after Matter's solver has resolved the first contact.
5. F3 and Reset Defaults include the new settings.

Checks performed:

| Check | Result |
|---|---|
| Strict TypeScript compilation of core physics/controller/config/UI modules | Passed |
| Strict TypeScript compilation of changed unit test files with a minimal Vitest declaration shim | Passed |
| Runtime check: wall horizontal velocity reverses | Passed |
| Runtime check: wall angular velocity reverses at configured retention | Passed |
| Runtime check: three landing hops decay (500 px/s input produced 260, 135.2, 70.3 px/s) | Passed |
| Runtime check: stale separating contact is ignored | Passed |
| Runtime check: landing sequence settles after the third hop | Passed |
| ZIP integrity | Passed |

There are 47 unit-test cases in `tests/unit`. The actual Vitest runner, full project `npm run typecheck`, Vite build, and Playwright E2E were not run here because the package dependencies and Chromium executable are not installed in this environment. Run the following on the development machine after extracting the archive:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```
