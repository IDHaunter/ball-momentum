import { describe, expect, it } from 'vitest';
import { MatterCollisionMapper, type CollisionPairLike, type PhysicsBodyMetadata } from '../../src/physics/MatterCollisionMapper';
import type { MatterBodyLike } from '../../src/physics/MatterPhysicsBody';
import type { Vector2 } from '../../src/physics/PhysicsTypes';

function body(x: number, y: number): MatterBodyLike {
  return { position: { x, y }, velocity: { x: 0, y: 0 }, angle: 0, angularVelocity: 0 };
}

describe('MatterCollisionMapper', () => {
  it('reports an upward support normal when the ball is bodyA on top of terrain', () => {
    const ball = body(100, 100);
    const terrain = body(100, 160);
    const metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [terrain, { kind: 'terrain', id: 'ground' }],
    ]);
    const mapper = new MatterCollisionMapper(metadata);
    const pair: CollisionPairLike = { bodyA: ball, bodyB: terrain, collision: { normal: { x: 0, y: -1 } } };

    expect(mapper.mapPair(pair, 'active')).toEqual([
      expect.objectContaining({ type: 'BALL_TERRAIN_CONTACT_ACTIVE', supportNormal: { x: 0, y: -1 } }),
    ]);
  });

  it('reports an upward support normal when the ball is bodyB on top of terrain', () => {
    const terrain = body(100, 160);
    const ball = body(100, 100);
    const metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [terrain, { kind: 'terrain', id: 'ground' }],
    ]);
    const mapper = new MatterCollisionMapper(metadata);
    const pair: CollisionPairLike = { bodyA: terrain, bodyB: ball, collision: { normal: { x: 0, y: 1 } } };

    expect(mapper.mapPair(pair, 'active')).toEqual([
      expect.objectContaining({ type: 'BALL_TERRAIN_CONTACT_ACTIVE', supportNormal: { x: 0, y: -1 } }),
    ]);
  });

  it('keeps an underside contact pointing downward', () => {
    const ball = body(100, 180);
    const ceiling = body(100, 120);
    const metadata = new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [ceiling, { kind: 'terrain', id: 'ceiling' }],
    ]);
    const mapper = new MatterCollisionMapper(metadata);
    const pair: CollisionPairLike = { bodyA: ball, bodyB: ceiling, collision: { normal: { x: 0, y: 1 } } };

    expect(mapper.mapPair(pair, 'active')).toEqual([
      expect.objectContaining({ type: 'BALL_TERRAIN_CONTACT_ACTIVE', supportNormal: { x: 0, y: 1 } }),
    ]);
  });
});


describe('MatterCollisionMapper movable support contacts', () => {
  it('reports an upward support contact when the ball lands on a movable block', () => {
    const ball = body(100, 100);
    const movable = body(100, 150);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball', mass: 1 }],
      [movable, { kind: 'movable', id: 'sandbox-movable-crate', mass: 4, minimumImpactEnergy: 32_000 }],
    ]));

    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: movable,
      collision: { normal: { x: 0, y: -1 } },
    }, 'start', { x: 140, y: 500 });

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'BALL_TERRAIN_CONTACT_STARTED',
        terrainId: 'sandbox-movable-crate',
        supportNormal: { x: 0, y: -1 },
      }),
    ]));
    expect(events.some((event) => event.type === 'BALL_MOVABLE_IMPACT')).toBe(false);
  });
});

