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

## Breakable glass terrain and Physics Sandbox obstacles — 2026-11-13

Implemented in this archive:

1. Added an optional `breakable` definition to box and polygon solids. A solid must use the `glass` material and specify a positive `thresholdEnergy`; an optional per-solid `velocityRetention` overrides the global value.
2. Added normal-impact energy calculation: `0.5 * ballMass * normalImpactSpeed^2`. Only the velocity component directed into the contacted face contributes, so a glancing impact is less effective than a perpendicular hit at the same overall speed.
3. A hit below the threshold leaves the complete collider and rendered glass shape in place. A successful hit removes the collider and visual terrain, then sends the ball through along its incoming direction with 72% velocity retention by default.
4. Added a translucent glass rendering style and a short glass-shard animation. Shards are cosmetic effects and are not independent physical bodies.
5. Added `BreakableTerrainManager` support dependencies. In the supplied sandbox stack, breaking the lower glass block cascades to the upper breakable glass block; breaking only the upper block leaves the lower block intact. This cascade currently tracks breakable glass pieces, not arbitrary non-breakable rigid bodies.
6. Added Physics Sandbox obstacles: a vertical wall, a triangular glass obstacle, and a two-piece vertical glass stack.
7. Added F3 tuning for global glass velocity retention and post-break separation distance.

Checks performed in this packaging environment:

