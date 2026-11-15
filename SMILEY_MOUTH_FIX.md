# Smiley mouth artifact and flicker fix

## Changes

- The in-game mouth is now a cached Phaser CanvasTexture drawn as one smooth quadratic Canvas 2D stroke with round caps and joins. The previous implementation cleared and tessellated a multi-segment Phaser Graphics path on every frame; this could show a dark endpoint/join artifact at small scale.
- The smile no longer switches between a line and a filled open-mouth polygon on impacts. This avoids a shape discontinuity when the impact timer crosses its threshold.
- The independent sinusoidal mouth rotation was removed. The smile remains aligned to the face and rotates naturally with the ball container.
- Speed and impact still make the smile subtly wider, but the scale is interpolated smoothly and never redraws the texture.
- Settings preview SVG, eyes, blink/gaze animation, skin selection, other skins, physics, and level data are unchanged.

## Verification

- Added `SmileyMouth.test.ts` for the single-stroke rounded path and safe texture sizing.
- Updated `SmileyAnimation.test.ts` for stable smile scaling and non-switching impact response.
- Full project Vitest / typecheck / build / E2E must be run in the developer's installed environment; project dependencies are not installed in this build environment.
