import { polygonEdgeOutwardNormal } from '../utils/GeometryUtils';
import type { BorderStyle, BoxBorderStyles, BoxSurfaceSide, PolygonBorderDefinition } from '../level/LevelTypes';

/** Minimal Phaser Graphics surface needed by the procedural edge painter. */
export interface BorderGraphicsLike {
  lineStyle(width: number, color: number, alpha?: number): unknown;
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown;
  fillStyle(color: number, alpha?: number): unknown;
  fillEllipse(x: number, y: number, width: number, height: number): unknown;
  strokeEllipse(x: number, y: number, width: number, height: number): unknown;
  fillPoints(points: BorderPoint[], closeShape?: boolean, closePath?: boolean, endIndex?: number): unknown;
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
    case 'pavers': {
      // Concrete pavers use the same quiet mixed greys as their face texture.
      // The top course is deliberately a little more expressive; side and
      // bottom courses remain neat, small, staggered paving blocks.
      stroke(10, 0x3b454a, 0.98);
      stroke(6.5, 0x646e70, 0.9);
      drawConcretePaverBorder(graphics, edge, length, tangent, normal);
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
    case 'brick': {
      // A dark warm mortar bed ties the border to the terracotta face texture.
      stroke(11, 0x453931, 1);
      drawBrickMasonryBorder(graphics, edge, length, tangent, normal);
      break;
    }
    case 'glass': {
      // Keep the border inside the muted graphite / blue-grey palette of the
      // glass facets. Low alpha lets the face texture visually continue into
      // the edge, so the solid reads as one translucent glass object.
      stroke(8, 0x29343c, 0.3);
      stroke(5.2, 0x697780, 0.32);
      stroke(1.2, 0xc3ccd1, 0.28, -1.35);
      stroke(1, 0x3e5059, 0.18, 1.45);

      // Sparse, soft oval reflections give the rim a glass sheen. Unlike ice,
      // glass has no diagonal scratches, cross-strokes, snow or crystal shapes.
      const random = createEdgeRandom(edge);
      const glints = Math.max(1, Math.floor(length / 92));
      for (let index = 0; index < glints; index += 1) {
        const t = (index + 0.42 + random() * 0.16) / glints;
        const centerX = a.x + dx * t + normal.x * (-1.1 - random() * 0.45);
        const centerY = a.y + dy * t + normal.y * (-1.1 - random() * 0.45);
        const reflectionWidth = 7 + random() * 3.5;

        // A diffuse grey reflection with a smaller soft highlight in its centre.
        graphics.fillStyle(0x9eabb2, 0.16);
        graphics.fillEllipse(centerX, centerY, reflectionWidth, 2.8);
        graphics.fillStyle(0xe1e7ea, 0.24);
        graphics.fillEllipse(centerX - tangent.x * 0.45, centerY - tangent.y * 0.45, reflectionWidth * 0.42, 1.15);
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
      if (normal.y < -0.35) {
        // An ice-and-snow crust sits outside the flat collision edge only.
        drawIceCrystalCoating(graphics, edge, length, tangent, normal);
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

interface BrickEdgeTone { body: number; shade: number; highlight: number; }

// These warm fired-clay colours are sampled from the brick-masonry face palette.
const BRICK_EDGE_TONES: readonly BrickEdgeTone[] = [
  { body: 0xb15b39, shade: 0x693725, highlight: 0xe0a07b },
  { body: 0xc0663f, shade: 0x77402b, highlight: 0xe5aa81 },
  { body: 0x9e4d33, shade: 0x5f3025, highlight: 0xd88a67 },
  { body: 0xcc774b, shade: 0x80432e, highlight: 0xf0b18a },
  { body: 0xa95235, shade: 0x673425, highlight: 0xd9926d },
];

/**
 * Draws a miniature terracotta brick course along the exposed edge. The top
 * gets one larger, hand-laid row with individually skewed bricks and a few
 * raised corners; side and bottom edges keep their original compact course.
 * All shapes are decorative Graphics only, and the original Matter boundary
 * remains unchanged.
 */
function drawBrickMasonryBorder(
  graphics: BorderGraphicsLike,
  edge: BorderEdgeSegment,
  length: number,
  tangent: BorderPoint,
  normal: BorderPoint,
): void {
  const random = createEdgeRandom(edge);
  const isUpperEdge = normal.y < -0.35;
  // Preserve the established side/bottom layout exactly; only the top course
  // changes to fewer, longer blocks with a more irregular hand-laid silhouette.
  const courses = 1;
  const brickPitch = isUpperEdge ? 26.2 : 19.2;

  for (let course = 0; course < courses; course += 1) {
    const stagger = 0;
    const centerOffset = isUpperEdge ? -2.7 : 0;
    const brickCount = Math.ceil((length + stagger) / brickPitch) + 1;

    for (let index = 0; index < brickCount; index += 1) {
      const tone = BRICK_EDGE_TONES[Math.floor(random() * BRICK_EDGE_TONES.length)];
      const rawStart = index * brickPitch - stagger + 0.6 + (random() - 0.5) * (isUpperEdge ? 1.25 : 0.8);
      const start = Math.max(0.35, rawStart);
      const availableLength = Math.min(isUpperEdge ? 25.0 : 18.0, length - start - 0.65);
      if (availableLength < (isUpperEdge ? 12.0 : 7.5)) continue;

      const nominalLength = isUpperEdge ? 20.6 + random() * 3.5 : 13.8 + random() * 3.4;
      const brickLength = Math.min(availableLength, nominalLength);
      const depth = (isUpperEdge ? 8.2 : 7.0) + random() * (isUpperEdge ? 1.8 : 1.1);
      const offset = centerOffset + (random() - 0.5) * (isUpperEdge ? 1.8 : 0.65);
      const angle = (random() - 0.5) * (isUpperEdge ? 0.19 : 0.045);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const brickTangent = {
        x: tangent.x * cos - normal.x * sin,
        y: tangent.y * cos - normal.y * sin,
      };
      const brickNormal = {
        x: tangent.x * sin + normal.x * cos,
        y: tangent.y * sin + normal.y * cos,
      };
      const alongCenter = start + brickLength * 0.5;
      const center = {
        x: edge.a.x + tangent.x * alongCenter + normal.x * offset,
        y: edge.a.y + tangent.y * alongCenter + normal.y * offset,
      };
      const halfLength = brickLength * 0.5;
      const halfDepth = depth * 0.5;
      const bevel = Math.min(isUpperEdge ? 1.9 : 1.45, halfDepth * 0.48, halfLength * 0.18);
      const point = (along: number, outward: number): BorderPoint => ({
        x: center.x + brickTangent.x * along + brickNormal.x * outward,
        y: center.y + brickTangent.y * along + brickNormal.y * outward,
      });
      // A few top corners sit slightly proud of the mortar line, as if the
      // larger bricks were placed by hand rather than cut to a perfect edge.
      const raisedLeftCorner = isUpperEdge && random() > 0.58 ? 1.0 + random() * 1.8 : 0;
      const raisedRightCorner = isUpperEdge && random() > 0.72 ? 0.8 + random() * 1.4 : 0;
      const points = [
        point(-halfLength + bevel, halfDepth + raisedLeftCorner),
        point(halfLength - bevel, halfDepth + raisedRightCorner),
        point(halfLength, halfDepth - bevel + raisedRightCorner * 0.35),
        point(halfLength, -halfDepth + bevel),
        point(halfLength - bevel, -halfDepth),
        point(-halfLength + bevel, -halfDepth),
        point(-halfLength, -halfDepth + bevel),
        point(-halfLength, halfDepth - bevel + raisedLeftCorner * 0.35),
      ];

      // A small offset shadow separates the brick from its mortar bed.
      graphics.fillStyle(0x382b26, 0.25);
      graphics.fillPoints(points.map((p) => ({ x: p.x + normal.x * 0.7, y: p.y + normal.y * 0.7 })), true, true);
      graphics.fillStyle(tone.body, 0.98);
      graphics.fillPoints(points, true, true);

      // Thin bevel outline, bright upper arris and a darker lower face mimic fired clay.
      graphics.lineStyle(0.9, tone.shade, 0.92);
      for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
        const current = points[pointIndex];
        const next = points[(pointIndex + 1) % points.length];
        graphics.lineBetween(current.x, current.y, next.x, next.y);
      }
      graphics.lineStyle(1.0, tone.highlight, 0.56);
      graphics.lineBetween(points[0].x, points[0].y, points[1].x, points[1].y);
      graphics.lineStyle(0.85, tone.shade, 0.76);
      graphics.lineBetween(points[4].x, points[4].y, points[5].x, points[5].y);

      // A few very small clay pores keep the little blocks from looking too synthetic.
      if (random() > 0.72) {
        const poreAlong = (random() - 0.5) * brickLength * 0.45;
        const poreOffset = (random() - 0.5) * depth * 0.28;
        graphics.fillStyle(tone.shade, 0.24);
        graphics.fillEllipse(
          center.x + brickTangent.x * poreAlong + brickNormal.x * poreOffset,
          center.y + brickTangent.y * poreAlong + brickNormal.y * poreOffset,
          1.2 + random() * 0.8,
          0.75 + random() * 0.45,
        );
      }
    }
  }
}


interface ConcretePaverTone { body: number; shade: number; highlight: number; }

const CONCRETE_PAVER_EDGE_TONES: readonly ConcretePaverTone[] = [
  { body: 0x929a99, shade: 0x596367, highlight: 0xc4c9c5 },
  { body: 0xa69f91, shade: 0x68665f, highlight: 0xd4cbb9 },
  { body: 0x7f8c90, shade: 0x4c5a60, highlight: 0xb8c2c3 },
  { body: 0xb1a99a, shade: 0x70695f, highlight: 0xded4c3 },
  { body: 0x8d9088, shade: 0x5b605c, highlight: 0xc4c6bc },
  { body: 0x87979a, shade: 0x526368, highlight: 0xc0ccca },
  { body: 0x9ba49b, shade: 0x606a64, highlight: 0xcbd3c8 },
];

/**
 * Paints a decorative concrete-paver border. The exposed top gets one course
 * of larger, gently irregular slabs; vertical and bottom edges retain compact,
 * regular pavers. This is visual-only and never modifies the physics edge.
 */
function drawConcretePaverBorder(
  graphics: BorderGraphicsLike,
  edge: BorderEdgeSegment,
  length: number,
  tangent: BorderPoint,
  normal: BorderPoint,
): void {
  const random = createEdgeRandom(edge);
  const isUpperEdge = normal.y < -0.35;
  const pitch = isUpperEdge ? 29.2 : 18.4;
  const blockCount = Math.ceil(length / pitch) + 1;

  for (let index = 0; index < blockCount; index += 1) {
    const tone = CONCRETE_PAVER_EDGE_TONES[Math.floor(random() * CONCRETE_PAVER_EDGE_TONES.length)];
    const start = index * pitch + 0.7 + (random() - 0.5) * (isUpperEdge ? 1.1 : 0.55);
    const availableLength = Math.min(isUpperEdge ? 27.3 : 16.9, length - start - 0.55);
    if (availableLength < (isUpperEdge ? 14 : 7)) continue;

    const blockLength = Math.min(
      availableLength,
      isUpperEdge ? 23.4 + random() * 3.1 : 14.2 + random() * 2.2,
    );
    const depth = (isUpperEdge ? 8.3 : 6.8) + random() * (isUpperEdge ? 1.3 : 0.8);
    const offset = (isUpperEdge ? -2.1 : 0) + (random() - 0.5) * (isUpperEdge ? 1.25 : 0.3);
    const angle = (random() - 0.5) * (isUpperEdge ? 0.105 : 0.025);
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const blockTangent = {
      x: tangent.x * cos - normal.x * sin,
      y: tangent.y * cos - normal.y * sin,
    };
    const blockNormal = {
      x: tangent.x * sin + normal.x * cos,
      y: tangent.y * sin + normal.y * cos,
    };
    const halfLength = blockLength * 0.5;
    const halfDepth = depth * 0.5;
    const centerAlong = start + halfLength;
    const center = {
      x: edge.a.x + tangent.x * centerAlong + normal.x * offset,
      y: edge.a.y + tangent.y * centerAlong + normal.y * offset,
    };
    const chamfer = Math.min(isUpperEdge ? 1.7 : 1.25, halfDepth * 0.44, halfLength * 0.14);
    const point = (along: number, outward: number): BorderPoint => ({
      x: center.x + blockTangent.x * along + blockNormal.x * outward,
      y: center.y + blockTangent.y * along + blockNormal.y * outward,
    });
    const raisedStart = isUpperEdge && random() > 0.66 ? 0.7 + random() * 1.1 : 0;
    const raisedEnd = isUpperEdge && random() > 0.76 ? 0.6 + random() * 0.9 : 0;
    const points = [
      point(-halfLength + chamfer, halfDepth + raisedStart),
      point(halfLength - chamfer, halfDepth + raisedEnd),
      point(halfLength, halfDepth - chamfer * 0.55),
      point(halfLength, -halfDepth + chamfer),
      point(halfLength - chamfer, -halfDepth),
      point(-halfLength + chamfer, -halfDepth),
      point(-halfLength, -halfDepth + chamfer),
      point(-halfLength, halfDepth - chamfer * 0.55),
    ];

    // Recessed dark joints and a soft contact shadow give each slab a little depth.
    graphics.fillStyle(0x303a3f, 0.24);
    graphics.fillPoints(points.map((p) => ({ x: p.x + normal.x * 0.65, y: p.y + normal.y * 0.65 })), true, true);
    graphics.fillStyle(tone.body, 0.98);
    graphics.fillPoints(points, true, true);

    graphics.lineStyle(0.85, tone.shade, 0.84);
    for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
      const current = points[pointIndex];
      const next = points[(pointIndex + 1) % points.length];
      graphics.lineBetween(current.x, current.y, next.x, next.y);
    }
    graphics.lineStyle(isUpperEdge ? 1.05 : 0.8, tone.highlight, isUpperEdge ? 0.58 : 0.42);
    graphics.lineBetween(points[0].x, points[0].y, points[1].x, points[1].y);
    graphics.lineStyle(0.8, tone.shade, 0.64);
    graphics.lineBetween(points[4].x, points[4].y, points[5].x, points[5].y);

    // Occasional fine aggregate flecks add a concrete feel without visual noise.
    if (random() > 0.58) {
      const fleckAlong = (random() - 0.5) * blockLength * 0.46;
      const fleckOffset = (random() - 0.5) * depth * 0.25;
      graphics.fillStyle(tone.highlight, 0.28);
      graphics.fillEllipse(
        center.x + blockTangent.x * fleckAlong + blockNormal.x * fleckOffset,
        center.y + blockTangent.y * fleckAlong + blockNormal.y * fleckOffset,
        1.2 + random() * 1.1,
        0.7 + random() * 0.55,
      );
    }
  }
}

interface IceChunkTone { body: number; shade: number; highlight: number; }

const ICE_CHUNK_TONES: readonly IceChunkTone[] = [
  { body: 0x8eddf0, shade: 0x397f9b, highlight: 0xf0fdff },
  { body: 0xb9eff7, shade: 0x5babc0, highlight: 0xffffff },
  { body: 0x70c8e5, shade: 0x286f91, highlight: 0xdffaff },
  { body: 0xd3f5f8, shade: 0x76baca, highlight: 0xffffff },
  { body: 0x9bcce9, shade: 0x507ea4, highlight: 0xf2fbff },
];

/**
 * Paints a playful, shallow crust of rounded ice chunks, tiny crystals and
 * snow sparkles along an exposed upper ice edge. It is purely decorative:
 * the original edge remains the sole surface used by the physics engine.
 */
function drawIceCrystalCoating(
  graphics: BorderGraphicsLike,
  edge: BorderEdgeSegment,
  length: number,
  tangent: BorderPoint,
  normal: BorderPoint,
): void {
  const random = createEdgeRandom(edge);
  const spacing = 11.4;
  const rows = 2;
  const count = Math.max(2, Math.ceil(length / spacing));

  for (let row = 0; row < rows; row += 1) {
    for (let index = 0; index < count; index += 1) {
      const tone = ICE_CHUNK_TONES[Math.floor(random() * ICE_CHUNK_TONES.length)];
      const width = 5.8 + random() * 5.2;
      const height = 3.8 + random() * 3.3;
      const along = Math.min(length, Math.max(0,
        (index + 0.5 + row * 0.46) * spacing + (random() - 0.5) * 3.1,
      ));
      const offset = (row === 0 ? 1.0 : -2.7) + (random() - 0.5) * 1.2;
      const centerX = edge.a.x + tangent.x * along + normal.x * offset;
      const centerY = edge.a.y + tangent.y * along + normal.y * offset;

      // Soft shadow, rounded ice lump and an icy rim make the layer readable.
      graphics.fillStyle(0x17445b, 0.24);
      graphics.fillEllipse(centerX - normal.x * 0.35, centerY - normal.y * 0.35, width * 1.08, height * 0.78);
      graphics.fillStyle(tone.body, 0.96);
      graphics.fillEllipse(centerX, centerY, width, height);
      graphics.lineStyle(0.95, tone.shade, 0.9);
      graphics.strokeEllipse(centerX, centerY, width, height);

      // Curved-looking white glints and a small snow cap vary each ice lump.
      graphics.fillStyle(tone.highlight, 0.7);
      graphics.fillEllipse(
        centerX - tangent.x * width * 0.12 - normal.x * height * 0.12,
        centerY - tangent.y * width * 0.12 - normal.y * height * 0.12,
        width * (0.28 + random() * 0.16),
        height * 0.24,
      );

      // Every few lumps grow a playful faceted shard above the rolling plane.
      if ((index + row * 2) % 3 === 1 || random() > 0.82) {
        const shardAlong = along + (random() - 0.5) * width * 0.34;
        const baseOffset = offset - height * 0.18;
        const halfBase = 2.1 + random() * 2.2;
        const tipHeight = 5.2 + random() * 4.6;
        const baseLeft = {
          x: edge.a.x + tangent.x * (shardAlong - halfBase) + normal.x * baseOffset,
          y: edge.a.y + tangent.y * (shardAlong - halfBase) + normal.y * baseOffset,
        };
        const baseRight = {
          x: edge.a.x + tangent.x * (shardAlong + halfBase) + normal.x * baseOffset,
          y: edge.a.y + tangent.y * (shardAlong + halfBase) + normal.y * baseOffset,
        };
        const tip = {
          x: edge.a.x + tangent.x * (shardAlong + (random() - 0.5) * 1.4) + normal.x * (baseOffset + tipHeight),
          y: edge.a.y + tangent.y * (shardAlong + (random() - 0.5) * 1.4) + normal.y * (baseOffset + tipHeight),
        };
        graphics.lineStyle(2.5, tone.shade, 0.95);
        graphics.lineBetween(baseLeft.x, baseLeft.y, tip.x, tip.y);
        graphics.lineBetween(tip.x, tip.y, baseRight.x, baseRight.y);
        graphics.lineStyle(1.15, tone.highlight, 1);
        graphics.lineBetween(baseLeft.x, baseLeft.y, tip.x, tip.y);
        graphics.lineBetween(tip.x, tip.y, baseRight.x, baseRight.y);
        graphics.lineBetween(
          tip.x, tip.y,
          edge.a.x + tangent.x * shardAlong + normal.x * baseOffset,
          edge.a.y + tangent.y * shardAlong + normal.y * baseOffset,
        );
      }

      // Occasional tiny snowflake glints add a light, slightly silly sparkle.
      if (random() > 0.72) {
        const flakeAlong = along + (random() - 0.5) * 6;
        const flakeOffset = offset + 3.8 + random() * 2.0;
        const flakeX = edge.a.x + tangent.x * flakeAlong + normal.x * flakeOffset;
        const flakeY = edge.a.y + tangent.y * flakeAlong + normal.y * flakeOffset;
        const arm = 1.4 + random() * 1.0;
        graphics.lineStyle(1.0, 0xffffff, 0.94);
        graphics.lineBetween(flakeX - tangent.x * arm, flakeY - tangent.y * arm, flakeX + tangent.x * arm, flakeY + tangent.y * arm);
        graphics.lineBetween(flakeX - normal.x * arm, flakeY - normal.y * arm, flakeX + normal.x * arm, flakeY + normal.y * arm);
      }
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
