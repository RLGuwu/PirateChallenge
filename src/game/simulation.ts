import type { GameplayConfig, InputState, MatchState, Ship, Projectile, EnemyKind, Vector2 } from './types';
import { forwardVector, leftVector, rightVector, angleTo, turnTowards, circlesOverlap, clamp, distance } from './math';
import { clampToArenaBounds, isBlockedByIsland, isOutsideArena, findEnemySpawnPoint } from './arena';

const EXPLOSION_DURATION = 0.6;
const MAX_DELTA_SECONDS = 1 / 20;

/** Rotation order new enemies spawn in, repeating. */
const ENEMY_SPAWN_CYCLE: EnemyKind[] = ['chaser', 'shooter', 'charger'];

export const PLAYER_ID = 0;

function createShip(id: number, kind: Ship['kind'], position: Vector2, rotation: number, maxHealth: number): Ship {
  return {
    id,
    kind,
    position,
    rotation,
    health: maxHealth,
    maxHealth,
    alive: true,
    deathTimer: 0,
    frontCooldown: 0,
    leftCooldown: 0,
    rightCooldown: 0,
    weaponCooldown: 0,
    chargeState: 'idle',
    chargeTimer: 0,
  };
}

export function createMatchState(config: GameplayConfig): MatchState {
  const player = createShip(
    PLAYER_ID,
    'player',
    { x: config.arenaWidth / 2, y: config.arenaHeight / 2 },
    0,
    config.player.maxHealth,
  );

  return {
    matchId: crypto.randomUUID(),
    elapsed: 0,
    remaining: config.matchDurationSeconds,
    score: 0,
    status: 'playing',
    endReason: null,
    spawnTimer: config.enemySpawnIntervalSeconds,
    nextEnemyKindIndex: 0,
    ships: [player],
    projectiles: [],
    nextEntityId: 1,
    hitEvents: [],
    soundEvents: [],
  };
}

export function getPlayerShip(state: MatchState): Ship | undefined {
  return state.ships.find((ship) => ship.kind === 'player');
}

function spawnProjectile(
  state: MatchState,
  ownerKind: Projectile['ownerKind'],
  position: Vector2,
  direction: Vector2,
  speed: number,
  damage: number,
  range: number,
): void {
  state.projectiles.push({
    id: state.nextEntityId++,
    ownerKind,
    position: { ...position },
    velocity: { x: direction.x * speed, y: direction.y * speed },
    damage,
    remainingRange: range,
  });
}

function fireBroadside(
  state: MatchState,
  ship: Ship,
  config: GameplayConfig,
  side: 'left' | 'right',
): void {
  const lateral = side === 'left' ? leftVector(ship.rotation) : rightVector(ship.rotation);
  const forward = forwardVector(ship.rotation);
  const weapon = config.player.sideWeapon;
  const offsets = [-config.player.sideWeaponSpacing, 0, config.player.sideWeaponSpacing];

  for (const offset of offsets) {
    const origin: Vector2 = {
      x: ship.position.x + forward.x * offset + lateral.x * config.shipRadius,
      y: ship.position.y + forward.y * offset + lateral.y * config.shipRadius,
    };
    spawnProjectile(state, 'player', origin, lateral, weapon.projectileSpeed, weapon.damage, weapon.range);
  }
}

function updateShipMovement(
  ship: Ship,
  config: GameplayConfig,
  wantsForward: boolean,
  moveSpeed: number,
  rotationDelta: number,
  dt: number,
): void {
  ship.rotation += rotationDelta * dt;

  if (!wantsForward) return;

  const forward = forwardVector(ship.rotation);
  const candidate: Vector2 = {
    x: ship.position.x + forward.x * moveSpeed * dt,
    y: ship.position.y + forward.y * moveSpeed * dt,
  };

  if (isBlockedByIsland(config, candidate, config.shipRadius)) return;
  ship.position = clampToArenaBounds(config, candidate, config.shipRadius);
}

