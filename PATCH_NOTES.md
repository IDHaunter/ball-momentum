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
