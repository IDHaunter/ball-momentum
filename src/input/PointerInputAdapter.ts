import type { InputConfig } from '../config/config.types';
import type { Disposable } from '../core/Disposable';
import { GestureRecognizer } from './GestureRecognizer';
import type { PlayerAction } from './PlayerAction';

interface PointerStart { id: number; x: number; y: number; time: number; source: 'touch' | 'mouse' }

export class PointerInputAdapter implements Disposable {
  private readonly recognizer: GestureRecognizer;
  private active: PointerStart | null = null;
  private readonly down = (event: PointerEvent) => this.onDown(event);
  private readonly up = (event: PointerEvent) => this.onUp(event);
  private readonly cancel = () => { this.active = null; };

  constructor(
    private readonly canvas: HTMLCanvasElement,
    config: InputConfig,
    private readonly emit: (action: PlayerAction) => void,
    private readonly enabled: () => boolean,
  ) {
    this.recognizer = new GestureRecognizer(config);
    canvas.addEventListener('pointerdown', this.down);
    canvas.addEventListener('pointerup', this.up);
    canvas.addEventListener('pointercancel', this.cancel);
    canvas.addEventListener('lostpointercapture', this.cancel);
  }

  private onDown(event: PointerEvent): void {
    if (!this.enabled() || this.active) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest('button, input, select, textarea, a, [data-ui-control]')) return;
    const rect = this.canvas.getBoundingClientRect();
    this.active = {
      id: event.pointerId,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
      time: performance.now(),
      source: event.pointerType === 'mouse' ? 'mouse' : 'touch',
    };
    this.canvas.setPointerCapture?.(event.pointerId);
    event.preventDefault();
  }

  private onUp(event: PointerEvent): void {
    if (!this.active || event.pointerId !== this.active.id) return;
    const start = this.active;
    this.active = null;
    if (!this.enabled()) return;
    const rect = this.canvas.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;
    const endTime = performance.now();
    const action = this.recognizer.recognize({
      startX: start.x, startY: start.y, endX, endY,
      durationMs: endTime - start.time,
      source: start.source,
      timestamp: endTime,
    });
    if (action) this.emit(action);
    event.preventDefault();
  }

  clear(): void { this.active = null; }
  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.down);
    this.canvas.removeEventListener('pointerup', this.up);
    this.canvas.removeEventListener('pointercancel', this.cancel);
    this.canvas.removeEventListener('lostpointercapture', this.cancel);
    this.active = null;
  }
}
