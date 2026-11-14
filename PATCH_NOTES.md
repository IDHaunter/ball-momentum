# Patch notes — Spring surfaces

- Added per-surface spring assignments to box and polygon level definitions.
- Boxes support `top`, `right`, `bottom`, and `left`; polygons support zero-based edge indices.
- Spring geometry is converted to outward unit normals and carried through Matter body metadata.
- New-contact spring impacts launch the ball along the selected normal while preserving tangential velocity.
- The `impulse` setting represents a fixed outgoing normal speed (px/s), avoiding cumulative energy gain on repeated contacts.
- Glass ignores spring assignments and retains its breakable-only behavior.
- Added a short impact flash and particle burst, plus spring-surface markers in the terrain renderer.
- Added three spring test cases to the Physics Sandbox.
- Added geometry, collision-mapping, controller, factory, and level-validation regression tests.

## TypeScript and geometry test follow-up — 2026-11-14

- Removed the overly narrow manual Zod issue-path annotation in `LevelValidator`. Each `PropertyKey` path segment is converted with `String(...)` before joining, which is compatible with Zod's symbol-capable path type and safely formats any symbol segment.
- Canonicalized signed zero in `polygonEdgeOutwardNormal`, so clockwise and counter-clockwise winding return stable `{ x: 0, ... }` normals instead of sometimes returning `-0`.
- Added regression coverage for schema issue formatting and signed-zero normalization.
- No gameplay behavior, spring configuration, level geometry, or physics tuning was changed.

## Spring surface spin behavior — 2026-11-14

- Horizontal spring surfaces preserve the ball's current angular velocity.
- Vertical and inclined spring surfaces reverse angular velocity using the same `wallBounce.spinRetention` coefficient as ordinary wall impacts.
- Added controller regression tests for side-wall springs, inclined springs, and horizontal spring surfaces.
- Updated the Physics Sandbox to the simplified layout supplied by the user: the triangle keeps only edge 1 spring-enabled, `sandbox-floor-d` is no longer spring-enabled, and spring-only hint decorations were removed.

## Movable blocks — 2026-11-14

- Added an optional `movable` definition for rectangular solids with `mass` and `minimumImpactEnergy`.
- Movable blocks start fixed in place. A side impact releases a block only when the ball's normal kinetic energy reaches the configured threshold; top contacts remain ordinary ground/support contacts.
- The initial impact is resolved as a two-body collision along the contact normal, accounting for ball mass, block mass, and material restitution while retaining most tangential ball velocity.
- After release, the block uses its configured material friction, collides with terrain and other movable blocks, can be pushed by subsequent hits, and is removed when it falls past the level kill plane.
- Glass, breakable, and spring-surface combinations are rejected for movable boxes. Movable boxes are intentionally configured independently from spring surfaces.
- Added an arrow-marked teal crate and a 150 px pit to Physics Sandbox.
- Added regression tests for impact energy threshold, top landing, momentum transfer, crate cleanup, incompatible level settings, and sandbox mapping.

## Football and basketball skin visual polish — 2026-11-14

- Reworked the in-game football pattern for the 36 px gameplay scale: a bold central pentagon, five surrounding dark panels, and lighter narrow connecting seams replace the previous star-like heavy spokes.
- Simplified the in-game basketball to three high-contrast seam systems: two bowed side seams, a centre meridian, and a horizontal equator. Increased the seam width so the pattern remains legible while rolling.
- Updated the Settings SVG previews to match the revised in-game designs.
- Kept Smiley, Googly Eye, and Tiny Alien visuals unchanged; no skin IDs, save format, or gameplay behavior changed.

## Autonomous patrol bots — 2026-11-14

- Added an optional top-level `bots` level definition with configurable position, radius, mass, patrol speed, starting direction, friction, restitution, and optional horizontal patrol bounds.
- Added dynamic Matter circle bodies with a dedicated collision category. Player balls, terrain, movable blocks, and bots now have symmetric collision filters for physical bot interactions; bots do not activate level triggers.
- Added terrain-shape metadata and point-in-shape probes so unbounded bots detect platform support and reverse before an edge. Side contacts with terrain also reverse patrol direction.
- Bot-to-bot contacts reverse both patrol directions. Player-ball impacts use Matter's two-body collision response; the bot briefly preserves its post-impact velocity before resuming patrol in the direction it was pushed.
- Bots follow terrain and gravity, and their physics bodies/face markers are cleaned up after falling below the level kill plane.
- Added a raised patrol island over the existing pit in Physics Sandbox with two bots of different masses and speeds.
- Added geometry, patrol, collision, edge-turnaround, cleanup, and level-validation regression tests.

## Bot patrol and spring landing fixes — 2026-11-14

- Bot-to-bot head-on contacts now assign directions by horizontal ordering: the left bot retreats left and the right bot retreats right. Residual overlap is separated immediately, and their patrol controllers take over without a recovery pause that could leave them pressed together.
- Edge detection now checks support beneath the rear part of the bot's circular footprint, rather than relying only on the centre point. A bot can therefore turn back even if solver correction has already moved its centre a little beyond the platform edge.
- Obstacle probes stay in the upper half of the bot so the platform directly underneath a low-spawned bot is not misclassified as a wall. Edge detection is not suppressed by the wall-contact cooldown.
- Spring launches now arm the same finite, damped landing-bounce sequence as a manual jump. Since movable-block top contacts are already mapped as ordinary ground-support contacts, the bounce sequence also works when the spring-launched ball lands on a pushable crate.
- Applied the user's updated Physics Sandbox layout. The bot island top is at y=400; bot y positions are 386 so their circle centres sit one radius above the platform instead of starting embedded halfway inside it.
- Added regression tests for bot footprint edge detection, low-spawn floor probing, deterministic bot separation, movable-block support contacts, and spring-launched landing bounces.
