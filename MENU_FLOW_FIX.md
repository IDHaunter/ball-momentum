# In-game Settings and Main Menu Return — 2026-11-15

## Implemented

- Added a **Settings** action to the pause menu. The option is also available from the level-complete panel.
- Settings now remembers its origin (`main-menu`, `pause`, or `complete`). Saving or pressing Back returns to that exact screen.
- Opening Settings from a paused game does not change the game state from `PAUSED`; physics, the player, bots, movable blocks, checkpoints, and level state remain intact.
- The game scene blocks Escape/P/R/F3 shortcuts while Settings or the exit-confirmation dialog is open, preventing accidental resume/restart/debug actions beneath the modal UI.
- Added a confirmation dialog before returning to Main Menu. Cancel keeps the current pause/completion screen; confirmation discards the current run and checkpoint but preserves completed-level records and saved preferences.
- Confirmed exit now clears the ball/controller/renderer, all level physics bodies (terrain, bots, movable blocks, triggers), terrain and trigger graphics, background graphics, decorations, checkpoint/respawn/completion state, and transient impact/shatter/spring particles.
- The camera resets to the default dark background and screen-sized bounds, so no previous level image remains behind the main menu.
- Reduced Motion changes made in Settings apply immediately to the current scene.

## Checks performed

- Strict TypeScript check passed for the Settings UI classes, settings-origin navigation helper, and their preferences/skin dependencies.
- Strict TypeScript check passed for the GameStateMachine regression tests.
- Strict TypeScript check passed for `EffectsRenderer.clear()` with a focused Phaser API declaration shim.
- Strict TypeScript check passed for `BackgroundRenderer.clear()` with a focused Phaser API declaration shim.
- Runtime checks passed for all three Settings origins and for return-to-menu transitions from both `PAUSED` and `LEVEL_COMPLETE`.
- All 108 TypeScript source and test files passed TypeScript parser syntax checks.
- Both level JSON files parse successfully. The current Physics Sandbox, including the patrol island and y=386 bot spawn coordinates, is preserved.

## Not run

- Full `npm run typecheck`, `npm run test`, `npm run build`, and Playwright E2E were not run because project npm dependencies are not installed in this environment.
