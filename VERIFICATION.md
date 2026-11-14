# Bot patrol and spring landing fixes — verification report

## Implemented

- Bot-to-bot head-on collisions are resolved deterministically by x-order: the left bot moves left and the right bot moves right.
- Residual overlap is separated before the next fixed step, and bot patrol control resumes immediately rather than waiting through the old recovery window.
- Patrol edge detection uses the rear portion of the circle footprint and remains active during collision cooldowns.
- Obstacle probes avoid the lower part of the bot, preventing the supporting platform from being detected as a wall when a bot starts slightly low.
- Spring launches now arm the configured, finite landing-bounce sequence. The existing collision mapper reports top contacts on movable blocks as ground-support contacts, so they now trigger the same damped landing bounces.
- Updated `public/levels/physics-sandbox.json` to the latest user-provided layout. Bot centres use y=386 because the island's top face is y=400 and each bot radius is 14 px.

## Checks performed

- Strict TypeScript check passed for `MatterPhysicsWorld`, `BotPatrol`, `BallController`, `MatterCollisionMapper`, and the four affected unit test files. A minimal Vitest declaration shim was used only for type-checking the test source because Vitest is not installed in this environment.
- Compiled the changed runtime modules with strict TypeScript and ran an integration harness against the actual compiled project classes.
- Runtime harness passed: the bot does not mistake its supporting platform for a wall; edge detection works after the centre crosses the edge while the rear footprint remains supported; two colliding bots are separated and assigned outward velocities; movable-block top contacts are emitted as ground support; a ball launched by a spring performs a damped landing bounce on a movable block.
- The updated Sandbox JSON parses successfully.

## Not run

- Full `npm run typecheck`, `npm run test`, `npm run build`, and Playwright E2E were not run because npm project dependencies are not installed in this environment.
- The runtime integration harness uses the actual compiled project classes with Matter/Phaser test doubles; it is not a replacement for a full browser physics playtest.
