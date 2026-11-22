import { z } from 'zod';
import { SURFACE_TEXTURE_NAMES } from './SurfaceTextureTypes';

const materialSchema = z.object({
  friction: z.number().min(0).max(1),
  frictionStatic: z.number().min(0).max(1),
  restitution: z.number().min(0).max(1),
});

const springImpulseSchema = z.number().finite().positive().max(3000);
const borderStyleSchema = z.enum(['default', 'none', 'grass', 'pavers', 'stone', 'metal', 'ice', 'glass', 'brick', 'wood', 'spikes']);
const boxBordersSchema = z.object({
  top: borderStyleSchema.optional(),
  right: borderStyleSchema.optional(),
  bottom: borderStyleSchema.optional(),
  left: borderStyleSchema.optional(),
});
const polygonBordersSchema = z.array(z.object({
  edge: z.number().int().nonnegative(),
  style: borderStyleSchema,
}));

const surfaceTextureNameSchema = z.enum(SURFACE_TEXTURE_NAMES);
const surfaceTextureSchema = z.union([
  surfaceTextureNameSchema,
  z.object({
    pattern: surfaceTextureNameSchema,
    density: z.number().finite().min(0.25).max(3).optional(),
    opacity: z.number().finite().min(0.05).max(1).optional(),
    seed: z.number().int().optional(),
  }),
]);

const boxSpringSurfaceSchema = z.object({
  side: z.enum(['top', 'right', 'bottom', 'left']),
  impulse: springImpulseSchema,
});

const polygonSpringSurfaceSchema = z.object({
  edge: z.number().int().nonnegative(),
  impulse: springImpulseSchema,
});

const breakableSchema = z.object({
  thresholdEnergy: z.number().finite().positive(),
  velocityRetention: z.number().min(0.1).max(1).optional(),
});

const movableSchema = z.object({
  mass: z.number().finite().positive().max(1000),
  minimumImpactEnergy: z.number().finite().positive(),
});

const boxSchema = z.object({
  id: z.string().min(1), type: z.literal('box'),
  x: z.number().finite(), y: z.number().finite(),
  width: z.number().finite().positive(), height: z.number().finite().positive(), material: z.string().optional(),
  breakable: breakableSchema.optional(),
  springSurfaces: z.array(boxSpringSurfaceSchema).optional(),
  movable: movableSchema.optional(),
  texture: surfaceTextureSchema.optional(),
  borders: boxBordersSchema.optional(),
});

const polygonSchema = z.object({
  id: z.string().min(1), type: z.literal('polygon'),
  vertices: z.array(z.tuple([z.number().finite(), z.number().finite()])).min(3),
  material: z.string().optional(),
  breakable: breakableSchema.optional(),
  springSurfaces: z.array(polygonSpringSurfaceSchema).optional(),
  texture: surfaceTextureSchema.optional(),
  borders: polygonBordersSchema.optional(),
});

const botSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  radius: z.number().finite().positive().max(100),
  mass: z.number().finite().positive().max(1000),
  speed: z.number().finite().positive().max(2000),
  direction: z.union([z.literal(-1), z.literal(1)]).optional(),
  restitution: z.number().min(0).max(1).optional(),
  friction: z.number().min(0).max(1).optional(),
  patrolRange: z.object({
    minX: z.number().finite(),
    maxX: z.number().finite(),
  }).optional(),
});


const birdSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  radius: z.number().finite().min(8).max(60),
  mass: z.number().finite().positive().max(1000),
  patrolSpeed: z.number().finite().positive().max(2000),
  attackSpeed: z.number().finite().positive().max(3000),
  aggressive: z.boolean().optional(),
  detectionRadius: z.number().finite().min(20).max(1200),
  attackImpulse: z.number().finite().min(0).max(5000),
  direction: z.union([z.literal(-1), z.literal(1)]).optional(),
  restitution: z.number().min(0).max(1).optional(),
  friction: z.number().min(0).max(1).optional(),
  patrolRange: z.object({ minX: z.number().finite(), maxX: z.number().finite() }),
});


const poopPickupSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  radius: z.number().finite().min(10).max(48),
  speedBoostPercent: z.number().finite().min(0).max(200),
  spinBoostPercent: z.number().finite().min(0).max(300),
});

const vomitEnemySchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  radius: z.number().finite().min(12).max(80),
  mass: z.number().finite().positive().max(1000),
  detectionRadius: z.number().finite().min(20).max(1000),
  pulseImpulse: z.number().finite().min(0).max(3000),
  pulseIntervalSeconds: z.number().finite().min(0.25).max(5),
  restitution: z.number().min(0).max(1).optional(),
  friction: z.number().min(0).max(1).optional(),
});

