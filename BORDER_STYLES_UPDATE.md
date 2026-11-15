# Surface Border Styles Update

- Added per-side box `borders` and per-edge polygon `borders` configuration.
- Added the styles `default`, `none`, `grass`, `asphalt`, `stone`, `metal`, `ice`, and `wood`.
- Added procedural geometric edge treatments in `src/rendering/SurfaceBorderRenderer.ts`.
- Replaced the old spring tick marks with a thick black-and-yellow hazard tape treatment; spring tape has priority over the selected border style on that same edge.
- Movable boxes now receive a synchronized border overlay that follows translation and rotation.
- Updated both `level-01.json` and the latest `physics-sandbox.json` with a varied set of edge treatments. Physics data is unchanged.
- Added validation and tests for polygon edge indexes, duplicate assignments, style rendering, spring tape, and movable-box border propagation.
