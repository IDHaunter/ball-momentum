import type { Vector2 } from '../physics/PhysicsTypes';

export interface RadiationGraphicsLike {
  clear(): this;
  setDepth(depth: number): this;
  fillStyle(color: number, alpha?: number): this;
  lineStyle(width: number, color: number, alpha?: number): this;
  fillEllipse(x: number, y: number, width: number, height: number): this;
  strokeEllipse(x: number, y: number, width: number, height: number): this;
  beginPath(): this;
  moveTo(x: number, y: number): this;
  lineTo(x: number, y: number): this;
  closePath(): this;
  fillPath(): this;
  strokePath(): this;
  destroy(): void;
}

export interface RadiationContainerLike {
  add(child: object): this;
  setDepth(depth: number): this;
  setPosition(x: number, y: number): this;
  setRotation(value: number): this;
  destroy(): void;
}

export interface RadiationTextLike {
  setOrigin(x: number, y?: number): this;
  setDepth(depth: number): this;
  setPosition(x: number, y: number): this;
  setText(value: string): this;
  setColor(value: string): this;
  setScale(x: number, y?: number): this;
  setVisible(value: boolean): this;
  destroy(): void;
}

export interface RadiationRendererSceneLike {
  add: {
    container(x: number, y: number): RadiationContainerLike;
    graphics(): RadiationGraphicsLike;
    text(x: number, y: number, value: string, style: Record<string, unknown>): RadiationTextLike;
  };
}

/** Procedural radiation symbol with an animated warning aura and fuse counter. */
export class RadiationEnemyRenderer {
  private readonly container: RadiationContainerLike;
  private readonly aura: RadiationGraphicsLike;
  private readonly symbol: RadiationGraphicsLike;
  private readonly countdown: RadiationTextLike;
  private elapsedMs = 0;
  private lastDisplayedSecond = -1;

  constructor(
    scene: RadiationRendererSceneLike,
    private readonly radius: number,
    x: number,
    y: number,
  ) {
    this.container = scene.add.container(x, y).setDepth(9);
    this.aura = scene.add.graphics();
    this.symbol = scene.add.graphics();
    this.container.add(this.aura);
    this.container.add(this.symbol);
    this.countdown = scene.add.text(x, y, '', {
      fontFamily: 'Arial, sans-serif',
      fontSize: `${Math.max(9, radius * 0.58)}px`,
      fontStyle: 'bold',
      color: '#fff1ad',
      stroke: '#382a04',
      strokeThickness: Math.max(1.4, radius * 0.09),
    }).setOrigin(0.5).setDepth(16).setVisible(false);
    this.drawSymbol(false, 0);
  }

  update(deltaMs: number, position: Vector2, rotation: number, activated: boolean, remainingMs: number): void {
    this.elapsedMs += Math.max(0, Math.min(80, deltaMs));
    this.container.setPosition(position.x, position.y).setRotation(rotation);
    this.drawSymbol(activated, remainingMs);
    this.countdown.setVisible(activated).setPosition(position.x, position.y);
    if (!activated) {
      this.lastDisplayedSecond = -1;
      return;
    }

    const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
    if (seconds !== this.lastDisplayedSecond) {
      this.lastDisplayedSecond = seconds;
      this.countdown.setText(String(seconds));
    }
    const urgent = remainingMs <= 1000;
    const pulse = 1 + (0.06 + (urgent ? 0.1 : 0))
      * (0.5 + 0.5 * Math.sin(this.elapsedMs * (urgent ? 0.055 : 0.026)));
    this.countdown.setColor(urgent ? '#ffffff' : '#fff1ad').setScale(pulse);
  }

  dispose(): void {
    this.container.destroy();
    this.countdown.destroy();
  }

  private drawSymbol(activated: boolean, remainingMs: number): void {
    const r = this.radius;
    const pulse = 0.5 + 0.5 * Math.sin(this.elapsedMs * (remainingMs <= 1000 ? 0.052 : 0.027));
    const flash = activated && Math.sin(this.elapsedMs * (remainingMs <= 1000 ? 0.075 : 0.035)) > 0;

    this.aura.clear();
    if (activated) {
      this.aura.fillStyle(0xdfff35, 0.08 + pulse * 0.11)
        .fillEllipse(0, 0, r * (2.35 + pulse * 0.25), r * (2.35 + pulse * 0.25));
      this.aura.lineStyle(Math.max(1.5, r * 0.095), flash ? 0xfff47a : 0xe9a91d, 0.3 + pulse * 0.42)
        .strokeEllipse(0, 0, r * (2.12 + pulse * 0.3), r * (2.12 + pulse * 0.3));
    }

    this.symbol.clear();
    this.symbol.fillStyle(activated && flash ? 0xfff38a : 0xffd928, 1).fillEllipse(0, 0, r * 2, r * 2);
    this.symbol.fillStyle(0xffef75, activated ? 0.35 + pulse * 0.28 : 0.26)
      .fillEllipse(-r * 0.2, -r * 0.24, r * 1.16, r * 0.74);
    this.symbol.lineStyle(Math.max(1, r * 0.09), 0x59420a, 0.96).strokeEllipse(0, 0, r * 1.96, r * 1.96);

    const sectorColors = activated && flash
      ? [0x493604, 0x604707, 0x493604]
      : [0x574207, 0x71540a, 0x574207];
    for (let index = 0; index < 3; index += 1) {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / 3);
      const outerRadius = r * 0.83;
      const innerRadius = r * 0.17;
      const halfAngle = 0.43;
      const arcSteps = 6;
      const drawBlade = (): void => {
        this.symbol.beginPath();
        for (let point = 0; point <= arcSteps; point += 1) {
          const bladeAngle = angle - halfAngle + (point / arcSteps) * halfAngle * 2;
          const x = Math.cos(bladeAngle) * outerRadius;
          const y = Math.sin(bladeAngle) * outerRadius;
          if (point === 0) this.symbol.moveTo(x, y);
          else this.symbol.lineTo(x, y);
        }
        for (let point = arcSteps; point >= 0; point -= 1) {
          const bladeAngle = angle - halfAngle + (point / arcSteps) * halfAngle * 2;
          this.symbol.lineTo(Math.cos(bladeAngle) * innerRadius, Math.sin(bladeAngle) * innerRadius);
        }
        this.symbol.closePath();
      };

      this.symbol.fillStyle(sectorColors[index]!, 1);
      drawBlade();
      this.symbol.fillPath();
      this.symbol.lineStyle(Math.max(0.7, r * 0.032), 0x382a04, 0.82);
      drawBlade();
      this.symbol.strokePath();
    }

    // The classic trefoil has a solid dark hub; the countdown is drawn above it
    // in a bright, high-contrast color while the three curved blades remain
    // clearly separated by yellow gaps.
    this.symbol.fillStyle(0x503b06, 1).fillEllipse(0, 0, r * 0.59, r * 0.59);
    this.symbol.lineStyle(Math.max(0.7, r * 0.032), 0x382a04, 0.88)
      .strokeEllipse(0, 0, r * 0.59, r * 0.59);
    if (activated) {
      this.symbol.fillStyle(0xffffff, flash ? 0.4 : 0.12)
        .fillEllipse(-r * 0.06, -r * 0.075, r * 0.12, r * 0.12);
    }
  }
}
