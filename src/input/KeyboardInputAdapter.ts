import type { InputConfig } from '../config/config.types';
import type { Disposable } from '../core/Disposable';
import type { PlayerAction } from './PlayerAction';

export type KeyboardShortcut = 'pause' | 'restart' | 'debug';

export class KeyboardInputAdapter implements Disposable {
  private readonly pressed = new Set<string>();
  private readonly lastActionAt = new Map<string, number>();
  private readonly down = (event: KeyboardEvent) => this.onDown(event);
  private readonly up = (event: KeyboardEvent) => this.onUp(event);
  private readonly blur = () => this.clear();

  constructor(
    private readonly config: InputConfig,
    private readonly emit: (action: PlayerAction) => void,
    private readonly shortcut: (name: KeyboardShortcut) => void,
    private readonly enabled: () => boolean,
  ) {
    window.addEventListener('keydown', this.down);
    window.addEventListener('keyup', this.up);
    window.addEventListener('blur', this.blur);
  }

  private onDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();
    const target = event.target as HTMLElement | null;
    const isUiControl = Boolean(target?.closest('button, input, select, textarea, a, [contenteditable="true"]'));
    if (isUiControl && key !== 'escape' && key !== 'f3') return;
    if (['arrowleft', 'arrowright', 'arrowup', 'arrowdown', ' ', 'escape'].includes(key)) event.preventDefault();
    if (this.pressed.has(key)) return;
    this.pressed.add(key);

    if (key === 'escape' || key === 'p') { this.shortcut('pause'); return; }
    if (key === 'r') { this.shortcut('restart'); return; }
    if (key === 'f3') { event.preventDefault(); this.shortcut('debug'); return; }
    if (!this.enabled()) return;

    const now = performance.now();
    const last = this.lastActionAt.get(key) ?? -Infinity;
    if (now - last < this.config.keyboardActionCooldownMs) return;
    this.lastActionAt.set(key, now);

    const types: Record<string, PlayerAction['type'] | undefined> = {
      arrowleft: 'MOVE_LEFT', a: 'MOVE_LEFT',
      arrowright: 'MOVE_RIGHT', d: 'MOVE_RIGHT',
      arrowdown: 'JUMP', s: 'JUMP', ' ': 'JUMP',
      arrowup: 'AIR_BOOST', w: 'AIR_BOOST',
    };
    const type = types[key];
    if (type) this.emit({ type, strength: 0.65, source: 'keyboard', timestamp: now } as PlayerAction);
  }

  private onUp(event: KeyboardEvent): void { this.pressed.delete(event.key.toLowerCase()); }
  clear(): void { this.pressed.clear(); }
  dispose(): void {
    window.removeEventListener('keydown', this.down);
    window.removeEventListener('keyup', this.up);
    window.removeEventListener('blur', this.blur);
    this.clear();
  }
}
