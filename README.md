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
- Pause menu: Settings can be opened without leaving the current level; closing Settings returns to the pause menu
- Main menu: leaving an active run asks for confirmation and clears the current level scene
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

## Rolling objects

Levels can define passive dynamic round bodies in a top-level `rollingObjects` array. They are active immediately, respond to gravity, roll with angular motion, and collide with terrain, the player, movable crates, bombs, enemies, and other rolling objects. `appearance` currently supports `stone` and `snow`; it changes only the canvas texture, while the same circular Matter body and physics parameters are used for both. A sufficiently energetic impact against breakable glass uses the rolling object's own mass and incoming speed along the collision normal, then removes the glass and lets the object continue with the configured velocity retention.

```json
{
  "rollingObjects": [
    {
      "id": "rolling-stone",
      "x": 9122,
      "y": 722,
      "radius": 38,
      "mass": 7.5,
      "appearance": "stone",
      "friction": 0.56,
      "restitution": 0.08
    }
  ]
}
```

`radius` is in pixels and `mass` is a Matter mass value. `friction` and `restitution` are optional contact properties. Objects are removed when they fall below the level kill plane. The Physics Sandbox's final section includes a stone ramp and a breakable glass wall to test rolling momentum and glass impacts.

## Time bombs

Levels can define timed bombs in a top-level `bombs` array. Bombs are activated by the player ball or autonomous bots, can be pushed during their countdown, and apply a quadratic radial blast to dynamic objects and breakable glass. See `TIME_BOMB_FEATURE.md` for the JSON fields and physics model.

## Paired lever switches and moving platforms

Levels can define a `platformSwitches` array. Each entry is one paired mechanism: it always creates both a physical lever and its moving platform, so neither can be configured independently. The lever shaft is a solid collider, so the ball rebounds from it instead of passing through a sensor. A sufficiently fast rightward impact from the left switches the lever ON and starts the platform; a sufficiently fast leftward impact from the right switches it OFF and stops the platform at its current position. Direction is read from the ball velocity immediately before collision resolution. Weak and mostly vertical impacts are ignored. The lever shows a green/red state lamp and tilts to match its state; its physical and visual rod length can be configured with `lever.height` (24–100 px, default 48).

The platform follows its `points` array at a constant configured speed, loops back to the first point, and can be stopped anywhere along the route. Its chassis and animated rocket exhaust stay consistent; `surface` changes only the top treatment (`stone`, `glass`, `metal`, or `grass`). Example:

```json
{
  "platformSwitches": [
    {
      "id": "rocket-bridge",
      "lever": {
        "x": 7550,
        "y": 760,
        "height": 52,
        "minimumImpactSpeed": 245,
        "initialState": "off"
      },
      "platform": {
        "width": 170,
        "surface": "metal",
        "speed": 155,
        "points": [
          { "x": 7900, "y": 880 },
          { "x": 8205, "y": 880 }
        ]
      }
    }
  ]
}
```

`minimumImpactSpeed` is measured in px/s from the ball's incoming horizontal velocity. `height` controls the lever shaft length in pixels. `speed` is the platform travel speed in px/s. Each path point is the centre of the platform, and the platform height is fixed by the renderer/physics implementation.

## Editing levels

Edit JSON files in `public/levels/`. `level-01.json` is the tutorial course and `physics-sandbox.json` is the movement sandbox. The browser validates each file before building collision bodies. Reload the game after changing a level.

## Octopus statues

Levels can define stationary Liberty-inspired octopus mascots in a top-level `statues` array. The compact mascot has a large round smiley head, a chunky purple punk mohawk over a gold circlet, six lower tentacles that fan out like a robe, a raised tentacle holding a brass torch, and a bold standalone thumb silhouette on the other side. Before activation, the torch releases a few soft animated smoke wisps; once the statue is activated, the smoke immediately gives way to the same layered orange, gold and pale-hot flame inspired by the checkpoint lantern, which then flickers gently. The gesture is a horizontal, messaging-app-style fist extending away from the head: its gold cuff attaches at the head-side wrist, while the thumb points vertically. Before activation the octopus has a sad face and a clearly visible thumbs-down. After the first player-ball collision, the same compact fist remains in place and flips only by vertical mirroring (rather than rotating) into a thumbs-up, while the face becomes a closed crescent smile with two small teeth over 720 ms. The hand uses the octopus's patina palette with a gold wrist cuff so the gesture remains readable at gameplay scale. Its face is rendered on a lightweight independent layer: pupils gently glance around and the eyes blink periodically, while all cheek blush marks are omitted. Further contacts do not reactivate it. The six lower tentacles sway slowly and independently of activation, while Reduced Motion freezes their motion and the smoke/flame animation. The physical body uses a compound contour around the head, lower tentacle skirt, plinth, horizontal fist and wrist instead of a broad rectangle, avoiding contacts in empty corners and side gaps around the mascot.

