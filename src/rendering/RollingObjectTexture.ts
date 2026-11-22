export const ROLLING_STONE_TEXTURE_KEY = 'ball-momentum-rolling-stone-v1';
export const ROLLING_SNOW_TEXTURE_KEY = 'ball-momentum-rolling-snow-v1';
export const ROLLING_OBJECT_TEXTURE_SIZE = 160;

/** Draws a softly faceted round stone/snowball texture shared by all matching objects. */
export function drawRollingObjectTexture(
  context: CanvasRenderingContext2D,
  size = ROLLING_OBJECT_TEXTURE_SIZE,
  appearance: 'stone' | 'snow' = 'stone',
): void {
  const safeSize = Number.isFinite(size) ? Math.max(64, Math.round(size)) : ROLLING_OBJECT_TEXTURE_SIZE;
  const center = safeSize / 2;
  const radius = safeSize * 0.475;
  context.clearRect(0, 0, safeSize, safeSize);
  context.save();

  // The silhouette is only subtly irregular; the circular Matter collider stays smooth.
  context.beginPath();
  const contour = [
    [0.00, -0.99], [0.42, -0.91], [0.79, -0.70], [0.96, -0.30],
    [1.00, 0.10], [0.82, 0.59], [0.47, 0.91], [0.02, 1.00],
    [-0.43, 0.91], [-0.82, 0.57], [-0.98, 0.12], [-0.95, -0.34],
    [-0.70, -0.75], [-0.35, -0.94],
  ];
  contour.forEach(([x, y], index) => {
    const px = center + x * radius;
    const py = center + y * radius;
    if (index === 0) context.moveTo(px, py);
    else context.lineTo(px, py);
  });
  context.closePath();
  context.clip();

  if (appearance === 'snow') {
    const base = context.createLinearGradient(safeSize * 0.2, safeSize * 0.05, safeSize * 0.78, safeSize * 0.98);
    base.addColorStop(0, '#f4fbff');
    base.addColorStop(0.42, '#d8e8f1');
    base.addColorStop(0.78, '#a8c0d0');
    base.addColorStop(1, '#728da2');
    context.fillStyle = base;
    context.fillRect(0, 0, safeSize, safeSize);
    const sheen = context.createRadialGradient(safeSize * 0.3, safeSize * 0.23, 2, safeSize * 0.38, safeSize * 0.35, safeSize * 0.72);
    sheen.addColorStop(0, 'rgba(255,255,255,0.86)');
    sheen.addColorStop(0.42, 'rgba(245,252,255,0.25)');
    sheen.addColorStop(1, 'rgba(220,240,250,0)');
    context.fillStyle = sheen;
    context.fillRect(0, 0, safeSize, safeSize);
    const flecks = [[0.27,0.38,0.035],[0.68,0.32,0.025],[0.58,0.63,0.04],[0.34,0.72,0.022],[0.76,0.78,0.018],[0.47,0.48,0.016]];
    for (const [x, y, r] of flecks) {
      context.beginPath();
      context.arc(x * safeSize, y * safeSize, r * safeSize, 0, Math.PI * 2);
      context.fillStyle = 'rgba(255,255,255,0.68)';
      context.fill();
    }
  } else {
    const base = context.createLinearGradient(safeSize * 0.12, safeSize * 0.02, safeSize * 0.9, safeSize * 0.98);
    base.addColorStop(0, '#aeb8c1');
    base.addColorStop(0.28, '#84919d');
    base.addColorStop(0.64, '#66737e');
    base.addColorStop(1, '#424d59');
    context.fillStyle = base;
    context.fillRect(0, 0, safeSize, safeSize);

    const highlight = context.createRadialGradient(safeSize * 0.31, safeSize * 0.22, 2, safeSize * 0.38, safeSize * 0.34, safeSize * 0.72);
    highlight.addColorStop(0, 'rgba(246,250,253,0.62)');
    highlight.addColorStop(0.33, 'rgba(216,225,232,0.20)');
    highlight.addColorStop(1, 'rgba(190,205,216,0)');
    context.fillStyle = highlight;
    context.fillRect(0, 0, safeSize, safeSize);

    // Broad, low-contrast mineral facets add a stone-like surface without looking crystalline.
    const facets = [
      [[0.10,0.22],[0.32,0.13],[0.43,0.34],[0.25,0.47]],
      [[0.43,0.12],[0.72,0.19],[0.63,0.42],[0.44,0.34]],
      [[0.24,0.50],[0.44,0.38],[0.60,0.60],[0.39,0.76]],
      [[0.64,0.46],[0.87,0.38],[0.85,0.68],[0.62,0.72]],
      [[0.12,0.62],[0.35,0.77],[0.30,0.91],[0.08,0.80]],
    ];
    facets.forEach((facet, index) => {
      context.beginPath();
      facet.forEach(([x, y], pointIndex) => {
        if (pointIndex === 0) context.moveTo(x * safeSize, y * safeSize);
        else context.lineTo(x * safeSize, y * safeSize);
      });
      context.closePath();
      context.fillStyle = index % 2 === 0 ? 'rgba(220,230,237,0.10)' : 'rgba(27,38,48,0.10)';
      context.fill();
    });

    const grains = [
      [0.18,0.40,0.012],[0.36,0.26,0.010],[0.73,0.29,0.014],[0.53,0.49,0.010],
      [0.78,0.58,0.012],[0.42,0.84,0.014],[0.20,0.72,0.010],[0.62,0.84,0.012],
      [0.54,0.18,0.008],[0.88,0.48,0.008],[0.31,0.60,0.008],
    ];
    for (const [x, y, r] of grains) {
      context.beginPath();
      context.arc(x * safeSize, y * safeSize, r * safeSize, 0, Math.PI * 2);
      context.fillStyle = 'rgba(24,32,41,0.24)';
      context.fill();
    }
  }

  const lowerShade = context.createRadialGradient(safeSize * 0.62, safeSize * 0.84, 1, safeSize * 0.58, safeSize * 0.76, safeSize * 0.66);
  lowerShade.addColorStop(0, appearance === 'snow' ? 'rgba(43,75,96,0.32)' : 'rgba(19,27,36,0.34)');
  lowerShade.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = lowerShade;
  context.fillRect(0, 0, safeSize, safeSize);

  context.restore();
  context.save();
  context.beginPath();
  context.arc(center, center, radius, 0, Math.PI * 2);
  context.strokeStyle = appearance === 'snow' ? 'rgba(91,125,148,0.48)' : 'rgba(35,45,55,0.60)';
  context.lineWidth = Math.max(2, safeSize * 0.018);
  context.stroke();
  context.restore();
}
