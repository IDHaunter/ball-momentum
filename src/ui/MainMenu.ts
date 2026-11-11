import { createButton, createElement, createPanel } from './DomUtils';

export interface MainMenuCallbacks {
  start(): void;
  sandbox(): void;
  settings(): void;
}

export class MainMenu {
  private readonly panel: HTMLElement;
  constructor(root: HTMLElement, callbacks: MainMenuCallbacks) {
    this.panel = createPanel(root, 'main-menu');
    const eyebrow = createElement('p', 'eyebrow', 'SWIPE • ROLL • JUMP');
    const title = createElement('h1', 'game-title', 'BALL MOMENTUM');
    const description = createElement('p', 'panel-description', 'Build momentum, read the terrain, and time your jumps.');
    const actions = createElement('div', 'menu-actions');
    actions.append(
      createButton('Start game', callbacks.start, 'button button-primary'),
      createButton('Physics sandbox', callbacks.sandbox, 'button button-secondary'),
      createButton('Settings', callbacks.settings, 'button button-ghost'),
    );
    const help = createElement('p', 'control-hint', 'Swipe or drag on the playfield. Keyboard: A / D, S / Space, W.');
    this.panel.append(eyebrow, title, description, actions, help);
  }
  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }
}
