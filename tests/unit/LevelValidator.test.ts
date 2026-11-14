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

  it('formats schema issue paths without assuming path segments are only strings or numbers', () => {
    const invalid = { ...validLevel, world: { ...validLevel.world, width: 'wide' } };
    expect(() => validator.validate(invalid)).toThrow(/world\.width/);
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


  it('accepts valid box and polygon spring surface assignments', () => {
    const level = {
      ...validLevel,
      solids: [
        { ...validLevel.solids[0], springSurfaces: [{ side: 'top', impulse: 620 }, { side: 'left', impulse: 400 }] },
        { id: 'triangle', type: 'polygon', vertices: [[100, 100], [150, 40], [200, 100]], springSurfaces: [{ edge: 0, impulse: 560 }] },
      ],
    };
    expect(validator.validate(level).solids).toHaveLength(2);
  });

  it('rejects duplicate or out-of-range polygon spring edges', () => {
    const duplicate = {
      ...validLevel,
      solids: [{ ...validLevel.solids[0], springSurfaces: [{ side: 'top', impulse: 500 }, { side: 'top', impulse: 600 }] }],
    };
    expect(() => validator.validate(duplicate)).toThrow(/duplicate surface assignment/);
    const invalidEdge = {
      ...validLevel,
      solids: [{ id: 'triangle', type: 'polygon', vertices: [[0, 0], [100, 0], [50, 100]], springSurfaces: [{ edge: 3, impulse: 500 }] }],
    };
    expect(() => validator.validate(invalidEdge)).toThrow(/outside the polygon vertex range/);
  });

  it('accepts spring settings on glass but leaves their handling to the glass-specific rule', () => {
    const level = {
      ...validLevel,
      materials: { ...validLevel.materials, glass: { friction: 0.08, frictionStatic: 0.12, restitution: 0.34 } },
      solids: [{ ...validLevel.solids[0], material: 'glass', breakable: { thresholdEnergy: 1000 }, springSurfaces: [{ side: 'top', impulse: 900 }] }],
    };
    expect(validator.validate(level).solids[0].springSurfaces).toHaveLength(1);
  });

  it('requires breakable solids to use the glass material', () => {
    const invalid = {
      ...validLevel,
      solids: [{ ...validLevel.solids[0], breakable: { thresholdEnergy: 1000 } }],
    };
    expect(() => validator.validate(invalid)).toThrow(/must use material "glass"/);
  });

  it('accepts a movable box with positive mass and impact energy threshold', () => {
    const level = {
      ...validLevel,
      solids: [{ ...validLevel.solids[0], movable: { mass: 4, minimumImpactEnergy: 32_000 } }],
    };
    const validated = validator.validate(level);
    const solid = validated.solids[0];
    expect(solid.type).toBe('box');
    if (solid.type === 'box') expect(solid.movable?.mass).toBe(4);
  });

  it('rejects movable boxes with invalid mass or impact energy', () => {
    const zeroMass = {
      ...validLevel,
      solids: [{ ...validLevel.solids[0], movable: { mass: 0, minimumImpactEnergy: 32_000 } }],
    };
    const zeroEnergy = {
      ...validLevel,
      solids: [{ ...validLevel.solids[0], movable: { mass: 4, minimumImpactEnergy: 0 } }],
    };
    expect(() => validator.validate(zeroMass)).toThrow(/mass/);
    expect(() => validator.validate(zeroEnergy)).toThrow(/minimumImpactEnergy/);
  });

  it('rejects spring surfaces on movable boxes because the features are configured independently', () => {
    const level = {
      ...validLevel,
      solids: [{
        ...validLevel.solids[0],
        movable: { mass: 4, minimumImpactEnergy: 32_000 },
        springSurfaces: [{ side: 'top', impulse: 620 }],
      }],
    };
    expect(() => validator.validate(level)).toThrow(/movable boxes cannot also define spring surfaces/);
  });

  it('rejects a movable box configured as glass or breakable', () => {
    const glass = {
      ...validLevel,
      materials: { ...validLevel.materials, glass: { friction: 0.08, frictionStatic: 0.12, restitution: 0.34 } },
      solids: [{ ...validLevel.solids[0], material: 'glass', movable: { mass: 4, minimumImpactEnergy: 32_000 } }],
    };
    const both = {
      ...validLevel,
      materials: { ...validLevel.materials, glass: { friction: 0.08, frictionStatic: 0.12, restitution: 0.34 } },
      solids: [{ ...validLevel.solids[0], material: 'glass', breakable: { thresholdEnergy: 50_000 }, movable: { mass: 4, minimumImpactEnergy: 32_000 } }],
    };
    expect(() => validator.validate(glass)).toThrow(/cannot use the glass material/);
    expect(() => validator.validate(both)).toThrow(/cannot be both movable and breakable/);
  });

});