```json
{
  "statues": [
    { "id": "liberty-statue-a", "x": 8405, "y": 930 },
    { "id": "liberty-statue-b", "x": 8610, "y": 930 }
  ]
}
```

`x` is the statue centre and `y` is the ground/base position, both in world pixels. A level with statues shows a `STATUES completed / total` HUD counter. The goal portal remains locked until every statue has been hit; entering it early displays the remaining requirement on the portal and in the HUD. Levels without statues retain their previous completion behavior. The Physics Sandbox contains two statues immediately before its final rocky section.

## Checkpoints

Checkpoint triggers remain non-physical sensor volumes. Their visual marker is a slim brushed-metal lamp post with a borderless, radially shaded glass globe and floating `Z` marks. Reaching one wakes the bulb, opens its face into dark sunglasses, and turns on a broad, feather-soft amber light pool that gently flickers without visible concentric rings. The active checkpoint remains the respawn location after death. Checkpoint placement and respawn coordinates are configured with the usual `triggers` entry (`type: "checkpoint"`, `x`, `y`, `width`, `height`, `respawnX`, and `respawnY`). The lamp is decorative only and does not push or stop the player. Reduced Motion keeps the bulb and ambient glow steadily lit without the continuous animation.

## Surface borders

Boxes and polygons can customize each visible edge independently from their physics material and interior texture. Boxes use `borders: { top, right, bottom, left }`; polygons use a `borders` array with zero-based `{ edge, style }` entries. Built-in styles are `default`, `none`, `grass`, `pavers`, `stone`, `metal`, `ice`, `glass`, `brick`, `wood`, and `spikes`. The `glass` style uses a quiet, translucent graphite blue-grey rim that blends into the glass facets, with sparse soft oval reflections; unlike `ice`, it does not add snow, crystal chunks, or bright diagonal strokes. Most border styles are visual-only and do not change collision geometry or material physics. `spikes` is the intentional exception: it draws raised teeth and creates matching triangular sensor volumes (default height 28 px). Only contact with the protruding spike volume is lethal; touching the underlying solid outside those triangles is safe. The player respawns at the active checkpoint, while enemy characters are removed. Spring-enabled edges are rendered on top as wide black-and-yellow hazard tape. See `SURFACE_BORDERS.md` for examples and the complete style reference.

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

Open **Settings** from the main menu to choose a ball appearance. The built-in skins are Happy face, Football, Basketball, Googly eye, and Tiny alien. The selected skin is stored with the player's local preferences and restored on the next visit. Existing saves that do not contain a `ballSkin` preference automatically use the Happy face skin. The Happy face skin has procedural eye glances, offset double-blinks, expressive eyebrows, a gently changing grin, and pulsing cheek blush. Its facial animation follows the rolling ball and pauses when **Reduce motion** is enabled.

## Autonomous patrol bots

Levels can define up to 24 autonomous rolling bots in the optional top-level `bots` array. Each bot is a dynamic circular Matter body with its own mass, radius, horizontal patrol speed, initial direction, restitution, and friction. Bots collide physically with the player ball, terrain, movable blocks, and other bots. They do not consume player input or ordinary level triggers; poop speed-and-spin pickups are a special collectible that can boost either the player or a bot.

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

## In-game settings and safe return to menu

Settings are available from the main menu, the pause menu, and the level-complete panel. Opening Settings while playing keeps the game paused; saving or closing Settings returns to the menu it was opened from, so the current level, player position, checkpoint, and physics state are preserved. Choosing Main menu opens a confirmation dialog. Confirming discards the current run and clears level geometry, physics bodies, bots, movable blocks, ball visuals, and transient effects before showing the main menu. Previously completed level records and saved preferences are retained.

## Surface textures

Level solids can optionally define a procedural `texture` independently of their physics `material`. See [`SURFACE_TEXTURES.md`](./SURFACE_TEXTURES.md) for the built-in catalog, per-solid options (`density`, `opacity`, `seed`), and JSON examples. Textures are CanvasTexture overlays clipped to each box or polygon; the movable-block overlay follows its physics body.

