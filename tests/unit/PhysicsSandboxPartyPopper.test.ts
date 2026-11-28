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

    expect(level.poopPickups?.find((item) => item.id === 'sandbox-poop-boost_small')?.message).toBe('УПС!');
    expect(level.poopPickups?.find((item) => item.id === 'sandbox-poop-boost_small_2')?.message).toBeUndefined();

    expect(level.partyPoppers).toHaveLength(3);
    expect(level.partyPoppers?.find((item) => item.id === 'sandbox-party-popper-a')?.message).toBe('ПУФ!');
    expect(level.partyPoppers?.find((item) => item.id === 'sandbox-party-popper-b')?.message).toBeUndefined();
    expect(level.partyPoppers?.find((item) => item.id === 'sandbox-party-popper-c')?.message).toBeUndefined();

    for (const [id, floorId] of [
      ['sandbox-party-popper-b', 'sandbox-floor-c'],
      ['sandbox-party-popper-c', 'sandbox-floor-d'],
    ] as const) {
      const extraPopper = level.partyPoppers?.find((item) => item.id === id);
      const floor = level.solids.find((solid) => solid.id === floorId);
      if (!extraPopper || floor?.type !== 'box') throw new Error(`Expected ${id} and ${floorId}`);
      expect(extraPopper.y + extraPopper.radius).toBe(floor.y);
      expect(extraPopper.x).toBeGreaterThan(floor.x);
      expect(extraPopper.x).toBeLessThan(floor.x + floor.width);
    }
  });
});
