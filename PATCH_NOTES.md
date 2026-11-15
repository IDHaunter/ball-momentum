# Patch notes — Surface border customization

- Added `borders` configuration to boxes (per `top`, `right`, `bottom`, `left` side) and polygons (per zero-based edge index).
- Added eight visual styles: `default`, `none`, `grass`, `asphalt`, `stone`, `metal`, `ice`, and `wood`. Each style uses simple procedural geometry and remains independent of physical materials and interior textures.
- Movable boxes receive a border overlay that follows their Matter position and rotation and is cleaned up when the block is removed.
- Replaced the old thin orange spring marker and short ticks with a broad black-and-yellow hazard tape, diagonal dark bands, and a pale highlight. Spring tape takes visual priority over a configured border style on the same edge; glass continues to ignore spring assignments.
- Applied coordinated grass, stone, metal, asphalt, wood, and ice borders across every solid in `level-01.json` and the latest `physics-sandbox.json`. Physics, collision geometry, and material parameters were not changed.
- Added a border renderer/catalog helper, polygon-edge validation, and regression tests for styles, hidden edges, spring tape, and movable-block overlays.

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

## Smiley skin style refinement — 2026-11-14

- Reworked only the Smiley skin to a soft vertical gradient from bright yellow through orange to a subtle rosy lower edge.
- Removed brows, cheek blush, teeth, and tongue. The face now uses large round white eyes, dark independently moving pupils, offset double-blinks, and a simple dark curved smile.
- The smile widens and flattens as the ball moves faster. Wall, terrain, spring, movable-block impacts, and landings briefly change it to a surprised open-mouth expression.
- Facial reactions are driven by speed and existing physics events through `BallVisualController`; the full face remains attached to the rotating / squash-stretch ball container.
- Reduced Motion continues to pause facial animation and impact reactions.
- Updated only the Smiley Settings preview SVG. Soccer, Basketball, Googly Eye, and Tiny Alien renderers and preview artwork are unchanged.
- No physics, input, level configuration, save keys, or skin IDs changed.
- Added regression coverage for speed-based mouth changes, impact expression, and visual-controller event forwarding.


## Smiley in-game gradient artifact fix — 2026-11-15

- Replaced the in-game Smiley fill made from 56 individual narrow Graphics polygons with a single high-resolution, circularly clipped Phaser CanvasTexture.
- The texture uses the same four vertical warm-gradient stops as the Settings preview, rendered by the Canvas 2D gradient engine rather than many independently tessellated WebGL polygons.
- Removed all additional shading from the base texture; the existing small soft highlight ellipse remains unchanged. No dark gradients, directional shading, or shadow bands are added.
- The generated texture is cached by a versioned key in the Phaser Texture Manager and reused across skin switches and level restarts.
- Settings preview SVG, Smiley eyes/mouth/animation, all other skins, physics, Sandbox JSON, and gameplay code remain unchanged.
- Added focused regression tests for the single clipped vertical gradient, exact warm color stops, and safe texture sizing.


## Smiley mouth rendering stabilization — 2026-11-15

- Replaced the per-frame-cleared Phaser Graphics mouth with one cached CanvasTexture containing a single antialiased quadratic stroke with round caps and joins. This removes short-path triangulation seams and endpoint artifacts that could appear as a dark dot beneath the chin.
- Removed the impact-triggered open-mouth polygon and independent sinusoidal mouth rotation, both of which could make the smile visibly pop/flicker while the ball rolled.
- Kept a subtle speed/impact expression by smoothly interpolating a very small horizontal/vertical scale change on the cached mouth image.
- Left the Settings preview SVG, Smiley gradient, eye/pupil animation, other skins, physics, Sandbox, and gameplay mechanics unchanged.
- Added focused `SmileyMouth` Canvas drawing tests and updated animation tests to assert stable smile behavior.


## First-level triangle jump support — 2026-11-15

- Raised the default maximum ground-support angle from 55 to 60 degrees. The first-level stone triangle has two sloped faces at approximately 55.71 degrees, so its outward normals were just outside the old grounded threshold even though the Sandbox triangle (approximately 54.74 degrees) was inside it.
- Updated the GameApplication fallback physics configuration to use the same 60-degree setting, so resetting physics defaults does not reintroduce the bug.
- Added GroundContactTracker regression coverage for both sloped faces of the exact `level-01.json` triangle and BallController integration coverage confirming the player can jump from either side.
- No terrain geometry, material settings, collision response, or Sandbox content was changed.


## Time Bombs

- Added level-configurable timed bomb characters with visible countdowns and fuse sparks.
- Player-ball and autonomous-bot contacts activate and release bombs; active bombs remain pushable and are removed without detonating if they fall below the kill plane.
- Added quadratic radial blast-energy falloff, mass-dependent velocity impulses for the player, bots, and movable blocks, and energy-threshold glass destruction with the existing glass-shatter cascade.
- Extended Physics Sandbox with a time-bomb test area, a nearby movable crate, a breakable glass target, and a finish beyond the bomb section.
