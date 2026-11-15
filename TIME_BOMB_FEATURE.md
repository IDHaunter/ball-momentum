# Time Bombs

Levels may define timed bombs in an optional top-level `bombs` array.

```json
{
  "bombs": [
    {
      "id": "time-bomb-01",
      "x": 3500,
      "y": 862,
      "radius": 18,
      "mass": 1.5,
      "fuseSeconds": 3,
      "explosionRadius": 360,
      "explosionEnergy": 300000,
      "restitution": 0.58,
      "friction": 0.08
    }
  ]
}
```

The bomb is static until the player ball or an autonomous bot hits it. The hit starts the fuse, releases the bomb as a dynamic Matter body, and transfers part of the incoming collision momentum so it can continue to be pushed during the countdown. If its centre falls below the level kill plane before the fuse ends, the bomb is removed without exploding.

At detonation, blast energy uses quadratic radial attenuation:

`energyAtDistance = explosionEnergy * (1 - distance / explosionRadius)^2`

The energy is converted into a mass-dependent radial velocity change for the player, bots, and movable blocks. An unactivated movable block is released only when the local blast energy reaches its `minimumImpactEnergy`. Breakable glass is destroyed when local blast energy reaches the solid's existing `breakable.thresholdEnergy`; its normal glass-shatter effect and support cascade are reused.

The countdown shows the configured seconds, updates once per second, displays `0` briefly, then detonates. Bombs that fall below `world.killPlaneY` are cleaned up along with their countdown and fuse visuals.
