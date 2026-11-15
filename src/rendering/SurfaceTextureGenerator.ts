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
    case 'ice-strata':
    case 'ice-crystals': // Backward-compatible key; no longer draws snowflakes.
      drawIceStrata(context, width, height, spacing, random);
      break;
    case 'stone-masonry':
    case 'ice-facets': // Backward-compatible key; now renders stone masonry.
      drawStoneMasonry(context, width, height, spacing, random);
      break;
    case 'brick-masonry':
    case 'rubber-dots': // Backward-compatible keys; now render brick masonry.
    case 'rubber-chevrons':
      drawBrickMasonry(context, width, height, spacing, random);
      break;
    case 'glass-facets':
      drawGlassFacets(context, width, height, spacing, random);
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

function drawIceStrata(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  // Compressed horizontal layers, like frozen sediment trapped inside a block.
  // The old snowflake motif is intentionally not used for either current or legacy ice IDs.
  const bandStep = Math.max(14, spacing * 0.54);
  const segmentStep = Math.max(24, spacing * 0.62);
  const rowCount = Math.ceil(height / bandStep) + 2;

  for (let row = -1; row < rowCount; row += 1) {
    const baseY = row * bandStep + (random() - 0.5) * bandStep * 0.16;
    const bandHeight = bandStep * (0.34 + random() * 0.22);
    const amplitude = bandStep * (0.035 + random() * 0.045);
    const phase = random() * Math.PI * 2;
    const top: Array<{ x: number; y: number }> = [];

    for (let x = -segmentStep; x <= width + segmentStep; x += segmentStep) {
      top.push({
        x,
        y: baseY + Math.sin(x / (segmentStep * 1.8) + phase) * amplitude + (random() - 0.5) * amplitude * 0.34,
      });
    }
    const bottom = top.map((point) => ({ x: point.x, y: point.y + bandHeight }));

    // A gently irregular translucent band gives the ice a compacted, layered body.
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    for (let index = 1; index < top.length; index += 1) ctx.lineTo(top[index].x, top[index].y);
    for (let index = bottom.length - 1; index >= 0; index -= 1) ctx.lineTo(bottom[index].x, bottom[index].y);
    ctx.closePath();
    ctx.fillStyle = row % 2 === 0 ? 'rgba(224,249,255,0.15)' : 'rgba(42,126,164,0.10)';
    ctx.fill();

    // Soft upper and lower seams read as compressed ice strata, not surface decoration.
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    for (let index = 1; index < top.length; index += 1) ctx.lineTo(top[index].x, top[index].y);
    ctx.strokeStyle = 'rgba(239,253,255,0.34)';
    ctx.lineWidth = 1.1 + random() * 0.55;
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(bottom[0].x, bottom[0].y);
    for (let index = 1; index < bottom.length; index += 1) ctx.lineTo(bottom[index].x, bottom[index].y);
    ctx.strokeStyle = 'rgba(38,105,145,0.22)';
    ctx.lineWidth = 1.1;
    ctx.stroke();

    // Sparse short fractures interrupt a few layers without creating a busy grid.
    if (random() > 0.58 && width > 42) {
      const crackX = random() * Math.max(1, width - 42) + 16;
      const crackY = baseY + bandHeight * (0.22 + random() * 0.55);
      const crackLength = 15 + random() * 26;
      const direction = random() > 0.5 ? 1 : -1;
      ctx.beginPath();
      ctx.moveTo(crackX, crackY);
      ctx.lineTo(crackX + crackLength * 0.4 * direction, crackY + (random() - 0.5) * 4);
      ctx.lineTo(crackX + crackLength * 0.72 * direction, crackY - 2 - random() * 4);
      ctx.lineTo(crackX + crackLength * direction, crackY - 1 + random() * 4);
      ctx.strokeStyle = 'rgba(246,254,255,0.42)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // A few narrow air pockets suggest translucent compacted ice, not snowflakes.
  const pocketCount = Math.max(2, Math.round((width * height) / (spacing * spacing) * 0.4));
  for (let index = 0; index < pocketCount; index += 1) {
    const x = random() * width;
    const y = random() * height;
    ctx.beginPath();
    ctx.ellipse(x, y, 2.5 + random() * 5.5, 0.8 + random() * 1.5, (random() - 0.5) * 0.18, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(245,254,255,0.34)';
    ctx.fill();
  }
}

function drawStoneMasonry(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const rowHeight = Math.max(16, spacing * 0.72);
  const mortar = Math.max(2, spacing * 0.055);
  const stoneColors = [
    'rgba(151,165,175,0.84)',
    'rgba(119,136,149,0.82)',
    'rgba(169,179,185,0.78)',
    'rgba(132,146,156,0.86)',
  ];

  // Recessed mortar bed makes the pattern read as masonry rather than another ice texture.
  ctx.fillStyle = 'rgba(40,52,61,0.74)';
  ctx.fillRect(0, 0, width, height);

  for (let row = -1; row * rowHeight < height + rowHeight; row += 1) {
    const y = row * rowHeight + mortar * 0.5;
    const offset = (row & 1) * spacing * 0.72;
    let x = -spacing + offset;
    while (x < width + spacing) {
      const blockWidth = spacing * (1.28 + random() * 0.72);
      const blockHeight = rowHeight - mortar * (1.4 + random() * 0.25);
      const inset = mortar * (0.7 + random() * 0.5);
      const left = x + inset;
      const top = y + mortar * 0.4;
      const right = x + blockWidth - inset;
      const bottom = top + blockHeight;
      const bevel = Math.min(5, blockWidth * 0.08, blockHeight * 0.12);

      ctx.beginPath();
      ctx.moveTo(left + bevel, top);
      ctx.lineTo(right - bevel * 0.6, top + (random() - 0.5) * 2);
      ctx.lineTo(right, top + bevel);
      ctx.lineTo(right - bevel * 0.25, bottom - bevel);
      ctx.lineTo(right - bevel, bottom);
      ctx.lineTo(left + bevel * 0.55, bottom - (random() - 0.5) * 2);
      ctx.lineTo(left, bottom - bevel);
      ctx.lineTo(left + bevel * 0.18, top + bevel);
      ctx.closePath();
      ctx.fillStyle = stoneColors[Math.floor(random() * stoneColors.length)];
      ctx.fill();

      // A shallow top-face highlight gives each block its own volume.
      ctx.beginPath();
      ctx.moveTo(left + bevel, top + 1);
      ctx.lineTo(right - bevel, top + 1);
      ctx.lineTo(right - bevel * 1.8, top + bevel * 1.8);
      ctx.lineTo(left + bevel * 1.4, top + bevel * 1.8);
      ctx.closePath();
      ctx.fillStyle = 'rgba(235,244,248,0.18)';
      ctx.fill();

      if (random() > 0.56) {
        ctx.fillStyle = 'rgba(43,56,64,0.16)';
        ctx.beginPath();
        ctx.ellipse(left + blockWidth * (0.25 + random() * 0.5), top + blockHeight * (0.35 + random() * 0.3), 2 + random() * 3, 1 + random() * 1.8, random() * 0.4, 0, Math.PI * 2);
        ctx.fill();
      }
      x += blockWidth;
    }
  }
}

function drawBrickMasonry(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const brickHeight = Math.max(13, spacing * 0.46);
  const nominalBrickWidth = spacing * 1.18;
  const mortar = Math.max(2, spacing * 0.055);
  const brickColors = [
    'rgba(177,91,57,0.96)',
    'rgba(192,102,63,0.94)',
    'rgba(158,77,51,0.96)',
    'rgba(204,119,75,0.92)',
    'rgba(169,82,53,0.95)',
  ];

  // Warm mortar is intentionally visible around every brick.
  ctx.fillStyle = 'rgba(69,57,49,0.94)';
  ctx.fillRect(0, 0, width, height);

  for (let row = -1; row * brickHeight < height + brickHeight; row += 1) {
    const y = row * brickHeight + mortar * 0.5;
    const offset = (row & 1) * nominalBrickWidth * 0.5;
    for (let x = -nominalBrickWidth + offset; x < width + nominalBrickWidth; x += nominalBrickWidth) {
      const w = nominalBrickWidth * (0.91 + random() * 0.13);
      const h = brickHeight - mortar * (1.35 + random() * 0.2);
      const inset = mortar * 0.55;
      const left = x + inset;
      const top = y + mortar * 0.35;
      const right = x + w - inset;
      const bottom = top + h;
      const bevel = Math.min(3.5, w * 0.045, h * 0.14);

      ctx.beginPath();
      ctx.moveTo(left + bevel, top);
      ctx.lineTo(right - bevel, top);
      ctx.lineTo(right, top + bevel);
      ctx.lineTo(right - 0.5, bottom - bevel * 0.4);
      ctx.lineTo(right - bevel, bottom);
      ctx.lineTo(left + bevel, bottom - 0.5);
      ctx.lineTo(left, bottom - bevel);
      ctx.lineTo(left + 0.5, top + bevel);
      ctx.closePath();
      ctx.fillStyle = brickColors[Math.floor(random() * brickColors.length)];
      ctx.fill();

      // Thin warm highlight and lower shadow suggest fired-clay bevels, not rubber ridges.
      ctx.fillStyle = 'rgba(255,205,156,0.2)';
      ctx.fillRect(left + bevel, top + 1, Math.max(0, right - left - bevel * 2), Math.max(1, bevel * 0.42));
      ctx.fillStyle = 'rgba(73,37,28,0.22)';
      ctx.fillRect(left + bevel, bottom - Math.max(1, bevel * 0.45), Math.max(0, right - left - bevel * 2), Math.max(1, bevel * 0.45));

      if (random() > 0.72) {
        ctx.fillStyle = 'rgba(90,48,35,0.2)';
        ctx.beginPath();
        ctx.ellipse(left + w * (0.3 + random() * 0.4), top + h * (0.42 + random() * 0.2), 1.2 + random() * 1.6, 0.7 + random(), 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
}

/**
 * Restores the earlier cool triangular-glass palette, but paints each pane as
 * one continuous polygon. Small inset planes create facet variation without
 * drawing shared corner-to-centre seams that can turn into visible crosses.
 */
function drawGlassFacets(ctx: CanvasRenderingContext2D, width: number, height: number, spacing: number, random: () => number): void {
  const step = spacing * 1.08;
  const columns = Math.ceil(width / step) + 1;
  const rows = Math.ceil(height / step) + 1;
  const paneColors = [
    'rgba(232,251,255,0.24)',
    'rgba(93,178,207,0.17)',
    'rgba(26,91,125,0.14)',
    'rgba(213,245,252,0.2)',
  ];

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      if (random() < 0.12) continue;
      const cellX = column * step - step * 0.18 + (row % 2) * step * 0.12;
      const cellY = row * step - step * 0.12;
      const paneWidth = step * (0.84 + random() * 0.12);
      const paneHeight = step * (0.82 + random() * 0.12);
      const cx = cellX + step * (0.48 + (random() - 0.5) * 0.12);
      const cy = cellY + step * (0.48 + (random() - 0.5) * 0.12);
      const halfW = paneWidth * 0.5;
      const halfH = paneHeight * 0.5;
      const skew = (random() - 0.5) * paneWidth * 0.16;
      const points: Array<[number, number]> = [
        [cx - halfW * 0.94, cy - halfH * 0.18],
        [cx - halfW * 0.62 + skew, cy - halfH * 0.94],
        [cx + halfW * 0.28, cy - halfH * 0.86],
        [cx + halfW * 0.96, cy - halfH * 0.14],
        [cx + halfW * 0.78, cy + halfH * 0.78],
        [cx - halfW * 0.12, cy + halfH * 0.96],
        [cx - halfW * 0.9, cy + halfH * 0.34],
      ];

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (let index = 1; index < points.length; index += 1) ctx.lineTo(points[index][0], points[index][1]);
      ctx.closePath();
      ctx.fillStyle = paneColors[Math.floor(random() * paneColors.length)];
      ctx.fill();

      // One inset triangular reflection per some panes; it never touches the pane edge.
      if (random() > 0.4) {
        const inset = Math.min(halfW, halfH) * 0.24;
        ctx.beginPath();
        ctx.moveTo(cx - halfW * 0.2, cy - halfH * 0.52);
        ctx.lineTo(cx + halfW * 0.36, cy - halfH * 0.38);
        ctx.lineTo(cx + halfW * 0.12, cy + halfH * 0.02);
        ctx.closePath();
        ctx.fillStyle = random() > 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(20,91,128,0.1)';
        ctx.fill();
      }

      if (random() > 0.7) {
        ctx.fillStyle = 'rgba(255,255,255,0.78)';
        ctx.beginPath();
        ctx.ellipse(
          cx + (random() - 0.5) * paneWidth * 0.34,
          cy - paneHeight * (0.18 + random() * 0.16),
          1.4 + random() * 1.2,
          0.8 + random() * 0.7,
          random() * Math.PI,
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
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
  const plankHeight = Math.max(18, spacing * 0.62);
  const plankColors = [
    'rgba(166,101,53,0.96)',
    'rgba(184,117,64,0.96)',
    'rgba(146,82,43,0.96)',
    'rgba(198,132,75,0.94)',
  ];

  // Tint the entire clipped surface warm brown so wood never inherits a grey stone base.
  ctx.fillStyle = 'rgba(113,65,36,0.94)';
  ctx.fillRect(0, 0, width, height);

  const rows = Math.ceil(height / plankHeight) + 1;
  for (let row = -1; row < rows; row += 1) {
    const y = row * plankHeight;
    const color = plankColors[Math.floor(random() * plankColors.length)];
    ctx.fillStyle = color;
    ctx.fillRect(0, y + 1, width, plankHeight - 2);

    // Dark seams between boards and a narrow amber edge highlight.
    ctx.fillStyle = 'rgba(64,35,20,0.48)';
    ctx.fillRect(0, y, width, 1.8);
    ctx.fillStyle = 'rgba(255,207,143,0.25)';
    ctx.fillRect(0, y + 2, width, 1.1);

    const grainLines = 2 + Math.floor(random() * 3);
    for (let line = 0; line < grainLines; line += 1) {
      const baseY = y + plankHeight * (0.2 + (line + random() * 0.55) / grainLines);
      const amplitude = 1.2 + random() * 2.2;
      const phase = random() * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(-6, baseY);
      for (let x = 0; x <= width + 8; x += Math.max(12, spacing * 0.38)) {
        const wave = Math.sin(x / (spacing * (1.4 + random() * 0.5)) + phase) * amplitude;
        ctx.lineTo(x, baseY + wave);
      }
      ctx.strokeStyle = line % 2 === 0 ? 'rgba(83,43,22,0.42)' : 'rgba(255,211,151,0.28)';
      ctx.lineWidth = line % 2 === 0 ? 1.35 : 0.9;
      ctx.stroke();
    }

    if (random() > 0.48 && width > spacing * 1.3) {
      const knotX = spacing * (0.8 + random() * Math.max(1, width / spacing - 1.2));
      const knotY = y + plankHeight * (0.35 + random() * 0.3);
      ctx.beginPath();
      ctx.ellipse(knotX, knotY, spacing * (0.07 + random() * 0.035), plankHeight * 0.07, 0, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(76,39,21,0.5)';
      ctx.lineWidth = 1.15;
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(knotX, knotY, spacing * 0.035, plankHeight * 0.035, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,211,151,0.24)';
      ctx.fill();
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
