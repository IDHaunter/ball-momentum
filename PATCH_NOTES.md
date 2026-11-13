# Patch notes — gameplay physics and input fixes

This archive includes the earlier Phaser typecheck fixes and the gameplay fixes reported after the game was launched locally.

## Ground detection and jumping

- Fixed `MatterCollisionMapper` normal orientation. Matter's raw `collision.normal` is the minimum-translation direction for `bodyA`; the mapper now converts it into the ball-facing support normal for both possible body orders.
- The ground tracker can now recognize a floor contact (`supportNormal.y < 0`), so grounded state, coyote time, jump buffering, and ground drag work as intended.
- Added regression coverage for both body orders and underside/ceiling contacts.

## Keyboard and swipe controls

- Keyboard gameplay actions are no longer discarded just because a menu or HUD button still has focus. Text-entry controls remain protected from game shortcuts.
- Clarified the controls in the main menu and README: swipe down / Down / S / Space jumps; swipe up / Up / W performs the one-time mid-air boost.

## Ramp/platform seams

- `TerrainFactory` now creates collider-only overlap for four-point sloped floor polygons that join boxes. The lower side corners are moved 24 px inside adjacent boxes, hiding the vertical side faces from the rolling ball.
- The original level geometry is unchanged for rendering; only the physics collider is adjusted. This avoids drawing altered ramp outlines and keeps the visible course shape intact.
- Added tests for ramp collider overlap and for polygons without adjoining platforms.

## Polygon collider alignment

- Fixed the root cause of the visual air gap on ramps and triangular slopes. `MatterPhysicsWorld.createStaticPolygon` previously used the bounding-box centre as the Matter body position while supplying vertices centred on that bounding box. Matter re-centres `fromVertices` geometry around the polygon centre of mass, which displaced asymmetric shapes vertically.
- The Matter body position is now the area-weighted polygon centroid, and the supplied local vertices are centred around the same point. The physical upper edge therefore remains aligned with the rendered level JSON coordinates for both ramps and triangles.
- Kept the existing seam overlap in `TerrainFactory`; it addresses side-wall catching and is independent of this centroid alignment fix.
- Added unit coverage for trapezoid and triangle centroids, local-vertex centering, clockwise/counter-clockwise order, and degenerate polygon rejection.

## Previous Phaser typecheck fixes

- Removed the unsupported `gravity.scale` property from the Matter gravity vector in `src/app/createGame.ts`.
- Renamed `GameplayScene.registry` to `GameplayScene.gameRegistry` to avoid shadowing the inherited `Phaser.Scene.registry` data manager.
- Renamed `GameplayScene.physics` to `GameplayScene.physicsSettings` to avoid overriding the inherited `Phaser.Scene.physics` system.
- Updated the relevant consumers in `src/app/GameApplication.ts`.
- Runtime gravity scale is still applied through `Matter.World.setGravity(x, y, scale)`.

See `VERIFICATION.md` for the exact checks run and their limitations.

## Wall bounce and dust impact (2026-11-11)

- Added `BALL_WALL_IMPACT`, emitted only for incoming collisions against near-vertical terrain normals.
- Captures the ball velocity during Matter.js `collisionstart`, before the velocity solver removes the incoming normal component.
- Applies a controlled bounce after the physics step: default normal restitution is `0.62`, tangential velocity retention is `0.94`, and impacts below `90 px/s` are ignored.
- Added short-lived directional dust particles at the wall contact point. The effect respects the reduced-motion preference.
- Added developer-panel tuning for wall restitution, tangential retention, and minimum impact speed.
- Added regression tests for both Matter body orders, contact point mapping, vertical-wall-only detection, impact direction, tangential retention, and low-speed filtering.

Validation in the packaging environment:
- Core physics modules compile with the globally available TypeScript compiler.
- A focused runtime harness passed wall-event mapping, horizontal reflection, tangential retention, and low-speed filtering.
- All TypeScript files passed syntax transpilation.
- Full Vitest/Vite build was not run because npm dependencies are not present in this environment and the npm cache has no required packages.


## Follow-up corrections from local validation — 2026-11-11

- Fixed strict TypeScript narrowing in `src/level/TerrainFactory.ts`. The `Array.find` predicates for left/right neighboring platforms are now explicit type guards (`candidate is BoxSolidDefinition`), so `.width` is only accessed after TypeScript has narrowed the candidate to a box.
- Corrected the ramp centroid regression test in `tests/unit/GeometryUtils.test.ts`. For the test's actual vertices `[(700,760), (1050,850), (1074,1280), (676,1280)]`, the area-weighted centroid is `(868.7157894736843, 1046.8240923163523)`. The old expected pair `(863.0533944, 1044.1364717)` did not correspond to those vertices; the centroid implementation itself was mathematically correct.
- No gameplay geometry or wall-bounce behavior was changed by this follow-up.

## Reliable wall bounce follow-up — 2026-11-11

The first wall-bounce implementation only generated an impact on `collisionstart` and ignored approach speeds below 90 px/s. That was insufficient when a ball first touched a wall gently and then continued pressing into it: the pair had already transitioned to `collisionactive`, so a later stronger approach could be missed. The threshold also made slow impacts behave as a fully inelastic stop.

