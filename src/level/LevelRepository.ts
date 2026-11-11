import type { LevelDefinition } from './LevelTypes';

export class LevelRepository {
  async load(id: string): Promise<LevelDefinition> {
    const url = `${import.meta.env.BASE_URL}levels/${encodeURIComponent(id)}.json`;
    const response = await fetch(url, { cache: 'no-cache' });
    if (!response.ok) throw new Error(`Unable to load level "${id}" (${response.status} ${response.statusText})`);
    return await response.json() as LevelDefinition;
  }
}
