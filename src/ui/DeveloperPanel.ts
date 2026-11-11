import type { PhysicsConfig } from '../config/config.types';
import { createButton, createElement, createPanel } from './DomUtils';

interface TuningField { label: string; path: string; min: number; max: number; step: number; }
const FIELDS: TuningField[] = [
  { label: 'Gravity Y', path: 'world.gravityY', min: 0, max: 2.5, step: 0.05 },
  { label: 'Gravity scale', path: 'world.gravityScale', min: 0.0001, max: 0.003, step: 0.0001 },
  { label: 'Swipe impulse min', path: 'horizontalControl.minVelocityDelta', min: 10, max: 300, step: 5 },
  { label: 'Swipe impulse max', path: 'horizontalControl.maxVelocityDelta', min: 20, max: 500, step: 5 },
  { label: 'Max horizontal speed', path: 'horizontalControl.maxHorizontalSpeed', min: 200, max: 1500, step: 10 },
  { label: 'Ground drag', path: 'drag.groundHorizontalDragPerSecond', min: 0, max: 3, step: 0.05 },
  { label: 'Air drag', path: 'drag.airHorizontalDragPerSecond', min: 0, max: 1, step: 0.01 },
  { label: 'Jump velocity', path: 'jump.baseVelocity', min: 200, max: 1000, step: 10 },
  { label: 'Air boost delta', path: 'airBoost.velocityDelta', min: 50, max: 500, step: 10 },
  { label: 'Boost sweet spot (ms)', path: 'airBoost.sweetSpotAfterTakeoffMs', min: 100, max: 900, step: 10 },
  { label: 'Ball radius (rebuild)', path: 'ball.radiusPx', min: 8, max: 32, step: 1 },
];

export class DeveloperPanel {
  private readonly panel: HTMLElement;
  private readonly values = new Map<string, HTMLInputElement>();
  constructor(root: HTMLElement, callbacks: { change(path: string, value: number): void; reset(): void; close(): void; getConfig(): PhysicsConfig }) {
    this.panel = createPanel(root, 'developer-panel');
    const header = createElement('div', 'developer-header');
    header.append(createElement('strong', '', 'Physics tuning'), createButton('×', callbacks.close, 'button button-small button-ghost'));
    this.panel.append(header);
    for (const field of FIELDS) {
      const row = createElement('label', 'tuning-row');
      const label = createElement('span', 'tuning-label', field.label);
      const input = document.createElement('input');
      input.type = 'range'; input.min = String(field.min); input.max = String(field.max); input.step = String(field.step);
      input.value = String(this.readPath(callbacks.getConfig(), field.path));
      const output = createElement('output', 'tuning-value', input.value);
      input.addEventListener('input', () => {
        const value = Number(input.value); output.textContent = String(value); callbacks.change(field.path, value);
      });
      row.append(label, input, output); this.panel.append(row); this.values.set(field.path, input);
    }
    this.panel.append(createButton('Reset defaults', callbacks.reset, 'button button-secondary button-small'));
    this.panel.hidden = true;
  }
  show(): void { this.panel.hidden = false; }
  hide(): void { this.panel.hidden = true; }
  setValues(config: PhysicsConfig): void {
    for (const field of FIELDS) {
      const input = this.values.get(field.path);
      if (input) input.value = String(this.readPath(config, field.path));
      const output = input?.nextElementSibling;
      if (output) output.textContent = input?.value ?? '';
    }
  }
  private readPath(config: PhysicsConfig, path: string): number {
    const [section, property] = path.split('.') as [keyof PhysicsConfig, string];
    return (config[section] as unknown as Record<string, number>)[property];
  }
}
