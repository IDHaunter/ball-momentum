import type { BreakableSolidDefinition, SolidDefinition } from './LevelTypes';

interface SolidBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/**
 * Tracks breakable solids and their breakable dependants. A dependant is a
 * breakable solid resting directly on another breakable solid. Breaking a
 * support recursively breaks the stack above it; breaking only the top item
 * leaves lower items intact.
 */
export class BreakableTerrainManager {
  private readonly breakables = new Map<string, BreakableSolidDefinition>();
  private readonly dependants = new Map<string, string[]>();
  private readonly broken = new Set<string>();

  constructor(solids: SolidDefinition[], private readonly supportTolerancePx = 2) {
    for (const solid of solids) {
      if (solid.breakable) this.breakables.set(solid.id, solid as BreakableSolidDefinition);
    }

    const items = [...this.breakables.values()];
    for (const support of items) {
      const supportBounds = getSolidBounds(support);
      for (const candidate of items) {
        if (candidate.id === support.id) continue;
        const candidateBounds = getSolidBounds(candidate);
        const verticalGap = supportBounds.minY - candidateBounds.maxY;
        const horizontalOverlap = Math.min(supportBounds.maxX, candidateBounds.maxX)
          - Math.max(supportBounds.minX, candidateBounds.minX);
        if (Math.abs(verticalGap) <= this.supportTolerancePx && horizontalOverlap > 2) {
          const list = this.dependants.get(support.id) ?? [];
          list.push(candidate.id);
          this.dependants.set(support.id, list);
        }
      }
    }
  }

  get(id: string): BreakableSolidDefinition | null {
    return this.breakables.get(id) ?? null;
  }

  isBroken(id: string): boolean { return this.broken.has(id); }

  break(id: string): BreakableSolidDefinition[] {
    if (!this.breakables.has(id) || this.broken.has(id)) return [];
    const result: BreakableSolidDefinition[] = [];
    const visit = (currentId: string): void => {
      if (this.broken.has(currentId)) return;
      this.broken.add(currentId);
      const solid = this.breakables.get(currentId);
      if (!solid) return;
      result.push(solid);
      for (const dependantId of this.dependants.get(currentId) ?? []) visit(dependantId);
    };
    visit(id);
    return result;
  }

  reset(): void { this.broken.clear(); }
}

export function getSolidBounds(solid: SolidDefinition): SolidBounds {
  if (solid.type === 'box') {
    return {
      minX: solid.x,
      maxX: solid.x + solid.width,
      minY: solid.y,
      maxY: solid.y + solid.height,
    };
  }
  const xs = solid.vertices.map(([x]) => x);
  const ys = solid.vertices.map(([, y]) => y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}
