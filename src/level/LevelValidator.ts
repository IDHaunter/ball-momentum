import { LevelSchema } from './LevelSchema';
import type { LevelDefinition } from './LevelTypes';
import { isConvexPolygon } from '../utils/GeometryUtils';
import { ValidationErrors } from '../utils/ValidationErrors';

export class LevelValidator {
  validate(raw: unknown, sourceName = 'level'): LevelDefinition {
    const parsed = LevelSchema.safeParse(raw);
    if (!parsed.success) {
      const issues = parsed.error.issues.map((issue) => {
        // Zod's PropertyKey path can contain symbols (for example, in
        // unrecognized-key issues), so do not narrow it to string | number.
        const path = issue.path.map((segment) => String(segment)).join('.');
        return `${path || '<root>'}: ${issue.message}`;
      });
      throw new ValidationErrors(`Invalid ${sourceName}: ${issues.join('; ')}`, issues);
    }
    const level = parsed.data as LevelDefinition;
    const errors: string[] = [];
    const ids = new Set<string>();
    const addId = (id: string, path: string) => {
      if (ids.has(id)) errors.push(`${path}: duplicate ID "${id}"`);
      ids.add(id);
    };

    if (level.spawn.x < 0 || level.spawn.x > level.world.width || level.spawn.y < 0 || level.spawn.y > level.world.height) {
      errors.push('spawn: coordinates must be inside world bounds');
    }
    if (level.world.killPlaneY <= 0 || level.world.killPlaneY > level.world.height + 1000) {
      errors.push('world.killPlaneY: must be positive and reasonably close to the world bounds');
    }

    for (const solid of level.solids) {
      addId(solid.id, `solids.${solid.id}`);
      if (solid.material && !level.materials?.[solid.material]) errors.push(`solids.${solid.id}.material: unknown material "${solid.material}"`);
      if (solid.breakable && solid.material !== 'glass') errors.push(`solids.${solid.id}.breakable: breakable solids must use material "glass"`);
      if (solid.type === 'box' && solid.movable && solid.material === 'glass') {
        errors.push(`solids.${solid.id}.movable: movable boxes cannot use the glass material`);
      }
      if (solid.type === 'box' && solid.movable && solid.breakable) {
        errors.push(`solids.${solid.id}: a box cannot be both movable and breakable`);
      }
      if (solid.type === 'box' && solid.movable && solid.springSurfaces?.length) {
        errors.push(`solids.${solid.id}.springSurfaces: movable boxes cannot also define spring surfaces`);
      }
      // Glass is intentionally non-springy. Its spring assignments are
      // accepted for forward compatibility but ignored by TerrainFactory.
      if (solid.material !== 'glass' && solid.springSurfaces?.length) {
        const surfaceKeys = solid.type === 'box'
          ? solid.springSurfaces.map((surface) => surface.side)
          : solid.springSurfaces.map((surface) => String(surface.edge));
        if (new Set(surfaceKeys).size !== surfaceKeys.length) {
          errors.push(`solids.${solid.id}.springSurfaces: duplicate surface assignment`);
        }
        if (solid.type === 'polygon') {
          for (const surface of solid.springSurfaces) {
            if (surface.edge >= solid.vertices.length) {
              errors.push(`solids.${solid.id}.springSurfaces: edge ${surface.edge} is outside the polygon vertex range`);
            }
          }
        }
      }
      if (solid.type === 'polygon') {
        const points = solid.vertices.map(([x, y]) => ({ x, y }));
        const unique = new Set(points.map((p) => `${p.x}:${p.y}`));
        if (unique.size !== points.length) errors.push(`solids.${solid.id}.vertices: duplicate vertices`);
        if (!isConvexPolygon(points)) errors.push(`solids.${solid.id}.vertices: polygon must be convex and have non-zero area`);
      }
    }

    let goals = 0;
    for (const trigger of level.triggers) {
      addId(trigger.id, `triggers.${trigger.id}`);
      if (trigger.type === 'goal') goals += 1;
      if (trigger.type === 'checkpoint' && (trigger.respawnX === undefined || trigger.respawnY === undefined)) {
        errors.push(`triggers.${trigger.id}: checkpoint requires respawnX and respawnY`);
      }
      if (trigger.type === 'checkpoint' && trigger.respawnX !== undefined && trigger.respawnY !== undefined) {
        if (trigger.respawnX < 0 || trigger.respawnX > level.world.width || trigger.respawnY < 0 || trigger.respawnY > level.world.height) {
          errors.push(`triggers.${trigger.id}: checkpoint respawn coordinates must be inside world bounds`);
        }
      }
    }
    for (const decoration of level.decorations ?? []) addId(decoration.id, `decorations.${decoration.id}`);
    if (goals === 0) errors.push('triggers: at least one goal trigger is required');
    if (errors.length) throw new ValidationErrors(`Invalid ${sourceName}: ${errors.join('; ')}`, errors);
    return level;
  }
}
