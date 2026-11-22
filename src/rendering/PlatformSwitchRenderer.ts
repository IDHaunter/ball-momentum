import type Phaser from 'phaser';
import type { Vector2 } from '../physics/PhysicsTypes';
import type { MovingPlatformSurface } from '../level/LevelTypes';

const PLATFORM_HEIGHT = 28;
const LEVER_LENGTH = 38;

/** Draws the paired lever and its rocket-assisted moving platform. */
export class PlatformSwitchRenderer {
  private readonly platformGraphics: Phaser.GameObjects.Graphics;
  private readonly leverGraphics: Phaser.GameObjects.Graphics;
  private readonly statusText: Phaser.GameObjects.Text;
  private elapsedMs = 0;
  private impactMs = 0;
  private enabled: boolean;

  constructor(
    scene: Phaser.Scene,
    _id: string,
    private readonly leverPosition: Vector2,
    private readonly platformWidth: number,
    private readonly surface: MovingPlatformSurface,
    initiallyEnabled: boolean,
  ) {
    this.enabled = initiallyEnabled;
    // Keep the moving deck below the player ball, while the control itself
    // and its status lamp remain legible above nearby objects.
    this.platformGraphics = scene.add.graphics().setDepth(4);
    this.leverGraphics = scene.add.graphics().setDepth(7);
    this.statusText = scene.add.text(leverPosition.x, leverPosition.y + 12, '', {
      fontFamily: 'Arial, sans-serif', fontSize: '10px', fontStyle: 'bold',
      color: initiallyEnabled ? '#8df5a5' : '#ff8b87',
      backgroundColor: '#111925', padding: { x: 4, y: 2 },
    }).setOrigin(0.5, 0).setDepth(13);
    this.statusText.setText(initiallyEnabled ? 'ON' : 'OFF');
  }

  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    this.impactMs = 260;
    this.statusText.setText(enabled ? 'ON' : 'OFF');
    this.statusText.setColor(enabled ? '#8df5a5' : '#ff8b87');
  }

  onImpact(): void {
    this.impactMs = 260;
  }

  update(deltaMs: number, platformPosition: Vector2): void {
    this.elapsedMs += Math.max(0, Math.min(80, deltaMs));
    this.impactMs = Math.max(0, this.impactMs - deltaMs);
    this.platformGraphics.clear();
    this.leverGraphics.clear();
    this.drawPlatform(platformPosition);
    this.drawLever();
  }

  dispose(): void {
    this.platformGraphics.destroy();
    this.leverGraphics.destroy();
    this.statusText.destroy();
  }

  private drawPlatform(position: Vector2): void {
    const g = this.platformGraphics;
    const half = this.platformWidth / 2;
    const left = position.x - half;
    const top = position.y - PLATFORM_HEIGHT / 2;
    const flamePulse = 0.72 + Math.sin(this.elapsedMs * 0.018) * 0.22;

    // Fixed graphite chassis: only the top material treatment changes.
    g.fillStyle(0x0d1724, 1).fillRect(left - 3, top + 1, this.platformWidth + 6, PLATFORM_HEIGHT + 4);
    g.fillStyle(0x344459, 1).fillRect(left, top + 3, this.platformWidth, PLATFORM_HEIGHT - 2);
    g.lineStyle(2, 0x101b29, 1).strokeRect(left, top + 3, this.platformWidth, PLATFORM_HEIGHT - 2);
    g.fillStyle(0x71849a, 1).fillRect(left + 7, top + 18, this.platformWidth - 14, 3);

    const topColor = this.surface === 'stone' ? 0x8b98a4
      : this.surface === 'glass' ? 0x80d9e8
        : this.surface === 'metal' ? 0xb1bfca : 0x69a958;
    g.fillStyle(topColor, this.surface === 'glass' ? 0.82 : 1).fillRect(left + 2, top, this.platformWidth - 4, 8);
    g.lineStyle(1.5, this.surface === 'glass' ? 0xd5fbff : 0x172433, 0.9)
      .lineBetween(left + 2, top + 1, left + this.platformWidth - 2, top + 1);

    if (this.surface === 'stone') {
      g.lineStyle(1, 0x53616e, 0.8);
      for (let index = 0; index < Math.floor(this.platformWidth / 28); index += 1) {
        const x = left + 15 + index * 27;
        g.lineBetween(x, top + 3, x + 7, top + 6);
        g.lineBetween(x + 7, top + 6, x + 12, top + 3);
      }
    } else if (this.surface === 'glass') {
      g.lineStyle(1, 0xe4fcff, 0.66);
      for (let index = 0; index < Math.floor(this.platformWidth / 42); index += 1) {
        const x = left + 16 + index * 42;
        g.lineBetween(x, top + 1, x + 12, top + 7);
        g.lineBetween(x + 12, top + 7, x + 24, top + 1);
      }
      g.fillStyle(0xffffff, 0.34).fillRect(left + 10, top + 2, this.platformWidth * 0.23, 2);
    } else if (this.surface === 'metal') {
      g.lineStyle(1, 0xe3edf4, 0.8);
      g.lineBetween(left + 10, top + 3, left + this.platformWidth - 10, top + 3);
      for (const x of [left + 13, left + this.platformWidth - 13]) {
        g.fillStyle(0x28394b, 1).fillCircle(x, top + 5, 2);
        g.fillStyle(0xd8e2e9, 1).fillCircle(x - 0.5, top + 4.5, 0.8);
      }
    } else {
      g.lineStyle(1.5, 0x397d3d, 1);
      for (let index = 0; index < Math.floor(this.platformWidth / 17); index += 1) {
        const x = left + 8 + index * 17;
        g.lineBetween(x, top + 2, x - 2, top - 3);
        g.lineBetween(x + 2, top + 2, x + 5, top - 2);
      }
    }

    // Small animated exhaust plumes below the chassis. They are decorative;
    // the platform's motion is driven by its configured waypoint path.
    for (const offset of [-this.platformWidth * 0.28, this.platformWidth * 0.28]) {
      const nozzleX = position.x + offset;
      const nozzleY = top + PLATFORM_HEIGHT + 2;
      g.fillStyle(0x131e2c, 1).fillRect(nozzleX - 7, nozzleY - 3, 14, 6);
      const flameLength = 8 + flamePulse * 9;
      this.fillTriangle(nozzleX - 5, nozzleY + 3, nozzleX + 5, nozzleY + 3, nozzleX, nozzleY + flameLength, 0xff8a3d, 0.92);
      this.fillTriangle(nozzleX - 2.5, nozzleY + 3, nozzleX + 2.5, nozzleY + 3, nozzleX, nozzleY + flameLength * 0.68, 0xffe69a, 0.95);
    }
  }

  private drawLever(): void {
    const g = this.leverGraphics;
    const { x, y } = this.leverPosition;
    const angle = this.enabled ? 0.5 : -0.5;
    const tipX = x + Math.sin(angle) * LEVER_LENGTH;
    const tipY = y - Math.cos(angle) * LEVER_LENGTH;
    const activeColor = this.enabled ? 0x62e58b : 0xff6662;

    // Mounting plate, pivot and two-tone lever shaft.
    g.fillStyle(0x111c2a, 1).fillRect(x - 17, y - 5, 34, 10);
    g.lineStyle(2, 0x91a3b6, 1).strokeRect(x - 17, y - 5, 34, 10);
    g.lineStyle(10, 0x182333, 1).lineBetween(x, y - 3, tipX, tipY);
    g.lineStyle(6, 0xe2e9ee, 1).lineBetween(x, y - 3, tipX, tipY);
    g.lineStyle(2, 0x697d90, 1).lineBetween(x - 2, y - 4, tipX - 2, tipY + 1);
    g.fillStyle(0x25364a, 1).fillCircle(x, y - 2, 8);
    g.fillStyle(0xb7c4cf, 1).fillCircle(x, y - 2, 4);
    g.fillStyle(0x222f42, 1).fillCircle(tipX, tipY, 9);
    g.fillStyle(activeColor, 1).fillCircle(tipX, tipY, 6);
    g.fillStyle(0xffffff, 0.55).fillCircle(tipX - 2, tipY - 2, 2);

    // Clear red/green state lamp at the base.
    g.fillStyle(0x0b111b, 1).fillCircle(x, y + 10, 5.5);
    g.fillStyle(activeColor, 0.2 + (this.impactMs > 0 ? 0.5 : 0)).fillCircle(x, y + 10, 9);
    g.fillStyle(activeColor, 1).fillCircle(x, y + 10, 3.5);
    if (this.impactMs > 0) {
      const progress = this.impactMs / 260;
      g.lineStyle(1.5, activeColor, progress);
      for (let index = 0; index < 6; index += 1) {
        const a = (index / 6) * Math.PI * 2 + this.elapsedMs * 0.006;
        const sx = tipX + Math.cos(a) * 11;
        const sy = tipY + Math.sin(a) * 11;
        g.lineBetween(sx, sy, tipX + Math.cos(a) * (17 + progress * 5), tipY + Math.sin(a) * (17 + progress * 5));
      }
    }
  }

  private fillTriangle(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, color: number, alpha: number): void {
    const g = this.platformGraphics;
    g.fillStyle(color, alpha);
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.lineTo(x3, y3);
    g.closePath();
    g.fillPath();
  }
}
