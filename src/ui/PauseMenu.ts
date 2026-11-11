import { createButton, createElement, createPanel } from './DomUtils';

export class PauseMenu {
  private readonly panel: HTMLElement;
  constructor(root: HTMLElement, callbacks: { resume(): void; restart(): void; menu(): void }) {
    this.panel = createPanel(root, 'pause-menu');
    this.panel.append(
      createElement('p', 'eyebrow', 'GAME PAUSED'),
      createElement('h2', 'panel-title', 'Take a breather'),
      createButton('Resume', callbacks.resume, 'button button-primary'),
      createButton('Restart level', callbacks.restart, 'button button-secondary'),
      createButton('Main menu', callbacks.menu, 'button button-ghost'),
    );
    this.panel.hidden = true;
  }
  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }
}
