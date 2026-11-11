export class CompletionManager {
  private completed = false;
  complete(): boolean {
    if (this.completed) return false;
    this.completed = true;
    return true;
  }
  reset(): void { this.completed = false; }
}
