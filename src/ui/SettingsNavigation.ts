export type SettingsOrigin = 'main-menu' | 'pause' | 'complete';

/** Remembers which menu should be restored after Settings is closed. */
export class SettingsNavigation {
  private origin: SettingsOrigin = 'main-menu';

  openFrom(origin: SettingsOrigin): void {
    this.origin = origin;
  }

  closeTo(): SettingsOrigin {
    const origin = this.origin;
    this.origin = 'main-menu';
    return origin;
  }
}
