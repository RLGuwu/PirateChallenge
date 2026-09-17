import type { GameplayConfig, IslandConfig, Vector2 } from './types';
import { clamp, distance } from './math';
import { ISLAND_SOLID_RATIO } from './config';

/**
 * Shortest distance from `position` to the island's *solid* footprint (0 if
 * inside it) - the outer glow ring drawn around the island is cosmetic only
 * and deliberately excluded here, so it never blocks movement.
 */
function distanceToIsland(position: Vector2, island: IslandConfig): number {
  const solidHalfSize = island.halfSize * ISLAND_SOLID_RATIO;
  const dx = Math.max(Math.abs(position.x - island.x) - solidHalfSize, 0);
  const dy = Math.max(Math.abs(position.y - island.y) - solidHalfSize, 0);
  return Math.hypot(dx, dy);
}

export function isBlockedByIsland(config: GameplayConfig, position: Vector2, radius: number): boolean {
  return config.islands.some((island) => distanceToIsland(position, island) < radius);
}

export function clampToArenaBounds(config: GameplayConfig, position: Vector2, radius: number): Vector2 {
  return {
    x: clamp(position.x, radius, config.arenaWidth - radius),
    y: clamp(position.y, radius, config.arenaHeight - radius),
  };
}

export function isOutsideArena(config: GameplayConfig, position: Vector2, margin = 0): boolean {
  return (
    position.x < -margin ||
    position.y < -margin ||
    position.x > config.arenaWidth + margin ||
    position.y > config.arenaHeight + margin
  );
}

const MAX_SPAWN_ATTEMPTS = 40;

/** Finds a random spawn point that is clear of islands and far enough from the player. */
export function findEnemySpawnPoint(
  config: GameplayConfig,
  playerPosition: Vector2,
  rng: () => number = Math.random,
): Vector2 {
  for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt += 1) {
    const candidate: Vector2 = {
      x: config.shipRadius * 2 + rng() * (config.arenaWidth - config.shipRadius * 4),
      y: config.shipRadius * 2 + rng() * (config.arenaHeight - config.shipRadius * 4),
    };

    const farEnoughFromPlayer = distance(candidate, playerPosition) >= config.minSpawnDistanceFromPlayer;
    const clearOfIslands = !isBlockedByIsland(config, candidate, config.shipRadius + 20);

    if (farEnoughFromPlayer && clearOfIslands) {
      return candidate;
    }
  }

  // Fallback: arena corner farthest from the player, used only if random sampling
  // repeatedly failed (e.g. a very small arena packed with islands).
  const corners: Vector2[] = [
    { x: config.shipRadius * 2, y: config.shipRadius * 2 },
    { x: config.arenaWidth - config.shipRadius * 2, y: config.shipRadius * 2 },
    { x: config.shipRadius * 2, y: config.arenaHeight - config.shipRadius * 2 },
    { x: config.arenaWidth - config.shipRadius * 2, y: config.arenaHeight - config.shipRadius * 2 },
  ];
  return corners.reduce((best, corner) =>
    distance(corner, playerPosition) > distance(best, playerPosition) ? corner : best,
  );
}
