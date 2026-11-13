import type { PhysicsConfig } from '../config/config.types';
import type { PhysicsEvent, Vector2 } from './PhysicsTypes';

interface Contact { normal: Vector2; lastSeenAtMs: number; }

export class GroundContactTracker {
  private contacts = new Map<string, Contact>();
  private readonly minimumSupportNormalY: number;

  constructor(private readonly config: PhysicsConfig) {
    this.minimumSupportNormalY = -Math.cos(config.groundContact.maxGroundAngleDegrees * Math.PI / 180);
  }

  handle(event: PhysicsEvent, nowMs: number): void {
    if (event.type === 'BALL_TERRAIN_CONTACT_ENDED') {
      this.contacts.delete(event.terrainId);
    } else if (event.type === 'BALL_TERRAIN_CONTACT_STARTED' || event.type === 'BALL_TERRAIN_CONTACT_ACTIVE') {
      if (event.supportNormal.y <= this.minimumSupportNormalY) {
        this.contacts.set(event.terrainId, { normal: { ...event.supportNormal }, lastSeenAtMs: nowMs });
      }
    }
  }

  isGrounded(nowMs: number): boolean {
    for (const contact of this.contacts.values()) {
      if (contact.normal.y <= this.minimumSupportNormalY && nowMs - contact.lastSeenAtMs <= this.config.groundContact.supportGraceMs) return true;
    }
    return false;
  }

  getSupportNormal(nowMs: number): Vector2 | null {
    let x = 0;
    let y = 0;
    let count = 0;
    for (const contact of this.contacts.values()) {
      if (contact.normal.y > this.minimumSupportNormalY || nowMs - contact.lastSeenAtMs > this.config.groundContact.supportGraceMs) continue;
      x += contact.normal.x;
      y += contact.normal.y;
      count += 1;
    }
    if (count === 0) return null;
    const length = Math.hypot(x, y);
    if (length < 1e-6) return { x: 0, y: -1 };
    return { x: x / length, y: y / length };
  }

  forget(terrainId: string): void { this.contacts.delete(terrainId); }

  clear(): void { this.contacts.clear(); }
}
