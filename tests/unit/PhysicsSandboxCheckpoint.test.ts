import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LevelValidator } from '../../src/level/LevelValidator';
import type { LevelDefinition } from '../../src/level/LevelTypes';

describe('Physics Sandbox checkpoint', () => {
  it('places the respawn checkpoint just after the spike wall and before the lever and moving-platform pit', () => {
    const path = resolve(process.cwd(), 'public/levels/physics-sandbox.json');
    const level = JSON.parse(readFileSync(path, 'utf8')) as LevelDefinition;
    const validated = new LevelValidator().validate(level);
    const checkpoint = validated.triggers.find((trigger) => trigger.id === 'sandbox-checkpoint-switch-approach');
    const spikeWall = validated.solids.find((solid) => solid.id === 'sandbox-spike-finish-wall');
    const approachDeck = validated.solids.find((solid) => solid.id === 'sandbox-vomit-landing');
    const switchMechanism = validated.platformSwitches?.find((item) => item.id === 'sandbox-rocket-bridge-switch');
    const goal = validated.triggers.find((trigger) => trigger.id === 'sandbox-goal');

    expect(checkpoint).toMatchObject({
      type: 'checkpoint',
      x: 7005,
      y: 748,
      width: 70,
      height: 132,
      respawnX: 7130,
      respawnY: 862,
    });
    expect(checkpoint).toBeDefined();
    expect(spikeWall?.type).toBe('box');
    expect(approachDeck?.type).toBe('box');
    expect(switchMechanism).toBeDefined();
    expect(goal).toBeDefined();

    if (spikeWall?.type !== 'box' || approachDeck?.type !== 'box' || !checkpoint || !switchMechanism) {
      throw new Error('Expected sandbox checkpoint, spike wall, approach deck and lever mechanism');
    }
    expect(checkpoint.x).toBeGreaterThan(spikeWall.x + spikeWall.width);
    expect(checkpoint.x).toBeLessThan(switchMechanism.lever.x);
    expect(checkpoint.respawnX).toBeLessThan(switchMechanism.lever.x);
    expect(checkpoint.respawnX).toBeGreaterThanOrEqual(approachDeck.x);
    expect(checkpoint.respawnX).toBeLessThan(approachDeck.x + approachDeck.width);
    expect(checkpoint.respawnY).toBe(approachDeck.y - 18);
    expect(checkpoint.x).toBeLessThan(goal!.x);
  });
});
