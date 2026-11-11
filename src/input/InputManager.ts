import type { InputConfig } from '../config/config.types';
import type { Disposable } from '../core/Disposable';
import type { PlayerAction } from './PlayerAction';
import { PointerInputAdapter } from './PointerInputAdapter';
import { KeyboardInputAdapter, type KeyboardShortcut } from './KeyboardInputAdapter';

export class InputManager implements Disposable {
  private readonly pointer: PointerInputAdapter;
  private readonly keyboard: KeyboardInputAdapter;

  constructor(
    canvas: HTMLCanvasElement,
    config: InputConfig,
    emit: (action: PlayerAction) => void,
    shortcut: (name: KeyboardShortcut) => void,
    enabled: () => boolean,
  ) {
    this.pointer = new PointerInputAdapter(canvas, config, emit, enabled);
    this.keyboard = new KeyboardInputAdapter(config, emit, shortcut, enabled);
  }

  clear(): void { this.pointer.clear(); this.keyboard.clear(); }
  dispose(): void { this.pointer.dispose(); this.keyboard.dispose(); }
}
