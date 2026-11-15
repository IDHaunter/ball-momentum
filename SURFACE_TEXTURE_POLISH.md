# Surface Texture Revision

- Removed the decorative cross-diagonal and centre-to-corner lines previously drawn over glass solids by `TerrainRenderer`; glass now uses only its configured outer border and translucent internal facets.
- Restored the earlier soft triangular glass-pane fill treatment, using large continuous translucent polygon panes and inset triangular reflections, with no shared centre spokes or stroked seam network.
- Replaced the duplicate ice-facets visual with `stone-masonry`; the only active ice gallery pattern is `ice-strata`.
- Replaced the purple rubber-dot and chevron visuals with warm `brick-masonry`.
- Kept old texture IDs as schema-compatible aliases: `ice-facets` -> `stone-masonry`, `rubber-dots` / `rubber-chevrons` -> `brick-masonry`, and `ice-crystals` -> `ice-strata`.
- Rebuilt wood grain as warm brown timber boards with fibres and knots, and assigned the wood sample a dedicated wood material base colour.
- Updated the Sandbox gallery to nine distinct, labelled samples and added `brick` and `wood` physics material definitions for those examples.

Physics calculations, collision geometry, breakable glass, spring surfaces, movable blocks and bot behaviour are unchanged.
