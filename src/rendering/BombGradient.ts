/** Cached graphite-metal shell texture for the game's timer bombs. */
export const BOMB_GRADIENT_TEXTURE_KEY = 'ball-momentum-bomb-shell-gradient-v1';
export const BOMB_GRADIENT_TEXTURE_SIZE = 128;

/**
 * Paints a rounded graphite shell with the same layered glossy treatment as
 * patrol bots, using a restrained steel/charcoal palette instead of red-pink.
 */
export function drawBombGradient(
  context: CanvasRenderingContext2D,
  size = BOMB_GRADIENT_TEXTURE_SIZE,
): void {
  const safeSize = Number.isFinite(size) ? Math.max(48, Math.round(size)) : BOMB_GRADIENT_TEXTURE_SIZE;
  const center = safeSize / 2;
  const radius = safeSize * 0.49;

  context.clearRect(0, 0, safeSize, safeSize);
  context.save();
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.closePath();
  context.clip();

  const base = context.createLinearGradient(safeSize * 0.12, safeSize * 0.04, safeSize * 0.86, safeSize * 0.98);
  base.addColorStop(0, '#87939f');
  base.addColorStop(0.28, '#626e7b');
  base.addColorStop(0.62, '#343e49');
  base.addColorStop(1, '#171d25');
  context.fillStyle = base;
  context.fillRect(0, 0, safeSize, safeSize);

  // Cool metallic sheen across the upper-left quadrant.
  const sheen = context.createRadialGradient(
    safeSize * 0.29, safeSize * 0.22, safeSize * 0.02,
    safeSize * 0.39, safeSize * 0.36, safeSize * 0.68,
  );
  sheen.addColorStop(0, 'rgba(246, 250, 255, 0.58)');
  sheen.addColorStop(0.34, 'rgba(205, 219, 233, 0.24)');
  sheen.addColorStop(1, 'rgba(170, 190, 210, 0)');
  context.fillStyle = sheen;
  context.fillRect(0, 0, safeSize, safeSize);

  // A deeper lower-right shade gives the bomb a compact, rounded volume.
  const shade = context.createRadialGradient(
    safeSize * 0.62, safeSize * 0.88, safeSize * 0.015,
    safeSize * 0.58, safeSize * 0.78, safeSize * 0.66,
  );
  shade.addColorStop(0, 'rgba(5, 9, 15, 0.56)');
  shade.addColorStop(0.56, 'rgba(9, 14, 21, 0.22)');
  shade.addColorStop(1, 'rgba(9, 14, 21, 0)');
  context.fillStyle = shade;
  context.fillRect(0, 0, safeSize, safeSize);

  // Wide soft specular highlight, matching the bots' glossy shell language.
  context.beginPath();
  context.ellipse(safeSize * 0.34, safeSize * 0.18, safeSize * 0.22, safeSize * 0.075, -0.42, 0, Math.PI * 2);
  const gloss = context.createLinearGradient(safeSize * 0.14, safeSize * 0.10, safeSize * 0.57, safeSize * 0.30);
  gloss.addColorStop(0, 'rgba(255, 255, 255, 0.62)');
  gloss.addColorStop(0.55, 'rgba(225, 236, 247, 0.24)');
  gloss.addColorStop(1, 'rgba(225, 236, 247, 0.015)');
  context.fillStyle = gloss;
  context.fill();

  context.beginPath();
  context.ellipse(safeSize * 0.265, safeSize * 0.14, safeSize * 0.092, safeSize * 0.027, -0.42, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 255, 255, 0.46)';
  context.fill();

  context.restore();
}
