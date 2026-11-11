import { createButton, createElement, createPanel } from './DomUtils';

export class GameHud {
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly boost: HTMLElement;
  constructor(root: HTMLElement, callbacks: { pause(): void; restart(): void }) {
    this.panel = createPanel(root, 'game-hud');
    const left = createElement('div', 'hud-left');
    this.title = createElement('strong', 'hud-level-title', 'Ball Momentum');
    this.boost = createElement('span', 'boost-indicator', 'BOOST READY');
    left.append(this.title, this.boost);
    const right = createElement('div', 'hud-actions');
    right.append(
      createButton('Restart', callbacks.restart, 'button button-small button-ghost'),
      createButton('Pause', callbacks.pause, 'button button-small button-secondary'),
    );
    this.panel.append(left, right);
    this.panel.hidden = true;
  }
  setTitle(title: string): void { this.title.textContent = title; }
  setBoost(available: boolean, used: boolean): void {
    this.boost.textContent = available ? 'BOOST READY' : used ? 'BOOST USED' : 'BOOST LOCKED';
    this.boost.classList.toggle('is-ready', available);
  }
  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }
}
