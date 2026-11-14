import type { Vector2 } from './PhysicsTypes';

export interface MovableBlockImpactInput {
  normal: Vector2;
  incomingVelocity: Vector2;
  ballMass: number;
  blockMass: number;
  restitution: number;
  tangentRetention?: number;
}

export interface MovableBlockImpactResult {
  ballVelocity: Vector2;
  blockVelocity: Vector2;
}

/**
 * Resolves a one-dimensional impact along the contact normal while retaining
 * most of the ball's tangential motion. Velocities are expressed in px/s.
 */
export function calculateMovableBlockImpact(input: MovableBlockImpactInput): MovableBlockImpactResult {
  const { normal, incomingVelocity } = input;
  const totalMass = input.ballMass + input.blockMass;
  if (!(input.ballMass > 0) || !(input.blockMass > 0) || !(totalMass > 0)) {
    throw new RangeError('Ball and block masses must be positive.');
  }

  const normalLength = Math.hypot(normal.x, normal.y);
  if (Math.abs(normalLength - 1) > 1e-4) {
    throw new RangeError('Collision normal must be normalized.');
  }

  const incomingNormal = incomingVelocity.x * normal.x + incomingVelocity.y * normal.y;
  if (incomingNormal >= 0) {
    return { ballVelocity: { ...incomingVelocity }, blockVelocity: { x: 0, y: 0 } };
  }

  const normalSpeed = -incomingNormal;
  const tangentRetention = input.tangentRetention ?? 0.98;
  const tangent = {
    x: incomingVelocity.x - incomingNormal * normal.x,
    y: incomingVelocity.y - incomingNormal * normal.y,
  };

  // Standard 1D two-body collision along the normal, with the block initially
  // at rest. This conserves linear momentum and applies material restitution.
  const ballNormalAfter = ((input.ballMass - input.restitution * input.blockMass) / totalMass) * incomingNormal;
  const blockNormalSpeedAfter = ((1 + input.restitution) * input.ballMass / totalMass) * normalSpeed;

  return {
    ballVelocity: {
      x: tangent.x * tangentRetention + normal.x * ballNormalAfter,
      y: tangent.y * tangentRetention + normal.y * ballNormalAfter,
    },
    blockVelocity: {
      x: -normal.x * blockNormalSpeedAfter,
      y: -normal.y * blockNormalSpeedAfter,
    },
  };
}