- `MatterPhysicsWorld.step()` now snapshots the ball's velocity before each fixed physics step and passes that sample to the collision mapper. This preserves the incoming velocity even when Matter's contact solver resolves the overlapping body to near-zero velocity during the same step.
- `MatterCollisionMapper` now checks both `collisionstart` and `collisionactive`, and re-aligns the normal so it points from the terrain toward the ball regardless of Matter body ordering.
- `BallController` accepts one bounce per continuous wall contact. It can react when a stronger push appears during an already-active contact, ignores subsequent duplicate impact candidates until `BALL_TERRAIN_CONTACT_ENDED`, and re-arms after the ball separates.
- The minimum approach speed is now 10 px/s (previously 90). The normal restitution is 0.86, and impacts receive a minimum outgoing normal speed of 125 px/s so slow contacts do not settle against the wall.
- After the collision step the ball is nudged 3 px away from the wall (up to 8 px when collision penetration is deeper), preventing the next Matter solve from immediately pinning it to the same contact manifold.
- Tangential speed retention increased to 0.98. New wall-bounce settings are available in F3: minimum outgoing speed and separation distance, alongside restitution and impact threshold.
- Wall dust is throttled to one burst per 120 ms to avoid particle spam while a sustained contact remains active.
- Added regression coverage for active-contact impact sampling, minimum-speed rebound, separation, and one bounce per contact/re-arm after contact end.

Validation for this follow-up:
- Strict TypeScript check of the changed physics/controller modules plus a lightweight Phaser declaration shim: passed.
- Integrated runtime harness using the actual compiled `MatterPhysicsWorld`, `MatterCollisionMapper`, and `BallController`: passed for 35, 70, 600, and 840 px/s impacts. The harness simulated `collisionactive` after Matter zeroed the live velocity; captured pre-step velocity still produced an immediate reverse velocity and separation from the wall.
- TypeScript syntax transpilation: 84 files, zero syntax diagnostics.
- Full Vitest, Vite production build, and Playwright E2E were not run in this environment because project dependencies and Chromium are not installed here.

## Wall spin reversal and damped landing hops — 2026-11-13

- Wall impacts now reverse the ball's angular velocity as well as its translational normal velocity. The angular-speed magnitude is retained at 85% by default (`wallBounce.spinRetention`) so the ball visibly changes rotation direction without an abrupt artificial stop.
- Added a damped landing-hop sequence for jump landings. The first landing and up to two following contacts launch the ball along the active support normal with 0.52 normal restitution, 0.96 tangential retention, and a 1.5 px separation from the support surface. The default sequence is capped at three hops and stops below the configured impact/outgoing speed thresholds.
- `GroundContactTracker` now exposes the averaged active support normal, allowing landing rebound to work on inclined surfaces as well as flat floors.
- `BallController` captures the incoming velocity before the physics step and uses it to calculate the landing rebound after Matter resolves the contact.
- Contacts whose normal velocity points away from the support surface are no longer mistaken for a new landing. This prevents a stale `collisionactive` frame immediately after takeoff from canceling the remaining damped hops.
- Added F3 tuning for wall spin retention, landing restitution, hop count, and minimum landing impact speed. Reset Defaults includes the new parameters.
- Added regression coverage for wall-spin direction reversal, three progressively smaller landing hops, stale separating contacts, and support-normal retrieval.

Validation performed in this environment:
- Strict TypeScript compilation of the changed controller, contact tracker, configuration, Developer Panel, and the two changed unit-test files (using a lightweight Vitest type shim): passed.
- Runtime harness using the actual compiled project classes: wall velocity and angular velocity both reverse; landing hops were 260, 135.2, and 70.3 px/s for a 500 px/s initial impact; stale separating contact was ignored; the next landing settled without a fourth hop.
- Full Vitest, Vite production build, and Playwright E2E were not run because project dependencies and Chromium are not installed in this environment.


## Breakable glass terrain and sandbox obstacles — 2026-11-13

- Added an optional `breakable` definition to box and polygon solids. Each definition specifies `thresholdEnergy` and may override `velocityRetention`.
- Collision mapping now emits a general `BALL_TERRAIN_IMPACT` for contacts on any face, not only vertical walls. Impact energy is calculated from the incoming velocity component along the contact normal (`0.5 * mass * normalSpeed^2`), so oblique hits naturally require more total speed than perpendicular hits.
- Glass that does not reach its energy threshold remains a solid obstacle and uses the normal material response / wall rebound. If the threshold is reached, the collider and rendered shape are removed and the ball continues along its original direction with a configurable fraction of its incoming velocity.
- Added `BreakableTerrainManager`, which detects vertically stacked breakable pieces. Breaking a supporting lower piece cascades through breakable pieces resting on it; breaking only an upper piece leaves its lower support intact.
- Added a translucent cyan glass rendering style with internal facets and a glass-shard burst animation. Shards are visual-only and fade out after the break.
- Added a sandbox vertical glass wall, an angled triangular glass piece, and a two-piece glass stack with labels. The thresholds deliberately differ so the user can test direct and glancing impacts.
- Added Developer Panel controls for breakthrough velocity retention and separation distance. Reset Defaults restores these values too.
- Added regression tests for squared normal impact energy, glancing-hit energy, angled terrain impact mapping, successful breakthrough velocity preservation, breakable-level validation, and stacked-glass cascade behavior.

Validation in the packaging environment:
- Syntax transpilation and pure-module strict TypeScript checks are performed on the new logic.
- Full Vitest, Vite production build, and Playwright E2E require the project dependencies, which are not installed in this environment; npm registry access currently fails with `EAI_AGAIN`.
