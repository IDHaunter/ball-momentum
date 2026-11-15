import { polygonEdgeOutwardNormal } from '../utils/GeometryUtils';
import type { BorderStyle, BoxBorderStyles, BoxSurfaceSide, PolygonBorderDefinition } from '../level/LevelTypes';

/** Minimal Phaser Graphics surface needed by the procedural edge painter. */
export interface BorderGraphicsLike {
  lineStyle(width: number, color: number, alpha?: number): unknown;
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
  fillStyle(color: number, alpha?: number): unknown;
  fillEllipse(x: number, y: number, width: number, height: number): unknown;
  strokeEllipse(x: number, y: number, width: number, height: number): unknown;
}

export interface BorderPoint { x: number; y: number; }
export interface BorderEdgeSegment { edge: number; side?: BoxSurfaceSide; a: BorderPoint; b: BorderPoint; normal: BorderPoint; }

const DEFAULT_EDGE_COLOR = 0x91a5bb;
const SPRING_TAPE = {
  outline: 0x172330,
  yellow: 0xf4c542,
  highlight: 0xffed9a,
  stripe: 0x18232f,
} as const;

export function getBoxBorderSegments(x: number, y: number, width: number, height: number): BorderEdgeSegment[] {
  return [
    { edge: 0, side: 'top', a: { x, y }, b: { x: x + width, y }, normal: { x: 0, y: -1 } },
    { edge: 1, side: 'right', a: { x: x + width, y }, b: { x: x + width, y: y + height }, normal: { x: 1, y: 0 } },
    { edge: 2, side: 'bottom', a: { x: x + width, y: y + height }, b: { x, y: y + height }, normal: { x: 0, y: 1 } },
    { edge: 3, side: 'left', a: { x, y: y + height }, b: { x, y }, normal: { x: -1, y: 0 } },
  ];
}

export function getPolygonBorderSegments(vertices: Array<[number, number]>): BorderEdgeSegment[] {
  const points = vertices.map(([x, y]) => ({ x, y }));
  return points.map((a, edge) => ({
    edge,
    a,
    b: points[(edge + 1) % points.length],
    normal: polygonEdgeOutwardNormal(points, edge),
  }));
}

export function drawBoxBorders(
  graphics: BorderGraphicsLike,
  x: number,
  y: number,
  width: number,
  height: number,
  borders: BoxBorderStyles | undefined,
  defaultColor = DEFAULT_EDGE_COLOR,
): void {
  for (const edge of getBoxBorderSegments(x, y, width, height)) {
    drawSurfaceBorder(graphics, edge, borders?.[edge.side as BoxSurfaceSide] ?? 'default', defaultColor);
  }
}

export function drawPolygonBorders(
  graphics: BorderGraphicsLike,
  vertices: Array<[number, number]>,
  borders: PolygonBorderDefinition[] | undefined,
  defaultColor = DEFAULT_EDGE_COLOR,
): void {
  const assignments = new Map((borders ?? []).map((border) => [border.edge, border.style]));
  for (const edge of getPolygonBorderSegments(vertices)) {
    drawSurfaceBorder(graphics, edge, assignments.get(edge.edge) ?? 'default', defaultColor);
  }
}

