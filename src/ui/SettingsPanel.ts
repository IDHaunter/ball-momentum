import { createButton, createElement, createPanel } from './DomUtils';
import type { PlayerPreferences } from '../platform/Storage/ProgressRepository';
import { BALL_SKIN_OPTIONS, DEFAULT_BALL_SKIN, type BallSkin } from '../player/BallSkin';

export class SettingsPanel {
  private readonly panel: HTMLElement;
  private readonly sound: HTMLInputElement;
  private readonly reducedMotion: HTMLInputElement;
  private readonly skinButtons = new Map<BallSkin, HTMLButtonElement>();
  private selectedSkin: BallSkin;

  constructor(root: HTMLElement, callbacks: { close(): void; save(value: PlayerPreferences): void; initial: PlayerPreferences }) {
    this.panel = createPanel(root, 'settings-menu');
    this.selectedSkin = callbacks.initial.ballSkin;

    const title = createElement('h2', 'panel-title', 'Settings');
    this.sound = document.createElement('input');
    this.sound.type = 'checkbox';
    this.sound.checked = callbacks.initial.soundEnabled;
    this.reducedMotion = document.createElement('input');
    this.reducedMotion.type = 'checkbox';
    this.reducedMotion.checked = callbacks.initial.reducedMotion;

    const soundLabel = createElement('label', 'setting-row');
    soundLabel.append(this.sound, createElement('span', '', 'Sound enabled'));
    const motionLabel = createElement('label', 'setting-row');
    motionLabel.append(this.reducedMotion, createElement('span', '', 'Reduce motion'));

    const skinHeading = createElement('div', 'skin-section-heading');
    skinHeading.append(
      createElement('span', 'setting-section-title', 'Ball skin'),
      createElement('span', 'setting-section-hint', 'Choose your rolling buddy'),
    );
    const skinGrid = createElement('div', 'skin-grid');
    for (const option of BALL_SKIN_OPTIONS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'skin-card';
      button.dataset.skin = option.id;
      button.setAttribute('aria-label', `${option.label}: ${option.description}`);
      button.setAttribute('aria-pressed', String(option.id === this.selectedSkin));

      const preview = createElement('span', 'skin-preview');
      // These SVG strings are trusted, static assets defined alongside the built-in skin catalogue.
      preview.innerHTML = option.previewSvg;
      button.append(preview, createElement('span', 'skin-card-name', option.label));
      button.addEventListener('click', () => {
        this.selectedSkin = option.id;
        this.refreshSkinSelection();
      });
      this.skinButtons.set(option.id, button);
      skinGrid.append(button);
    }

    const save = createButton('Save settings', () => {
      callbacks.save({
        soundEnabled: this.sound.checked,
        reducedMotion: this.reducedMotion.checked,
        ballSkin: this.selectedSkin,
      });
      callbacks.close();
    }, 'button button-primary');
    const reset = createButton('Reset settings', () => {
      this.sound.checked = true;
      this.reducedMotion.checked = false;
      this.selectedSkin = DEFAULT_BALL_SKIN;
      this.refreshSkinSelection();
      callbacks.save({ soundEnabled: true, reducedMotion: false, ballSkin: DEFAULT_BALL_SKIN });
    }, 'button button-secondary');

    this.panel.append(
      createElement('p', 'eyebrow', 'PREFERENCES'),
      title,
      soundLabel,
      motionLabel,
      skinHeading,
      skinGrid,
      save,
      reset,
      createButton('Back', callbacks.close, 'button button-ghost'),
    );
    this.panel.hidden = true;
    this.refreshSkinSelection();
  }

  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }

  private refreshSkinSelection(): void {
    for (const [skin, button] of this.skinButtons) {
      const selected = skin === this.selectedSkin;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    }
  }
}
