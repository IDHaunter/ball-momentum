# Patch notes — Phaser typecheck fixes

This archive includes fixes for the Phaser type errors reported by the project owner:

- Removed the unsupported `gravity.scale` property from the Matter gravity vector in `src/app/createGame.ts`.
- Renamed `GameplayScene.registry` to `GameplayScene.gameRegistry` to avoid shadowing the inherited `Phaser.Scene.registry` data manager.
- Renamed `GameplayScene.physics` to `GameplayScene.physicsSettings` to avoid overriding the inherited `Phaser.Scene.physics` system with an incompatible configuration object.
- Updated the relevant consumers in `src/app/GameApplication.ts`.

The runtime gravity scale is still applied through `Matter.World.setGravity(x, y, scale)`.

See `VERIFICATION.md` for what was and was not verified in the build environment.