function updatePlayer(state: MatchState, ship: Ship, config: GameplayConfig, input: InputState, dt: number): void {
  const rotationDelta = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  updateShipMovement(ship, config, input.forward, config.player.moveSpeed, rotationDelta * config.player.rotationSpeed, dt);

  ship.frontCooldown = Math.max(0, ship.frontCooldown - dt);
  ship.leftCooldown = Math.max(0, ship.leftCooldown - dt);
  ship.rightCooldown = Math.max(0, ship.rightCooldown - dt);

  if (input.fireFront && ship.frontCooldown <= 0) {
    const weapon = config.player.frontWeapon;
    const forward = forwardVector(ship.rotation);
    const origin: Vector2 = {
      x: ship.position.x + forward.x * config.shipRadius,
      y: ship.position.y + forward.y * config.shipRadius,
    };
    spawnProjectile(state, 'player', origin, forward, weapon.projectileSpeed, weapon.damage, weapon.range);
    ship.frontCooldown = weapon.cooldown;
    state.soundEvents.push('front-cannon');
  }

  if (input.fireLeft && ship.leftCooldown <= 0) {
    fireBroadside(state, ship, config, 'left');
    ship.leftCooldown = config.player.sideWeapon.cooldown;
    state.soundEvents.push('broadside');
  }

  if (input.fireRight && ship.rightCooldown <= 0) {
    fireBroadside(state, ship, config, 'right');
    ship.rightCooldown = config.player.sideWeapon.cooldown;
    state.soundEvents.push('broadside');
  }
}

function updateChaser(state: MatchState, ship: Ship, player: Ship, config: GameplayConfig, dt: number): void {
  const targetAngle = angleTo(ship.position, player.position);
  ship.rotation = turnTowards(ship.rotation, targetAngle, config.chaser.rotationSpeed * dt);
  updateShipMovement(ship, config, true, config.chaser.moveSpeed, 0, dt);

  if (player.alive && circlesOverlap(ship.position, config.shipRadius, player.position, config.shipRadius)) {
    player.health = Math.max(0, player.health - config.chaser.contactDamage);
    state.hitEvents.push({ x: player.position.x, y: player.position.y });
    state.soundEvents.push('ship-collision');
    if (player.health <= 0) killShip(state, player);
    killShip(state, ship);
  }
}

/**
 * Stalks the player from a distance, sits still once in range while it locks
 * onto them, then dashes in a fixed straight line - no steering once it
 * commits, so a player who sidesteps in time makes it whiff. A hit works
 * exactly like the chaser's: contact damage, no score, both ships destroyed.
 */
function updateCharger(state: MatchState, ship: Ship, player: Ship, config: GameplayConfig, dt: number): void {
  const cfg = config.charger;

  if (ship.chargeState === 'charging') {
    updateShipMovement(ship, config, true, cfg.chargeSpeed, 0, dt);
    ship.chargeTimer -= dt;
    if (ship.chargeTimer <= 0) {
      ship.chargeState = 'idle';
      ship.chargeTimer = 0;
    }
  } else {
    const targetAngle = angleTo(ship.position, player.position);
    ship.rotation = turnTowards(ship.rotation, targetAngle, cfg.rotationSpeed * dt);

    const inRange = distance(ship.position, player.position) <= cfg.triggerRange;
    updateShipMovement(ship, config, !inRange, cfg.approachSpeed, 0, dt);

    if (inRange) {
      ship.chargeTimer += dt;
      if (ship.chargeTimer >= cfg.windupSeconds) {
        ship.chargeState = 'charging';
        ship.chargeTimer = cfg.chargeDurationSeconds;
      }
    } else {
      ship.chargeTimer = 0;
    }
  }

  if (player.alive && circlesOverlap(ship.position, config.shipRadius, player.position, config.shipRadius)) {
    player.health = Math.max(0, player.health - cfg.contactDamage);
    state.hitEvents.push({ x: player.position.x, y: player.position.y });
    state.soundEvents.push('ship-collision');
    if (player.health <= 0) killShip(state, player);
    killShip(state, ship);
  }
}

function updateShooter(state: MatchState, ship: Ship, player: Ship, config: GameplayConfig, dt: number): void {
  const targetAngle = angleTo(ship.position, player.position);
  ship.rotation = turnTowards(ship.rotation, targetAngle, config.shooter.rotationSpeed * dt);

  const dx = player.position.x - ship.position.x;
  const dy = player.position.y - ship.position.y;
  const distanceToPlayer = Math.hypot(dx, dy);
  const inRange = distanceToPlayer <= config.shooter.attackRange;

  updateShipMovement(ship, config, !inRange, config.shooter.moveSpeed, 0, dt);

  ship.weaponCooldown = Math.max(0, ship.weaponCooldown - dt);
  if (inRange && ship.weaponCooldown <= 0 && player.alive) {
    const weapon = config.shooter.weapon;
    const direction = forwardVector(ship.rotation);
    const origin: Vector2 = {
      x: ship.position.x + direction.x * config.shipRadius,
      y: ship.position.y + direction.y * config.shipRadius,
    };
    spawnProjectile(state, 'enemy', origin, direction, weapon.projectileSpeed, weapon.damage, weapon.range);
    ship.weaponCooldown = weapon.cooldown;
  }
}