describe('MatterCollisionMapper wall impacts', () => {
  it('captures an incoming horizontal impact and its contact point', () => {
    const ball = body(100, 100);
    ball.velocity = { x: 10, y: 2 };
    ball.circleRadius = 18;
    const wall = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [wall, { kind: 'terrain', id: 'right-wall' }],
    ]));
    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: wall,
      collision: { normal: { x: -1, y: 0 }, supports: [{ x: 118, y: 95 }, { x: 118, y: 105 }, { x: 999, y: 999 }], supportCount: 2 },
    }, 'start');

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'BALL_WALL_IMPACT',
        terrainId: 'right-wall',
        normal: { x: -1, y: 0 },
        incomingVelocity: { x: 600, y: 120 },
        contactPoint: { x: 118, y: 100 },
        impactSpeed: 600,
      }),
    ]));
  });

  it('maps the wall normal correctly when the ball is bodyB', () => {
    const wall = body(130, 100);
    const ball = body(100, 100);
    ball.velocity = { x: 8, y: 0 };
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [wall, { kind: 'terrain', id: 'right-wall' }],
      [ball, { kind: 'ball', id: 'ball' }],
    ]));
    const events = mapper.mapPair({ bodyA: wall, bodyB: ball, collision: { normal: { x: 1, y: 0 } } }, 'start');
    const impact = events.find((event) => event.type === 'BALL_WALL_IMPACT');

    expect(impact).toEqual(expect.objectContaining({
      type: 'BALL_WALL_IMPACT',
      normal: { x: -1, y: 0 },
      incomingVelocity: { x: 480, y: 0 },
      impactSpeed: 480,
    }));
  });

  it('does not create wall impacts for floor contacts or movement away from a wall', () => {
    const ball = body(100, 100);
    ball.velocity = { x: -5, y: 0 };
    const wall = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [wall, { kind: 'terrain', id: 'wall' }],
    ]));

    const movingAway = mapper.mapPair({ bodyA: ball, bodyB: wall, collision: { normal: { x: -1, y: 0 } } }, 'start');
    const floor = mapper.mapPair({ bodyA: ball, bodyB: wall, collision: { normal: { x: 0, y: -1 } } }, 'start');
    expect(movingAway.some((event) => event.type === 'BALL_WALL_IMPACT')).toBe(false);
    expect(floor.some((event) => event.type === 'BALL_WALL_IMPACT')).toBe(false);
  });


  it('detects a wall impact during an already-active contact using pre-step velocity', () => {
    const ball = body(100, 100);
    // Matter may have resolved the previous frame to nearly zero velocity.
    ball.velocity = { x: 0, y: 0 };
    const wall = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [wall, { kind: 'terrain', id: 'right-wall' }],
    ]));
    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: wall,
      collision: { normal: { x: -1, y: 0 }, depth: 3 },
    }, 'active', { x: 55, y: 0 });

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'BALL_WALL_IMPACT',
        incomingVelocity: { x: 55, y: 0 },
        impactSpeed: 55,
        penetrationDepth: 3,
      }),
    ]));
  });


  it('reports normal impact speed for an angled polygon surface', () => {
    const ball = body(100, 100);
    const ramp = body(130, 130);
    ball.velocity = { x: 8, y: 0 };
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [ramp, { kind: 'terrain', id: 'glass-ramp', breakable: true }],
    ]));
    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: ramp,
      collision: { normal: { x: -Math.SQRT1_2, y: -Math.SQRT1_2 }, supports: [{ x: 116, y: 116 }], supportCount: 1 },
    }, 'start');
    const impact = events.find((event) => event.type === 'BALL_TERRAIN_IMPACT');
    expect(impact?.type).toBe('BALL_TERRAIN_IMPACT');
    if (impact?.type === 'BALL_TERRAIN_IMPACT') {
      expect(impact.terrainId).toBe('glass-ramp');
      expect(impact.impactSpeed).toBeCloseTo(8 * Math.SQRT1_2 * 60, 5);
    }
  });

});


