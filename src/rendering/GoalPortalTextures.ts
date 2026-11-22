import type Phaser from 'phaser';

export const GOAL_PORTAL_FIELD_TEXTURE_KEY = 'ball-momentum-goal-portal-field-v1';
export const GOAL_PORTAL_GLOW_TEXTURE_KEY = 'ball-momentum-goal-portal-glow-v2';
export const GOAL_PORTAL_FLOW_TEXTURE_KEY = 'ball-momentum-goal-portal-flow-v1';

const PORTAL_SIZE = 256;
const PORTAL_GLOW_SIZE = 512;
const PORTAL_CORNER_RATIO = 0.14;

/** Creates the soft, cool-toned portal textures used by goal triggers. */
export function ensureGoalPortalTextures(scene: Phaser.Scene): void {
  ensureCanvasTexture(scene, GOAL_PORTAL_FIELD_TEXTURE_KEY, PORTAL_SIZE, PORTAL_SIZE, drawPortalField);
  ensureCanvasTexture(scene, GOAL_PORTAL_GLOW_TEXTURE_KEY, PORTAL_GLOW_SIZE, PORTAL_GLOW_SIZE, drawPortalGlow);
  ensureCanvasTexture(scene, GOAL_PORTAL_FLOW_TEXTURE_KEY, PORTAL_SIZE, PORTAL_SIZE, drawPortalFlow);
}

export function drawPortalField(context: CanvasRenderingContext2D, width = PORTAL_SIZE, height = PORTAL_SIZE): void {
  context.clearRect(0, 0, width, height);
  context.save();
  tracePortalRoundedRect(context, width, height, 8);
  context.clip();

  const base = context.createLinearGradient(0, 0, width, 0);
  base.addColorStop(0, 'rgba(63, 103, 128, 0.04)');
  base.addColorStop(0.16, 'rgba(91, 154, 174, 0.24)');
  base.addColorStop(0.43, 'rgba(177, 220, 219, 0.40)');
  base.addColorStop(0.58, 'rgba(216, 231, 218, 0.35)');
  base.addColorStop(0.84, 'rgba(91, 157, 179, 0.24)');
  base.addColorStop(1, 'rgba(52, 91, 120, 0.035)');
  context.fillStyle = base;
  context.fillRect(0, 0, width, height);

  const depth = context.createRadialGradient(width * 0.5, height * 0.48, width * 0.025, width * 0.5, height * 0.48, width * 0.58);
  depth.addColorStop(0, 'rgba(226, 246, 235, 0.33)');
  depth.addColorStop(0.38, 'rgba(117, 181, 196, 0.10)');
  depth.addColorStop(1, 'rgba(24, 48, 68, 0.08)');
  context.fillStyle = depth;
  context.fillRect(0, 0, width, height);

  // Broad, blurred ribbons make the portal read like liquid energy rather than a solid pane.
  context.save();
  context.shadowBlur = 18;
  context.shadowColor = 'rgba(191, 238, 234, 0.42)';
  for (let index = 0; index < 6; index += 1) {
    const y = height * (0.13 + index * 0.145);
    context.beginPath();
    context.moveTo(-width * 0.12, y + 15);
    context.bezierCurveTo(width * 0.22, y - 28, width * 0.68, y + 30, width * 1.12, y - 12);
    const ribbon = context.createLinearGradient(0, y - 26, width, y + 26);
    ribbon.addColorStop(0, 'rgba(128, 196, 208, 0)');
    ribbon.addColorStop(0.32, 'rgba(213, 245, 230, 0.18)');
    ribbon.addColorStop(0.68, 'rgba(130, 204, 213, 0.16)');
    ribbon.addColorStop(1, 'rgba(128, 196, 208, 0)');
    context.strokeStyle = ribbon;
    context.lineWidth = 9 + (index % 3) * 3;
    context.stroke();
  }
  context.restore();

  // A few vertical, bending currents add depth while staying deliberately translucent.
  for (let index = 0; index < 5; index += 1) {
    const x = width * (0.12 + index * 0.19);
    context.beginPath();
    context.moveTo(x, -height * 0.04);
    context.bezierCurveTo(x - 24, height * 0.27, x + 22, height * 0.62, x - 7, height * 1.04);
    context.strokeStyle = index % 2 === 0 ? 'rgba(226, 244, 226, 0.12)' : 'rgba(111, 189, 205, 0.13)';
    context.lineWidth = index % 2 === 0 ? 3.2 : 5.5;
    context.stroke();
  }

  context.restore();
}

