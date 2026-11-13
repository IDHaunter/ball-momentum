# Ball Momentum

A 2D swipe-driven physics platform game built with TypeScript, Phaser 4.2.1, Phaser Matter Physics, Vite, and Zod.

## Requirements

- Node.js 22.12 or newer
- npm 10 or newer

## Run locally

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Use mouse/touch swipes or the keyboard:

- Swipe left / Left / A: add leftward momentum
- Swipe right / Right / D: add rightward momentum
- Swipe down / Down / S / Space: jump (or buffer a jump)
- Swipe up / Up / W: one timed mid-air boost after takeoff
- Escape / P: pause or resume
- R: restart the current level
- F3: toggle the developer panel

## Validation

```bash
npm run typecheck
npm run test
npm run build
npm run test:e2e
```

Playwright browser tests require the Chromium browser to be installed (`npx playwright install chromium`).

## Editing levels

Edit JSON files in `public/levels/`. `level-01.json` is the tutorial course and `physics-sandbox.json` is the movement sandbox. The browser validates each file before building collision bodies. Reload the game after changing a level.

## Physics tuning

Defaults live in `src/config/physics.defaults.ts`. Use `?debug=1` or press F3 while playing to open the developer panel. Runtime tuning is temporary and does not modify source files.

## Breakable glass

The Physics Sandbox includes a vertical glass wall, an angled glass triangle, and a two-piece glass stack. Each breakable solid uses a per-shape energy threshold and can override the velocity retained by the ball after piercing:

```json
{
  "material": "glass",
  "breakable": { "thresholdEnergy": 140000, "velocityRetention": 0.72 }
}
```

Impact energy is evaluated from the velocity component perpendicular to the contact face: `0.5 * ballMass * normalImpactSpeed^2`. This makes direct hits more effective than glancing hits at the same overall speed. A failed break leaves the glass intact; a successful break removes its collider and plays a shard animation. Stacked breakable glass pieces resting on a broken lower piece shatter as a cascade. Shards are cosmetic effects, not separate physics bodies; the current cascade tracks breakable glass pieces rather than arbitrary non-breakable rigid bodies.

- Vertical wall impacts reverse both horizontal movement and the ball's angular spin.
- A jump landing produces up to three damped follow-up hops, with each hop smaller than the previous one. Rebounds follow the contacted surface normal, including slopes.
- Glass solids can be marked with `breakable: { thresholdEnergy, velocityRetention }` in level JSON. The impact check uses the square of the velocity component perpendicular to the contacted face, so glancing hits are harder to break than direct hits. Breakable glass stacks cascade when their lower support is destroyed.

## Architecture boundaries

- Input adapters produce `PlayerAction` values only.
- Ball gameplay code depends on `IPhysicsWorld` / `IPhysicsBody`, never Matter classes.
- `MatterPhysicsWorld` and `MatterPhysicsBody` contain all Phaser Matter calls and velocity-unit conversion.
- Level-specific geometry is JSON, not Scene code.
- Physics advances at a fixed 60 Hz independent of rendering cadence.

The web build is intentionally platform-neutral and can later be wrapped with Capacitor without creating a second gameplay implementation.
