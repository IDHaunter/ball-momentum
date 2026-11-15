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


# Smiley style refinement — verification report

## Implemented

- Replaced the glossy, glamorized Smiley face with a soft vertical gradient: yellow at the top, warm orange through the middle, and a subtle rosy tint at the bottom.
- Replaced brows, blush, teeth, and tongue with large round white eyes, dark pupils, and one simple dark curved smile.
- Preserved independent pupil motion and offset double-blinks for a slightly goofy, wide-eyed expression.
- The smile widens and flattens as movement speed increases; wall, terrain, spring, movable-block impacts, and landings briefly trigger a surprised open-mouth expression.
- Speed and impact reactions are routed through `BallVisualController` and `GameplayScene`; only the Smiley renderer responds. Other skins and all physics remain unchanged.
- Updated the Smiley Settings preview SVG to match the new style.

## Checks performed

- Strict TypeScript compile passed for `BallSkin`, `SmileyAnimation`, `BallRenderer`, and `BallVisualController` using a minimal Phaser declaration shim. The shim includes only the Phaser Graphics `clear()` method used by the animated mouth redraw.
- The pure Smiley animation module compiled with the system TypeScript compiler; 7 runtime assertions passed for independent bounded gaze, offset blinking, speed-dependent smile shape, impact expression, deterministic blink timing, and invalid-input safety.
- Added/updated unit tests in `SmileyAnimation.test.ts` and `BallVisualController.test.ts` for speed forwarding, impact reactions, and Reduced Motion behavior.
- All 100 TypeScript source and test files parsed successfully with the TypeScript compiler API.
- Rendered and visually inspected the updated Settings preview at 256 px; the in-game geometry uses matching proportions scaled to the configured ball radius.
- Confirmed only Smiley-specific rendering, animation, preview, visual-controller wiring, tests, and update documentation changed. Other skin renderers, Sandbox JSON, physics tuning, and save keys remain unchanged.

## Not run

- Full `npm run typecheck`, `npm run test`, `npm run build`, and Playwright E2E were not run because project npm dependencies are not installed in this environment.


# Smiley in-game gradient artifact fix — verification report

## Implemented

- Replaced the in-game Smiley background built from 56 thin Graphics polygons with one high-resolution CanvasTexture.
- The CanvasTexture draws a circularly clipped vertical linear gradient using the same yellow/orange/rose color stops as the existing Settings SVG preview.
- The base texture has no dark colors, radial shadow, or horizontal band geometry. The existing soft highlight ellipse and face details remain in their original positions.
- The texture uses a versioned Texture Manager key and is created once per Phaser Game, then reused across renderer recreation and level restarts.
- No Settings preview, other skins, skin selection storage, Smiley facial animation, physics, Sandbox JSON, or gameplay behavior was modified.

## Checks performed

- Strict TypeScript check passed for `BallRenderer`, `SmileyGradient`, `SmileyAnimation`, and `BallSkin` using a minimal Phaser API declaration shim that covers the actual members used by these modules.
- Strict TypeScript check passed for the new `SmileyGradient.test.ts` using a minimal Vitest declaration shim.
- Compiled and executed the real `drawSmileyGradient` function with a Canvas context test double; confirmed circular clipping, one vertical gradient fill, the four warm color stops, no dark stops, and safe handling of invalid/small texture sizes.
- All 102 TypeScript source and test files parsed successfully with the TypeScript compiler API.
- Phaser 4 CanvasTexture methods (`TextureManager.exists`, `createCanvas`, `CanvasTexture.getContext`, and `refresh`) were checked against the Phaser API documentation.

## Not run

- Full `npm run typecheck`, `npm run test`, `npm run build`, and Playwright E2E were not run because project npm dependencies are not installed in this environment.

# Smiley mouth artifact and flicker stabilization — 2026-11-15

## Implemented

- Replaced the in-game Smiley mouth's frame-by-frame Phaser Graphics redraw with one cached CanvasTexture containing a single quadratic Canvas 2D stroke with round caps and joins. This removes short-path triangulation seams and endpoint artifacts that could appear as a dark dot beneath the mouth.
- Removed the impact-triggered switch between a smile line and a filled open-mouth polygon, and removed independent sinusoidal mouth rotation. The mouth now remains one stable smile and rotates only with the ball face/container.
- Preserved a subtle reaction to speed and impact by smoothly interpolating a very small mouth scale change. No geometry is cleared or re-tessellated during gameplay updates.
- Settings preview SVG, Smiley gradient, eyes/pupil movement/blinking, other skins, physics, level data, and gameplay mechanics remain unchanged.

## Checks performed

- Strict TypeScript check passed for `BallRenderer`, `SmileyMouth`, `SmileyAnimation`, `SmileyGradient`, `BallSkin`, and the two changed unit-test files, using minimal Phaser and Vitest declaration shims because npm dependencies are not installed in this environment.
- Compiled and executed the real `SmileyMouth` and `SmileyAnimation` modules with Node. Runtime checks passed for stable smile defaults, bounded subtle speed/impact scaling, finite invalid-input fallback, and exactly one rounded quadratic Canvas stroke with no extra fill/arc marks.
- All 104 TypeScript source and test files passed TypeScript parser syntax checks.
- Manually inspected a 36 px gameplay-scale render of the updated Smiley face; the mouth is a single smooth curve with no separate endpoint/chin mark in the generated texture.

## Not run

- Full `npm run typecheck`, `npm run test`, `npm run build`, and Playwright E2E were not run because project npm dependencies are not installed in this environment.
