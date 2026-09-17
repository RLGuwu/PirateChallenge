import { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine } from '../game/GameEngine';
import type { GameplayConfig, HudSnapshot, MatchEndSummary, TouchAction } from '../game/types';
import { PrimaryButton } from '../components/PrimaryButton';
import { getLocalPlayer } from '../api/player';
import { savePendingMatch, clearPendingMatch } from '../api/pendingMatch';
import type { RegisterMatchPayload } from '../api/types';
import { useRegisterMatchMutation } from '../query/useRegisterMatchMutation';
import { formatDuration } from '../utils/formatDuration';
import { soundManager } from '../audio/soundManager';
import icon_forward from '../assets/png/default/ui/controls/icon_forward.png';
import icon_turn_left from '../assets/png/default/ui/controls/icon_turn_left.png';
import icon_turn_right from '../assets/png/default/ui/controls/icon_turn_right.png';
import icon_fire_front from '../assets/png/default/ui/controls/icon_fire_front.png';
import icon_fire_left from '../assets/png/default/ui/controls/icon_fire_left.png';
import icon_fire_right from '../assets/png/default/ui/controls/icon_fire_right.png';
import icon_pause from '../assets/png/default/ui/controls/icon_pause.png';
import panel_menu from '../assets/images/panel_menu.png';
import health_frame from '../assets/png/default/ui/hud/health_frame.png';
import health_fill_green from '../assets/png/default/ui/hud/health_fill_green.png';
import health_fill_amber from '../assets/png/default/ui/hud/health_fill_amber.png';
import health_fill_red from '../assets/png/default/ui/hud/health_fill_red.png';
import counter_panel from '../assets/png/default/ui/hud/counter_panel.png';
import icon_score from '../assets/png/default/ui/hud/icon_score.png';
import icon_time from '../assets/png/default/ui/hud/icon_time.png';

function healthFillForRatio(ratio: number): string {
  if (ratio > 0.6) return health_fill_green;
  if (ratio >= 0.3) return health_fill_amber;
  return health_fill_red;
}

interface GameScreenProps {
  config: GameplayConfig;
  onExit: () => void;
}

type LoadState =
  | { phase: 'loading'; progress: number }
  | { phase: 'ready' }
  | { phase: 'error'; message: string };

function initialHud(config: GameplayConfig): HudSnapshot {
  return {
    score: 0,
    remainingSeconds: config.matchDurationSeconds,
    playerHealth: config.player.maxHealth,
    playerMaxHealth: config.player.maxHealth,
    status: 'playing',
    endReason: null,
  };
}

interface TouchButtonProps {
  icon: string;
  label: string;
  action: TouchAction;
  onAction: (action: TouchAction, active: boolean) => void;
}

function TouchButton({ icon, label, action, onAction }: TouchButtonProps) {
  return (
    <button
      type="button"
      className="touch-button"
      aria-label={label}
      onContextMenu={(event) => event.preventDefault()}
      onPointerDown={(event) => {
        event.preventDefault();
        onAction(action, true);
      }}
      onPointerUp={() => onAction(action, false)}
      onPointerLeave={() => onAction(action, false)}
      onPointerCancel={() => onAction(action, false)}
    >
      <img src={icon} alt="" />
    </button>
  );
}