export function drawSurfaceBorder(
  graphics: BorderGraphicsLike,
  edge: BorderEdgeSegment,
  style: BorderStyle,
  defaultColor = DEFAULT_EDGE_COLOR,
): void {
  if (style === 'none') return;
  const { a, b, normal } = edge;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const tangent = { x: dx / length, y: dy / length };
  const stroke = (width: number, color: number, alpha = 1, offset = 0): void => {
    graphics.lineStyle(width, color, alpha);
    graphics.lineBetween(
      a.x + normal.x * offset, a.y + normal.y * offset,
      b.x + normal.x * offset, b.y + normal.y * offset,
    );
  };

  switch (style) {
    case 'default':
      stroke(3, defaultColor, 0.9);
      break;
    case 'grass': {
      stroke(9, 0x203e32, 0.98);
      stroke(6, 0x4d9953, 1);
      stroke(1.5, 0xc1e88a, 0.9, -1.2);
      const blades = Math.max(3, Math.floor(length / 12));
      for (let index = 0; index <= blades; index += 1) {
        const t = (index + 0.35) / (blades + 0.7);
        const base = { x: a.x + dx * t, y: a.y + dy * t };
        const height = 4 + (index % 3) * 1.7;
        const lean = ((index % 2) ? 1 : -1) * 2.6;
        const tip = { x: base.x + normal.x * height + tangent.x * lean, y: base.y + normal.y * height + tangent.y * lean };
        const shoulder = { x: base.x + normal.x * (height * 0.58), y: base.y + normal.y * (height * 0.58) };
        graphics.lineStyle(1.7, index % 3 === 0 ? 0xb2df70 : 0x78bc59, 0.98);
        graphics.lineBetween(base.x, base.y, tip.x, tip.y);
        graphics.lineBetween(shoulder.x, shoulder.y, tip.x, tip.y);
      }
      break;
    }
    case 'asphalt': {
      stroke(10, 0x26313b, 1);
      stroke(7, 0x46525e, 1);
      stroke(1.4, 0x89949e, 0.85, -2.6);
      const dashCount = Math.max(2, Math.floor(length / 34));
      graphics.lineStyle(2.1, 0xe5e6d9, 0.95);
      for (let index = 0; index < dashCount; index += 2) {
        const start = (index + 0.2) / dashCount;
        const end = Math.min(1, start + 0.44 / dashCount);
        graphics.lineBetween(a.x + dx * start, a.y + dy * start, a.x + dx * end, a.y + dy * end);
      }
      break;
    }
    case 'stone': {
      stroke(9, 0x34404c, 0.98);
      stroke(6, 0x8996a1, 1);
      stroke(1.3, 0xc1cbd1, 0.8, -1.4);
      if (normal.y < -0.35) {
        // A decorative loose-pebble coat sits on the upper edge only. It is
        // painted with graphics and never changes the underlying Matter body.
        drawStonePebbleCoating(graphics, edge, length, tangent, normal);
      } else {
        const chips = Math.max(2, Math.floor(length / 38));
        for (let index = 1; index < chips; index += 1) {
          const t = index / chips;
          const x = a.x + dx * t;
          const y = a.y + dy * t;
          graphics.lineStyle(1.5, 0x4a5864, 0.85);
          graphics.lineBetween(x - tangent.x * 3 + normal.x * 2, y - tangent.y * 3 + normal.y * 2, x + tangent.x * 3 - normal.x * 3, y + tangent.y * 3 - normal.y * 3);
        }
      }
      break;
    }
    case 'metal': {
      stroke(9, 0x182633, 1);
      stroke(6, 0x7f96a8, 1);
      stroke(1.3, 0xd7e5ed, 0.95, -1.8);
      const rivets = Math.max(2, Math.floor(length / 54));
      for (let index = 1; index < rivets; index += 1) {
        const t = index / rivets;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        graphics.lineStyle(2, 0xe2edf2, 0.95);
        graphics.lineBetween(x - tangent.x * 2.2, y - tangent.y * 2.2, x + tangent.x * 2.2, y + tangent.y * 2.2);
        graphics.lineBetween(x - normal.x * 2.2, y - normal.y * 2.2, x + normal.x * 2.2, y + normal.y * 2.2);
      }
      break;
    }
    case 'ice': {
      stroke(9, 0x28627c, 0.98);
      stroke(6, 0x79d5ed, 1);
      stroke(1.7, 0xe1fbff, 1, -1.6);
      const glints = Math.max(2, Math.floor(length / 42));
      for (let index = 1; index < glints; index += 1) {
        const t = index / glints;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        graphics.lineStyle(1.6, 0xf4ffff, 0.98);
        graphics.lineBetween(x - tangent.x * 3 - normal.x * 2, y - tangent.y * 3 - normal.y * 2, x + tangent.x * 3 + normal.x * 2, y + tangent.y * 3 + normal.y * 2);
      }
      break;
    }
    case 'wood': {
      stroke(9, 0x4b2d22, 0.98);
      stroke(6, 0xb6804f, 1);
      stroke(1.4, 0xe1bd80, 0.9, -1.7);
      const grains = Math.max(2, Math.floor(length / 32));
      for (let index = 1; index < grains; index += 1) {
        const t = index / grains;
        const x = a.x + dx * t;
        const y = a.y + dy * t;
        graphics.lineStyle(1.2, 0x68432e, 0.78);
        graphics.lineBetween(x - tangent.x * 4 + normal.x * 1.8, y - tangent.y * 4 + normal.y * 1.8, x + tangent.x * 4 - normal.x * 1.8, y + tangent.y * 4 - normal.y * 1.8);
      }
      break;
    }
  }
}

interface PebbleTone { body: number; shade: number; highlight: number; }

const PEBBLE_TONES: readonly PebbleTone[] = [
  { body: 0x9da7ad, shade: 0x56616a, highlight: 0xdce3e7 },
  { body: 0x7f8b93, shade: 0x46535c, highlight: 0xc8d0d5 },
  { body: 0xb1aaa0, shade: 0x645f58, highlight: 0xe3ddd3 },
  { body: 0x687780, shade: 0x3e4a53, highlight: 0xb9c5cc },
  { body: 0xaaaeb0, shade: 0x62696d, highlight: 0xe7eaeb },
];

/**
 * Paints a shallow, irregular layer of rounded pebbles along an exposed upper
 * stone edge. The small outward offset makes the coat visible without changing
 * the edge coordinates used by physics or collision detection.
 */
