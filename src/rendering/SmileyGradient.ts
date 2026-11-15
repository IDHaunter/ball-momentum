/**
 * Draws the Smiley ball's clean warm fill into a CanvasTexture context.
 * Using one clipped Canvas gradient avoids the thin polygon seams produced
 * by tessellating dozens of tiny Graphics bands in the WebGL renderer.
 */
export const SMILEY_GRADIENT_TEXTURE_KEY = 'ball-momentum-smiley-gradient-v3';
export const SMILEY_GRADIENT_TEXTURE_SIZE = 256;

export function drawSmileyGradient(
  context: CanvasRenderingContext2D,
  size: number = SMILEY_GRADIENT_TEXTURE_SIZE,
): void {
  const safeSize = Number.isFinite(size) ? Math.max(32, Math.round(size)) : SMILEY_GRADIENT_TEXTURE_SIZE;
  const center = safeSize / 2;
  const radius = safeSize * 0.49;

  context.clearRect(0, 0, safeSize, safeSize);
  context.save();
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.closePath();
  context.clip();

  const gradient = context.createLinearGradient(0, 0, 0, safeSize);
  gradient.addColorStop(0, '#ffd94d');
  gradient.addColorStop(0.42, '#f8b932');
  gradient.addColorStop(0.76, '#ef873f');
  gradient.addColorStop(1, '#e77978');
  context.fillStyle = gradient;
  context.fillRect(0, 0, safeSize, safeSize);

  // The separate, existing softHighlight ellipse supplies the only gloss.
  // Keeping the base texture to one linear gradient avoids any extra shading.
  context.restore();
}
