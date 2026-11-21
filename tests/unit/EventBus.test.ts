import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '../../src/core/EventBus';

describe('EventBus', () => {
  it('emits the complete poop pickup collection event payload', () => {
    const events = new EventBus();
    const listener = vi.fn();
    events.on('pickupCollected', listener);

    const payload = {
      id: 'poop-boost-01',
      type: 'poop' as const,
      speedBoostPercent: 25,
      spinBoostPercent: 45,
      speedBefore: 120,
      speedAfter: 150,
      spinBefore: 8,
      spinAfter: 11.6,
    };

    events.emit('pickupCollected', payload);

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith(payload);
  });
});
