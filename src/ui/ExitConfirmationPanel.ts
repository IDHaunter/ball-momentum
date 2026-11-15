import { createButton, createElement, createPanel } from './DomUtils';

export class ExitConfirmationPanel {
  private readonly panel: HTMLElement;

  constructor(root: HTMLElement, callbacks: { confirm(): void; cancel(): void }) {
    this.panel = createPanel(root, 'confirm-menu');
    this.panel.setAttribute('role', 'dialog');
    this.panel.setAttribute('aria-modal', 'true');
    this.panel.setAttribute('aria-labelledby', 'exit-confirmation-title');

    const title = createElement('h2', 'panel-title', 'Leave this level?');
    title.id = 'exit-confirmation-title';
    const description = createElement(
      'p',
      'panel-description confirmation-description',
      'Your current run and checkpoint will be discarded. Previously completed levels and saved settings will be kept.',
    );
    this.panel.append(
      createElement('p', 'eyebrow', 'PROGRESS WARNING'),
      title,
      description,
      createButton('Leave level', callbacks.confirm, 'button button-danger'),
      createButton('Stay in game', callbacks.cancel, 'button button-primary'),
    );
    this.panel.hidden = true;
  }

  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }
}
