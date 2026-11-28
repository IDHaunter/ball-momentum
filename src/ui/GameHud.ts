import { createButton, createElement, createPanel } from './DomUtils';

export class GameHud {
  private readonly panel: HTMLElement;
  private readonly title: HTMLElement;
  private readonly boost: HTMLElement;
  private readonly statues: HTMLElement;
  private readonly goalRequirement: HTMLElement;
  constructor(root: HTMLElement, callbacks: { pause(): void; restart(): void }) {
    this.panel = createPanel(root, 'game-hud');
    const left = createElement('div', 'hud-left');
    this.title = createElement('strong', 'hud-level-title', 'Ball Momentum');
    this.boost = createElement('span', 'boost-indicator', 'BOOST READY');
    this.statues = createElement('span', 'statue-indicator', 'STATUES 0 / 0');
    left.append(this.title, this.boost, this.statues);
    const right = createElement('div', 'hud-actions');
    right.append(
      createButton('Restart', callbacks.restart, 'button button-small button-ghost'),
      createButton('Pause', callbacks.pause, 'button button-small button-secondary'),
    );
    this.goalRequirement = createElement('div', 'portal-requirement', '');
    this.goalRequirement.hidden = true;
    this.panel.append(left, right, this.goalRequirement);
    this.panel.hidden = true;
  }
  setTitle(title: string): void { this.title.textContent = title; }
  setBoost(available: boolean, used: boolean): void {
    this.boost.textContent = available ? 'BOOST READY' : used ? 'BOOST USED' : 'BOOST LOCKED';
    this.boost.classList.toggle('is-ready', available);
  }
  setStatueProgress(progress: { completed: number; total: number; remaining: number; complete: boolean }): void {
    this.statues.hidden = progress.total === 0;
    this.statues.textContent = `STATUES ${progress.completed} / ${progress.total}`;
    this.statues.classList.toggle('is-complete', progress.complete && progress.total > 0);
    if (progress.complete) this.goalRequirement.hidden = true;
    else if (!this.goalRequirement.hidden) {
      this.goalRequirement.textContent = `PORTAL LOCKED · ACTIVATE ALL STATUES (${progress.remaining} LEFT)`;
    }
  }
  clearGoalBlocked(): void { this.goalRequirement.hidden = true; }
  showGoalBlocked(progress: { completed: number; total: number; remaining: number }): void {
    if (progress.total === 0 || progress.remaining === 0) return;
    this.goalRequirement.textContent = `PORTAL LOCKED · ACTIVATE ALL STATUES (${progress.remaining} LEFT)`;
    this.goalRequirement.hidden = false;
  }
  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }
}
