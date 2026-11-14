import { describe, expect, it } from 'vitest';
import { calculateMovableBlockImpact } from '../../src/physics/MovableBlockImpact';

describe('calculateMovableBlockImpact', () => {
  it('transfers normal momentum to the block while preserving tangential ball motion', () => {
    const result = calculateMovableBlockImpact({
      normal: { x: -1, y: 0 },
      incomingVelocity: { x: 400, y: -120 },
      ballMass: 1,
      blockMass: 4,
      restitution: 0.02,
    });

    expect(result.blockVelocity.x).toBeCloseTo(81.6, 6);
    expect(result.blockVelocity.y).toBeCloseTo(0, 6);
    expect(result.ballVelocity.x).toBeCloseTo(73.6, 6);
    expect(result.ballVelocity.y).toBeCloseTo(-117.6, 6);

    const initialMomentumX = 1 * 400;
    const finalMomentumX = 1 * result.ballVelocity.x + 4 * result.blockVelocity.x;
    expect(finalMomentumX).toBeCloseTo(initialMomentumX, 6);
  });

  it('resolves impacts from the opposite side symmetrically', () => {
    const result = calculateMovableBlockImpact({
      normal: { x: 1, y: 0 },
      incomingVelocity: { x: -300, y: 40 },
      ballMass: 1,
      blockMass: 2,
      restitution: 0.1,
    });

    expect(result.blockVelocity.x).toBeLessThan(0);
    expect(result.ballVelocity.x).toBeLessThan(0);
    expect(result.ballVelocity.y).toBeCloseTo(39.2, 6);
  });

  it('does not transfer momentum when the ball is already moving away', () => {
    const incoming = { x: -200, y: 0 };
    const result = calculateMovableBlockImpact({
      normal: { x: -1, y: 0 },
      incomingVelocity: incoming,
      ballMass: 1,
      blockMass: 3,
      restitution: 0.1,
    });

    expect(result.ballVelocity).toEqual(incoming);
    expect(result.blockVelocity).toEqual({ x: 0, y: 0 });
  });
});
