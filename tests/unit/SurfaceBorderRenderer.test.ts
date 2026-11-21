import { describe, expect, it } from 'vitest';
import {
  drawBoxBorders,
  drawPolygonBorders,
  drawSpringTape,
  getBoxBorderSegments,
  getPolygonBorderSegments,
  type BorderGraphicsLike,
} from '../../src/rendering/SurfaceBorderRenderer';

class FakeGraphics implements BorderGraphicsLike {
  current = { width: 0, color: 0, alpha: 1 };
  currentFill = { color: 0, alpha: 1 };
  lines: Array<{ x1: number; y1: number; x2: number; y2: number; width: number; color: number; alpha: number }> = [];
  ellipses: Array<{ x: number; y: number; width: number; height: number; fill: boolean; color: number; alpha: number }> = [];
  polygons: Array<{ points: Array<{ x: number; y: number }>; color: number; alpha: number }> = [];
  lineStyle(width: number, color: number, alpha = 1): unknown {
    this.current = { width, color, alpha };
    return this;
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown {
    this.lines.push({ ...this.current, x1, y1, x2, y2 });
    return this;
  }
  fillStyle(color: number, alpha = 1): unknown {
    this.currentFill = { color, alpha };
    return this;
  }
  fillEllipse(x: number, y: number, width: number, height: number): unknown {
    this.ellipses.push({ ...this.currentFill, x, y, width, height, fill: true });
    return this;
  }
  strokeEllipse(x: number, y: number, width: number, height: number): unknown {
    this.ellipses.push({ ...this.current, x, y, width, height, fill: false });
    return this;
  }
  fillPoints(points: Array<{ x: number; y: number }>, _closeShape = false, _closePath = false): unknown {
    this.polygons.push({ points: points.map((point) => ({ ...point })), ...this.currentFill });
    return this;
  }
}

describe('SurfaceBorderRenderer', () => {
  it('returns four consistently oriented box edges', () => {
    const edges = getBoxBorderSegments(10, 20, 100, 40);
    expect(edges.map((edge) => edge.side)).toEqual(['top', 'right', 'bottom', 'left']);
    expect(edges.map((edge) => edge.normal)).toEqual([
      { x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 },
    ]);
  });

  it('returns one outward-normal segment for each polygon edge', () => {
    const edges = getPolygonBorderSegments([[0, 50], [50, 0], [100, 50]]);
    expect(edges).toHaveLength(3);
    expect(edges[0].edge).toBe(0);
    expect(edges[0].normal.y).toBeLessThan(0);
  });

  it('skips a box edge styled as none while retaining default edges', () => {
    const graphics = new FakeGraphics();
    drawBoxBorders(graphics, 0, 0, 100, 50, { top: 'none' });
    expect(graphics.lines.length).toBe(3);
    expect(graphics.lines.every((line) => line.width === 3)).toBe(true);
  });

  it('draws a layered grass edge with blades outside the surface', () => {
    const graphics = new FakeGraphics();
    drawBoxBorders(graphics, 0, 0, 120, 40, { top: 'grass', right: 'none', bottom: 'none', left: 'none' });
    expect(graphics.lines.length).toBeGreaterThan(15);
    expect(graphics.lines.some((line) => line.color === 0x4d9953 && line.width === 6)).toBe(true);
    expect(graphics.lines.some((line) => line.y2 < line.y1)).toBe(true);
  });

  it('adds a shallow, varied pebble coat only to upper stone edges', () => {
    const top = new FakeGraphics();
    drawBoxBorders(top, 0, 0, 160, 40, { top: 'stone', right: 'none', bottom: 'none', left: 'none' });
    expect(top.ellipses.length).toBeGreaterThan(40);
    expect(top.ellipses.some((ellipse) => ellipse.fill && ellipse.width >= 6 && ellipse.height >= 3)).toBe(true);
    expect(new Set(top.ellipses.filter((ellipse) => ellipse.fill).map((ellipse) => ellipse.color)).size).toBeGreaterThan(2);

    const side = new FakeGraphics();
    drawBoxBorders(side, 0, 0, 160, 40, { top: 'none', right: 'stone', bottom: 'none', left: 'none' });
    expect(side.ellipses).toHaveLength(0);
    expect(side.lines.some((line) => line.color === 0x4a5864)).toBe(true);
  });


  it('draws one larger, irregular terracotta brick row along the upper edge', () => {
    const top = new FakeGraphics();
    const secondTop = new FakeGraphics();
    drawBoxBorders(top, 0, 0, 180, 50, { top: 'brick', right: 'none', bottom: 'none', left: 'none' });
    drawBoxBorders(secondTop, 0, 0, 180, 50, { top: 'brick', right: 'none', bottom: 'none', left: 'none' });

    const bodyColors = new Set([0xb15b39, 0xc0663f, 0x9e4d33, 0xcc774b, 0xa95235]);
    const upperBricks = top.polygons.filter((polygon) => bodyColors.has(polygon.color));
    expect(upperBricks.length).toBeGreaterThan(4);
    expect(upperBricks.length).toBeLessThan(10); // One course, not the previous two.
    expect(top.polygons).toEqual(secondTop.polygons);
    expect(new Set(top.polygons.map((polygon) => polygon.color)).size).toBeGreaterThan(2);
    expect(top.polygons.every((polygon) => polygon.points.length === 8)).toBe(true);
    expect(top.lines.some((line) => line.color === 0x453931 && line.width === 11)).toBe(true);

    const upperWidths = upperBricks.map((polygon) => {
      const xs = polygon.points.map((point) => point.x);
      return Math.max(...xs) - Math.min(...xs);
    });
    expect(Math.min(...upperWidths)).toBeGreaterThan(18.5);
    expect(Math.max(...upperWidths) - Math.min(...upperWidths)).toBeGreaterThan(0.35);

    const verticalSide = new FakeGraphics();
    drawBoxBorders(verticalSide, 0, 0, 120, 50, { top: 'none', right: 'brick', bottom: 'none', left: 'none' });
    const sideBricks = verticalSide.polygons.filter((polygon) => bodyColors.has(polygon.color));
    const sideLengths = sideBricks.map((polygon) => {
      const ys = polygon.points.map((point) => point.y);
      return Math.max(...ys) - Math.min(...ys);
    });
    expect(sideLengths.length).toBeGreaterThan(1);
    expect(Math.max(...sideLengths)).toBeLessThan(19); // Existing smaller side bricks are retained.

    const sideAndBottom = new FakeGraphics();
    drawBoxBorders(sideAndBottom, 0, 0, 120, 50, { top: 'none', right: 'brick', bottom: 'brick', left: 'brick' });
    expect(sideAndBottom.polygons.length).toBeGreaterThan(12);
    expect(sideAndBottom.lines.some((line) => line.color === 0x79d5ed || line.color === 0xf4ffff)).toBe(false);
  });

  it('follows sloped polygon edges with deterministic brick courses', () => {
    const first = new FakeGraphics();
    const second = new FakeGraphics();
    const vertices: Array<[number, number]> = [[0, 55], [75, 0], [150, 55], [150, 110], [0, 110]];
    const borders = [{ edge: 0, style: 'brick' as const }, { edge: 1, style: 'brick' as const }];
    drawPolygonBorders(first, vertices, borders);
    drawPolygonBorders(second, vertices, borders);
    expect(first.polygons).toEqual(second.polygons);
    expect(first.polygons.length).toBeGreaterThan(10);
  });

  it('draws a subdued graphite glass rim with soft reflections and no ice-like strokes', () => {
    const first = new FakeGraphics();
    const second = new FakeGraphics();
    const vertices: Array<[number, number]> = [[0, 50], [70, 0], [140, 50], [140, 100], [0, 100]];
    const borders = [
      { edge: 0, style: 'glass' as const },
      { edge: 1, style: 'none' as const },
      { edge: 2, style: 'none' as const },
      { edge: 3, style: 'none' as const },
      { edge: 4, style: 'none' as const },
    ];

    drawPolygonBorders(first, vertices, borders);
    drawPolygonBorders(second, vertices, borders);

    expect(first.lines).toEqual(second.lines);
    expect(first.ellipses).toEqual(second.ellipses);
    expect(first.lines.some((line) => line.color === 0x697780 && line.alpha < 0.4)).toBe(true);
    expect(first.lines.some((line) => line.color === 0xc3ccd1 && line.alpha < 0.35)).toBe(true);
    expect(first.lines.some((line) => line.color === 0x72d8ea || line.color === 0xe8fbff)).toBe(false);
    expect(first.ellipses.some((ellipse) => ellipse.fill && ellipse.color === 0x9eabb2 && ellipse.alpha < 0.2)).toBe(true);
    expect(first.ellipses.some((ellipse) => ellipse.fill && ellipse.color === 0xe1e7ea && ellipse.alpha < 0.3)).toBe(true);
    // Only the four quiet continuous edge strokes remain; reflections are soft ovals, not ice-like dashes.
    expect(first.lines).toHaveLength(4);
    expect(first.ellipses.length).toBeLessThan(8);
  });

  it('uses the glass finish on vertical box edges as well as top edges', () => {
    const graphics = new FakeGraphics();
    drawBoxBorders(graphics, 0, 0, 120, 50, { top: 'none', right: 'glass', bottom: 'none', left: 'none' });
    expect(graphics.lines.some((line) => line.color === 0x697780 && line.alpha < 0.4)).toBe(true);
    expect(graphics.ellipses.length).toBeGreaterThan(0);
  });

  it('adds rounded ice chunks, raised crystals and snow sparkles only to upper ice edges', () => {
    const top = new FakeGraphics();
    drawBoxBorders(top, 0, 0, 170, 42, { top: 'ice', right: 'none', bottom: 'none', left: 'none' });
    expect(top.ellipses.length).toBeGreaterThan(60);
    expect(new Set(top.ellipses.filter((ellipse) => ellipse.fill).map((ellipse) => ellipse.color)).size).toBeGreaterThan(4);
    expect(top.lines.some((line) => line.color === 0xffffff)).toBe(true);
    expect(top.lines.some((line) => line.color === 0xdffaff || line.color === 0xf0fdff)).toBe(true);

    const side = new FakeGraphics();
    drawBoxBorders(side, 0, 0, 170, 42, { top: 'none', right: 'ice', bottom: 'none', left: 'none' });
    expect(side.ellipses).toHaveLength(0);
    expect(side.lines.some((line) => line.color === 0xf4ffff)).toBe(true);
  });

  it('keeps the ice coating deterministic on sloped upward-facing polygon edges', () => {
    const first = new FakeGraphics();
    const second = new FakeGraphics();
    const vertices: Array<[number, number]> = [[0, 54], [70, 0], [140, 54], [140, 100], [0, 100]];
    const borders = [{ edge: 0, style: 'ice' as const }];
    drawPolygonBorders(first, vertices, borders);
    drawPolygonBorders(second, vertices, borders);
    expect(first.ellipses).toEqual(second.ellipses);
    expect(first.lines).toEqual(second.lines);
    expect(first.ellipses.length).toBeGreaterThan(20);
  });

  it('keeps the pebble arrangement deterministic and follows sloped upper polygon edges', () => {
    const first = new FakeGraphics();
    const second = new FakeGraphics();
    const vertices: Array<[number, number]> = [[0, 50], [60, 0], [120, 50], [120, 100], [0, 100]];
    const borders = [{ edge: 0, style: 'stone' as const }];
    drawPolygonBorders(first, vertices, borders);
    drawPolygonBorders(second, vertices, borders);
    expect(first.ellipses).toEqual(second.ellipses);
    expect(first.ellipses.length).toBeGreaterThan(10);
  });

  it('draws one gently irregular larger concrete-paver course along upper paver edges', () => {
    const first = new FakeGraphics();
    const second = new FakeGraphics();
    drawBoxBorders(first, 0, 0, 180, 42, { top: 'pavers', right: 'none', bottom: 'none', left: 'none' });
    drawBoxBorders(second, 0, 0, 180, 42, { top: 'pavers', right: 'none', bottom: 'none', left: 'none' });

    const bodyColors = new Set([0x929a99, 0xa69f91, 0x7f8c90, 0xb1a99a, 0x8d9088, 0x87979a, 0x9ba49b]);
    const upperPavers = first.polygons.filter((polygon) => bodyColors.has(polygon.color));
    expect(upperPavers.length).toBeGreaterThan(4);
    expect(upperPavers.length).toBeLessThan(10);
    expect(first.polygons).toEqual(second.polygons);
    expect(new Set(upperPavers.map((polygon) => polygon.color)).size).toBeGreaterThan(2);
    expect(upperPavers.every((polygon) => polygon.points.length === 8)).toBe(true);
    expect(first.lines.some((line) => line.color === 0x3b454a && line.width === 10)).toBe(true);

    const topWidths = upperPavers.map((polygon) => {
      const xs = polygon.points.map((point) => point.x);
      return Math.max(...xs) - Math.min(...xs);
    });
    expect(Math.min(...topWidths)).toBeGreaterThan(20);

    const side = new FakeGraphics();
    const bottom = new FakeGraphics();
    drawBoxBorders(side, 0, 0, 42, 120, { top: 'none', right: 'pavers', bottom: 'none', left: 'none' });
    drawBoxBorders(bottom, 0, 0, 120, 42, { top: 'none', right: 'none', bottom: 'pavers', left: 'none' });
    const sidePavers = side.polygons.filter((polygon) => bodyColors.has(polygon.color));
    const bottomPavers = bottom.polygons.filter((polygon) => bodyColors.has(polygon.color));
    expect(sidePavers.length).toBeGreaterThan(3);
    expect(bottomPavers.length).toBeGreaterThan(3);
    const sideLengths = sidePavers.map((polygon) => {
      const ys = polygon.points.map((point) => point.y);
      return Math.max(...ys) - Math.min(...ys);
    });
    expect(Math.max(...sideLengths)).toBeLessThan(Math.min(...topWidths));
  });

  it('applies styles by polygon edge index and supports hidden edges', () => {
    const graphics = new FakeGraphics();
    drawPolygonBorders(graphics, [[0, 40], [50, 0], [100, 40]], [
      { edge: 0, style: 'grass' },
      { edge: 1, style: 'none' },
      { edge: 2, style: 'metal' },
    ]);
    expect(graphics.lines.some((line) => line.color === 0x4d9953)).toBe(true);
    expect(graphics.lines.some((line) => line.color === 0x7f96a8)).toBe(true);
    expect(graphics.lines.length).toBeGreaterThan(10);
  });

  it('draws spring surfaces as bold yellow-black warning tape', () => {
    const graphics = new FakeGraphics();
    const edge = getBoxBorderSegments(0, 0, 140, 30)[0];
    drawSpringTape(graphics, edge);
    expect(graphics.lines.some((line) => line.width === 14 && line.color === 0x172330)).toBe(true);
    expect(graphics.lines.some((line) => line.width === 10 && line.color === 0xf4c542)).toBe(true);
    expect(graphics.lines.filter((line) => line.width === 3.6 && line.color === 0x18232f).length).toBeGreaterThan(3);
  });
});
