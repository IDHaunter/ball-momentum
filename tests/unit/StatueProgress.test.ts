import { describe, expect, it } from 'vitest';
import { StatueProgress } from '../../src/gameflow/StatueProgress';

describe('StatueProgress', () => {
  it('starts with every configured statue outstanding', () => {
    const progress = new StatueProgress(['one', 'two']);
    expect(progress.snapshot).toEqual({ completed: 0, total: 2, remaining: 2, complete: false });
  });

  it('counts each configured statue only once', () => {
    const progress = new StatueProgress(['one', 'two']);
    expect(progress.activate('one')).toBe(true);
    expect(progress.activate('one')).toBe(false);
    expect(progress.activate('unknown')).toBe(false);
    expect(progress.snapshot).toEqual({ completed: 1, total: 2, remaining: 1, complete: false });
    expect(progress.activate('two')).toBe(true);
    expect(progress.snapshot).toEqual({ completed: 2, total: 2, remaining: 0, complete: true });
  });

  it('allows levels without statues to complete normally', () => {
    const progress = new StatueProgress();
    expect(progress.snapshot).toEqual({ completed: 0, total: 0, remaining: 0, complete: true });
  });
});
