import { describe, expect, it } from 'vitest';
import { isConvexPolygon, polygonCentroid } from '../../src/utils/GeometryUtils';

describe('isConvexPolygon', () => {
  it('accepts convex triangles and rectangles', () => {
    expect(isConvexPolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 10 }])).toBe(true);
    expect(isConvexPolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(true);
  });
  it('rejects concave and zero-area polygons', () => {
    expect(isConvexPolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 3, y: 3 }, { x: 10, y: 10 }, { x: 0, y: 10 }])).toBe(false);
    expect(isConvexPolygon([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }])).toBe(false);
  });
});


describe('polygonCentroid', () => {
  it('uses the area-weighted centre rather than the bounding-box centre for a ramp', () => {
    const ramp = [
      { x: 700, y: 760 },
      { x: 1050, y: 850 },
      { x: 1074, y: 1280 },
      { x: 676, y: 1280 },
    ];

    expect(polygonCentroid(ramp).x).toBeCloseTo(863.0533944, 5);
    expect(polygonCentroid(ramp).y).toBeCloseTo(1044.1364717, 5);
    expect(polygonCentroid(ramp).y).not.toBeCloseTo(1020, 0);
  });

  it('centres local Matter vertices around the polygon centroid', () => {
    const triangle = [
      { x: 2500, y: 850 },
      { x: 2650, y: 630 },
      { x: 2800, y: 850 },
    ];
    const center = polygonCentroid(triangle);
    const local = triangle.map((point) => ({ x: point.x - center.x, y: point.y - center.y }));

    expect(center.x).toBeCloseTo(2650, 8);
    expect(center.y).toBeCloseTo(776.6666667, 5);
    expect(polygonCentroid(local).x).toBeCloseTo(0, 8);
    expect(polygonCentroid(local).y).toBeCloseTo(0, 8);
  });

  it('supports either clockwise or counter-clockwise vertex order', () => {
    const clockwise = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }];
    const counterClockwise = [...clockwise].reverse();

    expect(polygonCentroid(clockwise)).toEqual({ x: 5, y: 5 });
    expect(polygonCentroid(counterClockwise)).toEqual({ x: 5, y: 5 });
  });

  it('rejects degenerate polygons', () => {
    expect(() => polygonCentroid([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 20, y: 0 }])).toThrow(/zero-area/);
  });
});
