/** Cached, glossy red-pink shell for autonomous patrol bots. */
export const BOT_GRADIENT_TEXTURE_KEY = 'ball-momentum-bot-shell-gradient-v1';
export const BOT_GRADIENT_TEXTURE_SIZE = 128;

/**
 * Paints a soft, layered red shell with a warm upper-left sheen and deeper lower
 * shading. The texture is clipped to a circle and reused by all patrol bots.
 */
export function drawBotGradient(
  context: CanvasRenderingContext2D,
  size = BOT_GRADIENT_TEXTURE_SIZE,
): void {
  const safeSize = Number.isFinite(size) ? Math.max(48, Math.round(size)) : BOT_GRADIENT_TEXTURE_SIZE;
  const center = safeSize / 2;
  const radius = safeSize * 0.49;

  context.clearRect(0, 0, safeSize, safeSize);
  context.save();
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.closePath();
  context.clip();

  const base = context.createLinearGradient(safeSize * 0.18, 0, safeSize * 0.78, safeSize);
  base.addColorStop(0, '#f58ba8');
  base.addColorStop(0.34, '#e96b91');
  base.addColorStop(0.68, '#cf4d79');
  base.addColorStop(1, '#9b315b');
  context.fillStyle = base;
  context.fillRect(0, 0, safeSize, safeSize);

  // Broad blush across the upper-left quadrant gives the shell a rounded volume.
  const blush = context.createRadialGradient(
    safeSize * 0.31, safeSize * 0.24, safeSize * 0.025,
    safeSize * 0.40, safeSize * 0.38, safeSize * 0.67,
  );
  blush.addColorStop(0, 'rgba(255, 220, 231, 0.62)');
  blush.addColorStop(0.36, 'rgba(255, 173, 196, 0.23)');
  blush.addColorStop(1, 'rgba(255, 173, 196, 0)');
  context.fillStyle = blush;
  context.fillRect(0, 0, safeSize, safeSize);

  // A gentle lower rim shade makes the circle feel glossy rather than flat.
  const shade = context.createRadialGradient(
    safeSize * 0.58, safeSize * 0.86, safeSize * 0.02,
    safeSize * 0.58, safeSize * 0.80, safeSize * 0.64,
  );
  shade.addColorStop(0, 'rgba(88, 18, 48, 0.34)');
  shade.addColorStop(0.55, 'rgba(112, 24, 58, 0.14)');
  shade.addColorStop(1, 'rgba(112, 24, 58, 0)');
  context.fillStyle = shade;
  context.fillRect(0, 0, safeSize, safeSize);

  // Soft, asymmetric specular patch and a smaller bright glint.
  context.beginPath();
  context.ellipse(safeSize * 0.34, safeSize * 0.19, safeSize * 0.22, safeSize * 0.075, -0.42, 0, Math.PI * 2);
  const gloss = context.createLinearGradient(safeSize * 0.16, safeSize * 0.12, safeSize * 0.54, safeSize * 0.29);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.54)');
  gloss.addColorStop(1, 'rgba(255, 238, 245, 0.03)');
  context.fillStyle = gloss;
  context.fill();

  context.beginPath();
  context.ellipse(safeSize * 0.27, safeSize * 0.145, safeSize * 0.095, safeSize * 0.028, -0.42, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.38)';
  context.fill();

  context.restore();
}
