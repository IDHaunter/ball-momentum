import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PHYSICS_DEFAULTS } from '../../src/config/physics.defaults';

describe('Physics Sandbox patrol bots', () => {
  it('matches the player smiley size and rests on the patrol island', () => {
    const level = JSON.parse(readFileSync(resolve(process.cwd(), 'public/levels/physics-sandbox.json'), 'utf8')) as {
      solids: Array<{ id: string; y: number }>;
      bots?: Array<{ id: string; y: number; radius: number }>;
    };
    const island = level.solids.find((solid) => solid.id === 'sandbox-bot-island');
    const bots = level.bots ?? [];

    expect(island).toBeDefined();
    expect(bots).toHaveLength(2);
    for (const bot of bots) {
      expect(bot.radius).toBe(PHYSICS_DEFAULTS.ball.radiusPx);
      expect(bot.y + bot.radius).toBe(island!.y);
    }
  });
});
