import type { DemonSpawnAreaDefinition, SolidDefinition } from './LevelTypes';
import type { Vector2 } from '../physics/PhysicsTypes';
import { polygonCentroid } from '../utils/GeometryUtils';

/**
 * Builds deterministic, ground-supported demon spawn positions from exposed
 * upward-facing solid edges. Raised lethal edges are deliberately excluded.
 */
export function getDemonSpawnPoints(
  solids: SolidDefinition[],
  area: DemonSpawnAreaDefinition,
  radius: number,
): Vector2[] {
  const points: Vector2[] = [];
  const spacing = Math.max(44, radius * 2.7);
  const append = (point: Vector2): void => {
    if (point.x < area.minX || point.x > area.maxX || point.y < area.minY || point.y > area.maxY) return;
    if (points.some((existing) => Math.hypot(existing.x - point.x, existing.y - point.y) < radius * 1.8)) return;
    points.push(point);
  };

  for (const solid of solids) {
    // Do not cache spawn points on surfaces that can later move or disappear.
    if (solid.breakable || (solid.type === 'box' && solid.movable)) continue;
    if (solid.type === 'box') {
      if (solid.borders?.top === 'spikes') continue;
      const left = Math.max(solid.x + radius + 2, area.minX);
      const right = Math.min(solid.x + solid.width - radius - 2, area.maxX);
      if (right < left) continue;
      const y = solid.y - radius - 0.5;
      if (y < area.minY || y > area.maxY) continue;
      const count = Math.max(1, Math.floor((right - left) / spacing));
      for (let index = 0; index <= count; index += 1) {
        append({ x: left + (right - left) * (count === 0 ? 0.5 : index / count), y });
      }
      continue;
    }

    const vertices = solid.vertices.map(([x, y]) => ({ x, y }));
    const center = polygonCentroid(vertices);
    for (let edgeIndex = 0; edgeIndex < vertices.length; edgeIndex += 1) {
      const border = solid.borders?.find((item) => item.edge === edgeIndex)?.style;
      if (border === 'spikes') continue;
      const start = vertices[edgeIndex]!;
      const end = vertices[(edgeIndex + 1) % vertices.length]!;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const length = Math.hypot(dx, dy);
      if (length < radius * 2.2) continue;
      let normal = { x: -dy / length, y: dx / length };
      const midpoint = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
      if (normal.x * (midpoint.x - center.x) + normal.y * (midpoint.y - center.y) < 0) {
        normal = { x: -normal.x, y: -normal.y };
      }
      // A demon stands on top-facing surfaces, including slopes, but never on
      // a vertical wall or an underside where the round body would float.
      if (normal.y > -0.28) continue;
      const startT = Math.min(0.45, (radius + 2) / length);
      const endT = 1 - startT;
      const usableLength = (endT - startT) * length;
      const count = Math.max(1, Math.floor(usableLength / spacing));
      for (let index = 0; index <= count; index += 1) {
        const t = startT + (endT - startT) * (count === 0 ? 0.5 : index / count);
        append({
          x: start.x + dx * t + normal.x * (radius + 0.5),
          y: start.y + dy * t + normal.y * (radius + 0.5),
        });
      }
    }
  }

  return points.sort((a, b) => a.x - b.x || a.y - b.y);
}
