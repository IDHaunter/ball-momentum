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

  it('accepts Liberty statues as level objectives and validates their placement', () => {
    const level = {
      ...validLevel,
      statues: [
        { id: 'statue-a', x: 250, y: 300 },
        { id: 'statue-b', x: 500, y: 300 },
      ],
    };
    expect(validator.validate(level).statues).toHaveLength(2);
    expect(() => validator.validate({ ...level, statues: [{ ...level.statues[0], x: 10 }] }))
      .toThrow(/complete silhouette/);
    expect(() => validator.validate({ ...level, statues: [{ ...level.statues[0], id: 'floor' }] }))
      .toThrow(/duplicate ID/);
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

  it('accepts raised lethal spike borders on box sides and polygon edges', () => {
    const level = {
      ...validLevel,
      solids: [
        { ...validLevel.solids[0], borders: { top: 'spikes', right: 'none', bottom: 'none', left: 'none' } },
        { id: 'spike-wall', type: 'polygon', vertices: [[300, 200], [360, 150], [400, 220]], borders: [
          { edge: 0, style: 'spikes' }, { edge: 1, style: 'none' }, { edge: 2, style: 'none' },
        ] },
      ],
    };
    const validated = validator.validate(level);
    const box = validated.solids[0];
    const polygon = validated.solids[1];
    if (box.type !== 'box' || polygon.type !== 'polygon') throw new Error('Expected a box and a polygon');
    expect(box.borders?.top).toBe('spikes');
    expect(polygon.borders?.[0].style).toBe('spikes');
  });

  it('accepts the glass border style without changing the physical glass material', () => {
    const level = {
      ...validLevel,
      materials: { ...validLevel.materials, glass: { friction: 0.08, frictionStatic: 0.12, restitution: 0.34 } },
      solids: [
        { ...validLevel.solids[0], material: 'glass', borders: { top: 'glass', right: 'glass', bottom: 'none', left: 'glass' } },
        { id: 'glass-triangle', type: 'polygon', vertices: [[200, 200], [250, 150], [300, 200]], borders: [
          { edge: 0, style: 'glass' }, { edge: 1, style: 'glass' }, { edge: 2, style: 'none' },
        ] },
      ],
    };

    const validated = validator.validate(level);
    const box = validated.solids[0];
    const polygon = validated.solids[1];
    if (box.type !== 'box' || polygon.type !== 'polygon') throw new Error('Expected a box and a polygon');
    expect(box.borders?.top).toBe('glass');
    expect(polygon.borders?.[0].style).toBe('glass');
    expect(validated.materials?.glass).toEqual({ friction: 0.08, frictionStatic: 0.12, restitution: 0.34 });
  });

  it('accepts configurable poop pickups that boost linear speed and spin', () => {
    const level = {
      ...validLevel,
      poopPickups: [{
        id: 'poop-boost', x: 420, y: 180, radius: 18,
        speedBoostPercent: 25, spinBoostPercent: 45,
      }],
    };
    expect(validator.validate(level).poopPickups?.[0]).toMatchObject({
      id: 'poop-boost', speedBoostPercent: 25, spinBoostPercent: 45, radius: 18,
    });
  });

  it('rejects poop pickups with invalid percentages, out-of-bounds positions or duplicate IDs', () => {
    const basePickup = { id: 'poop-boost', x: 420, y: 180, radius: 18, speedBoostPercent: 25, spinBoostPercent: 45 };
    expect(() => validator.validate({ ...validLevel, poopPickups: [{ ...basePickup, speedBoostPercent: -1 }] })).toThrow(/speedBoostPercent/);
    expect(() => validator.validate({ ...validLevel, poopPickups: [{ ...basePickup, spinBoostPercent: 301 }] })).toThrow(/spinBoostPercent/);
    expect(() => validator.validate({ ...validLevel, poopPickups: [{ ...basePickup, x: 5 }] })).toThrow(/pickup circle must be inside world bounds/);
    expect(() => validator.validate({ ...validLevel, poopPickups: [{ ...basePickup, id: 'floor' }] })).toThrow(/duplicate ID/);
  });

  it('accepts a pushable vomit enemy with configurable detection and pulse timing', () => {
    const level = {
      ...validLevel,
      vomitEnemies: [{
        id: 'green-gremlin', x: 620, y: 170, radius: 24, mass: 1.2,
        detectionRadius: 220, pulseImpulse: 190, pulseIntervalSeconds: 0.9,
        restitution: 0.18, friction: 0.62,
      }],
    };
    expect(validator.validate(level).vomitEnemies?.[0]).toMatchObject({
      id: 'green-gremlin', radius: 24, detectionRadius: 220, pulseImpulse: 190, pulseIntervalSeconds: 0.9,
    });
  });

  it('rejects vomit enemies with invalid radius, impulse interval, bounds or duplicate identifiers', () => {
    const baseEnemy = {
      id: 'green-gremlin', x: 620, y: 170, radius: 24, mass: 1.2,
      detectionRadius: 220, pulseImpulse: 190, pulseIntervalSeconds: 0.9,
    };
    expect(() => validator.validate({ ...validLevel, vomitEnemies: [{ ...baseEnemy, pulseIntervalSeconds: 0.1 }] })).toThrow(/pulseIntervalSeconds/);
    expect(() => validator.validate({ ...validLevel, vomitEnemies: [{ ...baseEnemy, pulseImpulse: 4000 }] })).toThrow(/pulseImpulse/);
    expect(() => validator.validate({ ...validLevel, vomitEnemies: [{ ...baseEnemy, x: 990 }] })).toThrow(/enemy circle must be inside world bounds/);
    expect(() => validator.validate({ ...validLevel, vomitEnemies: [{ ...baseEnemy, id: 'floor' }] })).toThrow(/duplicate ID/);
  });

  it('accepts configurable passive rolling stones and the future snowball appearance', () => {
    const level = {
      ...validLevel,
      rollingObjects: [
        { id: 'stone-a', x: 420, y: 160, radius: 38, mass: 7.5, appearance: 'stone', friction: 0.56, restitution: 0.08 },
        { id: 'snowball-a', x: 620, y: 160, radius: 28, mass: 4, appearance: 'snow' },
      ],
    };
    const validated = validator.validate(level);
    expect(validated.rollingObjects?.map((item) => item.appearance)).toEqual(['stone', 'snow']);
  });

  it('rejects rolling objects outside the world, with invalid dimensions, or duplicate IDs', () => {
    const rolling = { id: 'stone-a', x: 420, y: 160, radius: 38, mass: 7.5, appearance: 'stone' };
    expect(() => validator.validate({ ...validLevel, rollingObjects: [{ ...rolling, x: 990 }] })).toThrow(/rolling object circle must be inside world bounds/);
    expect(() => validator.validate({ ...validLevel, rollingObjects: [{ ...rolling, radius: 8 }] })).toThrow(/radius/);
    expect(() => validator.validate({ ...validLevel, rollingObjects: [{ ...rolling, id: 'floor' }] })).toThrow(/duplicate ID/);
  });

  it('accepts a valid timed bomb with an energy-based blast configuration', () => {
    const level = {
      ...validLevel,
      bombs: [{
        id: 'bomb-1', x: 500, y: 180, radius: 18, mass: 1.5,
        fuseSeconds: 3, explosionRadius: 320, explosionEnergy: 250000,
      }],
    };
    expect(validator.validate(level).bombs?.[0].fuseSeconds).toBe(3);
  });

  it('rejects bombs outside the world and invalid blast radii', () => {
    const outside = {
      ...validLevel,
      bombs: [{ id: 'bomb-1', x: 995, y: 180, radius: 18, mass: 1, fuseSeconds: 3, explosionRadius: 300, explosionEnergy: 10000 }],
    };
    expect(() => validator.validate(outside)).toThrow(/bomb circle must be inside world bounds/);
    const invalidRadius = {
      ...validLevel,
      bombs: [{ id: 'bomb-1', x: 500, y: 180, radius: 18, mass: 1, fuseSeconds: 3, explosionRadius: 18, explosionEnergy: 10000 }],
    };
    expect(() => validator.validate(invalidRadius)).toThrow(/explosionRadius/);
  });

  it('rejects duplicate bomb identifiers', () => {
    const duplicate = {
      ...validLevel,
      bombs: [{ id: 'floor', x: 500, y: 180, radius: 18, mass: 1, fuseSeconds: 3, explosionRadius: 300, explosionEnergy: 10000 }],
    };
    expect(() => validator.validate(duplicate)).toThrow(/duplicate ID/);
  });

  it('accepts a paired lever and moving platform with a configurable route', () => {
    const level = {
      ...validLevel,
      platformSwitches: [{
        id: 'rocket-bridge',
        lever: { x: 420, y: 200, height: 56, minimumImpactSpeed: 240, initialState: 'off' },
        platform: { width: 160, surface: 'metal', speed: 140, points: [{ x: 500, y: 500 }, { x: 700, y: 500 }] },
      }],
    };
    expect(validator.validate(level).platformSwitches?.[0]).toMatchObject({
      id: 'rocket-bridge', lever: { height: 56, minimumImpactSpeed: 240, initialState: 'off' },
      platform: { width: 160, surface: 'metal', speed: 140 },
    });
  });

  it('rejects a lever whose configured physical body would leave world bounds', () => {
    const mechanism = {
      id: 'edge-lever',
      lever: { x: 12, y: 200, height: 72, minimumImpactSpeed: 240 },
      platform: { width: 160, surface: 'glass', speed: 140, points: [{ x: 500, y: 500 }, { x: 700, y: 500 }] },
    };
    expect(() => validator.validate({ ...validLevel, platformSwitches: [mechanism] }))
      .toThrow(/complete lever must stay inside world bounds/);
  });

  it('rejects platform routes that exceed world bounds and duplicate mechanism IDs', () => {
    const base = {
      id: 'rocket-bridge',
      lever: { x: 420, y: 200, minimumImpactSpeed: 240 },
      platform: { width: 160, surface: 'glass', speed: 140, points: [{ x: 500, y: 500 }, { x: 700, y: 500 }] },
    };
    expect(() => validator.validate({ ...validLevel, platformSwitches: [{ ...base, platform: { ...base.platform, points: [{ x: 500, y: 500 }, { x: 980, y: 500 }] } }] })).toThrow(/platform must stay inside world bounds/);
    expect(() => validator.validate({ ...validLevel, platformSwitches: [base, base] })).toThrow(/duplicate ID/);
  });

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

  it('accepts configured autonomous bots with mass, speed, direction, and patrol bounds', () => {
    const level = {
      ...validLevel,
      bots: [{
        id: 'patrol-bot', x: 300, y: 184, radius: 16, mass: 1.2, speed: 140,
        direction: -1 as const, restitution: 0.82, friction: 0.015,
        patrolRange: { minX: 200, maxX: 500 },
      }],
    };
    const validated = validator.validate(level);
    expect(validated.bots?.[0]).toMatchObject({ id: 'patrol-bot', mass: 1.2, speed: 140, direction: -1 });
  });

  it('accepts flying birds with a patrol interval, guard radius, mass, and attack impulse', () => {
    const level = {
      ...validLevel,
      birds: [{
        id: 'nest-guardian', x: 500, y: 180, radius: 18, mass: 1.35,
        patrolSpeed: 95, attackSpeed: 260, aggressive: true, detectionRadius: 135, attackImpulse: 150,
        direction: -1 as const, patrolRange: { minX: 350, maxX: 650 },
      }],
    };
    expect(validator.validate(level).birds?.[0]).toMatchObject({
      id: 'nest-guardian', mass: 1.35, patrolSpeed: 95, attackSpeed: 260,
      aggressive: true, detectionRadius: 135, attackImpulse: 150, direction: -1,
      patrolRange: { minX: 350, maxX: 650 },
    });
  });

  it('rejects birds outside world bounds, outside their patrol interval, or with invalid detection settings', () => {
    const bird = {
      id: 'nest-guardian', x: 500, y: 180, radius: 18, mass: 1.35,
      patrolSpeed: 95, attackSpeed: 260, aggressive: true, detectionRadius: 135, attackImpulse: 150,
      patrolRange: { minX: 350, maxX: 650 },
    };
    expect(() => validator.validate({ ...validLevel, birds: [{ ...bird, x: 900 }] })).toThrow(/starting position must be inside patrolRange/);
    expect(() => validator.validate({ ...validLevel, birds: [{ ...bird, detectionRadius: 0 }] })).toThrow(/detectionRadius/);
    expect(() => validator.validate({ ...validLevel, birds: [{ ...bird, patrolRange: { minX: 495, maxX: 505 } }] })).toThrow(/range must be at least the bird diameter/);
    expect(() => validator.validate({ ...validLevel, birds: [{ ...bird, id: 'floor' }] })).toThrow(/duplicate ID/);
  });

  it('rejects bots outside world bounds and invalid patrol ranges', () => {
    const outside = { ...validLevel, bots: [{ id: 'outside', x: 990, y: 184, radius: 16, mass: 1, speed: 100 }] };
    const invalidRange = {
      ...validLevel,
      bots: [{ id: 'bad-range', x: 300, y: 184, radius: 16, mass: 1, speed: 100, patrolRange: { minX: 290, maxX: 310 } }],
    };
    expect(() => validator.validate(outside)).toThrow(/bot circle must be inside world bounds/);
    expect(() => validator.validate(invalidRange)).toThrow(/range must be at least the bot diameter/);
  });

  it('requires bot IDs to be unique across the level', () => {
    const duplicate = { ...validLevel, bots: [{ id: 'floor', x: 300, y: 184, radius: 16, mass: 1, speed: 100 }] };
    expect(() => validator.validate(duplicate)).toThrow(/duplicate ID/);
  });

});

