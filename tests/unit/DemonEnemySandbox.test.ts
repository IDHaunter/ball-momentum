import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LevelValidator } from '../../src/level/LevelValidator';
import { getDemonSpawnPoints } from '../../src/level/DemonSpawnSelector';

describe('Demon enemy sandbox setup', () => {
  it('defines an independently configurable spawn region, attack radius and impulse on safe surfaces', () => {
    const path = resolve(process.cwd(), 'public/levels/physics-sandbox.json');
    const raw = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    const level = new LevelValidator().validate(raw, 'physics-sandbox');
    expect(level.demonEnemies).toHaveLength(1);
    const demon = level.demonEnemies![0]!;
    expect(demon.spawnArea.maxX).toBeGreaterThan(demon.spawnArea.minX);
    expect(demon.spawnArea.minX).toBe(6100); // Keep the spawn lane beyond the texture-gallery display.
    expect(demon.attackRadius).toBeGreaterThan(0);
    expect(demon.lightningImpulse).toBeGreaterThan(0);
    const candidates = getDemonSpawnPoints(level.solids, demon.spawnArea, demon.radius);
    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates.every((point) => point.x >= demon.spawnArea.minX && point.x <= demon.spawnArea.maxX)).toBe(true);
  });
});