function drawStonePebbleCoating(
  graphics: BorderGraphicsLike,
  edge: BorderEdgeSegment,
  length: number,
  tangent: BorderPoint,
  normal: BorderPoint,
): void {
  const random = createEdgeRandom(edge);
  const rows = 2;
  const spacing = 9.2;
  const count = Math.max(2, Math.ceil(length / spacing));

  for (let row = 0; row < rows; row += 1) {
    for (let index = 0; index < count; index += 1) {
      const tone = PEBBLE_TONES[Math.floor(random() * PEBBLE_TONES.length)];
      const width = 6.1 + random() * 4.4;
      const height = 3.2 + random() * 2.1;
      const along = Math.min(length, Math.max(0, (index + 0.5 + row * 0.48) * spacing + (random() - 0.5) * 2.2));
      const offset = (row === 0 ? 0.7 : -2.05) + (random() - 0.5) * 1.0;
      const centerX = edge.a.x + tangent.x * along + normal.x * offset;
      const centerY = edge.a.y + tangent.y * along + normal.y * offset;
      const angleJitter = (random() - 0.5) * 0.22;
      const xAxis = { x: tangent.x * Math.cos(angleJitter) - normal.x * Math.sin(angleJitter), y: tangent.y * Math.cos(angleJitter) - normal.y * Math.sin(angleJitter) };
      const yAxis = { x: tangent.x * Math.sin(angleJitter) + normal.x * Math.cos(angleJitter), y: tangent.y * Math.sin(angleJitter) + normal.y * Math.cos(angleJitter) };

      // A tiny contact shadow grounds each pebble on the flat collision plane.
      graphics.fillStyle(0x26323a, 0.3);
      graphics.fillEllipse(centerX - normal.x * 0.2, centerY - normal.y * 0.2, width * 1.02, height * 0.72);

      graphics.fillStyle(tone.body, 0.98);
      graphics.fillEllipse(centerX, centerY, width, height);
      graphics.lineStyle(0.85, tone.shade, 0.92);
      graphics.strokeEllipse(centerX, centerY, width, height);

      // A short offset glint gives the rounded stones a soft, readable volume.
      const glintX = centerX - yAxis.x * height * 0.16 - xAxis.x * width * 0.12;
      const glintY = centerY - yAxis.y * height * 0.16 - xAxis.y * width * 0.12;
      graphics.lineStyle(0.8, tone.highlight, 0.86);
      graphics.lineBetween(
        glintX - xAxis.x * width * 0.17,
        glintY - xAxis.y * width * 0.17,
        glintX + xAxis.x * width * 0.17,
        glintY + xAxis.y * width * 0.17,
      );
    }
  }
}

/** Stable per-edge pseudo-random values keep the decoration consistent per run. */
function createEdgeRandom(edge: BorderEdgeSegment): () => number {
  const rawSeed = Math.round(
    edge.a.x * 73856093 + edge.a.y * 19349663 + edge.b.x * 83492791 + edge.b.y * 2654435761 + edge.edge * 97,
  );
  let state = rawSeed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/** A bold black-and-yellow hazard tape used to identify spring-loaded edges. */
export function drawSpringTape(graphics: BorderGraphicsLike, edge: BorderEdgeSegment): void {
  const dx = edge.b.x - edge.a.x;
  const dy = edge.b.y - edge.a.y;
  const length = Math.hypot(dx, dy);
  if (length < 1) return;
  const tangent = { x: dx / length, y: dy / length };
  graphics.lineStyle(14, SPRING_TAPE.outline, 1);
  graphics.lineBetween(edge.a.x, edge.a.y, edge.b.x, edge.b.y);
  graphics.lineStyle(10, SPRING_TAPE.yellow, 1);
  graphics.lineBetween(edge.a.x, edge.a.y, edge.b.x, edge.b.y);
  graphics.lineStyle(1.5, SPRING_TAPE.highlight, 0.95);
  graphics.lineBetween(
    edge.a.x - edge.normal.x * 2.1, edge.a.y - edge.normal.y * 2.1,
    edge.b.x - edge.normal.x * 2.1, edge.b.y - edge.normal.y * 2.1,
  );

  const stripeCount = Math.max(2, Math.floor(length / 23));
  graphics.lineStyle(3.6, SPRING_TAPE.stripe, 0.98);
  for (let index = 0; index <= stripeCount; index += 1) {
    const t = (index + 0.5) / (stripeCount + 1);
    const center = { x: edge.a.x + dx * t, y: edge.a.y + dy * t };
    const halfTangent = 3.7;
    const halfNormal = 5.4;
    graphics.lineBetween(
      center.x - tangent.x * halfTangent - edge.normal.x * halfNormal,
      center.y - tangent.y * halfTangent - edge.normal.y * halfNormal,
      center.x + tangent.x * halfTangent + edge.normal.x * halfNormal,
      center.y + tangent.y * halfTangent + edge.normal.y * halfNormal,
    );
  }
}
