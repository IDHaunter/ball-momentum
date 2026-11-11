import type Phaser from 'phaser';
import type { LevelDefinition } from '../level/LevelTypes';
import type { RenderConfig } from '../config/config.types';
import { clamp } from '../utils/MathUtils';

export class FollowCameraController {
  private levelWidth = 0;
  private levelHeight = 0;
  private anchorRatio: number;
  private smoothing: number;
  private minX = 0;
  private maxX = 0;

  constructor(private readonly camera: Phaser.Cameras.Scene2D.Camera, private readonly defaults: RenderConfig) {
    this.anchorRatio = defaults.horizontalAnchorRatio;
    this.smoothing = defaults.cameraSmoothing;
  }

  configure(level: LevelDefinition): void {
    this.levelWidth = level.world.width;
    this.levelHeight = level.world.height;
    this.anchorRatio = level.camera?.followOffsetX ?? this.defaults.horizontalAnchorRatio;
    this.smoothing = level.camera?.smoothing ?? this.defaults.cameraSmoothing;
    this.minX = level.camera?.minX ?? 0;
    this.maxX = level.camera?.maxX ?? level.world.width;
    this.camera.setBounds(0, 0, this.levelWidth, this.levelHeight);
    this.camera.setBackgroundColor(level.world.backgroundColor ?? '#18212f');
  }

  snap(x: number, y: number): void {
    const maxScrollX = Math.max(0, Math.min(this.maxX - this.camera.width, this.levelWidth - this.camera.width));
    const desiredX = x - this.camera.width * this.anchorRatio;
    this.camera.scrollX = clamp(desiredX, this.minX, Math.max(this.minX, maxScrollX));

    // The initial spawn must be visible even when it is below the top viewport.
    const maxScrollY = Math.max(0, this.levelHeight - this.camera.height);
    this.camera.scrollY = clamp(y - this.camera.height * 0.65, 0, maxScrollY);
  }

  update(x: number, y: number): void {
    const maxScrollX = Math.max(0, Math.min(this.maxX - this.camera.width, this.levelWidth - this.camera.width));
    const desiredX = x - this.camera.width * this.anchorRatio;
    const targetX = clamp(desiredX, this.minX, Math.max(this.minX, maxScrollX));
    this.camera.scrollX += (targetX - this.camera.scrollX) * this.smoothing;

    // Vertical follow uses a dead zone, avoiding constant camera motion on level ground.
    const screenY = y - this.camera.scrollY;
    const upperThreshold = this.camera.height * 0.25;
    const lowerThreshold = this.camera.height * 0.78;
    let targetY = this.camera.scrollY;
    if (screenY < upperThreshold) targetY = y - this.camera.height * 0.38;
    else if (screenY > lowerThreshold) targetY = y - this.camera.height * 0.62;
    const maxScrollY = Math.max(0, this.levelHeight - this.camera.height);
    targetY = clamp(targetY, 0, maxScrollY);
    this.camera.scrollY += (targetY - this.camera.scrollY) * this.smoothing;
  }
}
