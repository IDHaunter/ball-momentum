import { describe, expect, it } from 'vitest';
import { isConvexPolygon } from '../../src/utils/GeometryUtils';

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
