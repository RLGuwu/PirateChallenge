import {
  SESSION_SECONDS_DEFAULT,
  SESSION_SECONDS_MIN,
  SESSION_SECONDS_MAX,
  SPAWN_SECONDS_DEFAULT,
  SPAWN_SECONDS_MIN,
  SPAWN_SECONDS_MAX,
} from './config';

const OPTIONS_KEY = 'pirate-battle:options';

export interface GameplayOptions {
  sessionSeconds: number;
  spawnSeconds: number;
}

const DEFAULT_OPTIONS: GameplayOptions = {
  sessionSeconds: SESSION_SECONDS_DEFAULT,
  spawnSeconds: SPAWN_SECONDS_DEFAULT,
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Reads the player's saved session/spawn settings, clamped in case the valid range ever changes. */
export function loadGameplayOptions(): GameplayOptions {
  try {
    const raw = localStorage.getItem(OPTIONS_KEY);
    if (!raw) return DEFAULT_OPTIONS;
    const parsed = JSON.parse(raw) as Partial<GameplayOptions>;
    return {
      sessionSeconds: clamp(
        typeof parsed.sessionSeconds === 'number' ? parsed.sessionSeconds : DEFAULT_OPTIONS.sessionSeconds,
        SESSION_SECONDS_MIN,
        SESSION_SECONDS_MAX,
      ),
      spawnSeconds: clamp(
        typeof parsed.spawnSeconds === 'number' ? parsed.spawnSeconds : DEFAULT_OPTIONS.spawnSeconds,
        SPAWN_SECONDS_MIN,
        SPAWN_SECONDS_MAX,
      ),
    };
  } catch {
    return DEFAULT_OPTIONS;
  }
}

export function saveGameplayOptions(options: GameplayOptions): void {
  try {
    localStorage.setItem(OPTIONS_KEY, JSON.stringify(options));
  } catch {
    // Best-effort only; a full storage quota shouldn't crash the app.
  }
}
