import type Phaser from 'phaser';
import type { SurfaceTextureAssignment, SurfaceTextureOptions, SurfaceTexturePattern } from '../level/SurfaceTextureTypes';
import { SURFACE_TEXTURE_CATALOG, createSurfaceTextureRandom, hashSurfaceTextureSeed } from './SurfaceTextureCatalog';

export interface SurfaceTexturePoint { x: number; y: number; }

export interface NormalizedSurfaceTextureOptions {
  pattern: SurfaceTexturePattern;
  density: number;
  opacity: number;
  seed: number;
}

export function normalizeSurfaceTexture(
  assignment: SurfaceTextureAssignment,
  fallbackSeed = 1,
): NormalizedSurfaceTextureOptions {
  const options: SurfaceTextureOptions = typeof assignment === 'string'
    ? { pattern: assignment }
    : assignment;
  const preset = SURFACE_TEXTURE_CATALOG[options.pattern];
  return {
    pattern: options.pattern,
    density: clamp(options.density ?? preset.defaultDensity, 0.25, 3),
    opacity: clamp(options.opacity ?? preset.defaultOpacity, 0.05, 1),
    seed: options.seed !== undefined && Number.isFinite(options.seed) ? Math.trunc(options.seed) : fallbackSeed,
  };
}

export function createSurfaceTextureKey(scope: string, id: string, assignment: SurfaceTextureAssignment): string {
  const normalized = normalizeSurfaceTexture(assignment, hashSurfaceTextureSeed(`${scope}:${id}`));
  const variation = `${normalized.pattern}:${normalized.density}:${normalized.opacity}:${normalized.seed}`;
  const identity = hashSurfaceTextureSeed(`${scope}:${id}`).toString(36);
  return `surface-pattern-${safeKey(scope)}-${safeKey(id)}-${identity}-${hashSurfaceTextureSeed(variation).toString(36)}`;
}

/**
 * Creates a transparent, clipped CanvasTexture for one solid. Points are local
 * to the texture rectangle, so the same generator works for boxes and polygons.
 */
export function createSurfaceTextureCanvas(
  scene: Phaser.Scene,
  key: string,
  width: number,
  height: number,
  polygon: SurfaceTexturePoint[],
  assignment: SurfaceTextureAssignment,
  fallbackSeed = 1,
): void {
  if (scene.textures.exists(key)) return;
  const largestDimension = Math.max(width, height, 1);
  const resolution = Math.min(2, 1536 / largestDimension);
  const canvasWidth = Math.max(8, Math.ceil(width * resolution));
  const canvasHeight = Math.max(8, Math.ceil(height * resolution));
  const texture = scene.textures.createCanvas(key, canvasWidth, canvasHeight);
  if (!texture) throw new Error(`Unable to create surface texture: ${key}`);

  const context = texture.getContext();
  context.clearRect(0, 0, canvasWidth, canvasHeight);
  context.save();
  context.scale(canvasWidth / width, canvasHeight / height);
  context.beginPath();
  context.moveTo(polygon[0].x, polygon[0].y);
  for (let index = 1; index < polygon.length; index += 1) {
    context.lineTo(polygon[index].x, polygon[index].y);
  }
  context.closePath();
  context.clip();
  drawSurfacePattern(context, width, height, normalizeSurfaceTexture(assignment, fallbackSeed));
  context.restore();
  texture.refresh();
}

export function drawSurfacePattern(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: NormalizedSurfaceTextureOptions,
): void {
  const random = createSurfaceTextureRandom(options.seed);
  const spacing = 52 / options.density;
  context.save();
  context.globalAlpha = options.opacity;
  context.lineCap = 'round';
  context.lineJoin = 'round';
  context.lineWidth = Math.max(1, 1.35 / options.density);

  switch (options.pattern) {
    case 'stone-fragments':
      drawStoneFragments(context, width, height, spacing, random);
      break;
    case 'stone-strata':
      drawStoneStrata(context, width, height, spacing, random);
      break;
    case 'ice-crystals':
      drawIceCrystals(context, width, height, spacing, random);
      break;
    case 'ice-facets':
    case 'glass-facets':
      drawFacets(context, width, height, spacing, random, options.pattern === 'glass-facets');
      break;
    case 'rubber-dots':
      drawRubberDots(context, width, height, spacing, random);
      break;
    case 'rubber-chevrons':
      drawRubberChevrons(context, width, height, spacing, random);
      break;
    case 'concrete-grain':
      drawConcreteGrain(context, width, height, spacing, random);
      break;
    case 'wood-grain':
      drawWoodGrain(context, width, height, spacing, random);
      break;
    case 'sand-specks':
      drawSandSpecks(context, width, height, spacing, random);
      break;
  }
  context.restore();
}

