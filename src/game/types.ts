export interface Vector2 {
  x: number;
  y: number;
}

export type EnemyKind = 'chaser' | 'shooter' | 'charger';
export type ShipKind = 'player' | EnemyKind;

export interface WeaponConfig {
  damage: number;
  projectileSpeed: number;
  range: number;
  cooldown: number;
}

export interface IslandConfig {
  x: number;
  y: number;
  /** Half the side length of the island's total visual footprint, including the soft outer glow ring. */
  halfSize: number;
}

export interface GameplayConfig {
  matchDurationSeconds: number;
  enemySpawnIntervalSeconds: number;
  arenaWidth: number;
  arenaHeight: number;
  minSpawnDistanceFromPlayer: number;
  shipRadius: number;
  projectileRadius: number;
  islands: IslandConfig[];
  player: {
    maxHealth: number;
    moveSpeed: number;
    rotationSpeed: number;
    frontWeapon: WeaponConfig;
    sideWeapon: WeaponConfig;
    sideWeaponSpacing: number;
  };
  chaser: {
    maxHealth: number;
    moveSpeed: number;
    rotationSpeed: number;
    contactDamage: number;
  };
  shooter: {
    maxHealth: number;
    moveSpeed: number;
    rotationSpeed: number;
    attackRange: number;
    weapon: WeaponConfig;
  };
  charger: {
    maxHealth: number;
    /** Speed while closing in before it's in range to wind up - not the charge itself. */
    approachSpeed: number;
    rotationSpeed: number;
    contactDamage: number;
    /** Distance from the player at which it stops approaching and starts winding up. */
    triggerRange: number;
    /** How long it sits still, tracking the player, before locking in a direction and charging. */
    windupSeconds: number;
    /** Speed during the charge itself - fixed heading, no turning. */
    chargeSpeed: number;
    chargeDurationSeconds: number;
  };
}

export interface Ship {
  id: number;
  kind: ShipKind;
  position: Vector2;
  rotation: number;
  health: number;
  maxHealth: number;
  alive: boolean;
  deathTimer: number;
  frontCooldown: number;
  leftCooldown: number;
  rightCooldown: number;
  weaponCooldown: number;
  /** Only meaningful for 'charger' enemies: idle/tracking until windupSeconds elapse, then a straight-line dash. */
  chargeState: 'idle' | 'charging';
  /** While idle: seconds spent tracking the player in range so far. While charging: seconds of dash remaining. */
  chargeTimer: number;
}

export interface Projectile {
  id: number;
  ownerKind: 'player' | 'enemy';
  position: Vector2;
  velocity: Vector2;
  damage: number;
  remainingRange: number;
}

export type MatchStatus = 'playing' | 'paused' | 'ended';
export type MatchEndReason = 'time-up' | 'defeated' | null;

/** Discrete gameplay sounds triggered this tick; consumed (and cleared) by GameEngine each frame. */
export type SoundEvent =
  | 'front-cannon'
  | 'broadside'
  | 'cannonball-splash'
  | 'ship-collision'
  | 'ship-destroyed'
  | 'score-point';

export interface MatchState {
  /** Stable id for this match, used as the idempotency key when registering the result. */
  matchId: string;
  elapsed: number;
  remaining: number;
  score: number;
  status: MatchStatus;
  endReason: MatchEndReason;
  spawnTimer: number;
  /** Cycles through the enemy spawn rotation (chaser, shooter, charger, repeat) - see ENEMY_SPAWN_CYCLE. */
  nextEnemyKindIndex: number;
  ships: Ship[];
  projectiles: Projectile[];
  nextEntityId: number;
  /** Impact points from this tick only (any ship taking damage, on either side); consumed by the renderer each frame. */
  hitEvents: Vector2[];
  /** Sound-worthy events from this tick only; consumed (and cleared) by GameEngine each frame. */
  soundEvents: SoundEvent[];
}

export type TouchAction = 'forward' | 'left' | 'right' | 'fireFront' | 'fireLeft' | 'fireRight';

export interface InputState {
  forward: boolean;
  left: boolean;
  right: boolean;
  fireFront: boolean;
  fireLeft: boolean;
  fireRight: boolean;
}

export interface HudSnapshot {
  score: number;
  remainingSeconds: number;
  playerHealth: number;
  playerMaxHealth: number;
  status: MatchStatus;
  endReason: MatchEndReason;
}

/** Emitted once, exactly when a match transitions to 'ended'. */
export interface MatchEndSummary {
  matchId: string;
  score: number;
  /** Actual time played, in seconds - may be less than the configured duration. */
  durationSeconds: number;
  endReason: 'time-up' | 'defeated';
}
