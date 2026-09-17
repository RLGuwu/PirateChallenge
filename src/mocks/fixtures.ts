import { SESSION_SECONDS_DEFAULT, SPAWN_SECONDS_DEFAULT } from '../game/config';
import type { MatchRecord } from '../api/types';

const DEFAULT_CONFIG = {
  matchDurationSeconds: SESSION_SECONDS_DEFAULT,
  enemySpawnIntervalSeconds: SPAWN_SECONDS_DEFAULT,
};

/**
 * Other captains on the ranking, per the challenge brief ("Outros jogadores são
 * representados por fixtures"). They only exist for the default config, so a
 * player who changes Options to an unusual combo simply sees their own matches.
 */
export function createFixtureRecords(): MatchRecord[] {
  const bots: Array<{ name: string; score: number; hoursAgo: number }> = [
    { name: 'Captain Flint', score: 38, hoursAgo: 2 },
    { name: 'Red Sparrow', score: 32, hoursAgo: 3 },
    { name: 'Storm Rider', score: 21, hoursAgo: 5 },
    { name: 'Sea Wolf', score: 19, hoursAgo: 6 },
    { name: 'Iron Beard', score: 17, hoursAgo: 8 },
    { name: 'Coral Fox', score: 15, hoursAgo: 9 },
    { name: 'Silver Hook', score: 14, hoursAgo: 11 },
    { name: 'Night Raven', score: 12, hoursAgo: 13 },
    { name: 'Blue Anchor', score: 10, hoursAgo: 15 },
    { name: 'Golden Tide', score: 9, hoursAgo: 18 },
    { name: 'Crimson Squall', score: 8, hoursAgo: 20 },
    { name: 'Windjammer', score: 7, hoursAgo: 22 },
    { name: 'Salt Reaper', score: 6, hoursAgo: 26 },
    { name: 'Barnacle Bill', score: 5, hoursAgo: 30 },
  ];

  const now = Date.now();

  return bots.map((bot, index) => ({
    matchId: `fixture-${index}`,
    playerId: `fixture-player-${index}`,
    playerName: bot.name,
    score: bot.score,
    durationSeconds: DEFAULT_CONFIG.matchDurationSeconds,
    endReason: 'time-up',
    config: DEFAULT_CONFIG,
    playedAt: new Date(now - bot.hoursAgo * 60 * 60 * 1000).toISOString(),
  }));
}
