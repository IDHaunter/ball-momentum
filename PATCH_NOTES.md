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