## Poop speed-and-spin pickups

Levels can define optional one-shot cartoon poop collectibles in the top-level `poopPickups` array. The character body stays still while its oversized pupils glance around independently; the old floating motion and decorative yellow sparkle are intentionally absent. When the player ball or an autonomous rolling bot touches one, the pickup disappears in a sticky splat: small brown droplets flick outward, stretch into drips, run down briefly, and fade. The touching character's linear speed and axial spin are multiplied by the configured percentages. For bots, the boosted patrol speed is retained by their patrol controller, so it is not overwritten on the next physics step. If a character is moving but has almost no spin at collection time, the pickup seeds a gentle rolling spin before applying the spin multiplier. Each pickup is one-shot and can be collected by only one character; whichever arrives first consumes it.

```json
{
  "poopPickups": [
    {
      "id": "sandbox-poop-boost",
      "x": 4050,
      "y": 861,
      "radius": 19,
      "speedBoostPercent": 25,
      "spinBoostPercent": 45
    }
  ]
}
```

`x` and `y` are the center coordinates of the pickup sensor. Its lower edge (`y + radius`) is treated as the surface contact line, and the visual character is bottom-aligned to that line. To place a pickup on a horizontal surface at `surfaceY`, set `y` to `surfaceY - radius`. `radius` controls the square sensor bounds and scales the character proportionally. `speedBoostPercent` accepts 0–200 and `spinBoostPercent` accepts 0–300. Pickups are collected once and reset when the level is restarted. The Physics Sandbox includes one example placed on its long concrete platform.

## Flying bird guardians

Levels may define flying birds in the optional `birds` array. Each bird patrols a horizontal segment at its initial `y` coordinate, turns around at the configured ends or when terrain blocks its forward corridor, and keeps its patrol altitude while flying.

```json
{
  "id": "nest-guardian",
  "x": 1910,
  "y": 478,
  "radius": 18,
  "mass": 1.35,
  "patrolSpeed": 95,
  "attackSpeed": 260,
  "aggressive": true,
  "detectionRadius": 135,
  "attackImpulse": 150,
  "direction": 1,
  "patrolRange": { "minX": 1760, "maxX": 2060 }
}
```

`patrolRange` and the bird's `y` coordinate define a horizontal patrol line. `detectionRadius` expands that line into a protected rectangle (the patrol interval extended by the radius at each end and vertically by the same radius) and is also the bird's local detection distance. Set `aggressive: true` to enable guarding; passive birds simply patrol and still behave as physical bodies. An aggressive bird attacks only while the ball is both inside this rectangle and within `detectionRadius` of the bird. It flies to an intercept point on the inner side of the ball so an impact sends the ball toward the nearer horizontal end of the patrol lane (rather than into the nest platform).

The Matter body uses the configured `mass`; ordinary patrol collisions transfer momentum through the physics solver. On an attack hit, `attackImpulse` adds a configurable equal-and-opposite impulse to the ball and bird. The bird is briefly allowed to recoil, then resumes its patrol and returns toward its original flight line. `attackImpulse` is expressed as mass × px/s and may be zero to disable the extra attack impulse while retaining the physical collision.

Bird guardians use a procedural cartoon renderer rather than a platform-dependent emoji. Their rounded teal-and-gold bodies, oversized googly eyes, beak, crest, feet and two independently flapping feathered wings are redrawn on each fixed physics step. Wing cadence increases during an attack, while the bird leans forward and opens its beak.

A bird/ball collision emits a deterministic, short-lived burst of colored feathers. Each feather has its own velocity, gravity, rotation and fade-out, and the particle layer is disposed with the bird. The circular Matter body, patrol behavior, attack detection and configured impulse are unchanged by this visual upgrade.

## Green vomit enemies

Levels may define optional `vomitEnemies` entries. A green enemy is a dynamic, pushable circular body. When the main ball enters its detection radius, it emits an immediate outward pulse, then repeats at `pulseIntervalSeconds` while the ball remains in range. The pulse adds `pulseImpulse / ballMass` to the ball's velocity in the direction from the green enemy toward the ball. The velocity change is applied through the Phaser Matter GameObject setter so Matter synchronizes its previous-position state and preserves the impulse during integration. The gagging animation emits a deterministic cone of individual slime droplets; no continuous beam is drawn. The enemy can be knocked from its ledge and is removed after falling below the level kill plane. Its Sandbox radius matches the player smiley radius (18 px).

