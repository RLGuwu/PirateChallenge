import type { IslandConfig } from './types';
import {
  DEFAULT_GAMEPLAY_CONFIG,
  ARENA_WIDTH,
  ARENA_HEIGHT,
  ISLAND_HALFSIZE_MIN,
  ISLAND_HALFSIZE_MAX,
  MAX_ISLANDS,
} from './config';

const LAYOUT_KEY = 'pirate-battle:island-layout';

function isIslandConfig(value: unknown): value is IslandConfig {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.x === 'number' && typeof candidate.y === 'number' && typeof candidate.halfSize === 'number'
  );
}

/** Keeps an island fully inside the arena and within the size range the editor allows. */
export function clampIsland(island: IslandConfig): IslandConfig {
  const halfSize = Math.min(ISLAND_HALFSIZE_MAX, Math.max(ISLAND_HALFSIZE_MIN, island.halfSize));
  return {
    halfSize,
    x: Math.min(ARENA_WIDTH - halfSize, Math.max(halfSize, island.x)),
    y: Math.min(ARENA_HEIGHT - halfSize, Math.max(halfSize, island.y)),
  };
}

function defaultLayout(): IslandConfig[] {
  return DEFAULT_GAMEPLAY_CONFIG.islands.map((island) => ({ ...island }));
}

/** The player's custom island layout, or the built-in default if none was ever saved. */
export function loadIslandLayout(): IslandConfig[] {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (!raw) return defaultLayout();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || !parsed.every(isIslandConfig)) return defaultLayout();
    return parsed.slice(0, MAX_ISLANDS).map(clampIsland);
  } catch {
    return defaultLayout();
  }
}

export function saveIslandLayout(islands: IslandConfig[]): void {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(islands));
  } catch {
    // Best-effort only; a full storage quota shouldn't crash the app.
  }
}

export function resetIslandLayout(): void {
  localStorage.removeItem(LAYOUT_KEY);
}
