# Surface Texture Library — Material Refresh

## Visual changes

- Removed the extra corner-to-corner, corner-to-centre and vertical strokes that `TerrainRenderer` previously drew over glass. Glass keeps its configured outer border, while its inside is filled only by translucent triangular colour panes and isolated glints.
- Restored the earlier cool triangular-glass palette using large continuous translucent polygon panes with small inset triangular reflections. No shared centre spokes or seam strokes are drawn.
- Replaced the second ice style with `stone-masonry`, leaving one active ice style: `ice-strata`.
- Replaced the purple rubber-dot and chevron patterns with warm `brick-masonry`.
- Retained the old IDs as compatibility aliases: `ice-facets` -> `stone-masonry`, `rubber-dots` / `rubber-chevrons` -> `brick-masonry`, and `ice-crystals` -> `ice-strata`.
- Reworked `wood-grain` into warm brown timber planks with fibres and knots. The Sandbox wood sample and wooden movable props now use a warm wood material base.
- Added visually named `brick` and `wood` materials. Their friction, static friction and restitution values exactly match the previous `rubber` and `stone` entries respectively, preserving physics response.
- Rebuilt the Sandbox gallery to show nine distinct active patterns: stone fragments, stone strata, ice strata, stone masonry, brick masonry, glass facets, concrete grain, wood grain and sand specks.

## Compatibility and physics

Old texture IDs remain accepted by the level schema and render as their closest replacement. This change is visual/material tuning only: no collision geometry, mass, friction on existing materials, spring impulses, bomb behaviour, breakable thresholds, bot behaviour or player physics logic was changed. The new `brick` coefficients exactly copy the former `rubber` coefficients, and `wood` exactly copies the former `stone` coefficients, so existing Sandbox physics response is preserved while the material names and colours match their appearance.

## Verification

- Procedural generator runtime harness exercised every active pattern and all legacy aliases.
- Glass CanvasTexture generator does not call `stroke`; glass TerrainRenderer no longer draws internal line segments.
- Gallery JSON contains exactly one sample for each active pattern and the goal remains after the samples.
- TypeScript syntax transpilation and JSON parsing are run as part of the packaging check.
