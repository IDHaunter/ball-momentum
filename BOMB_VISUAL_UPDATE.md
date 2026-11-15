# Time Bomb — Visual Polish

## Visual changes

- Replaced the flat charcoal bomb badge with a graphite-black shell, muted steel rim, a soft metallic highlight, and a small specular glint.
- Added two large white cartoon eyes with independent pupils, animated brows, and a small elastic mouth.
- The pupils glance around while idle and move faster as the fuse approaches detonation. Brows and mouth become more tense as the remaining time decreases.
- Replaced the changing fuse glyph with a visible brown wick, a dormant ember before activation, and a layered orange/yellow/white flame after activation.
- The flame flickers and grows slightly as the countdown nears zero. The countdown remains readable and uses the same fuse duration and detonation timing as before.
- All overlay pieces follow the bomb's position and rotation. They are explicitly destroyed when the bomb detonates, falls below the kill plane, or the level is cleared.

## Gameplay scope

This is a cosmetic-only update. Bomb collision filtering, mass, activation conditions, fuse duration, explosion radius, explosion energy, radial falloff, and object impulses are unchanged.

## Verification

- Strict TypeScript check of `MatterPhysicsWorld.ts` and `MatterPhysicsWorldBomb.test.ts` — PASS.
- Bomb physics/visual regression tests, using compiled project classes and the local lightweight Vitest-compatible harness — 7/7 PASS.
- The focused visual test verifies that the flame is hidden before activation, becomes visible immediately on impact, flickers while burning, and that the pupils animate.
- Full Vitest, Vite production build, and Playwright E2E were not run in this environment because the project dependencies are not installed here.