export function GameScreen({ config, onExit }: GameScreenProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [loadState, setLoadState] = useState<LoadState>({ phase: 'loading', progress: 0 });
  const [hud, setHud] = useState<HudSnapshot>(() => initialHud(config));
  const [isPaused, setIsPaused] = useState(false);
  const [retryToken, setRetryToken] = useState(0);
  const [player] = useState(() => getLocalPlayer());
  const [durationPlayed, setDurationPlayed] = useState<number | null>(null);
  const registerMatchMutation = useRegisterMatchMutation();
  const lastPayloadRef = useRef<RegisterMatchPayload | null>(null);

  const handleMatchEnd = useCallback(
    (summary: MatchEndSummary) => {
      setDurationPlayed(summary.durationSeconds);
      const payload: RegisterMatchPayload = {
        matchId: summary.matchId,
        playerId: player.id,
        playerName: player.name,
        score: summary.score,
        durationSeconds: summary.durationSeconds,
        endReason: summary.endReason,
        config: {
          matchDurationSeconds: config.matchDurationSeconds,
          enemySpawnIntervalSeconds: config.enemySpawnIntervalSeconds,
        },
      };
      lastPayloadRef.current = payload;
      savePendingMatch(payload);
      registerMatchMutation.mutate(payload, {
        onSuccess: () => clearPendingMatch(payload.matchId),
      });
    },
    [config.matchDurationSeconds, config.enemySpawnIntervalSeconds, player, registerMatchMutation],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    setLoadState({ phase: 'loading', progress: 0 });
    setHud(initialHud(config));
    setIsPaused(false);
    setDurationPlayed(null);

    const engine = new GameEngine(config, {
      onHudUpdate: (snapshot) => {
        if (!cancelled) setHud(snapshot);
      },
      onPauseStateChange: (paused) => {
        if (!cancelled) setIsPaused(paused);
      },
      onMatchEnd: (summary) => {
        if (!cancelled) handleMatchEnd(summary);
      },
    });
    engineRef.current = engine;

    engine
      .init(container, (fraction) => {
        if (!cancelled) setLoadState({ phase: 'loading', progress: fraction });
      })
      .then(() => {
        if (!cancelled) setLoadState({ phase: 'ready' });
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadState({
            phase: 'error',
            message: error instanceof Error ? error.message : 'Failed to load the arena assets.',
          });
        }
      });

    return () => {
      cancelled = true;
      engine.destroy();
      if (engineRef.current === engine) engineRef.current = null;
    };
  }, [config, retryToken]);

  const handleTouchAction = useCallback((action: TouchAction, active: boolean) => {
    engineRef.current?.setTouchAction(action, active);
  }, []);

  const handlePauseClick = () => engineRef.current?.togglePause();
  const handleResumeClick = () => engineRef.current?.resume();
  const handleRestart = () => {
    setDurationPlayed(null);
    engineRef.current?.restart();
  };
  const handleRetryMatchSave = () => {
    const payload = lastPayloadRef.current;
    if (!payload) return;
    registerMatchMutation.mutate(payload, {
      onSuccess: () => clearPendingMatch(payload.matchId),
    });
  };
  const handleRetryLoad = () => setRetryToken((token) => token + 1);

  const healthRatio = hud.playerMaxHealth > 0 ? hud.playerHealth / hud.playerMaxHealth : 0;

  return (
    <div className="game-screen">
      <div className="game-canvas" ref={containerRef} />

      {loadState.phase === 'loading' && (
        <div className="game-overlay">
          <p className="game-overlay-title">Loading arena…</p>
          <div className="loading-bar">
            <div className="loading-bar-fill" style={{ width: `${Math.round(loadState.progress * 100)}%` }} />
          </div>
        </div>
      )}

      {loadState.phase === 'error' && (
        <div className="game-overlay">
          <p className="game-overlay-title">Couldn&apos;t load the arena</p>
          <p className="options-description">{loadState.message}</p>
          <div className="button-column">
            <PrimaryButton label="RETRY" onClick={handleRetryLoad} />
            <PrimaryButton label="MAIN MENU" onClick={onExit} sound="uiBack" />
          </div>
        </div>
      )}

      {loadState.phase === 'ready' && (
        <>
          <div className="player-health-hud" aria-hidden="true">
            <img src={health_frame} className="player-health-frame-img" alt="" />
            <div className="player-health-fill-clip" style={{ width: `${Math.max(0, healthRatio * 100)}%` }}>
              <img src={healthFillForRatio(healthRatio)} className="player-health-fill-img" alt="" />
            </div>
          </div>

          <div className="game-hud">
            <div className="hud-counter" aria-hidden="true">
              <img src={counter_panel} className="hud-counter-panel" alt="" />
              <img src={icon_score} className="hud-counter-icon" alt="" />
              <span className="hud-counter-value">{hud.score}</span>
            </div>
            <div className="hud-counter" aria-hidden="true">
              <img src={counter_panel} className="hud-counter-panel" alt="" />
              <img src={icon_time} className="hud-counter-icon" alt="" />
              <span className="hud-counter-value">{hud.remainingSeconds}s</span>
            </div>
            <button
              type="button"
              className="hud-pause-button"
              onClick={handlePauseClick}
              onMouseEnter={() => soundManager.play('uiHover')}
              aria-label="Pause game"
            >
              <img src={icon_pause} alt="" />
            </button>
          </div>

          <p className="visually-hidden" role="status">
            Score {hud.score}. Time remaining {hud.remainingSeconds} seconds. Health {hud.playerHealth} of{' '}
            {hud.playerMaxHealth}.
          </p>

          <p className="game-controls-hint">
            Move: W / ↑ &nbsp;·&nbsp; Turn: A D or ← → &nbsp;·&nbsp; Fire front: Space &nbsp;·&nbsp; Fire left: Q
            &nbsp;·&nbsp; Fire right: E &nbsp;·&nbsp; Pause: Esc
          </p>

          <div className="touch-controls touch-controls-left">
            <TouchButton icon={icon_turn_left} label="Turn left" action="left" onAction={handleTouchAction} />
            <TouchButton icon={icon_forward} label="Move forward" action="forward" onAction={handleTouchAction} />
            <TouchButton icon={icon_turn_right} label="Turn right" action="right" onAction={handleTouchAction} />
          </div>

          <div className="touch-controls touch-controls-right">
            <TouchButton icon={icon_fire_left} label="Fire left" action="fireLeft" onAction={handleTouchAction} />
            <TouchButton icon={icon_fire_front} label="Fire front" action="fireFront" onAction={handleTouchAction} />
            <TouchButton icon={icon_fire_right} label="Fire right" action="fireRight" onAction={handleTouchAction} />
          </div>

          {isPaused && hud.status !== 'ended' && (
            <div className="game-overlay">
              <div className="panel panel-default" style={{ backgroundImage: `url(${panel_menu})` }}>
                <p className="game-overlay-title">Paused</p>
                <div className="button-column">
                  <PrimaryButton label="RESUME" onClick={handleResumeClick} sound={null} />
                  <PrimaryButton label="MAIN MENU" onClick={onExit} sound="uiBack" />
                </div>
              </div>
            </div>
          )}

          {hud.status === 'ended' && (
            <div className="game-overlay">
              <div className="panel panel-default" style={{ backgroundImage: `url(${panel_menu})` }}>
                <p className="game-overlay-title">
                  {hud.endReason === 'time-up' ? 'Battle complete' : 'Ship defeated'}
                </p>
                <p className="game-overlay-score">{hud.score}</p>
                <p className="options-description">
                  {hud.endReason === 'time-up' ? 'Time up' : 'Defeated'}
                  {durationPlayed !== null ? ` · ${formatDuration(durationPlayed)} played` : ''}
                </p>
                <p className="match-save-status">
                  {registerMatchMutation.isPending && 'Saving match…'}
                  {registerMatchMutation.isSuccess && 'Match saved to your history.'}
                  {registerMatchMutation.isError && "Couldn't save this match."}
                </p>
                {registerMatchMutation.isError && (
                  <PrimaryButton label="RETRY SAVE" onClick={handleRetryMatchSave} />
                )}
                <div className="button-column">
                  <PrimaryButton label="PLAY AGAIN" onClick={handleRestart} />
                  <PrimaryButton label="MAIN MENU" onClick={onExit} sound="uiBack" />
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
