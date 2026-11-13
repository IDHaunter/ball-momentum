/** Kinetic impact energy from the velocity component perpendicular to a surface. */
export function calculateNormalImpactEnergy(normalImpactSpeed: number, mass: number): number {
  if (!Number.isFinite(normalImpactSpeed) || !Number.isFinite(mass) || mass <= 0) return 0;
  const speed = Math.max(0, normalImpactSpeed);
  return 0.5 * mass * speed * speed;
}
