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
