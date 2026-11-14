import Phaser from 'phaser';
import { GAME_DEFAULTS } from '../config/game.defaults';
import { INPUT_DEFAULTS } from '../config/input.defaults';
import { createPhysicsConfig } from '../config/physics.defaults';
import { RENDER_DEFAULTS } from '../config/render.defaults';
import type { PhysicsConfig } from '../config/config.types';
import { GameClock } from '../core/GameClock';
import type { PlayerAction } from '../input/PlayerAction';
import { InputQueue } from '../input/InputQueue';
import { InputManager } from '../input/InputManager';
import type { KeyboardShortcut } from '../input/KeyboardInputAdapter';
import { BallController } from '../player/BallController';
import { BallRenderer } from '../rendering/BallRenderer';
import { BallVisualController } from '../player/BallVisualController';
import { EffectsRenderer } from '../rendering/EffectsRenderer';
import { DebugRenderer } from '../rendering/DebugRenderer';
import { MatterPhysicsWorld } from '../physics/MatterPhysicsWorld';
import type { PhysicsEvent } from '../physics/PhysicsTypes';
import { LevelManager } from '../level/LevelManager';
import type { LevelDefinition } from '../level/LevelTypes';
import { LevelBuilder } from '../level/LevelBuilder';
import { FollowCameraController } from '../camera/FollowCameraController';
import { CheckpointManager } from '../gameflow/CheckpointManager';
import { RespawnManager } from '../gameflow/RespawnManager';
import { CompletionManager } from '../gameflow/CompletionManager';
import { LevelProgression } from '../gameflow/LevelProgression';
import { LocalStorageProgressRepository } from '../platform/Storage/LocalStorageProgressRepository';
import type { GameRegistry } from '../app/GameRegistry';
import type { GameState } from '../core/GameState';
import { FIXED_STEP_MS } from '../utils/TimeUtils';
import { calculateNormalImpactEnergy } from '../physics/ImpactEnergy';

export class GameplayScene extends Phaser.Scene {
  private readonly gameRegistry: GameRegistry;
  private readonly physicsConfig: PhysicsConfig = createPhysicsConfig();
  private readonly clock = new GameClock();
  private readonly inputQueue = new InputQueue();
  private readonly levelManager = new LevelManager();
  private readonly progress = new LocalStorageProgressRepository();
  private readonly respawn = new RespawnManager();
  private readonly completion = new CompletionManager();
  private readonly progression = new LevelProgression(GAME_DEFAULTS.levelIds);
  private physicsWorld!: MatterPhysicsWorld;
  private levelBuilder!: LevelBuilder;
  private cameraController!: FollowCameraController;
  private debugRenderer!: DebugRenderer;
  private effects!: EffectsRenderer;
  private inputManager!: InputManager;
  private ball: BallController | null = null;
  private ballRenderer: BallRenderer | null = null;
  private ballVisual: BallVisualController | null = null;
  private checkpoint: CheckpointManager | null = null;
  private level: LevelDefinition | null = null;
  private currentLevelId = GAME_DEFAULTS.initialLevelId;
  private physicsEvents: PhysicsEvent[] = [];
  private accumulator = 0;
  private lastSubsteps = 0;
  private debugEnabled = new URLSearchParams(window.location.search).get('debug') === '1';
  private levelStartedAtMs = 0;
  private autoPaused = false;
  private lastBoostIndicator = '';
  private resolveSceneReady!: () => void;
  private readonly sceneReady = new Promise<void>((resolve) => { this.resolveSceneReady = resolve; });

  constructor(registry: GameRegistry) {
    super({ key: 'GameplayScene' });
    this.gameRegistry = registry;
    this.gameRegistry.gameplayScene = this;
  }

