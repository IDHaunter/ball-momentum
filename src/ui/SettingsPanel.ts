import { createButton, createElement, createPanel } from './DomUtils';
import type { PlayerPreferences } from '../platform/Storage/ProgressRepository';

export class SettingsPanel {
  private readonly panel: HTMLElement;
  private readonly sound: HTMLInputElement;
  private readonly reducedMotion: HTMLInputElement;
  constructor(root: HTMLElement, callbacks: { close(): void; save(value: PlayerPreferences): void; initial: PlayerPreferences }) {
    this.panel = createPanel(root, 'settings-menu');
    const title = createElement('h2', 'panel-title', 'Settings');
    this.sound = document.createElement('input'); this.sound.type = 'checkbox'; this.sound.checked = callbacks.initial.soundEnabled;
    this.reducedMotion = document.createElement('input'); this.reducedMotion.type = 'checkbox'; this.reducedMotion.checked = callbacks.initial.reducedMotion;
    const soundLabel = createElement('label', 'setting-row'); soundLabel.append(this.sound, createElement('span', '', 'Sound enabled'));
    const motionLabel = createElement('label', 'setting-row'); motionLabel.append(this.reducedMotion, createElement('span', '', 'Reduce motion'));
    const save = createButton('Save settings', () => {
      callbacks.save({ soundEnabled: this.sound.checked, reducedMotion: this.reducedMotion.checked });
      callbacks.close();
    }, 'button button-primary');
    const reset = createButton('Reset settings', () => {
      this.sound.checked = true;
      this.reducedMotion.checked = false;
      callbacks.save({ soundEnabled: true, reducedMotion: false });
    }, 'button button-secondary');
    this.panel.append(createElement('p', 'eyebrow', 'PREFERENCES'), title, soundLabel, motionLabel, save, reset,
      createButton('Back', callbacks.close, 'button button-ghost'));
    this.panel.hidden = true;
  }
  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }
}