export function drawPortalGlow(context: CanvasRenderingContext2D, width = PORTAL_GLOW_SIZE, height = PORTAL_GLOW_SIZE): void {
  context.clearRect(0, 0, width, height);
  context.save();
  context.translate(width / 2, height / 2);

  // The glow is deliberately drawn well inside a larger texture. Its blur can
  // dissipate before reaching the texture bounds, avoiding a visible square edge.
  context.filter = `blur(${Math.min(width, height) * 0.094}px)`;
  context.fillStyle = 'rgba(107, 188, 205, 0.34)';
  traceCenteredRoundedRect(context, width * 0.48, height * 0.48, Math.min(width, height) * 0.085);
  context.fill();
  context.filter = 'none';

  context.filter = `blur(${Math.min(width, height) * 0.066}px)`;
  context.fillStyle = 'rgba(195, 231, 222, 0.19)';
  traceCenteredRoundedRect(context, width * 0.34, height * 0.34, Math.min(width, height) * 0.07);
  context.fill();
  context.filter = 'none';
  context.restore();

  // Feather both axes independently so the outer aura dissolves to transparency
  // at the texture boundary instead of reading as a bright square card.
  context.save();
  context.globalCompositeOperation = 'destination-in';
  const horizontalFade = context.createLinearGradient(0, 0, width, 0);
  horizontalFade.addColorStop(0, 'rgba(255, 255, 255, 0)');
  horizontalFade.addColorStop(0.08, 'rgba(255, 255, 255, 0.18)');
  horizontalFade.addColorStop(0.20, 'rgba(255, 255, 255, 0.72)');
  horizontalFade.addColorStop(0.34, 'rgba(255, 255, 255, 1)');
  horizontalFade.addColorStop(0.66, 'rgba(255, 255, 255, 1)');
  horizontalFade.addColorStop(0.80, 'rgba(255, 255, 255, 0.72)');
  horizontalFade.addColorStop(0.92, 'rgba(255, 255, 255, 0.18)');
  horizontalFade.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = horizontalFade;
  context.fillRect(0, 0, width, height);

  const verticalFade = context.createLinearGradient(0, 0, 0, height);
  verticalFade.addColorStop(0, 'rgba(255, 255, 255, 0)');
  verticalFade.addColorStop(0.08, 'rgba(255, 255, 255, 0.18)');
  verticalFade.addColorStop(0.20, 'rgba(255, 255, 255, 0.72)');
  verticalFade.addColorStop(0.34, 'rgba(255, 255, 255, 1)');
  verticalFade.addColorStop(0.66, 'rgba(255, 255, 255, 1)');
  verticalFade.addColorStop(0.80, 'rgba(255, 255, 255, 0.72)');
  verticalFade.addColorStop(0.92, 'rgba(255, 255, 255, 0.18)');
  verticalFade.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.fillStyle = verticalFade;
  context.fillRect(0, 0, width, height);
  context.restore();
}

export function drawPortalFlow(context: CanvasRenderingContext2D, width = PORTAL_SIZE, height = PORTAL_SIZE): void {
  context.clearRect(0, 0, width, height);
  context.save();
  tracePortalRoundedRect(context, width, height, 13);
  context.clip();
  context.shadowBlur = 9;
  context.shadowColor = 'rgba(210, 246, 232, 0.20)';

  for (let index = 0; index < 8; index += 1) {
    const x = width * (0.08 + index * 0.12);
    context.beginPath();
    context.moveTo(x - 18, -height * 0.03);
    context.bezierCurveTo(x + 24, height * 0.24, x - 27, height * 0.58, x + 11, height * 1.03);
    const color = index % 3 === 0 ? 'rgba(238, 246, 220, 0.095)' : 'rgba(143, 213, 218, 0.075)';
    context.strokeStyle = color;
    context.lineWidth = index % 2 === 0 ? 2.1 : 1.35;
    context.stroke();
  }
  context.restore();
}

function tracePortalRoundedRect(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  inset: number,
): void {
  const left = inset;
  const right = width - inset;
  const top = inset;
  const bottom = height - inset;
  const radius = Math.min(right - left, bottom - top) * PORTAL_CORNER_RATIO;
  context.beginPath();
  context.moveTo(left + radius, top);
  context.lineTo(right - radius, top);
  context.quadraticCurveTo(right, top, right, top + radius);
  context.lineTo(right, bottom - radius);
  context.quadraticCurveTo(right, bottom, right - radius, bottom);
  context.lineTo(left + radius, bottom);
  context.quadraticCurveTo(left, bottom, left, bottom - radius);
  context.lineTo(left, top + radius);
  context.quadraticCurveTo(left, top, left + radius, top);
  context.closePath();
}

function traceCenteredRoundedRect(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
): void {
  const left = -width / 2;
  const right = width / 2;
  const top = -height / 2;
  const bottom = height / 2;
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(left + safeRadius, top);
  context.lineTo(right - safeRadius, top);
  context.quadraticCurveTo(right, top, right, top + safeRadius);
  context.lineTo(right, bottom - safeRadius);
  context.quadraticCurveTo(right, bottom, right - safeRadius, bottom);
  context.lineTo(left + safeRadius, bottom);
  context.quadraticCurveTo(left, bottom, left, bottom - safeRadius);
  context.lineTo(left, top + safeRadius);
  context.quadraticCurveTo(left, top, left + safeRadius, top);
  context.closePath();
}

function ensureCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void,
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, width, height);
  if (!texture) throw new Error(`Unable to create goal portal texture: ${key}`);
  draw(texture.getContext(), width, height);
  texture.refresh();
}
