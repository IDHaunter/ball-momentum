import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('Physics sandbox background', () => {
  it('keeps the moving-platform pit transparent to the standard level background', () => {
    const path = resolve(process.cwd(), 'public/levels/physics-sandbox.json');
    const level = JSON.parse(readFileSync(path, 'utf8')) as {
      world: { backgroundColor?: string };
      decorations?: { id: string; type: string; color?: string }[];
    };

    expect(level.world.backgroundColor).toBe('#18212f');
    expect(level.decorations?.some((item) => item.id === 'sandbox-switch-pit-backdrop')).toBe(false);
  });
});
