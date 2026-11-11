import type { Disposable } from '../core/Disposable';

export interface PlatformLifecycle extends Disposable {
  onPause(callback: () => void): void;
  onResume(callback: () => void): void;
}
