import type Phaser from 'phaser';

export const CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY = 'ball-momentum-checkpoint-flame-dormant-v1';
export const CHECKPOINT_FLAME_ACTIVE_TEXTURE_KEY = 'ball-momentum-checkpoint-flame-active-v1';
export const CHECKPOINT_GLASS_TEXTURE_KEY = 'ball-momentum-checkpoint-glass-v1';
export const CHECKPOINT_GLOW_TEXTURE_KEY = 'ball-momentum-checkpoint-glow-v2';

const FLAME_TEXTURE_SIZE = 128;
const GLASS_TEXTURE_SIZE = 128;
const GLOW_TEXTURE_SIZE = 256;

/** Creates the cached flame, transparent lantern-glass and soft ambient-light textures. */
export function ensureCheckpointLightTextures(scene: Phaser.Scene): void {
  ensureCanvasTexture(scene, CHECKPOINT_FLAME_DORMANT_TEXTURE_KEY, FLAME_TEXTURE_SIZE, (context) => {
    drawCheckpointFlame(context, FLAME_TEXTURE_SIZE, false);
  });
  ensureCanvasTexture(scene, CHECKPOINT_FLAME_ACTIVE_TEXTURE_KEY, FLAME_TEXTURE_SIZE, (context) => {
    drawCheckpointFlame(context, FLAME_TEXTURE_SIZE, true);
  });
  ensureCanvasTexture(scene, CHECKPOINT_GLASS_TEXTURE_KEY, GLASS_TEXTURE_SIZE, (context) => {
    drawCheckpointGlass(context, GLASS_TEXTURE_SIZE);
  });
  ensureCanvasTexture(scene, CHECKPOINT_GLOW_TEXTURE_KEY, GLOW_TEXTURE_SIZE, (context) => {
    drawCheckpointGlow(context, GLOW_TEXTURE_SIZE);
  });
}

/** Draws a small stylized living flame, with a muted ember state before activation. */
export function drawCheckpointFlame(
  context: CanvasRenderingContext2D,
  size: number,
  active: boolean,
): void {
  const safeSize = Number.isFinite(size) ? Math.max(48, Math.round(size)) : FLAME_TEXTURE_SIZE;
  const center = safeSize / 2;
  context.clearRect(0, 0, safeSize, safeSize);
  context.save();
  context.globalAlpha = active ? 1 : 0.72;

  const outer = context.createLinearGradient(0, safeSize * 0.12, 0, safeSize * 0.91);
  if (active) {
    outer.addColorStop(0, '#fff8bd');
    outer.addColorStop(0.22, '#ffd95e');
    outer.addColorStop(0.55, '#ff922f');
    outer.addColorStop(0.82, '#ee5a25');
    outer.addColorStop(1, '#b93c28');
  } else {
    outer.addColorStop(0, '#d9a65b');
    outer.addColorStop(0.34, '#a96b39');
    outer.addColorStop(0.72, '#75462f');
    outer.addColorStop(1, '#4d3540');
  }

  context.beginPath();
  context.moveTo(center, safeSize * 0.08);
  context.bezierCurveTo(safeSize * 0.58, safeSize * 0.24, safeSize * 0.91, safeSize * 0.43, safeSize * 0.78, safeSize * 0.68);
  context.bezierCurveTo(safeSize * 0.72, safeSize * 0.84, safeSize * 0.61, safeSize * 0.91, center, safeSize * 0.91);
  context.bezierCurveTo(safeSize * 0.29, safeSize * 0.91, safeSize * 0.17, safeSize * 0.78, safeSize * 0.21, safeSize * 0.62);
  context.bezierCurveTo(safeSize * 0.24, safeSize * 0.48, safeSize * 0.39, safeSize * 0.39, safeSize * 0.40, safeSize * 0.20);
  context.bezierCurveTo(safeSize * 0.47, safeSize * 0.28, safeSize * 0.49, safeSize * 0.34, center, safeSize * 0.08);
  context.closePath();
  context.fillStyle = outer;
  context.fill();

  // A smaller, asymmetrical hot core gives the flame a familiar chat-emoji feel
  // without turning it into a face or making it compete with the player character.
  const core = context.createRadialGradient(
    safeSize * 0.47, safeSize * 0.66, safeSize * 0.015,
    safeSize * 0.48, safeSize * 0.64, safeSize * 0.31,
  );
  if (active) {
    core.addColorStop(0, 'rgba(255, 255, 218, 0.98)');
    core.addColorStop(0.42, 'rgba(255, 235, 145, 0.92)');
    core.addColorStop(1, 'rgba(255, 190, 78, 0)');
  } else {
    core.addColorStop(0, 'rgba(255, 210, 137, 0.42)');
    core.addColorStop(0.5, 'rgba(218, 143, 73, 0.28)');
    core.addColorStop(1, 'rgba(180, 94, 52, 0)');
  }
  context.fillStyle = core;
  context.fillRect(0, 0, safeSize, safeSize);

  // A narrow inner lick adds a little depth and variation to the flame silhouette.
  context.beginPath();
  context.moveTo(center * 0.98, safeSize * 0.79);
  context.bezierCurveTo(safeSize * 0.39, safeSize * 0.69, safeSize * 0.50, safeSize * 0.57, safeSize * 0.57, safeSize * 0.43);
  context.bezierCurveTo(safeSize * 0.70, safeSize * 0.61, safeSize * 0.64, safeSize * 0.74, center * 1.04, safeSize * 0.82);
  context.closePath();
  context.fillStyle = active ? 'rgba(255, 250, 211, 0.92)' : 'rgba(238, 179, 102, 0.35)';
  context.fill();
  context.restore();
}

