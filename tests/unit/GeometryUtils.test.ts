import { describe, expect, it } from 'vitest';
import { isConvexPolygon, polygonCentroid, polygonEdgeOutwardNormal } from '../../src/utils/GeometryUtils';

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

    expect(polygonCentroid(ramp).x).toBeCloseTo(868.7157895, 5);
    expect(polygonCentroid(ramp).y).toBeCloseTo(1046.8240923, 5);
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


describe('polygonEdgeOutwardNormal', () => {
  it('returns the outward normal for a top-facing polygon edge', () => {
    const points = [{ x: 10, y: 50 }, { x: 50, y: 10 }, { x: 90, y: 50 }];
    const normal = polygonEdgeOutwardNormal(points, 0);
    expect(normal.x).toBeCloseTo(-Math.SQRT1_2, 6);
    expect(normal.y).toBeCloseTo(-Math.SQRT1_2, 6);
  });

  it('is independent of clockwise or counter-clockwise vertex order', () => {
    const clockwise = [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }, { x: 0, y: 100 }];
    const reversed = [...clockwise].reverse();
    expect(polygonEdgeOutwardNormal(clockwise, 0)).toEqual({ x: 0, y: -1 });
    const reversedNormal = polygonEdgeOutwardNormal(reversed, 2);
    expect(reversedNormal).toEqual({ x: 0, y: -1 });
    expect(Object.is(reversedNormal.x, -0)).toBe(false);
  });
});
