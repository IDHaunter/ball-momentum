import { LevelRepository } from './LevelRepository';
import { LevelValidator } from './LevelValidator';
import type { LevelDefinition } from './LevelTypes';

export class LevelManager {
  constructor(private readonly repository = new LevelRepository(), private readonly validator = new LevelValidator()) {}

  async load(id: string): Promise<LevelDefinition> {
    const raw = await this.repository.load(id);
    return this.validator.validate(raw, `${id}.json`);
  }
}
