import type Phaser from 'phaser';
import { createGame } from './createGame';
import { GameRegistry } from './GameRegistry';
import { MainMenu } from '../ui/MainMenu';
import { GameHud } from '../ui/GameHud';
import { PauseMenu } from '../ui/PauseMenu';
import { LevelCompletePanel } from '../ui/LevelCompletePanel';
import { SettingsPanel } from '../ui/SettingsPanel';
import { DeveloperPanel } from '../ui/DeveloperPanel';
import { LocalStorageProgressRepository } from '../platform/Storage/LocalStorageProgressRepository';
import { BrowserLifecycleAdapter } from '../platform/BrowserLifecycleAdapter';

export class GameApplication {
  private readonly game: Phaser.Game;
  private readonly registry: GameRegistry;
  private readonly menu: MainMenu;
  private readonly hud: GameHud;
  private readonly pause: PauseMenu;
  private readonly complete: LevelCompletePanel;
  private readonly settings: SettingsPanel;
  private readonly developer: DeveloperPanel;
  private readonly progress = new LocalStorageProgressRepository();
  private readonly lifecycle = new BrowserLifecycleAdapter();
  private readonly unsubscribers: Array<() => void> = [];
  private autoPaused = false;

  constructor(gameContainer: HTMLElement, uiRoot: HTMLElement) {
    const created = createGame(gameContainer);
    this.game = created.game;
    this.registry = created.registry;
    document.documentElement.dataset.reducedMotion = String(this.progress.getPreferences().reducedMotion);

    this.menu = new MainMenu(uiRoot, {
      start: () => void this.registry.gameplayScene?.startLevel('level-01'),
      sandbox: () => void this.registry.gameplayScene?.startLevel('physics-sandbox'),
      settings: () => { this.menu.hide(); this.settings.show(); },
    });
    this.hud = new GameHud(uiRoot, {
      pause: () => this.registry.gameplayScene?.pauseGame(),
      restart: () => void this.registry.gameplayScene?.restartLevel(),
    });
    this.pause = new PauseMenu(uiRoot, {
      resume: () => this.registry.gameplayScene?.resumeGame(),
      restart: () => void this.registry.gameplayScene?.restartLevel(),
      menu: () => this.registry.gameplayScene?.returnToMenu(),
    });
    this.complete = new LevelCompletePanel(uiRoot, {
      replay: () => void this.registry.gameplayScene?.restartLevel(),
      next: () => void this.registry.gameplayScene?.nextLevel(),
      menu: () => this.registry.gameplayScene?.returnToMenu(),
    });
    this.settings = new SettingsPanel(uiRoot, {
      initial: this.progress.getPreferences(),
      save: (value) => {
        this.progress.savePreferences(value);
        document.documentElement.dataset.reducedMotion = String(value.reducedMotion);
      },
      close: () => { this.settings.hide(); this.menu.show(); },
    });
    this.developer = new DeveloperPanel(uiRoot, {
      change: (path, value) => this.registry.gameplayScene?.applyDebugSetting(path, value),
      reset: () => this.resetPhysicsDefaults(),
      close: () => this.developer.hide(),
      getConfig: () => this.registry.gameplayScene?.physicsSettings ?? this.defaultPhysicsFallback(),
    });

    this.unsubscribers.push(
      this.registry.events.on('stateChanged', ({ state }) => this.renderState(state)),
      this.registry.events.on('levelLoaded', ({ title }) => { this.hud.setTitle(title); this.hideError(); }),
      this.registry.events.on('completed', ({ title, hasNext }) => { this.complete.setTitle(title); this.complete.setNextAvailable(hasNext); }),
      this.registry.events.on('boostChanged', ({ available, used }) => this.hud.setBoost(available, used)),
      this.registry.events.on('debugChanged', ({ enabled }) => {
        if (enabled) { this.developer.setValues(this.registry.gameplayScene?.physicsSettings ?? this.defaultPhysicsFallback()); this.developer.show(); }
        else this.developer.hide();
      }),
      this.registry.events.on('error', ({ message }) => this.showError(message)),
    );
    this.lifecycle.onPause(() => {
      if (this.registry.flow.state === 'PLAYING') {
        this.autoPaused = true;
        this.registry.gameplayScene?.pauseGame();
      }
    });
    this.lifecycle.onResume(() => {
      if (this.autoPaused && this.registry.flow.state === 'PAUSED') {
        this.autoPaused = false;
        this.registry.gameplayScene?.resumeGame();
      }
    });
    this.renderState('MAIN_MENU');
    if (new URLSearchParams(window.location.search).get('debug') === '1') {
      this.developer.setValues(this.registry.gameplayScene?.physicsSettings ?? this.defaultPhysicsFallback());
      this.developer.show();
    }
  }