describe('surface textures', () => {
  const validator = new LevelValidator();

  it('accepts named patterns and per-solid texture overrides', () => {
    const level = {
      ...validLevel,
      solids: [
        { ...validLevel.solids[0], texture: 'stone-fragments' },
        {
          id: 'ice-slope', type: 'polygon',
          vertices: [[100, 100], [180, 40], [260, 100]],
          texture: { pattern: 'ice-strata', density: 1.4, opacity: 0.62, seed: 17 },
        },
      ],
    };
    const validated = validator.validate(level);
    expect(validated.solids[0].texture).toBe('stone-fragments');
    expect(validated.solids[1].texture).toMatchObject({ pattern: 'ice-strata', density: 1.4, opacity: 0.62, seed: 17 });
  });

  it('rejects retired texture IDs instead of silently aliasing them', () => {
    const retiredPatterns = [
      'ice-crystals', 'stone-masonry', 'ice-facets', 'asphalt-masonry',
      'asphalt-pavers', 'metal-polish', 'rubber-dots', 'rubber-chevrons',
    ];
    for (const pattern of retiredPatterns) {
      const invalid = { ...validLevel, solids: [{ ...validLevel.solids[0], texture: pattern }] };
      expect(() => validator.validate(invalid)).toThrow(/texture/);
    }
    const invalidBorder = { ...validLevel, solids: [{ ...validLevel.solids[0], borders: { top: 'asphalt' } }] };
    expect(() => validator.validate(invalidBorder)).toThrow(/borders/);
  });

  it('rejects unknown patterns and invalid texture tuning values', () => {
    const unknown = { ...validLevel, solids: [{ ...validLevel.solids[0], texture: 'lava-cracks' }] };
    const invalidDensity = { ...validLevel, solids: [{ ...validLevel.solids[0], texture: { pattern: 'stone-fragments', density: 5 } }] };
    const invalidOpacity = { ...validLevel, solids: [{ ...validLevel.solids[0], texture: { pattern: 'stone-fragments', opacity: 0 } }] };
    expect(() => validator.validate(unknown)).toThrow(/texture/);
    expect(() => validator.validate(invalidDensity)).toThrow(/density/);
    expect(() => validator.validate(invalidOpacity)).toThrow(/opacity/);
  });
  it('accepts custom box-side and polygon-edge border styles', () => {
    const custom = {
      ...validLevel,
      solids: [
        { id: 'box', type: 'box', x: 0, y: 200, width: 300, height: 100, borders: { top: 'pavers', right: 'metal', bottom: 'none', left: 'brick' } },
        { id: 'triangle', type: 'polygon', vertices: [[400, 300], [450, 200], [500, 300]], borders: [{ edge: 0, style: 'grass' }, { edge: 1, style: 'brick' }] },
      ],
    };
    const validated = validator.validate(custom);
    expect(validated.solids).toHaveLength(2);
    const box = validated.solids[0];
    const polygon = validated.solids[1];
    if (box.type !== 'box' || polygon.type !== 'polygon') throw new Error('Expected a box and polygon');
    expect(box.borders?.top).toBe('pavers');
    expect(box.borders?.left).toBe('brick');
    expect(polygon.borders?.[1].style).toBe('brick');
  });

  it('rejects duplicate polygon border assignments', () => {
    const invalid = {
      ...validLevel,
      solids: [{ id: 'triangle', type: 'polygon', vertices: [[100, 300], [150, 200], [200, 300]], borders: [
        { edge: 0, style: 'grass' }, { edge: 0, style: 'metal' },
      ] }],
    };
    expect(() => validator.validate(invalid)).toThrow(/borders: duplicate edge assignment/);
  });

  it('rejects polygon border edge indices outside the vertex range', () => {
    const invalid = {
      ...validLevel,
      solids: [{ id: 'triangle', type: 'polygon', vertices: [[100, 300], [150, 200], [200, 300]], borders: [
        { edge: 3, style: 'grass' },
      ] }],
    };
    expect(() => validator.validate(invalid)).toThrow(/edge 3 is outside the polygon vertex range/);
  });

});
