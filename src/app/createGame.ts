import Phaser from 'phaser';
import { GAME_DEFAULTS } from '../config/game.defaults';
import { PHYSICS_DEFAULTS } from '../config/physics.defaults';
import { GameRegistry } from './GameRegistry';
import { BootScene } from '../scenes/BootScene';
import { GameplayScene } from '../scenes/GameplayScene';

export function createGame(parent: HTMLElement): { game: Phaser.Game; registry: GameRegistry } {
  const registry = new GameRegistry();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: GAME_DEFAULTS.width,
    height: GAME_DEFAULTS.height,
    backgroundColor: GAME_DEFAULTS.backgroundColor,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: '100%',
      height: '100%',
    },
    render: { antialias: true, roundPixels: false },
    physics: {
      default: 'matter',
      matter: {
        enabled: true,
        gravity: {
          x: PHYSICS_DEFAULTS.world.gravityX,
          y: PHYSICS_DEFAULTS.world.gravityY,
          scale: PHYSICS_DEFAULTS.world.gravityScale,
        },
        autoUpdate: false,
        debug: false,
      },
    },
    scene: [new BootScene(), new GameplayScene(registry)],
  });
  return { game, registry };
}
