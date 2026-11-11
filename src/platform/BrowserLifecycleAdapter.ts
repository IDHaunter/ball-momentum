import type { PlatformLifecycle } from './PlatformLifecycle';

export class BrowserLifecycleAdapter implements PlatformLifecycle {
  private pauseCallback: () => void = () => undefined;
  private resumeCallback: () => void = () => undefined;
  private readonly visibility = () => {
    if (document.hidden) this.pauseCallback();
    else this.resumeCallback();
  };
  private readonly blur = () => this.pauseCallback();
  private readonly focus = () => this.resumeCallback();

  constructor() {
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('blur', this.blur);
    window.addEventListener('focus', this.focus);
  }

  onPause(callback: () => void): void { this.pauseCallback = callback; }
  onResume(callback: () => void): void { this.resumeCallback = callback; }
  dispose(): void {
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('focus', this.focus);
  }
}
