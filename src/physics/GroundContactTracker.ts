import type { PhysicsConfig } from '../config/config.types';
import type { PhysicsEvent } from './PhysicsTypes';

interface Contact { normalY: number; lastSeenAtMs: number; }

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
        this.contacts.set(event.terrainId, { normalY: event.supportNormal.y, lastSeenAtMs: nowMs });
      }
    }
  }

  isGrounded(nowMs: number): boolean {
    for (const contact of this.contacts.values()) {
      if (contact.normalY <= this.minimumSupportNormalY && nowMs - contact.lastSeenAtMs <= this.config.groundContact.supportGraceMs) return true;
    }
    return false;
  }

  clear(): void { this.contacts.clear(); }
}