  destroy(): void {
    for (const unsubscribe of this.unsubscribers) unsubscribe();
    this.lifecycle.dispose();
    this.game.destroy(true);
  }

  private renderState(state: string): void {
    this.menu.hide(); this.hud.hide(); this.pause.hide(); this.complete.hide();
    if (state === 'MAIN_MENU') this.menu.show();
    else if (state === 'PLAYING' || state === 'PAUSED' || state === 'RESPAWNING') this.hud.show();
    if (state === 'PAUSED') this.pause.show();
    if (state === 'LEVEL_COMPLETE') this.complete.show();
  }

  private hideError(): void {
    const banner = document.getElementById('error-banner');
    if (!banner) return;
    banner.textContent = '';
    banner.hidden = true;
  }

  private showError(message: string): void {
    const banner = document.getElementById('error-banner');
    if (!banner) return;
    banner.textContent = message;
    banner.hidden = false;
  }

  private resetPhysicsDefaults(): void {
    const scene = this.registry.gameplayScene;
    if (!scene) return;
    const defaults = this.defaultPhysicsFallback();
    const paths = [
      'world.gravityY', 'world.gravityScale',
      'horizontalControl.minVelocityDelta', 'horizontalControl.maxVelocityDelta',
      'horizontalControl.maxHorizontalSpeed',
      'drag.groundHorizontalDragPerSecond', 'drag.airHorizontalDragPerSecond',
      'jump.baseVelocity', 'airBoost.velocityDelta', 'airBoost.sweetSpotAfterTakeoffMs',
      'ball.radiusPx',
      'wallBounce.restitution', 'wallBounce.tangentRetention', 'wallBounce.minimumImpactSpeed',
      'wallBounce.minimumOutgoingSpeed', 'wallBounce.separationDistancePx', 'wallBounce.spinRetention',
      'landingBounce.restitution', 'landingBounce.tangentRetention', 'landingBounce.minimumImpactSpeed',
      'landingBounce.minimumOutgoingSpeed', 'landingBounce.maxBounces', 'landingBounce.separationDistancePx',
    ];
    for (const path of paths) {
      const [section, property] = path.split('.') as [keyof typeof defaults, string];
      scene.applyDebugSetting(path, (defaults[section] as unknown as Record<string, number>)[property]);
    }
    this.developer.setValues(scene.physicsSettings);
  }

  private defaultPhysicsFallback() {
    return {
      timestep: { hz: 60, maxFrameDeltaMs: 100, maxSubStepsPerFrame: 5 },
      world: { gravityX: 0, gravityY: 1, gravityScale: 0.001, timeScale: 1 },
      ball: { radiusPx: 18, mass: 1, restitution: 0.05, friction: 0.8, frictionStatic: 0.8, frictionAir: 0, fixedRotation: false },
      horizontalControl: { minVelocityDelta: 65, maxVelocityDelta: 180, maxHorizontalSpeed: 840, airControlMultiplier: 0.75, actionCooldownMs: 70 },
      drag: { groundHorizontalDragPerSecond: 0.85, airHorizontalDragPerSecond: 0.1 },
      jump: { baseVelocity: 540, minStrengthMultiplier: 0.85, maxStrengthMultiplier: 1.15, coyoteTimeMs: 100, bufferTimeMs: 120, anticipationMs: 60 },
      airBoost: { velocityDelta: 210, minStrengthMultiplier: 0.8, maxStrengthMultiplier: 1.2, earliestAfterTakeoffMs: 60, latestAfterTakeoffMs: 1000, sweetSpotAfterTakeoffMs: 440, sweetSpotToleranceMs: 180, edgeTimingMultiplier: 0.65, maxUpwardSpeed: 900 },
      limits: { maxHorizontalSpeed: 840, maxUpwardSpeed: 900, maxDownwardSpeed: 1100 },
      groundContact: { maxGroundAngleDegrees: 55, supportGraceMs: 35 },
      wallBounce: { restitution: 0.86, tangentRetention: 0.98, spinRetention: 0.85, minimumImpactSpeed: 10, minimumOutgoingSpeed: 125, separationDistancePx: 3 },
      landingBounce: { restitution: 0.52, tangentRetention: 0.96, minimumImpactSpeed: 45, minimumOutgoingSpeed: 35, maxBounces: 3, separationDistancePx: 1.5 },
    };
  }
}
