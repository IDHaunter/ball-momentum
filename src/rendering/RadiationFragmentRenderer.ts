import type { Vector2 } from '../physics/PhysicsTypes';
import type { RadiationGraphicsLike } from './RadiationEnemyRenderer';

export interface RadiationFragmentVisual {
  position: Vector2;
  velocity: Vector2;
  radius: number;
  lifeRatio: number;
}

export interface RadiationFragmentRendererSceneLike { add: { graphics(): RadiationGraphicsLike }; }

/** Six guided shards are drawn as pointed radioactive splinters with a flickering exhaust trail. */
export class RadiationFragmentRenderer {
  private readonly graphics: RadiationGraphicsLike;
  private elapsedMs = 0;

  constructor(scene: RadiationFragmentRendererSceneLike) {
    this.graphics = scene.add.graphics().setDepth(15);
  }

  draw(fragments: RadiationFragmentVisual[], deltaMs = 16.67): void {
    this.elapsedMs += Math.max(0, Math.min(80, deltaMs));
    this.graphics.clear();
    for (const fragment of fragments) {
      const speed = Math.hypot(fragment.velocity.x, fragment.velocity.y);
      const angle = speed > 0.01 ? Math.atan2(fragment.velocity.y, fragment.velocity.x) : 0;
      const dx = Math.cos(angle);
      const dy = Math.sin(angle);
      const px = -dy;
      const py = dx;
      const { x, y } = fragment.position;
      const flicker = 0.8 + 0.2 * Math.sin(this.elapsedMs * 0.045 + fragment.radius);
      const length = fragment.radius * (1.7 + flicker * 0.3);
      const width = fragment.radius * 1.25;
      const alpha = Math.max(0.2, Math.min(1, fragment.lifeRatio));

      this.graphics.fillStyle(0xff5b22, 0.2 * alpha * flicker)
        .fillEllipse(x - dx * length * 1.35, y - dy * length * 1.35, width * 1.9, width * 1.9);
      this.graphics.fillStyle(0xff8a24, 0.52 * alpha)
        .fillEllipse(x - dx * length * 0.88, y - dy * length * 0.88, width * 1.2, width * 1.2);
      this.graphics.fillStyle(0xffe26b, 0.82 * alpha)
        .fillEllipse(x - dx * length * 0.48, y - dy * length * 0.48, width * 0.58, width * 0.58);

      const tip = { x: x + dx * length * 0.92, y: y + dy * length * 0.92 };
      const base = { x: x - dx * length * 0.68, y: y - dy * length * 0.68 };
      const left = { x: base.x + px * width * 0.56, y: base.y + py * width * 0.56 };
      const right = { x: base.x - px * width * 0.56, y: base.y - py * width * 0.56 };
      this.graphics.fillStyle(0xffd52c, 0.98 * alpha)
        .beginPath().moveTo(tip.x, tip.y).lineTo(left.x, left.y).lineTo(right.x, right.y).closePath().fillPath();
      this.graphics.lineStyle(Math.max(0.8, fragment.radius * 0.16), 0x6a390b, 0.95 * alpha)
        .beginPath().moveTo(tip.x, tip.y).lineTo(left.x, left.y).lineTo(right.x, right.y).closePath().strokePath();
      const innerTip = { x: x + dx * length * 0.43, y: y + dy * length * 0.43 };
      const innerBase = { x: x - dx * length * 0.42, y: y - dy * length * 0.42 };
      this.graphics.fillStyle(0xfff2a0, 0.82 * alpha)
        .beginPath().moveTo(innerTip.x, innerTip.y)
        .lineTo(innerBase.x + px * width * 0.17, innerBase.y + py * width * 0.17)
        .lineTo(innerBase.x - px * width * 0.17, innerBase.y - py * width * 0.17)
        .closePath().fillPath();
    }
  }

  dispose(): void { this.graphics.destroy(); }
}
