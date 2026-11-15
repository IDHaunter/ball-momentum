import { describe, expect, it } from 'vitest';
import { createPhysicsConfig } from '../../src/config/physics.defaults';
import { GroundContactTracker } from '../../src/physics/GroundContactTracker';
import { polygonEdgeOutwardNormal } from '../../src/utils/GeometryUtils';

describe('GroundContactTracker', () => {
  it('recognizes an upward-facing floor contact as grounded', () => {
    const tracker = new GroundContactTracker(createPhysicsConfig());
    tracker.handle({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE', terrainId: 'floor',
      supportNormal: { x: 0, y: -1 }, impactSpeed: 0,
    }, 100);

    expect(tracker.isGrounded(100)).toBe(true);
  });

  it('does not treat a ceiling underside contact as ground support', () => {
    const tracker = new GroundContactTracker(createPhysicsConfig());
    tracker.handle({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE', terrainId: 'ceiling',
      supportNormal: { x: 0, y: 1 }, impactSpeed: 0,
    }, 100);

    expect(tracker.isGrounded(100)).toBe(false);
  });

  it('exposes the active support normal for landing response', () => {
    const tracker = new GroundContactTracker(createPhysicsConfig());
    tracker.handle({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE', terrainId: 'ramp',
      supportNormal: { x: -0.35, y: -0.9367496998 }, impactSpeed: 0,
    }, 100);

    const normal = tracker.getSupportNormal(100);
    expect(normal?.x).toBeCloseTo(-0.35, 5);
    expect(normal?.y).toBeCloseTo(-0.9367496998, 5);
  });

  it('retains support only for the configured grace interval', () => {
    const tracker = new GroundContactTracker(createPhysicsConfig());
    tracker.handle({
      type: 'BALL_TERRAIN_CONTACT_ACTIVE', terrainId: 'floor',
      supportNormal: { x: 0, y: -1 }, impactSpeed: 0,
    }, 100);

    expect(tracker.isGrounded(135)).toBe(true);
    expect(tracker.isGrounded(136)).toBe(false);
  });

  it('recognizes both sloped faces of the first-level stone triangle as ground support', () => {
    // Geometry from public/levels/level-01.json. Each side is approximately
    // 55.71 degrees, slightly steeper than the previous 55-degree limit.
    const triangle = [
      { x: 2500, y: 850 },
      { x: 2650, y: 630 },
      { x: 2800, y: 850 },
    ];

    for (const edgeIndex of [0, 1]) {
      const tracker = new GroundContactTracker(createPhysicsConfig());
      const normal = polygonEdgeOutwardNormal(triangle, edgeIndex);
      tracker.handle({
        type: 'BALL_TERRAIN_CONTACT_ACTIVE',
        terrainId: `level-01-triangle-edge-${edgeIndex}`,
        supportNormal: normal,
        impactSpeed: 0,
      }, 100);

      expect(normal.y).toBeLessThan(-0.5);
      expect(tracker.isGrounded(100)).toBe(true);
      expect(tracker.getSupportNormal(100)?.x).toBeCloseTo(edgeIndex === 0 ? -0.8262273 : 0.8262273, 5);
    }
  });

});
