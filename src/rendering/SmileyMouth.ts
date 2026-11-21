/**
 * Draws the Smiley's normal and surprised mouths as small transparent CanvasTextures.
 * Canvas textures keep the tiny facial marks stable and avoid WebGL line artifacts
 * when the parent ball rotates.
 */
export const SMILEY_MOUTH_TEXTURE_KEY = 'ball-momentum-smiley-mouth-v1';
export const SMILEY_MOUTH_TEXTURE_WIDTH = 256;
export const SMILEY_MOUTH_TEXTURE_HEIGHT = 128;

export const SMILEY_SURPRISE_MOUTH_TEXTURE_KEY = 'ball-momentum-smiley-surprise-mouth-v1';
export const SMILEY_SURPRISE_MOUTH_TEXTURE_SIZE = 128;

function safeDimension(value: number, minimum: number, fallback: number): number {
  return Number.isFinite(value) ? Math.max(minimum, Math.round(value)) : fallback;
}

export function drawSmileyMouth(
  context: CanvasRenderingContext2D,
  width = SMILEY_MOUTH_TEXTURE_WIDTH,
  height = SMILEY_MOUTH_TEXTURE_HEIGHT,
): void {
  const safeWidth = safeDimension(width, 64, SMILEY_MOUTH_TEXTURE_WIDTH);
  const safeHeight = safeDimension(height, 48, SMILEY_MOUTH_TEXTURE_HEIGHT);

  context.clearRect(0, 0, safeWidth, safeHeight);
  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = 25;
  context.strokeStyle = '#33221b';
  context.beginPath();
  context.moveTo(safeWidth * 0.11, safeHeight * 0.275);
  context.quadraticCurveTo(safeWidth * 0.5, safeHeight * 0.695, safeWidth * 0.89, safeHeight * 0.275);
  context.stroke();
  context.restore();
}

/** A readable surprised "O" mouth with a warm inner tongue highlight. */
export function drawSmileySurpriseMouth(
  context: CanvasRenderingContext2D,
  size = SMILEY_SURPRISE_MOUTH_TEXTURE_SIZE,
): void {
  const safeSize = safeDimension(size, 48, SMILEY_SURPRISE_MOUTH_TEXTURE_SIZE);
  const center = safeSize / 2;

  context.clearRect(0, 0, safeSize, safeSize);
  context.save();
  context.beginPath();
  context.ellipse(center, center, safeSize * 0.235, safeSize * 0.34, 0, 0, Math.PI * 2);
  context.fillStyle = '#33221b';
  context.fill();

  // The small lower highlight keeps the open mouth expressive at 36 px scale.
  context.beginPath();
  context.ellipse(center, center + safeSize * 0.16, safeSize * 0.12, safeSize * 0.075, 0, Math.PI, Math.PI * 2);
  context.fillStyle = '#d97867';
  context.fill();

  context.beginPath();
  context.ellipse(center - safeSize * 0.075, center - safeSize * 0.19, safeSize * 0.055, safeSize * 0.027, -0.35, 0, Math.PI * 2);
  context.fillStyle = 'rgba(255, 245, 225, 0.42)';
  context.fill();
  context.restore();
}
