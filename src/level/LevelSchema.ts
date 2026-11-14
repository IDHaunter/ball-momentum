import { z } from 'zod';

const materialSchema = z.object({
  friction: z.number().min(0).max(1),
  frictionStatic: z.number().min(0).max(1),
  restitution: z.number().min(0).max(1),
});

const springImpulseSchema = z.number().finite().positive().max(3000);

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

const boxSchema = z.object({
  id: z.string().min(1), type: z.literal('box'),
  x: z.number().finite(), y: z.number().finite(),
  width: z.number().finite().positive(), height: z.number().finite().positive(), material: z.string().optional(),
  breakable: breakableSchema.optional(),
  springSurfaces: z.array(boxSpringSurfaceSchema).optional(),
});

const polygonSchema = z.object({
  id: z.string().min(1), type: z.literal('polygon'),
  vertices: z.array(z.tuple([z.number().finite(), z.number().finite()])).min(3),
  material: z.string().optional(),
  breakable: breakableSchema.optional(),
  springSurfaces: z.array(polygonSpringSurfaceSchema).optional(),
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
  materials: z.record(z.string(), materialSchema).optional(),
  decorations: z.array(decorationSchema).optional(),
  camera: z.object({
    followOffsetX: z.number().min(0).max(1).optional(),
    smoothing: z.number().min(0).max(1).optional(),
    minX: z.number().finite().optional(), maxX: z.number().finite().optional(),
  }).optional(),
});