  create(): void {
    this.physicsWorld = new MatterPhysicsWorld(this);
    this.physicsWorld.onPhysicsEvent((event) => this.physicsEvents.push(event));
    this.physicsWorld.setGravity(this.physicsConfig.world.gravityX, this.physicsConfig.world.gravityY, this.physicsConfig.world.gravityScale);
    this.physicsWorld.setTimeScale(this.physicsConfig.world.timeScale);
    this.levelBuilder = new LevelBuilder(this, this.physicsWorld);
    this.cameraController = new FollowCameraController(this.cameras.main, RENDER_DEFAULTS);
    this.debugRenderer = new DebugRenderer(this);
    this.effects = new EffectsRenderer(this, this.progress.getPreferences().reducedMotion);
    this.inputManager = new InputManager(
      this.game.canvas,
      INPUT_DEFAULTS,
      (action) => this.inputQueue.push(action),
      (shortcut) => this.handleShortcut(shortcut),
      () => this.gameRegistry.flow.state === 'PLAYING',
    );
    this.debugRenderer.setVisible(this.debugEnabled);
    if (this.gameRegistry.flow.state === 'BOOT') this.gameRegistry.flow.transition('MAIN_MENU');
    if (this.debugEnabled) this.gameRegistry.events.emit('debugChanged', { enabled: true });
    this.resolveSceneReady();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.shutdown());
  }

  async startLevel(id: string): Promise<void> {
    await this.sceneReady;
    let currentState = this.gameRegistry.flow.state;
    if (currentState === 'BOOT') { this.gameRegistry.flow.transition('MAIN_MENU'); currentState = 'MAIN_MENU'; }
    if (currentState !== 'LOADING_LEVEL') this.gameRegistry.flow.transition('LOADING_LEVEL');
    this.currentLevelId = id;
    this.accumulator = 0;
    this.inputManager?.clear();
    this.inputQueue.clear();
    this.respawn.reset();
    this.completion.reset();
    this.ball?.dispose();
    this.ball = null;
    this.ballRenderer?.destroy();
    this.ballRenderer = null;
    this.ballVisual = null;
    this.physicsWorld?.removeLevelBodies();
    this.levelBuilder?.clear();

    try {
      const level = await this.levelManager.load(id);
      this.level = level;
      this.clock.reset();
      this.physicsEvents = [];
      this.physicsWorld.setGravity(this.physicsConfig.world.gravityX, this.physicsConfig.world.gravityY, this.physicsConfig.world.gravityScale);
      this.physicsWorld.setTimeScale(this.physicsConfig.world.timeScale);
      this.levelBuilder.build(level);
      this.checkpoint = new CheckpointManager(level.spawn);
      const preferences = this.progress.getPreferences();
      this.effects.setReducedMotion(preferences.reducedMotion);
      this.ball = new BallController(this.physicsWorld, this.physicsConfig, this.clock, level.spawn);
      this.ballRenderer = new BallRenderer(this, this.physicsConfig.ball.radiusPx);
      this.ballVisual = new BallVisualController(this.ballRenderer, preferences.reducedMotion);
      this.emitBoostState();
      this.cameraController.configure(level);
      this.cameraController.snap(level.spawn.x, level.spawn.y);
      this.levelStartedAtMs = this.clock.nowMs;
      this.gameRegistry.events.emit('levelLoaded', { id: level.id, title: level.title });
      this.gameRegistry.flow.transition('PLAYING');
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.gameRegistry.events.emit('error', { message });
      this.gameRegistry.flow.transition('MAIN_MENU');
    }
  }

  pauseGame(): void {
    if (this.gameRegistry.flow.state !== 'PLAYING') return;
    this.gameRegistry.flow.transition('PAUSED');
    this.inputManager.clear();
    this.inputQueue.clear();
    this.accumulator = 0;
  }

  resumeGame(): void {
    if (this.gameRegistry.flow.state !== 'PAUSED') return;
    this.gameRegistry.flow.transition('PLAYING');
    this.inputManager.clear();
    this.accumulator = 0;
  }

  togglePause(): void {
    if (this.gameRegistry.flow.state === 'PLAYING') this.pauseGame();
    else if (this.gameRegistry.flow.state === 'PAUSED') this.resumeGame();
  }

  async restartLevel(): Promise<void> {
    if (this.level) await this.startLevel(this.currentLevelId);
  }

  async nextLevel(): Promise<void> {
    const next = this.progression.next(this.currentLevelId);
    if (next) await this.startLevel(next);
    else this.returnToMenu();
  }

  returnToMenu(): void {
    const state = this.gameRegistry.flow.state;
    if (state === 'MAIN_MENU') return;
    this.inputManager?.clear();
    this.inputQueue.clear();
    this.accumulator = 0;
    this.gameRegistry.flow.transition('MAIN_MENU');
  }

  toggleDebug(): void {
    this.debugEnabled = !this.debugEnabled;
    this.debugRenderer.setVisible(this.debugEnabled);
    this.gameRegistry.events.emit('debugChanged', { enabled: this.debugEnabled });
  }

  update(_time: number, delta: number): void {
    const state = this.gameRegistry.flow.state;
    if (state !== 'PLAYING' && state !== 'RESPAWNING') {
      this.accumulator = 0;
      return;
    }

    this.accumulator += Math.min(delta, this.physicsConfig.timestep.maxFrameDeltaMs);
    let steps = 0;
    const stepMs = 1000 / this.physicsConfig.timestep.hz;
    while (this.accumulator >= stepMs && steps < this.physicsConfig.timestep.maxSubStepsPerFrame) {
      this.clock.advance(stepMs);
      if (this.gameRegistry.flow.state === 'PLAYING') this.simulatePlayingStep(stepMs);
      else if (this.gameRegistry.flow.state === 'RESPAWNING') this.simulateRespawnStep(stepMs);
      this.accumulator -= stepMs;
      steps += 1;
    }
    if (steps >= this.physicsConfig.timestep.maxSubStepsPerFrame) this.accumulator = Math.min(this.accumulator, stepMs);
    this.lastSubsteps = steps;

    if (this.ball) {
      const snapshot = this.ball.snapshot;
      this.ballVisual?.update(delta / 1000, snapshot.position.x, snapshot.position.y, snapshot.angle);
      this.cameraController.update(snapshot.position.x, snapshot.position.y);
    }
    this.debugRenderer.update(this.gameRegistry.flow.state, this.currentLevelId, this.ball, stepMs, this.lastSubsteps);
  }

  applyDebugSetting(path: string, value: number): void {
    const [section, property] = path.split('.') as [keyof PhysicsConfig, string];
    const group = this.physicsConfig[section] as unknown as Record<string, number>;
    if (!group || !(property in group) || !Number.isFinite(value)) return;
    group[property] = value;

    if (section === 'world') {
      this.physicsWorld.setGravity(this.physicsConfig.world.gravityX, this.physicsConfig.world.gravityY, this.physicsConfig.world.gravityScale);
      this.physicsWorld.setTimeScale(this.physicsConfig.world.timeScale);
    }
    if (section === 'horizontalControl' && property === 'maxHorizontalSpeed') this.physicsConfig.limits.maxHorizontalSpeed = value;
    if (section === 'ball' && property === 'radiusPx' && this.ball) {
      this.ball.rebuildBody(this.physicsConfig.ball.radiusPx);
      this.ballRenderer?.destroy();
      this.ballRenderer = new BallRenderer(this, this.physicsConfig.ball.radiusPx);
      this.ballVisual = new BallVisualController(this.ballRenderer, this.progress.getPreferences().reducedMotion);
    }
  }

  get currentState(): GameState { return this.gameRegistry.flow.state; }
  get currentTitle(): string { return this.level?.title ?? ''; }
  get physicsSettings(): PhysicsConfig { return this.physicsConfig; }

  private simulatePlayingStep(stepMs: number): void {
    if (!this.ball || !this.level) return;
    const actions = this.inputQueue.drain();
    if (actions.some((action) => action.type === 'JUMP' && this.ball?.state.grounded)) this.ballVisual?.anticipate();
    const previousTakeoff = this.ball.state.takeoffAtMs;
    const preVelocity = this.ball.snapshot.velocity;
    const launched = this.ball.stepBeforePhysics(actions);
    if (launched || (previousTakeoff === null && this.ball.state.takeoffAtMs !== null)) this.ballVisual?.launch();
    this.physicsWorld.step(stepMs);
    const contact = this.ball.stepAfterPhysics();
    this.emitBoostState();
    if (contact.landed) {
      this.ballVisual?.land(Math.hypot(preVelocity.x, preVelocity.y));
      this.effects.landing(this.ball.snapshot.position.x, this.ball.snapshot.position.y + this.physicsConfig.ball.radiusPx, Math.hypot(preVelocity.x, preVelocity.y));
    }
    this.processPhysicsEvents();
    if (this.gameRegistry.flow.state === 'PLAYING' && this.ball.snapshot.position.y > this.level.world.killPlaneY) this.die('fall');
  }

  private emitBoostState(): void {
    if (!this.ball) return;
    const available = this.ball.state.airBoostAvailable;
    const used = this.ball.state.airBoostUsed;
    const signature = `${available}:${used}`;
    if (signature === this.lastBoostIndicator) return;
    this.lastBoostIndicator = signature;
    this.gameRegistry.events.emit('boostChanged', { available, used });
  }

  private simulateRespawnStep(stepMs: number): void {
    const target = this.respawn.advance(stepMs);
    if (!target || !this.ball) return;
    this.ball.resetAt(target.x, target.y);
    this.ballRenderer?.setVisible(true);
    this.emitBoostState();
    this.inputQueue.clear();
    this.gameRegistry.flow.transition('PLAYING');
  }

  private processPhysicsEvents(): void {
    const events = this.physicsEvents;
    this.physicsEvents = [];
    for (const event of events) {
      if (event.type === 'BALL_SPRING_IMPACT') {
        if (this.gameRegistry.flow.state === 'PLAYING') {
          this.effects.springImpact(event.contactPoint.x, event.contactPoint.y, event.normal, event.impulse);
        }
        continue;
      }
      if (event.type === 'BALL_TERRAIN_IMPACT') {
        if (this.gameRegistry.flow.state !== 'PLAYING' || !this.ball || !this.levelBuilder) continue;
        const breakable = this.levelBuilder.getBreakable(event.terrainId);
        if (!breakable) continue;
        const impactEnergy = calculateNormalImpactEnergy(event.impactSpeed, this.physicsConfig.ball.mass);
        if (impactEnergy < breakable.breakable.thresholdEnergy) continue;
        const broken = this.levelBuilder.breakSolid(event.terrainId);
        if (broken.length === 0) continue;
        const velocityRetention = breakable.breakable.velocityRetention ?? this.physicsConfig.breakableTerrain.velocityRetention;
        this.ball.breakThroughTerrain(
          event.incomingVelocity,
          event.normal,
          velocityRetention,
          this.physicsConfig.breakableTerrain.separationDistancePx,
        );
        for (const solid of broken) this.effects.glassShatter(solid);
        continue;
      }
      if (event.type === 'BALL_WALL_IMPACT') {
        if (!event.breakable && this.gameRegistry.flow.state === 'PLAYING' && event.impactSpeed >= this.physicsConfig.wallBounce.minimumImpactSpeed) {
          this.effects.wallImpact(event.contactPoint.x, event.contactPoint.y, event.normal, event.impactSpeed);
        }
        continue;
      }
      if (event.type !== 'BALL_ENTERED_TRIGGER' || this.gameRegistry.flow.state !== 'PLAYING') continue;
      if (event.triggerType === 'hazard') this.die(`hazard:${event.triggerId}`);
      else if (event.triggerType === 'checkpoint' && this.checkpoint && this.level) {
        const trigger = this.level.triggers.find((item) => item.id === event.triggerId);
        if (trigger && trigger.respawnX !== undefined && trigger.respawnY !== undefined && this.checkpoint.activate(trigger.id, trigger.respawnX, trigger.respawnY)) {
          this.levelBuilder.activateCheckpoint(trigger.id);
          this.gameRegistry.events.emit('checkpoint', { id: trigger.id });
        }
      } else if (event.triggerType === 'goal') this.completeLevel();
    }
  }

  private die(reason: string): void {
    if (this.gameRegistry.flow.state !== 'PLAYING' || !this.ball || !this.checkpoint) return;
    this.gameRegistry.flow.transition('RESPAWNING');
    this.inputManager.clear();
    this.inputQueue.clear();
    this.respawn.start(this.checkpoint.getRespawnPoint());
    this.ballRenderer?.setVisible(false);
    this.gameRegistry.events.emit('died', { reason });
  }

  private completeLevel(): void {
    if (this.gameRegistry.flow.state !== 'PLAYING' || !this.level || !this.completion.complete()) return;
    this.gameRegistry.flow.transition('LEVEL_COMPLETE');
    const elapsed = this.clock.nowMs - this.levelStartedAtMs;
    this.progress.markLevelCompleted(this.level.id, elapsed);
    this.gameRegistry.events.emit('completed', { id: this.level.id, title: this.level.title, hasNext: this.progression.next(this.currentLevelId) !== null });
    this.inputManager.clear();
    this.inputQueue.clear();
  }

  private handleShortcut(shortcut: KeyboardShortcut): void {
    if (shortcut === 'pause') this.togglePause();
    else if (shortcut === 'restart') void this.restartLevel();
    else this.toggleDebug();
  }

  private shutdown(): void {
    this.inputManager?.dispose();
    this.ball?.dispose();
    this.ballRenderer?.destroy();
    this.levelBuilder?.destroy();
    this.physicsWorld?.dispose();
  }
}
