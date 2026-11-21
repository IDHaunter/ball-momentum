import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHYSICS_DEFAULTS } from '../../src/config/physics.defaults';

describe('Physics Sandbox green enemy', () => {
  it('uses the same radius as the player smiley', () => {
    const level = JSON.parse(readFileSync(resolve(process.cwd(), 'public/levels/physics-sandbox.json'), 'utf8')) as {
      vomitEnemies?: Array<{ id: string; x: number; y: number; radius: number }>;
      solids?: Array<{ id: string; y?: number }>;
      decorations?: Array<{ id: string; x: number; width?: number }>;
    };
    const greenEnemy = level.vomitEnemies?.find((enemy) => enemy.id === 'sandbox-green-gremlin');

    expect(greenEnemy).toBeDefined();
    expect(greenEnemy?.radius).toBe(PHYSICS_DEFAULTS.ball.radiusPx);

    const platform = level.solids?.find((solid) => solid.id === 'sandbox-floor-d');
    const pitBackdrop = level.decorations?.find((item) => item.id === 'sandbox-vomit-pit-backdrop');
    expect(platform).toBeDefined();
    expect(pitBackdrop?.width).toBeDefined();
    expect(greenEnemy!.y + greenEnemy!.radius).toBe(platform!.y);
    expect(greenEnemy!.x + greenEnemy!.radius).toBe(pitBackdrop!.x - pitBackdrop!.width! / 2);
  });
});
