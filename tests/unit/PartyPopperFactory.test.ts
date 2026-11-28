import { describe, expect, it, vi } from 'vitest';
import { PartyPopperFactory } from '../../src/level/PartyPopperFactory';
import type { IPhysicsWorld } from '../../src/physics/IPhysicsWorld';
import type { SensorOptions } from '../../src/physics/PhysicsTypes';
import type { PartyPopperRenderer } from '../../src/rendering/PartyPopperRenderer';

const popper = {
  id: 'party-popper-a', x: 240, y: 170, radius: 19,
  upwardLaunchSpeed: 700, forwardBoost: 240,
};

describe('PartyPopperFactory', () => {
  it('creates a matching one-shot sensor for every party popper', () => {
    const sensors: SensorOptions[] = [];
    const world = {
      createSensor: (definition: SensorOptions) => sensors.push(definition),
      removeSensor: vi.fn(),
    } as unknown as IPhysicsWorld;
    const renderer = { render: vi.fn(), clear: vi.fn(), collect: vi.fn() } as unknown as PartyPopperRenderer;
    const factory = new PartyPopperFactory(world, renderer);

    factory.build([popper]);

    expect(sensors).toEqual([{
      id: 'party-popper-a', type: 'partyPopper', x: 221, y: 151, width: 38, height: 38,
    }]);
    expect(renderer.render).toHaveBeenCalledWith([popper]);
  });

  it('returns and removes a party popper only once', () => {
    const world = { createSensor: vi.fn(), removeSensor: vi.fn() } as unknown as IPhysicsWorld;
    const renderer = { render: vi.fn(), clear: vi.fn(), collect: vi.fn() } as unknown as PartyPopperRenderer;
    const factory = new PartyPopperFactory(world, renderer);
    factory.build([popper]);

    expect(factory.collect(popper.id)).toEqual(popper);
    expect(factory.collect(popper.id)).toBeNull();
    expect(world.removeSensor).toHaveBeenCalledTimes(1);
    expect(world.removeSensor).toHaveBeenCalledWith(popper.id);
    expect(renderer.collect).toHaveBeenCalledTimes(1);
  });

  it('removes all remaining sensors and visuals when the level is cleared', () => {
    const world = { createSensor: vi.fn(), removeSensor: vi.fn() } as unknown as IPhysicsWorld;
    const renderer = { render: vi.fn(), clear: vi.fn(), collect: vi.fn() } as unknown as PartyPopperRenderer;
    const factory = new PartyPopperFactory(world, renderer);
    factory.build([popper]);
    factory.clear();

    expect(world.removeSensor).toHaveBeenCalledWith(popper.id);
    expect(renderer.clear).toHaveBeenCalled();
    expect(factory.collect(popper.id)).toBeNull();
  });
});
