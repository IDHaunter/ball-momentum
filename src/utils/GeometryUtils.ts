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
