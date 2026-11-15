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


describe('menu return transitions', () => {
  it('allows returning to the main menu from a paused level', () => {
    const machine = new GameStateMachine();
    machine.transition('MAIN_MENU');
    machine.transition('LOADING_LEVEL');
    machine.transition('PLAYING');
    machine.transition('PAUSED');
    machine.transition('MAIN_MENU');
    expect(machine.state).toBe('MAIN_MENU');
  });

  it('allows returning to the main menu after a completed level', () => {
    const machine = new GameStateMachine();
    machine.transition('MAIN_MENU');
    machine.transition('LOADING_LEVEL');
    machine.transition('PLAYING');
    machine.transition('LEVEL_COMPLETE');
    machine.transition('MAIN_MENU');
    expect(machine.state).toBe('MAIN_MENU');
  });
});
