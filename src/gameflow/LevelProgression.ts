export class LevelProgression {
  constructor(private readonly levelIds: string[]) {}
  next(currentId: string): string | null {
    const index = this.levelIds.indexOf(currentId);
    return index >= 0 && index < this.levelIds.length - 1 ? this.levelIds[index + 1] : null;
  }
}
