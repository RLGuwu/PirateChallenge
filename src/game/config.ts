import type { GameplayConfig } from './types';

// Doubling both dimensions quadruples the playable area.
export const ARENA_WIDTH = 3200;
export const ARENA_HEIGHT = 1800;

export const SESSION_SECONDS_MIN = 60;
export const SESSION_SECONDS_MAX = 180;
export const SESSION_SECONDS_STEP = 10;
export const SESSION_SECONDS_DEFAULT = 120;

export const SPAWN_SECONDS_MIN = 1;
export const SPAWN_SECONDS_MAX = 30;
export const SPAWN_SECONDS_STEP = 1;
export const SPAWN_SECONDS_DEFAULT = 3;

/**
 * Islands are drawn as a 5x5 tile grid: the outer ring is a soft, mostly
 * transparent "shallow water" glow, and only the inner 3x3 (sand + grass) is
 * solid. Collision uses this fraction of the configured half-size so ships
 * and projectiles can drift over the glow without being blocked by it.
 */
export const ISLAND_SOLID_RATIO = 3 / 5;

/** Health-bar colour breakpoints, shared by the renderer (hull/sail tier, bar colour) and the audio layer (health_low cue). */
export const HEALTH_RATIO_GREEN_THRESHOLD = 0.6;
export const HEALTH_RATIO_AMBER_THRESHOLD = 0.3;

export const ISLAND_HALFSIZE_MIN = 100;
export const ISLAND_HALFSIZE_MAX = 320;
export const ISLAND_HALFSIZE_STEP = 20;
export const ISLAND_HALFSIZE_DEFAULT = 180;
export const MAX_ISLANDS = 12;

export const DEFAULT_GAMEPLAY_CONFIG: GameplayConfig = {
  matchDurationSeconds: SESSION_SECONDS_DEFAULT,
  enemySpawnIntervalSeconds: SPAWN_SECONDS_DEFAULT,
  arenaWidth: ARENA_WIDTH,
  arenaHeight: ARENA_HEIGHT,
  minSpawnDistanceFromPlayer: 320,
  shipRadius: 30,
  projectileRadius: 6,
  islands: [
    { x: 500, y: 350, halfSize: 220 },
    { x: 1600, y: 280, halfSize: 190 },
    { x: 2700, y: 420, halfSize: 240 },
    { x: 350, y: 1450, halfSize: 210 },
    { x: 1600, y: 1560, halfSize: 200 },
    { x: 2850, y: 1420, halfSize: 250 },
    { x: 950, y: 950, halfSize: 170 },
    { x: 2300, y: 950, halfSize: 170 },
  ],
  player: {
    maxHealth: 100,
    moveSpeed: 220,
    rotationSpeed: 2.6,
    frontWeapon: {
      damage: 10,
      projectileSpeed: 520,
      range: 700,
      cooldown: 0.35,
    },
    sideWeapon: {
      damage: 6,
      projectileSpeed: 440,
      range: 520,
      cooldown: 0.9,
    },
    sideWeaponSpacing: 24,
  },
  chaser: {
    maxHealth: 30,
    moveSpeed: 110,
    rotationSpeed: 2.4,
    contactDamage: 20,
  },
  shooter: {
    maxHealth: 25,
    moveSpeed: 130,
    rotationSpeed: 2.0,
    attackRange: 420,
    weapon: {
      damage: 8,
      projectileSpeed: 380,
      range: 460,
      cooldown: 1.2,
    },
  },
  charger: {
    maxHealth: 35,
    approachSpeed: 90,
    rotationSpeed: 2.2,
    contactDamage: 20,
    triggerRange: 260,
    windupSeconds: 0.5,
    chargeSpeed: 260,
    chargeDurationSeconds: 1.0,
  },
};

export function cloneGameplayConfig(
  overrides: Partial<
    Pick<GameplayConfig, 'matchDurationSeconds' | 'enemySpawnIntervalSeconds' | 'islands'>
  > = {},
): GameplayConfig {
  return {
    ...DEFAULT_GAMEPLAY_CONFIG,
    ...overrides,
    islands: (overrides.islands ?? DEFAULT_GAMEPLAY_CONFIG.islands).map((island) => ({ ...island })),
    player: {
      ...DEFAULT_GAMEPLAY_CONFIG.player,
      frontWeapon: { ...DEFAULT_GAMEPLAY_CONFIG.player.frontWeapon },
      sideWeapon: { ...DEFAULT_GAMEPLAY_CONFIG.player.sideWeapon },
    },
    chaser: { ...DEFAULT_GAMEPLAY_CONFIG.chaser },
    shooter: {
      ...DEFAULT_GAMEPLAY_CONFIG.shooter,
      weapon: { ...DEFAULT_GAMEPLAY_CONFIG.shooter.weapon },
    },
    charger: { ...DEFAULT_GAMEPLAY_CONFIG.charger },
  };
}