describe('MatterCollisionMapper spring surfaces', () => {
  it('emits a spring impact for a newly acquired top contact while rolling tangentially', () => {
    const ball = body(100, 100);
    const floor = body(100, 160);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [floor, {
        kind: 'terrain', id: 'spring-floor',
        springSurfaces: [{ id: 'spring-floor:spring:top', normal: { x: 0, y: -1 }, impulse: 640 }],
      }],
    ]));

    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: floor,
      collision: { normal: { x: 0, y: -1 }, supports: [{ x: 100, y: 118 }], supportCount: 1 },
    }, 'start', { x: 360, y: 0 });

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'BALL_SPRING_IMPACT', terrainId: 'spring-floor',
        surfaceId: 'spring-floor:spring:top', normal: { x: 0, y: -1 }, impulse: 640,
      }),
    ]));
  });

  it('matches the spring face by its normal when the ball is bodyB', () => {
    const wall = body(130, 100);
    const ball = body(100, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [wall, { kind: 'terrain', id: 'spring-wall', springSurfaces: [{ id: 'spring-wall:left', normal: { x: -1, y: 0 }, impulse: 480 }] }],
      [ball, { kind: 'ball', id: 'ball' }],
    ]));

    const events = mapper.mapPair({
      bodyA: wall,
      bodyB: ball,
      collision: { normal: { x: 1, y: 0 }, supports: [{ x: 118, y: 100 }], supportCount: 1 },
    }, 'start', { x: 240, y: 0 });

    expect(events.some((event) => event.type === 'BALL_SPRING_IMPACT')).toBe(true);
    expect(events.some((event) => event.type === 'BALL_WALL_IMPACT')).toBe(false);
  });

  it('does not retrigger during an active pair or when the ball is separating', () => {
    const ball = body(100, 100);
    const floor = body(100, 160);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [floor, { kind: 'terrain', id: 'spring-floor', springSurfaces: [{ id: 'top', normal: { x: 0, y: -1 }, impulse: 600 }] }],
    ]));
    const pair: CollisionPairLike = { bodyA: ball, bodyB: floor, collision: { normal: { x: 0, y: -1 } } };

    const active = mapper.mapPair(pair, 'active', { x: 100, y: 0 });
    const separating = mapper.mapPair(pair, 'start', { x: 0, y: -120 });
    expect(active.some((event) => event.type === 'BALL_SPRING_IMPACT')).toBe(false);
    expect(separating.some((event) => event.type === 'BALL_SPRING_IMPACT')).toBe(false);
  });
});


describe('MatterCollisionMapper collectible sensors', () => {
  it('emits a one-shot poop pickup trigger event on contact start', () => {
    const ball = body(100, 100);
    const pickup = body(120, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [pickup, { kind: 'trigger', id: 'poop-boost', triggerType: 'poop' }],
    ]));
    const pair: CollisionPairLike = { bodyA: ball, bodyB: pickup, collision: { normal: { x: 1, y: 0 } } };

    expect(mapper.mapPair(pair, 'start')).toEqual([
      { type: 'BALL_ENTERED_TRIGGER', triggerId: 'poop-boost', triggerType: 'poop' },
    ]);
    expect(mapper.mapPair(pair, 'active')).toEqual([]);
  });
});

describe('MatterCollisionMapper movable blocks', () => {
  function createMapper(ball: MatterBodyLike, block: MatterBodyLike) {
    return new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball', mass: 1 }],
      [block, { kind: 'movable', id: 'push-crate', mass: 4, minimumImpactEnergy: 20_000 }],
    ]));
  }

  it('releases a movable block on a sufficiently energetic side impact', () => {
    const ball = body(100, 100);
    const block = body(140, 100);
    const mapper = createMapper(ball, block);
    const events = mapper.mapPair({
      bodyA: ball,
      bodyB: block,
      collision: { normal: { x: 1, y: 0 } },
    }, 'start', { x: 250, y: 0 });

    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'BALL_MOVABLE_IMPACT',
        movableId: 'push-crate',
        normal: { x: -1, y: 0 },
        normalImpactSpeed: 250,
        impactEnergy: 31_250,
        ballMass: 1,
      }),
    ]));
    expect(events.some((event) => event.type === 'BALL_WALL_IMPACT')).toBe(false);
  });

  it('does not release a block on a low-energy side impact', () => {
    const ball = body(100, 100);
    const block = body(140, 100);
    const events = createMapper(ball, block).mapPair({
      bodyA: ball,
      bodyB: block,
      collision: { normal: { x: 1, y: 0 } },
    }, 'start', { x: 100, y: 0 });

    expect(events.some((event) => event.type === 'BALL_MOVABLE_IMPACT')).toBe(false);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'BALL_WALL_IMPACT', terrainId: 'push-crate' }),
    ]));
  });

  it('keeps a block fixed when the ball lands on its top surface', () => {
    const ball = body(100, 100);
    const block = body(100, 160);
    const events = createMapper(ball, block).mapPair({
      bodyA: ball,
      bodyB: block,
      collision: { normal: { x: 0, y: 1 } },
    }, 'start', { x: 0, y: 500 });

    expect(events.some((event) => event.type === 'BALL_MOVABLE_IMPACT')).toBe(false);
    expect(events.some((event) => event.type === 'BALL_WALL_IMPACT')).toBe(false);
    expect(events).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: 'BALL_TERRAIN_CONTACT_STARTED', terrainId: 'push-crate', supportNormal: { x: 0, y: -1 } }),
    ]));
  });
});


