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
  lines: Array<{ x1: number; y1: number; x2: number; y2: number; width: number; color: number; alpha: number }> = [];
  lineStyle(width: number, color: number, alpha = 1): unknown {
    this.current = { width, color, alpha };
    return this;
  }
  lineBetween(x1: number, y1: number, x2: number, y2: number): unknown {
    this.lines.push({ ...this.current, x1, y1, x2, y2 });
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

  it('draws asphalt dashes along the selected box edge', () => {
    const graphics = new FakeGraphics();
    drawBoxBorders(graphics, 0, 0, 180, 40, { top: 'asphalt', right: 'none', bottom: 'none', left: 'none' });
    expect(graphics.lines.some((line) => line.color === 0x46525e && line.width === 7)).toBe(true);
    expect(graphics.lines.filter((line) => line.color === 0xe5e6d9).length).toBeGreaterThan(1);
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