Example:

```json
{
  "id": "green-gremlin",
  "x": 6282,
  "y": 862,
  "radius": 18,
  "mass": 1.15,
  "detectionRadius": 245,
  "pulseImpulse": 170,
  "pulseIntervalSeconds": 0.88,
  "restitution": 0.16,
  "friction": 0.58
}
```

The Physics Sandbox includes a slime-guarded ledge beside a pit after the texture gallery. Try jumping past its repeated pulses, then push the gremlin into the gap.

## Patrol bot appearance

The red patrol bots in the Physics Sandbox use the same 18 px radius as the default player smiley and are positioned so their lower edge rests on the patrol island. Their oversized eyes retain the manic pupils; the mouth follows its own lower-face track instead of orbiting with the eyes as the body rolls. The circular body outline is a restrained 1.1 px dark burgundy stroke rather than a thick bright pink rim.

A substantial player impact (at least 260 px/s along the contact normal) now triggers a brief surprised expression: the eyes enlarge and the smile crossfades to an open O mouth for about 0.62 seconds. This applies to terrain, walls, springs, movable blocks, patrol bots, birds and green vomit enemies. Small contacts do not change the expression, and collision impacts no longer squash or stretch the player's body.

## Teleporting purple demons

Levels may define optional `demonEnemies`. A demon selects the nearest safe candidate relative to the player from upward-facing solid surfaces inside its `spawnArea`. Box tops and upward-facing polygon slopes are supported; subsequent choices avoid the previous location when possible. Surface edges marked `spikes` are never used as spawn locations. Candidate points are sampled with a radius margin so the circular body is fully supported by the selected surface. Keep the spawn region over static, intact platforms; movable and breakable solids are excluded because spawn positions are derived from level geometry when the level is built.

```json
{
  "demonEnemies": [
    {
      "id": "purple-devil",
      "spawnArea": { "minX": 6100, "minY": 700, "maxX": 6880, "maxY": 900 },
      "radius": 18,
      "mass": 1.35,
      "respawnIntervalSeconds": 3.8,
      "telegraphSeconds": 1.0,
      "attackDelaySeconds": 0.5,
      "activeSeconds": 4.0,
      "attackRadius": 270,
      "lightningImpulse": 235,
      "collisionImpulse": 520,
      "restitution": 0.14,
      "friction": 0.48
    }
  ]
}
```

Before each appearance, jagged teleport lightning marks the selected location for `telegraphSeconds`. The location is checked against the player's current position: the demon will not materialize within the combined body radii plus a small safety margin. If every configured point is occupied, it waits and retries until the player moves away; if the player rolls into the marked point during the warning, the marker relocates and the full warning period starts again. The demon then materializes as a dynamic Matter circle, waits `attackDelaySeconds`, and keeps the zap armed until the clear gap between the ball and demon circles is within `attackRadius` (the check includes both collision radii); it then zaps the ball exactly once. `lightningImpulse` controls the added player momentum; `collisionImpulse` (default 520, in mass × px/s) controls the equal-and-opposite knockback applied to the ball and demon on physical contact, with a bright branching electrical burst at the contact point; set it to 0 to disable the extra collision knockback while keeping the visual burst. The value can be tuned per demon in the level JSON; each body receives a velocity change based on its own mass. The ranged `lightningImpulse` is converted using the player's mass. The strike still produces a deterministic knockback when the ball and demon centers coincide, rather than silently dropping the impulse. Unless physically disrupted, the demon remains visible and physical for `activeSeconds` (4 seconds by default), then vanishes and waits `respawnIntervalSeconds` before choosing another surface point. A meaningful physical impact by a character disrupts the teleport cycle and leaves the demon as a normal pushable body, so it can be knocked into pits or onto spikes; the pending zap remains armed during the active window and is not cancelled by the ram. The enemy is also removed when it crosses `world.killPlaneY`. Its horns, bat wings, trident and expression are procedural Phaser graphics in a standalone world-space display object, separate from the invisible Matter Zone that owns the circular collision body. The body graphics are positioned directly from the current Matter body position each step, without depending on a nested Container. This keeps rendering visible when Matter switches the body between dormant/static and active/dynamic states. Teleport arcs and the zap are separate world-space graphics.
