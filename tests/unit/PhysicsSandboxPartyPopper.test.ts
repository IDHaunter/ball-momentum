import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LevelValidator } from '../../src/level/LevelValidator';
import type { LevelDefinition } from '../../src/level/LevelTypes';

describe('Physics Sandbox party popper', () => {
  it('places a test popper on the opening floor with editable launch settings', () => {
    const path = resolve(process.cwd(), 'public/levels/physics-sandbox.json');
    const raw = JSON.parse(readFileSync(path, 'utf8')) as LevelDefinition;
    const level = new LevelValidator().validate(raw);
    const popper = level.partyPoppers?.find((item) => item.id === 'sandbox-party-popper-a');
    const openingFloor = level.solids.find((solid) => solid.id === 'sandbox-floor-a');

    expect(popper).toMatchObject({
      x: 790, y: 681, radius: 19, upwardLaunchSpeed: 700, forwardBoost: 240,
    });
    expect(openingFloor?.type).toBe('box');
    if (!popper || openingFloor?.type !== 'box') throw new Error('Expected sandbox popper and opening floor');
    expect(popper.y + popper.radius).toBe(openingFloor.y);
  });
});
