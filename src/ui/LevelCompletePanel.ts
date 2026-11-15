import { createButton, createElement, createPanel } from './DomUtils';

export class LevelCompletePanel {
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly nextButton: HTMLButtonElement;
  constructor(root: HTMLElement, callbacks: { replay(): void; next(): void; settings(): void; menu(): void }) {
    this.panel = createPanel(root, 'complete-menu');
    this.title = createElement('h2', 'panel-title', 'Level complete!');
    this.nextButton = createButton('Play next level', callbacks.next, 'button button-primary');
    this.panel.append(
      createElement('p', 'eyebrow', 'NICE RUN'), this.title,
      this.nextButton,
      createButton('Replay', callbacks.replay, 'button button-secondary'),
      createButton('Settings', callbacks.settings, 'button button-ghost'),
      createButton('Main menu', callbacks.menu, 'button button-danger button-ghost'),
    );
    this.panel.hidden = true;
  }
  setTitle(title: string): void { this.title.textContent = `${title} complete!`; }
  setNextAvailable(available: boolean): void { this.nextButton.hidden = !available; }
  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }
}
