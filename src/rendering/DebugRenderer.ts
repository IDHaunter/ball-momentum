import type Phaser from 'phaser';
import type { BallController } from '../player/BallController';
import type { GameState } from '../core/GameState';

export class DebugRenderer {
  private readonly text: Phaser.GameObjects.Text;
  private visible = false;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add.text(14, 66, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#e8f1ff',
      backgroundColor: '#0b1320dd', padding: { x: 9, y: 7 }, lineSpacing: 3,
    }).setScrollFactor(0).setDepth(1000).setVisible(false);
  }

  setVisible(visible: boolean): void { this.visible = visible; this.text.setVisible(visible); }
  update(state: GameState, levelId: string, ball: BallController | null, stepMs: number, substeps: number): void {
    if (!this.visible || !ball) return;
    const snapshot = ball.snapshot;
    this.text.setText([
      `STATE: ${state}   LEVEL: ${levelId}`,
      `POS: ${snapshot.position.x.toFixed(1)}, ${snapshot.position.y.toFixed(1)}`,
      `VEL: ${snapshot.velocity.x.toFixed(1)}, ${snapshot.velocity.y.toFixed(1)} px/s`,
      `CONTACT: ${ball.state.grounded ? 'GROUNDED' : 'AIRBORNE'}`,
      `TAKEOFF: ${ball.state.takeoffAtMs === null ? '-' : ball.state.takeoffAtMs.toFixed(0) + ' ms'}`,
      `BOOST: ${ball.state.airBoostAvailable ? 'READY' : ball.state.airBoostUsed ? 'USED' : 'LOCKED'}`,
      `STEP: ${stepMs.toFixed(2)} ms   SUBSTEPS: ${substeps}`,
    ]);
  }

  destroy(): void { this.text.destroy(); }
}