const demonEnemySchema = z.object({
  id: z.string().min(1),
  spawnArea: z.object({
    minX: z.number().finite(), minY: z.number().finite(),
    maxX: z.number().finite(), maxY: z.number().finite(),
  }).refine((area) => area.maxX > area.minX && area.maxY > area.minY, {
    message: 'spawnArea max bounds must be greater than min bounds',
  }),
  radius: z.number().finite().min(10).max(60),
  mass: z.number().finite().positive().max(1000),
  respawnIntervalSeconds: z.number().finite().min(0.5).max(60),
  telegraphSeconds: z.number().finite().min(0.2).max(5).optional(),
  attackDelaySeconds: z.number().finite().min(0.1).max(5).optional(),
  activeSeconds: z.number().finite().min(0.5).max(8).optional(),
  attackRadius: z.number().finite().min(20).max(1400),
  lightningImpulse: z.number().finite().min(0).max(6000),
  collisionImpulse: z.number().finite().min(0).max(6000).optional(),
  restitution: z.number().min(0).max(1).optional(),
  friction: z.number().min(0).max(1).optional(),
});

const platformSwitchSchema = z.object({
  id: z.string().min(1),
  lever: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    height: z.number().finite().min(24).max(100).optional(),
    minimumImpactSpeed: z.number().finite().min(20).max(2000),
    initialState: z.enum(['on', 'off']).optional(),
  }),
  platform: z.object({
    width: z.number().finite().min(80).max(500),
    surface: z.enum(['stone', 'glass', 'metal', 'grass']),
    speed: z.number().finite().min(10).max(1500),
    points: z.array(z.object({ x: z.number().finite(), y: z.number().finite() })).min(2).max(32),
  }),
});

const rollingObjectSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  radius: z.number().finite().min(16).max(120),
  mass: z.number().finite().positive().max(1000),
  appearance: z.enum(['stone', 'snow']).optional(),
  friction: z.number().finite().min(0).max(1).optional(),
  restitution: z.number().finite().min(0).max(1).optional(),
});

const bombSchema = z.object({
  id: z.string().min(1),
  x: z.number().finite(),
  y: z.number().finite(),
  radius: z.number().finite().positive().min(10).max(80),
  mass: z.number().finite().positive().max(100),
  fuseSeconds: z.number().finite().positive().min(0.5).max(15),
  explosionRadius: z.number().finite().positive().max(1200),
  explosionEnergy: z.number().finite().positive(),
  restitution: z.number().min(0).max(1).optional(),
  friction: z.number().min(0).max(1).optional(),
});

const triggerSchema = z.object({
  id: z.string().min(1), type: z.enum(['hazard', 'checkpoint', 'goal']),
  x: z.number().finite(), y: z.number().finite(),
  width: z.number().finite().positive(), height: z.number().finite().positive(),
  respawnX: z.number().finite().optional(), respawnY: z.number().finite().optional(),
});

const decorationSchema = z.object({
  id: z.string().min(1), type: z.enum(['circle', 'rectangle', 'line', 'text']),
  x: z.number().finite(), y: z.number().finite(),
  width: z.number().finite().positive().optional(), height: z.number().finite().positive().optional(),
  radius: z.number().finite().positive().optional(), color: z.string().optional(),
  text: z.string().optional(), depth: z.number().optional(),
});

export const LevelSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  world: z.object({
    width: z.number().finite().positive(), height: z.number().finite().positive(),
    killPlaneY: z.number().finite().positive(), backgroundColor: z.string().optional(),
  }),
  spawn: z.object({ x: z.number().finite(), y: z.number().finite() }),
  solids: z.array(z.discriminatedUnion('type', [boxSchema, polygonSchema])),
  triggers: z.array(triggerSchema),
  bots: z.array(botSchema).max(24).optional(),
  birds: z.array(birdSchema).max(24).optional(),
  bombs: z.array(bombSchema).max(24).optional(),
  rollingObjects: z.array(rollingObjectSchema).max(24).optional(),
  poopPickups: z.array(poopPickupSchema).max(48).optional(),
  vomitEnemies: z.array(vomitEnemySchema).max(24).optional(),
  demonEnemies: z.array(demonEnemySchema).max(24).optional(),
  platformSwitches: z.array(platformSwitchSchema).max(24).optional(),
  materials: z.record(z.string(), materialSchema).optional(),
  decorations: z.array(decorationSchema).optional(),
  camera: z.object({
    followOffsetX: z.number().min(0).max(1).optional(),
    smoothing: z.number().min(0).max(1).optional(),
    minX: z.number().finite().optional(), maxX: z.number().finite().optional(),
  }).optional(),
});