function drawStoneFragments(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const columns = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (random() < 0.16) continue;
      const cx = column * spacing + (row % 2) * spacing * 0.48 + (random() - 0.5) * spacing * 0.3;
      const cy = row * spacing + (random() - 0.5) * spacing * 0.3;
      const radius = spacing * (0.14 + random() * 0.13);
      const sides = 5 + Math.floor(random() * 3);
      ctx.beginPath();
      for (let point = 0; point < sides; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI * 2 / sides;
        const varied = radius * (0.65 + random() * 0.5);
        const x = cx + Math.cos(angle) * varied;
        const y = cy + Math.sin(angle) * varied * 0.72;
        if (point === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fillStyle = random() > 0.5 ? 'rgba(235,244,250,0.22)' : 'rgba(22,34,48,0.19)';
      ctx.strokeStyle = 'rgba(18,30,44,0.28)';
      ctx.fill();
      ctx.stroke();
      if (random() > 0.52) {
        ctx.beginPath();
        ctx.moveTo(cx - radius * 0.45, cy - radius * 0.12);
        ctx.lineTo(cx + radius * 0.28, cy + radius * 0.24);
        ctx.strokeStyle = 'rgba(244,249,252,0.28)';
        ctx.stroke();
      }
    }
  }
}

function drawStoneStrata(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const rows = Math.ceil(height / (spacing * 0.62));
  for (let row = 0; row <= rows; row += 1) {
    const y = row * spacing * 0.62 + random() * spacing * 0.25;
    ctx.beginPath();
    ctx.moveTo(-8, y);
    const segments = Math.ceil(width / (spacing * 0.7));
    for (let segment = 0; segment <= segments; segment += 1) {
      const x = segment * spacing * 0.7;
      ctx.lineTo(x, y + Math.sin(segment * 1.4 + row) * spacing * 0.075 + (random() - 0.5) * spacing * 0.12);
    }
    ctx.strokeStyle = row % 2 ? 'rgba(18,30,44,0.24)' : 'rgba(238,246,250,0.24)';
    ctx.lineWidth = 1 + random() * 1.2;
    ctx.stroke();
  }
  drawSmallFlecks(ctx, width, height, spacing * 0.5, random, 0.32);
}

function drawIceCrystals(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const columns = Math.ceil(width / spacing) + 1;
  const rows = Math.ceil(height / spacing) + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (random() < 0.38) continue;
      const x = column * spacing + (row % 2) * spacing * 0.5 + random() * spacing * 0.2;
      const y = row * spacing + random() * spacing * 0.2;
      const size = spacing * (0.15 + random() * 0.12);
      ctx.strokeStyle = 'rgba(239,253,255,0.72)';
      ctx.lineWidth = 1.2;
      for (let arm = 0; arm < 6; arm += 1) {
        const angle = arm * Math.PI / 3;
        const dx = Math.cos(angle) * size;
        const dy = Math.sin(angle) * size;
        ctx.beginPath();
        ctx.moveTo(x - dx, y - dy);
        ctx.lineTo(x + dx, y + dy);
        ctx.stroke();
        for (const end of [-1, 1]) {
          const ex = x + dx * end;
          const ey = y + dy * end;
          const branch = size * 0.3;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - Math.cos(angle - 0.75) * branch * end, ey - Math.sin(angle - 0.75) * branch * end);
          ctx.moveTo(ex, ey);
          ctx.lineTo(ex - Math.cos(angle + 0.75) * branch * end, ey - Math.sin(angle + 0.75) * branch * end);
          ctx.stroke();
        }
      }
      ctx.fillStyle = 'rgba(255,255,255,0.76)';
      ctx.beginPath(); ctx.arc(x, y, 1.7, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawFacets(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number, glass: boolean): void {
  const step = spacing * 0.95;
  const columns = Math.ceil(width / step) + 1;
  const rows = Math.ceil(height / step) + 1;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = column * step - step * 0.15;
      const y = row * step - step * 0.15;
      const jitterX = (random() - 0.5) * step * 0.36;
      const jitterY = (random() - 0.5) * step * 0.36;
      const midX = x + step * 0.5 + jitterX;
      const midY = y + step * 0.5 + jitterY;
      const color = random() > 0.5 ? 'rgba(232,251,255,0.26)' : 'rgba(19,70,94,0.13)';
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, y); ctx.lineTo(x + step, y); ctx.lineTo(midX, midY); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + step, y); ctx.lineTo(x + step, y + step); ctx.lineTo(midX, midY); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + step, y + step); ctx.lineTo(x, y + step); ctx.lineTo(midX, midY); ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x, y + step); ctx.lineTo(x, y); ctx.lineTo(midX, midY); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = glass ? 'rgba(218,250,255,0.52)' : 'rgba(238,253,255,0.4)';
      ctx.lineWidth = glass ? 1.35 : 1;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(midX, midY); ctx.lineTo(x + step, y); ctx.stroke();
      if (glass && random() > 0.68) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); ctx.arc(midX + (random() - 0.5) * step * 0.25, midY + (random() - 0.5) * step * 0.25, 1.8, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
}