describe('MatterCollisionMapper enemy poop pickups', () => {
  it('reports a one-time bot trigger entry for poop sensors in either body order', () => {
    const bot = body(120, 100);
    const poop = body(120, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [bot, { kind: 'bot', id: 'enemy-runner' }],
      [poop, { kind: 'trigger', id: 'poop-boost', triggerType: 'poop' }],
    ]));

    const expected = [{
      type: 'BOT_ENTERED_TRIGGER', botId: 'enemy-runner', triggerId: 'poop-boost', triggerType: 'poop',
    }];
    expect(mapper.mapPair({ bodyA: bot, bodyB: poop, collision: { normal: { x: 1, y: 0 } } }, 'start')).toEqual(expected);
    expect(mapper.mapPair({ bodyA: poop, bodyB: bot, collision: { normal: { x: -1, y: 0 } } }, 'start')).toEqual(expected);
    expect(mapper.mapPair({ bodyA: bot, bodyB: poop, collision: { normal: { x: 1, y: 0 } } }, 'active')).toEqual([]);
    expect(mapper.mapPair({ bodyA: bot, bodyB: poop, collision: { normal: { x: 1, y: 0 } } }, 'end')).toEqual([]);
  });

  it('does not treat ordinary triggers as enemy speed pickups', () => {
    const bot = body(120, 100);
    const checkpoint = body(120, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [bot, { kind: 'bot', id: 'enemy-runner' }],
      [checkpoint, { kind: 'trigger', id: 'checkpoint-a', triggerType: 'checkpoint' }],
    ]));

    expect(mapper.mapPair({ bodyA: bot, bodyB: checkpoint, collision: { normal: { x: 1, y: 0 } } }, 'start')).toEqual([]);
  });
});


describe('MatterCollisionMapper raised spikes', () => {
  it('kills the player only when the raised spike sensor is contacted', () => {
    const ball = body(80, 90);
    const spike = body(80, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball', mass: 1 }],
      [spike, { kind: 'spike', id: 'floor:spike:top:2', spikeParentId: 'floor' }],
    ]));

    expect(mapper.mapPair({ bodyA: ball, bodyB: spike, collision: { normal: { x: 0, y: -1 } } }, 'start')).toEqual([
      expect.objectContaining({
        type: 'SPIKE_ENTITY_HIT', entityKind: 'player', entityId: 'ball',
        spikeId: 'floor:spike:top:2', position: { x: 80, y: 90 },
      }),
    ]);
    expect(mapper.mapPair({ bodyA: ball, bodyB: spike, collision: { normal: { x: 0, y: -1 } } }, 'active')).toEqual([]);
  });

  it('maps enemy contacts to removal events rather than player respawns', () => {
    const bot = body(140, 80);
    const spike = body(140, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [bot, { kind: 'bot', id: 'patrol-bot', mass: 1.2 }],
      [spike, { kind: 'spike', id: 'wall:spike:left:1', spikeParentId: 'wall' }],
    ]));
    const event = mapper.mapPair({ bodyA: spike, bodyB: bot, collision: { normal: { x: 1, y: 0 } } }, 'start')[0];
    expect(event).toEqual(expect.objectContaining({ type: 'SPIKE_ENTITY_HIT', entityKind: 'bot', entityId: 'patrol-bot' }));
  });

  it.each([
    ['bird', 'nest-guardian', 'bird'],
    ['vomitEnemy', 'green-gremlin', 'vomitEnemy'],
  ] as const)('maps %s spike contact to the correct enemy removal kind', (metadataKind: 'bird' | 'vomitEnemy', id: string, eventKind: 'bird' | 'vomitEnemy') => {
    const enemy = body(140, 80);
    const spike = body(140, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [enemy, { kind: metadataKind, id }],
      [spike, { kind: 'spike', id: 'wall:spike:left:1', spikeParentId: 'wall' }],
    ]));
    const event = mapper.mapPair({ bodyA: enemy, bodyB: spike, collision: { normal: { x: 1, y: 0 } } }, 'start')[0];
    expect(event).toEqual(expect.objectContaining({ type: 'SPIKE_ENTITY_HIT', entityKind: eventKind, entityId: id }));
  });
});