| Check | Result |
|---|---|
| TypeScript syntax transpilation (`src` + `tests`, 88 files) | Passed; zero syntax diagnostics |
| Strict typecheck of changed physics, controller, level, and rendering modules (using a minimal Phaser declaration shim) | Passed |
| Structural type pass of all source and test files with shims for external packages (non-strict; not a replacement for the project's actual `tsc` command) | Passed |
| Glass runtime harness using the project's compiled classes: direct and glancing energy, event mapping, ball breakthrough/velocity retention | Passed |
| Glass stack runtime harness: breaking lower cascades to upper; breaking upper leaves lower intact | Passed |
| Physics Sandbox JSON validation: 4 breakable shapes, valid thresholds/materials, unique IDs, aligned stack geometry | Passed |
| ZIP archive integrity | Passed |

The runtime harness uses the actual compiled project classes with a mock Matter world. It checks the impact math, mapped contact-normal speed, cascade decisions, and breakthrough velocity, but it is not a browser simulation with the real Phaser Matter engine.

There are 60 unit-test cases in 13 files under `tests/unit`. The Vitest runner, actual dependency-backed full `npm run typecheck`, Vite production build, and Playwright browser tests were not run in this environment because project `node_modules` and the Chromium executable are not installed. The npm registry has also been unavailable in this environment. Run the full suite on the development machine:

```bash
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```

In the sandbox, test the vertical wall with both a weak and a strong direct hit, the triangular glass with a direct and a glancing hit, breaking only the top block, and breaking the lower block of the stack.


## Unit-test expectation fixes — 2026-11-13

The user reported 3 failing assertions out of 60 unit tests while `npm run typecheck` and `npm run build` passed:

- Two `TerrainFactory.test.ts` assertions used exact deep equality against objects containing only `id` and `breakable`, while the factory correctly passes complete collider definitions including geometry and glass material properties. The tests now assert the relevant fields using `toMatchObject` and also verify geometry/material propagation.
- One `BallController.test.ts` assertion used exact equality for `700 * 0.7`. IEEE-754 represents this as `489.99999999999994`; the test now uses `toBeCloseTo` for both velocity components.

No production code was changed. Full Vitest and build were not rerun in this packaging environment because dependencies are not installed here. The user's prior successful typecheck/build logs remain applicable because this patch only modifies tests and documentation.

## User-reported Vitest assertion fixes — 2026-11-13

The user reported the following results on the breakable-glass build: TypeScript typecheck passed, Vite production build passed, and 57/60 unit tests passed. The 3 failures were test assertion issues rather than gameplay failures:

1. Two `TerrainFactory.test.ts` tests captured the complete collider definition but expected an object containing only `{ id, breakable }`. The factory correctly forwards geometry and glass material properties too. The assertions now use `toMatchObject` and verify the collider dimensions/vertices, glass friction/restitution, and `breakable: true`. Capture arrays now use the actual `IPhysicsWorld` method parameter types.
2. `BallController.test.ts` expected exact equality for `700 * 0.7`. JavaScript floating-point arithmetic returns `489.99999999999994`, so the assertion now uses `toBeCloseTo(490, 10)`; the y component is checked with the same tolerance.

No production source, game behavior, level data, or physics parameters changed.

Checks performed for this test-only patch:

| Check | Result |
|---|---|
| Focused strict TypeScript check for both modified tests and their dependencies (with minimal external type declarations for unavailable Phaser/Vitest packages) | Passed |
| TypeScript syntax transpilation (`src` + `tests`, 88 files) | Passed, zero syntax diagnostics |
| Executed actual compiled `TerrainFactory.test.ts` test cases using a lightweight local Vitest-compatible assertion runner | 4 passed, 0 failed |
| Executed actual compiled `BallController.test.ts` test cases using the same runner | 10 passed, 0 failed |
| `package.json` and both level JSON files parse | Passed |
| ZIP integrity | Passed |

The lightweight runner executes the test bodies and supported assertions but is not the Vitest runtime. Full `npm test` was not rerun here because Vitest and project dependencies are not installed in this packaging environment. The user's prior log showed the other 57 cases passing before this test-only correction; rerun `npm run test` locally to confirm the complete 60-test suite.

## Spring surfaces — 2026-11-14

Implemented per-surface spring behavior for non-glass terrain:

1. Box solids accept `springSurfaces` entries with `side: "top" | "right" | "bottom" | "left"` and a positive `impulse` value.
2. Polygon solids accept `springSurfaces` entries with a zero-based `edge` index and a positive `impulse` value. Edge normals are calculated from the actual collision vertices and are independent of polygon winding.
3. The configured `impulse` is the fixed outgoing normal speed in px/s. Tangential speed is retained at the configured `springSurface.tangentRetention` (default 0.98). Because the normal component is set to a fixed launch speed rather than incremented, repeated touches do not compound spring energy.
4. Springs fire once on a newly acquired contact while the ball is moving toward or tangentially across the selected face. They do not retrigger during `collisionactive`, and a separating ball is not launched back into the surface.
5. Applying a spring launch separates the ball from the contact manifold, clears stale ground support, and prevents the regular wall-bounce/landing-bounce logic from overriding the spring response.
6. Glass ignores spring assignments. The factory passes no spring metadata for glass and the renderer does not draw spring markers on glass; breakable glass behavior is unchanged.
7. Added a spring-impact flash/particle pulse and persistent spring-edge markers. F3 exposes global tangential retention and contact separation settings.
8. The Physics Sandbox now contains three spring-enabled solids and five assigned surfaces: the step top and right side, both sloped sides of a triangle, and a horizontal floor. No glass solid has spring assignments.

### Verification completed in this environment

| Check | Result |
|---|---|
| Strict TypeScript check of app, all source dependencies, and unit tests using minimal temporary declarations for unavailable Phaser/Vitest/Zod packages | Passed |
| TypeScript syntax transpilation (`src` + `tests`, 88 files) | Passed; zero syntax diagnostics |
| Focused runtime harness using transpiled project classes | Passed; 10 checks |
| Spring activation while rolling tangentially across a new top contact | Passed |
| Polygon edge outward normals and spring contact mapping | Passed |
| Matter body-order handling (`bodyA` / `bodyB`) | Passed |
| No spring event for active contacts or separating velocity | Passed |
| Ball controller: normal launch speed, tangential retention, separation, and grounded reset | Passed |
| Repeated spring contact: fixed launch speed, no cumulative normal-speed gain | Passed |
| TerrainFactory: box sides, polygon edges, and glass spring suppression | Passed |
| TerrainRenderer spring markers and EffectsRenderer impact pulse smoke checks | Passed |
| JSON parsing for package and both level files; sandbox spring configuration | Passed; 3 solids, 5 surfaces, no glass springs |
| ZIP integrity | Passed |

The current suite contains 91 unit-test cases across 15 unit-test files, plus 2 Playwright E2E cases. New Vitest cases cover geometry, mapping, controller response, factory mapping, schema validation, duplicate surfaces, and the glass exclusion rule. The actual Vitest runner, dependency-backed `npm run typecheck`, Vite production build, and Playwright browser E2E were not run here: the project has no `node_modules`, and `npm install --ignore-scripts --no-audit --no-fund` timed out while reaching the npm registry. The strict TypeScript check above used temporary declaration shims and is not represented as the project's full dependency-backed `npm run typecheck`.

Run locally after extracting the archive:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Sandbox test sequence: roll onto `sandbox-floor-d` for the horizontal trampoline; jump onto the top of `sandbox-step`; collide with its right side; then hit either sloped edge of `sandbox-triangle`. Verify that hitting a glass wall still only breaks it according to its energy threshold and does not spring-launch the ball.

## Final spring-surface verification — 2026-11-14

After the last controller adjustment, applying a spring launch also resets stale jump/Air Boost state. This prevents a spring bounce from inheriting an old manual-jump landing sequence or a previously available air boost. The spring still provides its configured fixed outward normal speed; the tangent component is retained at 98% by default. A spring activates only on a newly acquired contact, so a continuous contact does not repeatedly add energy. After the ball separates and touches again, the same configured launch speed is applied again.

Latest checks, performed after this controller adjustment:

| Check | Result |
|---|---|
| Strict TypeScript check of app, imported source dependencies, and all unit tests, using temporary declaration shims for unavailable Phaser, Zod, and Vitest packages | Passed |
| TypeScript syntax transpilation (`src` + `tests`, 88 files) | Passed; zero syntax diagnostics |
| Focused runtime harness using transpiled project classes | Passed; 10 checks |
| Box-side spring mapping (top, right, left) | Passed |
| Polygon spring edge normal mapping | Passed |
| Tangential rolling contact activates a newly acquired top spring | Passed |
| Spring contact mapping with ball as `bodyA` and `bodyB` | Passed |
| No repeated spring event during an active contact and no launch when already separating | Passed |
| BallController: fixed outgoing normal speed, tangential retention, separation, grounded/jump state reset | Passed |
| Repeated spring contacts: no cumulative normal-speed gain | Passed |
| Glass spring assignments are ignored by the collider factory | Passed |
| TerrainRenderer marker and EffectsRenderer spring-pulse smoke checks | Passed |
| Sandbox JSON: three spring-enabled solids, five surface assignments, no spring on glass | Passed |
| ZIP archive integrity | Passed |

The focused harness executes the transpiled project classes and uses a minimal mock physics world for deterministic checks. It is not a browser simulation with the actual Phaser Matter engine. Full Vitest, the dependency-backed project `npm run typecheck`, Vite build, and Playwright E2E were not run in this environment because dependencies are not installed and npm registry access timed out. The user's development machine should run the commands below after extracting the archive:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

## Spring surface validation follow-up — 2026-11-14

The owner reported one project typecheck error and one failing geometry unit test after the spring-surface feature. Both were corrected:

1. `src/level/LevelValidator.ts`: removed the manual `(string | number)[]` issue-path annotation. Zod paths use `PropertyKey[]`, which can include symbols. Path segments are now formatted with `String(segment)` before joining.
2. `src/utils/GeometryUtils.ts`: normalized signed zero in the outward edge normal result. This avoids returning `-0` for the X component when polygon winding is reversed while preserving the same mathematical normal.
3. Added regression coverage in `LevelValidator.test.ts` and made the geometry test explicitly assert that the reversed-winding result is not negative zero.

The two reported failures are addressed in source. Dependency-backed full `npm run typecheck`, `npm run test`, and `npm run build` were not run in this packaging environment because project dependencies are not installed here; rerun those commands locally after extracting the updated archive.

## Spring surface spin consistency — 2026-11-14

- Updated `BallController.applyPendingSpringImpulse()` so a spring contact on a non-horizontal face reverses the ball's angular velocity using the same `wallBounce.spinRetention` coefficient as an ordinary wall impact.
- Horizontal spring surfaces (top/bottom faces) intentionally preserve angular velocity, retaining the requested rolling behavior.
- The orientation check uses `abs(normal.x) > 0.05`, which treats clearly inclined and vertical faces as non-horizontal while ignoring small floating-point deviations from a horizontal normal.
- Added three `BallController` regression tests: vertical spring reverses spin; inclined spring reverses spin; horizontal spring preserves spin.
- Applied the user's simplified `physics-sandbox.json`: `sandbox-triangle` keeps only spring edge `1`; `sandbox-floor-d` has no spring surface; spring-specific hint decorations were removed. The step's top and right springs remain.

Validation performed in this environment:

| Check | Result |
|---|---|
| Strict TypeScript check for `BallController.ts`, its imported source dependencies, and `BallController.test.ts` with a minimal Vitest declaration shim | Passed |
| Compiled runtime checks using the actual project `BallController` class: vertical, inclined, and horizontal spring spin behavior | 3/3 passed |
| TypeScript syntax transpilation (`src` and `tests`) | 88 files, 0 syntax errors |
| Updated Physics Sandbox JSON parse and key spring-placement assertions | Passed |
| ZIP archive integrity | Passed |

The full Vitest runner and dependency-backed full project build were not run in this environment because project `node_modules` are not installed here. Expected unit-test total is 76 cases (73 existing + 3 spring-spin regression cases); rerun `npm run typecheck`, `npm run test`, and `npm run build` on the development machine to confirm the complete local toolchain.

## Movable block feature verification — 2026-11-14

Implementation notes:

- Added `movable: { mass, minimumImpactEnergy }` to box level definitions.
- A movable block is created as a dynamic Matter rectangle and initially held static. A side contact releases it only when the ball's normal impact energy reaches the configured threshold; a top-side support contact does not release it.
- The first impact is resolved with a two-body collision calculation using ball mass, block mass, and the material restitution. The block then interacts with terrain and other movable blocks using Matter physics; material friction controls its motion after release.
- The block can be pushed repeatedly and is removed along with its arrow marker after its centre passes `world.killPlaneY`.
- Glass, breakable, and spring-surface combinations are rejected for movable boxes. This prevents unsupported feature combinations from being silently ignored.
- Physics Sandbox includes a teal arrow-marked movable crate at the approach to a 150 px pit.

| Check | Result |
|---|---|
| Strict TypeScript check of core physics modules | Passed |
| Strict TypeScript check of Matter world, collision mapper, terrain factory and renderer using a minimal Phaser declaration shim | Passed |
| Strict TypeScript check of level schema and validator using minimal external declarations | Passed |
| Strict TypeScript check of changed tests and imported project modules using minimal Phaser/Vitest declarations | Passed |
| Compiled runtime harness using actual project classes: high-energy release, low-energy hold, top landing, kill-plane cleanup | Passed; 4 checks |
| Movable-block impact helper: momentum transfer, reverse-side impact, moving-away case | Covered by 3 unit tests; compiled helper included in runtime harness |
| Physics Sandbox JSON and TerrainFactory mapping | Passed; 1 movable block, 8 static boxes, 3 polygons, 150 px pit gap |
| TypeScript syntax transpilation (`src` + `tests`) | Passed; 91 files, zero syntax diagnostics |
| JSON parsing | Passed; 5 files |
| ZIP archive integrity | Passed |

Full Vitest, dependency-backed `npm run typecheck`, Vite production build, and Playwright browser E2E were not run in this packaging environment. The project has no `node_modules`; `npm install --ignore-scripts --no-audit --no-fund` timed out while reaching the npm registry. Temporary declaration shims were used only for focused TypeScript checks and are not substitutes for the complete project typecheck. The development machine should run:

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```