function drawRubberDots(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const step = spacing * 0.45;
  for (let y = step * 0.5; y < height; y += step) {
    for (let x = step * 0.5; x < width; x += step) {
      const px = x + (random() - 0.5) * step * 0.18;
      const py = y + (random() - 0.5) * step * 0.18;
      const radius = Math.max(1.4, spacing * (0.045 + random() * 0.018));
      ctx.fillStyle = 'rgba(21,26,39,0.29)';
      ctx.beginPath(); ctx.arc(px + 0.8, py + 1, radius * 1.1, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(222,221,255,0.23)';
      ctx.beginPath(); ctx.arc(px - 0.5, py - 0.6, radius * 0.75, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function drawRubberChevrons(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const rowStep = spacing * 0.58;
  const columnStep = spacing * 0.85;
  for (let y = 0; y < height + rowStep; y += rowStep) {
    for (let x = -columnStep; x < width + columnStep; x += columnStep) {
      const offset = (Math.floor(y / rowStep) % 2) * columnStep * 0.5;
      const px = x + offset;
      const py = y + (random() - 0.5) * rowStep * 0.1;
      const size = spacing * 0.19;
      ctx.beginPath(); ctx.moveTo(px - size, py - size * 0.45); ctx.lineTo(px, py + size * 0.45); ctx.lineTo(px + size, py - size * 0.45);
      ctx.strokeStyle = 'rgba(22,27,40,0.32)'; ctx.lineWidth = 2.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(px - size, py - size * 0.65); ctx.lineTo(px, py + size * 0.25); ctx.lineTo(px + size, py - size * 0.65);
      ctx.strokeStyle = 'rgba(232,225,255,0.2)'; ctx.lineWidth = 1; ctx.stroke();
    }
  }
}

function drawConcreteGrain(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const count = Math.min(4200, Math.max(24, Math.round((width * height) / (spacing * spacing) * 30)));
  for (let index = 0; index < count; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const length = 1 + random() * 4.5;
    ctx.strokeStyle = random() > 0.5 ? 'rgba(235,242,248,0.35)' : 'rgba(15,27,42,0.25)';
    ctx.lineWidth = 0.7 + random() * 1.1;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length, y + (random() - 0.5) * length); ctx.stroke();
  }
}

function drawWoodGrain(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const rows = Math.ceil(height / (spacing * 0.42));
  for (let row = 0; row <= rows; row += 1) {
    const baseY = row * spacing * 0.42;
    ctx.beginPath(); ctx.moveTo(-10, baseY);
    for (let x = 0; x <= width + spacing; x += spacing * 0.4) {
      ctx.lineTo(x, baseY + Math.sin(x / (spacing * 1.8) + row * 0.7) * spacing * 0.07 + (random() - 0.5) * 2);
    }
    ctx.strokeStyle = row % 2 ? 'rgba(42,25,15,0.28)' : 'rgba(255,225,172,0.27)';
    ctx.lineWidth = row % 3 === 0 ? 1.8 : 1; ctx.stroke();
    if (row % 4 === 1 && width > spacing * 1.5) {
      const knotX = spacing * (1 + random() * Math.max(1, width / spacing - 1));
      ctx.beginPath(); ctx.ellipse(knotX, baseY, spacing * 0.12, spacing * 0.055, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(43,25,14,0.3)'; ctx.lineWidth = 1.3; ctx.stroke();
    }
  }
}

function drawSandSpecks(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const count = Math.min(3600, Math.max(32, Math.round(width * height / (spacing * spacing) * 36)));
  for (let index = 0; index < count; index += 1) {
    const x = random() * width;
    const y = random() * height;
    const radius = 0.6 + random() * 2;
    ctx.fillStyle = random() > 0.52 ? 'rgba(255,228,166,0.52)' : 'rgba(65,44,25,0.26)';
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }
}

function drawSmallFlecks(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number, probability: number): void {
  for (let y = spacing * 0.5; y < height; y += spacing) {
    for (let x = spacing * 0.5; x < width; x += spacing) {
      if (random() > probability) continue;
      ctx.fillStyle = 'rgba(226,237,243,0.26)';
      ctx.beginPath(); ctx.arc(x + random() * spacing * 0.35, y + random() * spacing * 0.35, 1 + random() * 2, 0, Math.PI * 2); ctx.fill();
    }
  }
}

function safeKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-').slice(0, 28) || 'solid';
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