function killShip(state: MatchState, ship: Ship): void {
  ship.alive = false;
  ship.deathTimer = EXPLOSION_DURATION;
  state.soundEvents.push('ship-destroyed');
}

function updateProjectiles(state: MatchState, config: GameplayConfig, dt: number): void {
  const player = getPlayerShip(state);

  state.projectiles = state.projectiles.filter((projectile) => {
    projectile.position.x += projectile.velocity.x * dt;
    projectile.position.y += projectile.velocity.y * dt;
    const travelled = Math.hypot(projectile.velocity.x, projectile.velocity.y) * dt;
    projectile.remainingRange -= travelled;

    if (projectile.remainingRange <= 0) {
      state.soundEvents.push('cannonball-splash');
      return false;
    }
    if (isOutsideArena(config, projectile.position, config.projectileRadius)) {
      state.soundEvents.push('cannonball-splash');
      return false;
    }
    if (isBlockedByIsland(config, projectile.position, config.projectileRadius)) {
      state.soundEvents.push('cannonball-splash');
      return false;
    }

    if (projectile.ownerKind === 'player') {
      for (const ship of state.ships) {
        if (ship.kind === 'player' || !ship.alive) continue;
        if (circlesOverlap(projectile.position, config.projectileRadius, ship.position, config.shipRadius)) {
          ship.health -= projectile.damage;
          state.hitEvents.push({ x: projectile.position.x, y: projectile.position.y });
          if (ship.health <= 0) {
            ship.health = 0;
            killShip(state, ship);
            state.score += 1;
            state.soundEvents.push('score-point');
          }
          return false;
        }
      }
    } else if (player && player.alive) {
      if (circlesOverlap(projectile.position, config.projectileRadius, player.position, config.shipRadius)) {
        player.health = Math.max(0, player.health - projectile.damage);
        state.hitEvents.push({ x: projectile.position.x, y: projectile.position.y });
        if (player.health <= 0) killShip(state, player);
        return false;
      }
    }

    return true;
  });
}

const ENEMY_MAX_HEALTH: Record<EnemyKind, (config: GameplayConfig) => number> = {
  chaser: (config) => config.chaser.maxHealth,
  shooter: (config) => config.shooter.maxHealth,
  charger: (config) => config.charger.maxHealth,
};

function spawnEnemy(state: MatchState, config: GameplayConfig, player: Ship, kind: EnemyKind): void {
  const position = findEnemySpawnPoint(config, player.position);
  const maxHealth = ENEMY_MAX_HEALTH[kind](config);
  const rotation = angleTo(position, player.position);
  state.ships.push(createShip(state.nextEntityId++, kind, position, rotation, maxHealth));
}

/** Advances the simulation by `dt` seconds. No-ops unless the match is currently playing. */
export function updateMatch(state: MatchState, config: GameplayConfig, input: InputState, dtSeconds: number): void {
  if (state.status !== 'playing') return;

  const dt = clamp(dtSeconds, 0, MAX_DELTA_SECONDS);
  const player = getPlayerShip(state);
  if (!player) return;

  state.hitEvents = [];
  state.soundEvents = [];
  state.elapsed += dt;
  state.remaining = Math.max(0, config.matchDurationSeconds - state.elapsed);

  if (player.alive) {
    updatePlayer(state, player, config, input, dt);
  }

  for (const ship of state.ships) {
    if (ship.kind === 'player' || !ship.alive) continue;
    if (ship.kind === 'chaser') updateChaser(state, ship, player, config, dt);
    else if (ship.kind === 'charger') updateCharger(state, ship, player, config, dt);
    else updateShooter(state, ship, player, config, dt);
  }

  updateProjectiles(state, config, dt);

  for (const ship of state.ships) {
    if (!ship.alive) ship.deathTimer -= dt;
  }
  state.ships = state.ships.filter((ship) => ship.alive || ship.deathTimer > 0);

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy(state, config, player, ENEMY_SPAWN_CYCLE[state.nextEnemyKindIndex % ENEMY_SPAWN_CYCLE.length] ?? 'chaser');
    state.nextEnemyKindIndex += 1;
    state.spawnTimer = config.enemySpawnIntervalSeconds;
  }

  if (state.remaining <= 0) {
    state.status = 'ended';
    state.endReason = 'time-up';
  } else if (!player.alive) {
    state.status = 'ended';
    state.endReason = 'defeated';
    // Nothing left to hit and no one left to fire back - clear every ball in
    // flight instead of leaving them to keep colliding into enemies (and
    // triggering more hit/explosion sound) after the match is already over.
    state.projectiles = [];
  }
}
