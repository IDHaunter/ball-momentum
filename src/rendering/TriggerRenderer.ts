import type Phaser from 'phaser';
import type { TriggerDefinition } from '../level/LevelTypes';

export class TriggerRenderer {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private labels: Phaser.GameObjects.Text[] = [];
  private triggers: TriggerDefinition[] = [];
  private activeCheckpointId: string | null = null;

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics().setDepth(2);
  }

  render(triggers: TriggerDefinition[]): void {
    this.triggers = [...triggers];
    this.activeCheckpointId = null;
    this.draw();
  }

  setActiveCheckpoint(id: string): void {
    this.activeCheckpointId = id;
    this.draw();
  }

  destroy(): void {
    this.graphics.destroy();
    for (const label of this.labels) label.destroy();
    this.labels = [];
    this.triggers = [];
  }

  private draw(): void {
    this.graphics.clear();
    for (const label of this.labels) label.destroy();
    this.labels = [];

    for (const trigger of this.triggers) {
      const activeCheckpoint = trigger.type === 'checkpoint' && trigger.id === this.activeCheckpointId;
      const color = trigger.type === 'hazard' ? 0xf05b5b
        : trigger.type === 'checkpoint' ? (activeCheckpoint ? 0x8af0c0 : 0x5ee0a0)
          : 0xf5c451;
      this.graphics.fillStyle(color, activeCheckpoint ? 0.3 : 0.16);
      this.graphics.lineStyle(activeCheckpoint ? 4 : 3, color, 0.95);
      this.graphics.fillRect(trigger.x, trigger.y, trigger.width, trigger.height);
      this.graphics.strokeRect(trigger.x, trigger.y, trigger.width, trigger.height);
      const symbol = trigger.type === 'hazard' ? '!' : trigger.type === 'checkpoint'
        ? (activeCheckpoint ? 'CHECKPOINT ✓' : '◆')
        : 'FINISH';
      const text = this.scene.add.text(trigger.x + trigger.width / 2, trigger.y - 25, symbol, {
        fontFamily: 'Arial, sans-serif',
        fontSize: trigger.type === 'goal' || activeCheckpoint ? '18px' : '22px',
        color: `#${color.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(3);
      this.labels.push(text);
    }
  }
}
