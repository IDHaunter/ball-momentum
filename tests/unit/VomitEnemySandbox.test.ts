import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHYSICS_DEFAULTS } from '../../src/config/physics.defaults';

describe('Physics Sandbox green enemy', () => {
  it('uses the same radius as the player smiley', () => {
    const level = JSON.parse(readFileSync(resolve(process.cwd(), 'public/levels/physics-sandbox.json'), 'utf8')) as {
      world: { backgroundColor?: string };
      vomitEnemies?: Array<{ id: string; x: number; y: number; radius: number }>;
      solids?: Array<{ id: string; x?: number; y?: number; width?: number; height?: number; borders?: { top?: string } }>;
      decorations?: Array<{ id: string; x: number; width?: number; depth?: number; color?: string }>;
    };
    const greenEnemy = level.vomitEnemies?.find((enemy) => enemy.id === 'sandbox-green-gremlin');

    expect(greenEnemy).toBeDefined();
    expect(greenEnemy?.radius).toBe(PHYSICS_DEFAULTS.ball.radiusPx);

    const platform = level.solids?.find((solid) => solid.id === 'sandbox-floor-d');
    const spikePitPlatform = level.solids?.find((solid) => solid.id === 'sandbox-spike-pit-platform');
    const pitBackdrop = level.decorations?.find((item) => item.id === 'sandbox-vomit-pit-backdrop');
    const pitGlowDecorations = level.decorations?.filter((item) => item.id.startsWith('sandbox-vomit-pit-glow-')) ?? [];
    expect(platform).toBeDefined();
    expect(spikePitPlatform).toMatchObject({ x: 6305, y: 1000, width: 292, height: 28 });
    expect(spikePitPlatform?.borders?.top).toBe('spikes');
    expect(pitBackdrop?.width).toBeDefined();
    // The pit is empty world space, so its backdrop must use the same color
    // as the level background instead of looking like a separate dark panel.
    expect(pitBackdrop?.color).toBe(level.world.backgroundColor);
    // Keep the backdrop behind terrain borders so visible spike teeth remain on top.
    expect(pitBackdrop?.depth).toBeLessThan(0.3);
    expect(greenEnemy!.y + greenEnemy!.radius).toBe(platform!.y);
    expect(greenEnemy!.x + greenEnemy!.radius).toBe(platform!.x! + platform!.width!);
    // Pit ambience must not use isolated green circles: they look like stray slime particles.
    expect(pitGlowDecorations).toHaveLength(0);
  });
});
