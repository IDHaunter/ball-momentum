import { describe, expect, it } from 'vitest';
import { LevelValidator } from '../../src/level/LevelValidator';

const validLevel = {
  schemaVersion: 1, id: 'test', title: 'Test',
  world: { width: 1000, height: 800, killPlaneY: 750 },
  spawn: { x: 50, y: 100 },
  solids: [{ id: 'floor', type: 'box', x: 0, y: 200, width: 1000, height: 500, material: 'normal' }],
  triggers: [{ id: 'goal', type: 'goal', x: 900, y: 100, width: 50, height: 100 }],
  materials: { normal: { friction: 0.3, frictionStatic: 0.5, restitution: 0 } },
};

describe('LevelValidator', () => {
  const validator = new LevelValidator();
  it('accepts a valid level', () => expect(validator.validate(validLevel).id).toBe('test'));
  it('rejects duplicate IDs', () => {
    const invalid = { ...validLevel, triggers: [{ ...validLevel.triggers[0], id: 'floor' }] };
    expect(() => validator.validate(invalid)).toThrow(/duplicate ID/);
  });
  it('rejects unknown materials', () => {
    const invalid = { ...validLevel, solids: [{ ...validLevel.solids[0], material: 'missing' }] };
    expect(() => validator.validate(invalid)).toThrow(/unknown material/);
  });
  it('rejects concave polygons', () => {
    const invalid = {
      ...validLevel,
      solids: [{ id: 'bad', type: 'polygon', vertices: [[0, 0], [100, 0], [30, 30], [100, 100], [0, 100]] }],
    };
    expect(() => validator.validate(invalid)).toThrow(/must be convex/);
  });
  it('requires a goal trigger', () => expect(() => validator.validate({ ...validLevel, triggers: [] })).toThrow(/goal trigger/));

  it('accepts breakable glass with a positive energy threshold', () => {
    const level = {
      ...validLevel,
      materials: { ...validLevel.materials, glass: { friction: 0.08, frictionStatic: 0.12, restitution: 0.34 } },
      solids: [{ ...validLevel.solids[0], material: 'glass', breakable: { thresholdEnergy: 120000, velocityRetention: 0.72 } }],
    };
    expect(validator.validate(level).solids[0].breakable?.thresholdEnergy).toBe(120000);
  });

  it('rejects a breakable solid with a non-positive energy threshold', () => {
    const level = {
      ...validLevel,
      solids: [{ ...validLevel.solids[0], breakable: { thresholdEnergy: 0 } }],
    };
    expect(() => validator.validate(level)).toThrow(/thresholdEnergy/);
  });


  it('requires breakable solids to use the glass material', () => {
    const invalid = {
      ...validLevel,
      solids: [{ ...validLevel.solids[0], breakable: { thresholdEnergy: 1000 } }],
    };
    expect(() => validator.validate(invalid)).toThrow(/must use material "glass"/);
  });

});