/** Draws a thin, transparent glass lantern shell with restrained cool reflections. */
export function drawCheckpointGlass(context: CanvasRenderingContext2D, size: number): void {
  const safeSize = Number.isFinite(size) ? Math.max(48, Math.round(size)) : GLASS_TEXTURE_SIZE;
  const center = safeSize / 2;
  context.clearRect(0, 0, safeSize, safeSize);
  context.save();

  context.beginPath();
  context.moveTo(center, safeSize * 0.075);
  context.bezierCurveTo(safeSize * 0.76, safeSize * 0.075, safeSize * 0.91, safeSize * 0.23, safeSize * 0.88, safeSize * 0.43);
  context.lineTo(safeSize * 0.84, safeSize * 0.79);
  context.bezierCurveTo(safeSize * 0.82, safeSize * 0.91, safeSize * 0.69, safeSize * 0.96, center, safeSize * 0.96);
  context.bezierCurveTo(safeSize * 0.31, safeSize * 0.96, safeSize * 0.18, safeSize * 0.91, safeSize * 0.16, safeSize * 0.79);
  context.lineTo(safeSize * 0.12, safeSize * 0.43);
  context.bezierCurveTo(safeSize * 0.09, safeSize * 0.23, safeSize * 0.24, safeSize * 0.075, center, safeSize * 0.075);
  context.closePath();

  const glassFill = context.createLinearGradient(safeSize * 0.12, 0, safeSize * 0.88, 0);
  glassFill.addColorStop(0, 'rgba(192, 222, 235, 0.22)');
  glassFill.addColorStop(0.2, 'rgba(225, 243, 249, 0.055)');
  glassFill.addColorStop(0.52, 'rgba(246, 252, 255, 0.025)');
  glassFill.addColorStop(0.82, 'rgba(183, 218, 234, 0.075)');
  glassFill.addColorStop(1, 'rgba(157, 195, 213, 0.19)');
  context.fillStyle = glassFill;
  context.fill();
  context.strokeStyle = 'rgba(218, 241, 249, 0.58)';
  context.lineWidth = safeSize * 0.012;
  context.stroke();

  // A pair of soft curved highlights makes the shell read as glass, not a cage.
  context.beginPath();
  context.moveTo(safeSize * 0.22, safeSize * 0.32);
  context.bezierCurveTo(safeSize * 0.20, safeSize * 0.48, safeSize * 0.22, safeSize * 0.69, safeSize * 0.28, safeSize * 0.79);
  context.strokeStyle = 'rgba(246, 253, 255, 0.55)';
  context.lineWidth = safeSize * 0.018;
  context.stroke();

  context.beginPath();
  context.moveTo(safeSize * 0.77, safeSize * 0.28);
  context.bezierCurveTo(safeSize * 0.81, safeSize * 0.43, safeSize * 0.78, safeSize * 0.62, safeSize * 0.74, safeSize * 0.70);
  context.strokeStyle = 'rgba(198, 229, 240, 0.28)';
  context.lineWidth = safeSize * 0.012;
  context.stroke();

  // Tiny top reflection, deliberately understated so the flame remains the focus.
  const reflection = context.createLinearGradient(safeSize * 0.34, safeSize * 0.12, safeSize * 0.66, safeSize * 0.22);
  reflection.addColorStop(0, 'rgba(255, 255, 255, 0)');
  reflection.addColorStop(0.5, 'rgba(255, 255, 255, 0.62)');
  reflection.addColorStop(1, 'rgba(255, 255, 255, 0)');
  context.beginPath();
  context.ellipse(center, safeSize * 0.16, safeSize * 0.17, safeSize * 0.025, 0, 0, Math.PI * 2);
  context.fillStyle = reflection;
  context.fill();
  context.restore();
}

/** Draws an irregular, feather-soft pool of warm light rather than visible glow rings. */
export function drawCheckpointGlow(context: CanvasRenderingContext2D, size: number): void {
  const safeSize = Number.isFinite(size) ? Math.max(64, Math.round(size)) : GLOW_TEXTURE_SIZE;
  context.clearRect(0, 0, safeSize, safeSize);
  context.save();

  const ambient = context.createRadialGradient(
    safeSize * 0.5, safeSize * 0.46, safeSize * 0.015,
    safeSize * 0.5, safeSize * 0.46, safeSize * 0.49,
  );
  ambient.addColorStop(0, 'rgba(255, 214, 126, 0.42)');
  ambient.addColorStop(0.2, 'rgba(255, 203, 104, 0.24)');
  ambient.addColorStop(0.48, 'rgba(255, 190, 91, 0.10)');
  ambient.addColorStop(0.76, 'rgba(255, 179, 81, 0.025)');
  ambient.addColorStop(1, 'rgba(255, 170, 70, 0)');
  context.fillStyle = ambient;
  context.fillRect(0, 0, safeSize, safeSize);

  // Asymmetric side spill softens the silhouette and avoids a perfect circular halo.
  const sideSpill = context.createRadialGradient(
    safeSize * 0.42, safeSize * 0.42, safeSize * 0.01,
    safeSize * 0.4, safeSize * 0.45, safeSize * 0.37,
  );
  sideSpill.addColorStop(0, 'rgba(255, 225, 153, 0.14)');
  sideSpill.addColorStop(0.5, 'rgba(255, 208, 125, 0.055)');
  sideSpill.addColorStop(1, 'rgba(255, 190, 100, 0)');
  context.fillStyle = sideSpill;
  context.fillRect(0, 0, safeSize, safeSize);

  context.restore();
}

function ensureCanvasTexture(
  scene: Phaser.Scene,
  key: string,
  size: number,
  draw: (context: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const texture = scene.textures.createCanvas(key, size, size);
  if (!texture) throw new Error(`Unable to create checkpoint texture: ${key}`);
  draw(texture.getContext());
  texture.refresh();
}
