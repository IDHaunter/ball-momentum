export type Point = { x: number; y: number };

export function signedPolygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return area / 2;
}

export function isConvexPolygon(points: Point[]): boolean {
  if (points.length < 3 || Math.abs(signedPolygonArea(points)) < 0.001) return false;
  let sign = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i]; const b = points[(i + 1) % points.length]; const c = points[(i + 2) % points.length];
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
    if (Math.abs(cross) < 0.000001) continue;
    const next = Math.sign(cross);
    if (sign !== 0 && next !== sign) return false;
    sign = next;
  }
  return sign !== 0;
}

/**
 * Calculates the area-weighted centroid (centre of mass for uniform density)
 * of a simple polygon. Matter.js positions `fromVertices` bodies at this point.
 */
export function polygonCentroid(points: Point[]): Point {
  if (points.length < 3) {
    throw new Error('A polygon must contain at least three vertices.');
  }

  let twiceArea = 0;
  let centroidX = 0;
  let centroidY = 0;

  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const cross = current.x * next.y - next.x * current.y;
    twiceArea += cross;
    centroidX += (current.x + next.x) * cross;
    centroidY += (current.y + next.y) * cross;
  }

  if (Math.abs(twiceArea) < 1e-8) {
    throw new Error('Cannot calculate the centroid of a zero-area polygon.');
  }

  return {
    x: centroidX / (3 * twiceArea),
    y: centroidY / (3 * twiceArea),
  };
}
