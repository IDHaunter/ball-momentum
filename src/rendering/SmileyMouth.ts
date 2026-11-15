/**
 * Draws the Smiley's mouth once as a small transparent CanvasTexture.
 * A single quadratic stroke avoids WebGL triangulation seams and endpoint
 * artifacts that can appear when a short Graphics path is cleared/redrawn
 * every frame while the parent ball rotates.
 */
export const SMILEY_MOUTH_TEXTURE_KEY = 'ball-momentum-smiley-mouth-v1';
export const SMILEY_MOUTH_TEXTURE_WIDTH = 256;
export const SMILEY_MOUTH_TEXTURE_HEIGHT = 128;

export function drawSmileyMouth(
  context: CanvasRenderingContext2D,
  width = SMILEY_MOUTH_TEXTURE_WIDTH,
  height = SMILEY_MOUTH_TEXTURE_HEIGHT,
): void {
  const safeWidth = Number.isFinite(width) ? Math.max(64, Math.round(width)) : SMILEY_MOUTH_TEXTURE_WIDTH;
  const safeHeight = Number.isFinite(height) ? Math.max(48, Math.round(height)) : SMILEY_MOUTH_TEXTURE_HEIGHT;

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
