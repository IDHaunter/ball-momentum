# Smiley in-game gradient rendering fix

- Replaced the in-game Smiley base's 56 individually tessellated horizontal Graphics polygons with one high-resolution Phaser CanvasTexture.
- The CanvasTexture uses a single clipped vertical linear gradient matching the existing Settings preview colors, while keeping the existing separate, subtle highlight ellipse. The base texture contains no dark or radial shading.
- No dark or black shading stops are used in the game texture, preventing the unwanted right-to-left dark streaking / dirty shading reported during gameplay.
- The texture is generated once in the Scene Texture Manager and reused across BallRenderer instances and level restarts. It is displayed at the current ball diameter, so debug radius changes still work.
- The Settings preview SVG, Smiley eyes, mouth, animation, all other skins, physics, levels, and gameplay systems are unchanged.
- Added focused regression coverage for the canvas clipping, warm vertical color stops, highlight stops, and safe texture sizing.
