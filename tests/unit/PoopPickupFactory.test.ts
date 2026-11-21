import { describe, expect, it, vi } from 'vitest';
import { PoopPickupFactory } from '../../src/level/PoopPickupFactory';
import type { IPhysicsWorld } from '../../src/physics/IPhysicsWorld';
import type { SensorOptions } from '../../src/physics/PhysicsTypes';
import type { PoopPickupRenderer } from '../../src/rendering/PoopPickupRenderer';

const pickup = {
  id: 'poop-boost', x: 240, y: 170, radius: 18,
  speedBoostPercent: 25, spinBoostPercent: 45,
};

describe('PoopPickupFactory', () => {
  it('creates a matching one-shot sensor around each visual pickup', () => {
    const sensors: SensorOptions[] = [];
    const world = {
      createSensor: (definition: SensorOptions) => sensors.push(definition),
      removeSensor: vi.fn(),
    } as unknown as IPhysicsWorld;
    const renderer = { render: vi.fn(), clear: vi.fn(), collect: vi.fn() } as unknown as PoopPickupRenderer;
    const factory = new PoopPickupFactory(world, renderer);

    factory.build([pickup]);

    expect(sensors).toEqual([{
      id: 'poop-boost', type: 'poop', x: 222, y: 152, width: 36, height: 36,
    }]);
    expect(renderer.render).toHaveBeenCalledWith([pickup]);
  });

  it('returns and removes a pickup only once', () => {
    const world = {
      createSensor: vi.fn(), removeSensor: vi.fn(),
    } as unknown as IPhysicsWorld;
    const renderer = { render: vi.fn(), clear: vi.fn(), collect: vi.fn() } as unknown as PoopPickupRenderer;
    const factory = new PoopPickupFactory(world, renderer);
    factory.build([pickup]);

    expect(factory.collect('poop-boost')).toEqual(pickup);
    expect(factory.collect('poop-boost')).toBeNull();
    expect(world.removeSensor).toHaveBeenCalledTimes(1);
    expect(world.removeSensor).toHaveBeenCalledWith('poop-boost');
    expect(renderer.collect).toHaveBeenCalledTimes(1);
  });

  it('clears remaining sensor bodies and visuals with the level', () => {
    const world = {
      createSensor: vi.fn(), removeSensor: vi.fn(),
    } as unknown as IPhysicsWorld;
    const renderer = { render: vi.fn(), clear: vi.fn(), collect: vi.fn() } as unknown as PoopPickupRenderer;
    const factory = new PoopPickupFactory(world, renderer);
    factory.build([pickup]);
    factory.clear();

    expect(world.removeSensor).toHaveBeenCalledWith('poop-boost');
    expect(renderer.clear).toHaveBeenCalled();
    expect(factory.collect('poop-boost')).toBeNull();
  });
});
