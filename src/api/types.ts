/** The two gameplay knobs that make two matches "comparable" on the ranking. */
export interface MatchConfigKey {
  matchDurationSeconds: number;
  enemySpawnIntervalSeconds: number;
}

export type MatchEndReason = 'time-up' | 'defeated';

/** A single completed match, as stored server-side and shown in history. */
export interface MatchRecord {
  /** Client-generated idempotency key: resubmitting the same id never duplicates the record. */
  matchId: string;
  playerId: string;
  playerName: string;
  score: number;
  /** Actual time played, in seconds (may be less than the configured duration if the player was defeated early). */
  durationSeconds: number;
  endReason: MatchEndReason;
  config: MatchConfigKey;
  /** ISO-8601 timestamp assigned by the server when the record is first created. */
  playedAt: string;
}

/** A ranking row: a match record plus its computed position and whether it belongs to the caller. */
export interface RankingEntry extends MatchRecord {
  rank: number;
  isYou: boolean;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

/** Body sent to register a completed match. */
export interface RegisterMatchPayload {
  matchId: string;
  playerId: string;
  playerName: string;
  score: number;
  durationSeconds: number;
  endReason: MatchEndReason;
  config: MatchConfigKey;
}