describe('MatterCollisionMapper player and patrol bot impacts', () => {
  it('emits a single impact event with relative pre-step speed and contact point', () => {
    const ball = body(100, 100);
    const bot = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball', mass: 1 }],
      [bot, { kind: 'bot', id: 'patrol-bot', mass: 1.2 }],
    ]));
    const preStepVelocities = new Map<MatterBodyLike, Vector2>([
      [ball, { x: 240, y: 12 }],
      [bot, { x: -20, y: 0 }],
    ]);

    const events = mapper.mapPair({
      bodyA: bot,
      bodyB: ball,
      collision: {
        normal: { x: 1, y: 0 },
        supports: [{ x: 115, y: 96 }, { x: 115, y: 104 }],
        supportCount: 2,
      },
    }, 'start', null, preStepVelocities);

    expect(events).toEqual([{
      type: 'BALL_BOT_IMPACT',
      botId: 'patrol-bot',
      normal: { x: -1, y: 0 },
      contactPoint: { x: 115, y: 100 },
      impactSpeed: 260,
    }]);
  });

  it('does not repeat the visual impact event during a sustained contact', () => {
    const ball = body(100, 100);
    const bot = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball' }],
      [bot, { kind: 'bot', id: 'patrol-bot' }],
    ]));
    const pair = { bodyA: ball, bodyB: bot, collision: { normal: { x: -1, y: 0 } } };

    expect(mapper.mapPair(pair, 'start', { x: 240, y: 0 })[0]?.type).toBe('BALL_BOT_IMPACT');
    expect(mapper.mapPair(pair, 'active', { x: 240, y: 0 })).toEqual([]);
  });
});

describe('MatterCollisionMapper impacts from other enemy characters', () => {
  it.each([
    ['bird', 'nest-guardian'],
    ['vomitEnemy', 'green-gremlin'],
  ] as const)('emits a thresholdable player impact when colliding with %s', (kind: 'bird' | 'vomitEnemy', id: string) => {
    const ball = body(100, 100);
    const enemy = body(130, 100);
    const mapper = new MatterCollisionMapper(new Map<MatterBodyLike, PhysicsBodyMetadata>([
      [ball, { kind: 'ball', id: 'ball', mass: 1 }],
      [enemy, { kind, id, mass: 1.2 }],
    ]));

    const events = mapper.mapPair({
      bodyA: enemy,
      bodyB: ball,
      collision: { normal: { x: 1, y: 0 }, supports: [{ x: 115, y: 100 }], supportCount: 1 },
    }, 'start', null, new Map<MatterBodyLike, Vector2>([
      [ball, { x: 300, y: 0 }],
      [enemy, { x: -30, y: 0 }],
    ]));

    expect(events).toEqual([{
      type: 'BALL_ENEMY_IMPACT',
      enemyKind: kind,
      enemyId: id,
      normal: { x: -1, y: 0 },
      contactPoint: { x: 115, y: 100 },
      impactSpeed: 330,
    }]);
    expect(mapper.mapPair({
      bodyA: enemy,
      bodyB: ball,
      collision: { normal: { x: 1, y: 0 } },
    }, 'active', { x: 300, y: 0 })).toEqual([]);
  });
});

