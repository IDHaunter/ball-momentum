import { describe, expect, it } from 'vitest';
import { GameStateMachine } from '../../src/core/GameStateMachine';

describe('GameStateMachine', () => {
  it('accepts legal game flow transitions', () => {
    const machine = new GameStateMachine();
    machine.transition('MAIN_MENU');
    machine.transition('LOADING_LEVEL');
    machine.transition('PLAYING');
    machine.transition('PAUSED');
    machine.transition('PLAYING');
    expect(machine.state).toBe('PLAYING');
  });
  it('rejects illegal transitions', () => {
    const machine = new GameStateMachine();
    expect(() => machine.transition('LEVEL_COMPLETE')).toThrow(/Illegal game state transition/);
  });
});
