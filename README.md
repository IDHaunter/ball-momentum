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

## Movable blocks

A rectangular solid can be released by a sufficiently strong side impact. The box remains fixed until the ball reaches its configured normal-impact energy threshold; then it becomes a dynamic Matter body and can be pushed, rotate, collide with terrain, and fall below the level kill plane. Landing on its top does not release it.

Example level definition:

```json
{
  "id": "pushable-crate",
  "type": "box",
  "x": 1530,
  "y": 830,
  "width": 70,
  "height": 50,
  "material": "stone",
  "movable": {
    "mass": 4,
    "minimumImpactEnergy": 32000
  }
}
```

`minimumImpactEnergy` is measured as `0.5 * ballMass * normalImpactSpeed²`; glancing impacts therefore transfer less energy than direct side hits. The material supplies friction and restitution. Movable boxes cannot also be glass breakables.

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

## Spring surfaces

Any non-glass terrain solid can expose one or more spring surfaces. A spring surface launches the ball along that surface's outward normal while preserving most of its tangential velocity. The configured `impulse` is a fixed outgoing normal speed in pixels per second, not an additive velocity delta; repeated contacts therefore reproduce the same launch energy rather than compounding it.

For boxes, use `side` values `top`, `right`, `bottom`, or `left`. For polygons, `edge` is the zero-based index of the first vertex of the edge (`vertices[edge]` to `vertices[(edge + 1) % vertices.length]`). Each assignment requires a positive `impulse` value up to 3000 px/s. A spring fires once when the ball acquires a new contact with that face; it is armed again after separation. The impulse sets a fixed outgoing normal speed, so repeated contacts do not accumulate more normal energy. Most tangential velocity is preserved. Horizontal spring faces preserve the ball's spin; vertical and inclined spring faces reverse spin using the same retention coefficient as ordinary wall impacts.

```json
{
  "id": "spring-platform",
  "type": "box",
  "x": 600,
  "y": 700,
  "width": 220,
  "height": 80,
  "material": "normal",
  "springSurfaces": [
    { "side": "top", "impulse": 650 },
    { "side": "right", "impulse": 420 }
  ]
}
```

Polygon example:

```json
{
  "id": "spring-ramp",
  "type": "polygon",
  "vertices": [[900, 700], [1050, 620], [1200, 700]],
  "material": "rubber",
  "springSurfaces": [{ "edge": 0, "impulse": 560 }]
}
```

Glass solids ignore `springSurfaces` even if the property is present. Their breakable behavior remains unchanged. The Physics Sandbox includes spring-enabled box sides, polygon slopes, and a horizontal spring floor for testing.

## Movable blocks

A box can be configured as a movable block. It starts as a fixed obstacle and is released by a sufficiently energetic side impact from the ball. A hit from above is treated as an ordinary landing and does not release it.

```json
{
  "id": "pushable-crate",
  "type": "box",
  "x": 1530,
  "y": 830,
  "width": 70,
  "height": 50,
  "material": "stone",
  "movable": {
    "mass": 4,
    "minimumImpactEnergy": 32000
  }
}
```

`mass` is the block's Matter mass; the ball-to-block collision transfers momentum according to both masses and the material restitution. `minimumImpactEnergy` is the minimum normal impact energy required to release the block, calculated as `0.5 * ballMass * normalImpactSpeed^2`. This makes glancing hits less effective than direct side hits. The selected material controls friction after the block starts moving. Once released, it can be pushed again by further collisions and it falls under gravity; blocks are removed after their centre passes the level's `world.killPlaneY`. A movable box cannot use glass, also be breakable, or define spring surfaces; these behaviors are intentionally configured independently.

The Physics Sandbox includes a teal, arrow-marked crate before a 150 px pit. Push it sideways repeatedly to move it toward the gap. Landing on its top does not release it; a sufficiently strong side impact does.

## Ball skins

Open **Settings** from the main menu to choose a ball appearance. The built-in skins are Happy face, Football, Basketball, Googly eye, and Tiny alien. The selected skin is stored with the player's local preferences and restored on the next visit. Existing saves that do not contain a `ballSkin` preference automatically use the Happy face skin.

## Autonomous patrol bots

Levels can define up to 24 autonomous rolling bots in the optional top-level `bots` array. Each bot is a dynamic circular Matter body with its own mass, radius, horizontal patrol speed, initial direction, restitution, and friction. Bots collide physically with the player ball, terrain, movable blocks, and other bots. They do not consume player input or activate level triggers.

```json
{
  "bots": [
    {
      "id": "patrol-bot-a",
      "x": 1687,
      "y": 736,
      "radius": 14,
      "mass": 1.15,
      "speed": 125,
      "direction": 1,
      "restitution": 0.82,
      "friction": 0.015
    }
  ]
}
```

`speed` is in pixels per second; `mass` is the Matter body mass. `direction` is `1` (right) or `-1` (left). If `patrolRange: { minX, maxX }` is present, the bot reverses at those horizontal limits. Otherwise, it detects the supporting terrain ahead and reverses before walking off a platform; horizontal collisions with walls also make it turn around. Two bots turn away from one another on contact. A player-ball collision is resolved by Matter using both bodies' masses and restitution; the bot briefly preserves its physical separation velocity before resuming patrol in the direction it was pushed. Bots fall naturally into pits and are removed after crossing `world.killPlaneY`.

The Physics Sandbox includes a small island over a pit with two differently weighted patrol bots, useful for testing edge turnaround, bot-to-bot contact, and player-to-bot impacts.
