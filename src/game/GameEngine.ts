import type { GameplayConfig, HudSnapshot, MatchEndSummary, MatchState, SoundEvent, TouchAction } from './types';
import { createMatchState, getPlayerShip, updateMatch } from './simulation';
import { PixiRenderer } from './renderer';
import { InputController } from './input';
import { HEALTH_RATIO_AMBER_THRESHOLD } from './config';
import { soundManager } from '../audio/soundManager';
import { CANNON_FIRE_CYCLE, CANNONBALL_WATER_CYCLE, SHIP_EXPLOSION_CYCLE } from '../audio/sounds';

const SOUND_EVENT_HANDLERS: Record<SoundEvent, () => void> = {
  'front-cannon': () => soundManager.playAlternating('cannonFire', CANNON_FIRE_CYCLE),
  broadside: () => soundManager.play('cannonBroadside'),
  'cannonball-splash': () => soundManager.playAlternating('cannonballSplash', CANNONBALL_WATER_CYCLE),
  'ship-collision': () => soundManager.play('shipCollision'),
  'ship-destroyed': () => soundManager.playAlternating('shipExplosion', SHIP_EXPLOSION_CYCLE),
  'score-point': () => soundManager.play('scorePoint'),
};

export interface GameEngineCallbacks {
  onHudUpdate?: (snapshot: HudSnapshot) => void;
  onMatchEnd?: (summary: MatchEndSummary) => void;
  onPauseStateChange?: (isPaused: boolean) => void;
}

function buildHudSnapshot(state: MatchState): HudSnapshot {
  const player = getPlayerShip(state);
  return {
    score: state.score,
    remainingSeconds: Math.ceil(state.remaining),
    playerHealth: player ? Math.max(0, Math.round(player.health)) : 0,
    playerMaxHealth: player?.maxHealth ?? 0,
    status: state.status,
    endReason: state.endReason,
  };
}

function snapshotsDiffer(a: HudSnapshot, b: HudSnapshot): boolean {
  return (
    a.score !== b.score ||
    a.remainingSeconds !== b.remainingSeconds ||
    a.playerHealth !== b.playerHealth ||
    a.status !== b.status ||
    a.endReason !== b.endReason
  );
}

/**
 * Owns the full lifecycle of a match: simulation state, the Pixi renderer,
 * and keyboard input. React only ever talks to this class - it never reaches
 * into Pixi or the simulation directly, which keeps rendering, input and
 * game rules independently testable.
 */
export class GameEngine {
  private readonly config: GameplayConfig;
  private readonly renderer = new PixiRenderer();
  private readonly input = new InputController();
  private state: MatchState;
  private callbacks: GameEngineCallbacks;
  private lastHudSnapshot: HudSnapshot;
  private wasPlayingBeforePause = false;
  private destroyed = false;
  private matchEndReported = false;
  private healthWasCritical = false;

  private readonly handleVisibilityChange = (): void => {
    if (document.hidden) this.pause();
  };

  private readonly handleWindowBlur = (): void => {
    this.pause();
  };

  constructor(config: GameplayConfig, callbacks: GameEngineCallbacks = {}) {
    this.config = config;
    this.callbacks = callbacks;
    this.state = createMatchState(config);
    this.lastHudSnapshot = buildHudSnapshot(this.state);
  }

  async init(container: HTMLDivElement, onProgress?: (fraction: number) => void): Promise<void> {
    await this.renderer.init(container, this.config, onProgress);
    if (this.destroyed) return;

    this.input.attach(() => this.togglePause());
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    window.addEventListener('blur', this.handleWindowBlur);
    // The renderer owns the Pixi Application; we drive the simulation from its ticker
    // so rendering and simulation stay in lockstep on the same frame clock.
    this.renderer.onTick((dtSeconds) => this.tick(dtSeconds));

    soundManager.play('gameStart');
    soundManager.startMusic('oceanAmbienceLoop');
  }

  private tick(dtSeconds: number): void {
    if (this.state.status === 'playing') {
      updateMatch(this.state, this.config, this.input.snapshot(), dtSeconds);
    }
    this.renderer.sync(this.state, dtSeconds);

    for (const event of this.state.soundEvents) {
      SOUND_EVENT_HANDLERS[event]();
    }
    // Both are only ever populated by updateMatch, which stops running once
    // the match isn't 'playing' (paused or ended) - but this tick() keeps
    // calling renderer.sync() and replaying soundEvents every frame either
    // way. Without clearing them here, whatever hit/sound happened on the
    // very last active tick would otherwise replay forever, once per frame,
    // for as long as the screen stays mounted.
    this.state.hitEvents = [];
    this.state.soundEvents = [];

    const snapshot = buildHudSnapshot(this.state);
    this.checkHealthLow(snapshot);
    if (snapshotsDiffer(snapshot, this.lastHudSnapshot)) {
      this.lastHudSnapshot = snapshot;
      this.callbacks.onHudUpdate?.(snapshot);
    }
    if (snapshot.status === 'ended' && !this.matchEndReported) {
      this.matchEndReported = true;
      const endReason = this.state.endReason ?? 'time-up';
      soundManager.play(endReason === 'time-up' ? 'gameComplete' : 'gameOver');
      this.callbacks.onMatchEnd?.({
        matchId: this.state.matchId,
        score: this.state.score,
        durationSeconds: Math.round(this.state.elapsed),
        endReason,
      });
    }
  }

  /** Plays health_low once, exactly when the player's health first drops into the critical (red) range. */
  private checkHealthLow(snapshot: HudSnapshot): void {
    const ratio = snapshot.playerMaxHealth > 0 ? snapshot.playerHealth / snapshot.playerMaxHealth : 0;
    const isCritical = snapshot.status === 'playing' && ratio > 0 && ratio <= HEALTH_RATIO_AMBER_THRESHOLD;
    if (isCritical && !this.healthWasCritical) {
      soundManager.play('healthLow');
    }
    this.healthWasCritical = isCritical;
  }

  pause(): void {
    if (this.state.status !== 'playing') return;
    this.wasPlayingBeforePause = true;
    this.state.status = 'paused';
    this.input.resetHeldActions();
    soundManager.play('gamePause');
    this.callbacks.onPauseStateChange?.(true);
  }

  resume(): void {
    if (this.state.status !== 'paused' || !this.wasPlayingBeforePause) return;
    this.state.status = 'playing';
    this.wasPlayingBeforePause = false;
    soundManager.play('gameResume');
    this.callbacks.onPauseStateChange?.(false);
  }

  togglePause(): void {
    if (this.state.status === 'playing') this.pause();
    else if (this.state.status === 'paused') this.resume();
  }

  restart(): void {
    this.state = createMatchState(this.config);
    this.lastHudSnapshot = buildHudSnapshot(this.state);
    this.wasPlayingBeforePause = false;
    this.matchEndReported = false;
    this.healthWasCritical = false;
    this.input.resetHeldActions();
    soundManager.play('gameStart');
    this.callbacks.onHudUpdate?.(this.lastHudSnapshot);
    this.callbacks.onPauseStateChange?.(false);
  }

  setTouchAction(action: TouchAction, active: boolean): void {
    this.input.setAction(action, active);
  }

  getHudSnapshot(): HudSnapshot {
    return this.lastHudSnapshot;
  }

  destroy(): void {
    this.destroyed = true;
    this.input.detach();
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
    window.removeEventListener('blur', this.handleWindowBlur);
    soundManager.stopMusic();
    this.renderer.destroy();
  }
}
