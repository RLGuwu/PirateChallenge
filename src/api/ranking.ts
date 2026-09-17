import { apiClient } from './client';
import type { MatchConfigKey, PaginatedResult, RankingEntry } from './types';

export interface FetchRankingParams {
  config: MatchConfigKey;
  page: number;
  pageSize: number;
  playerId: string;
  signal?: AbortSignal;
}

export async function fetchRanking(params: FetchRankingParams): Promise<PaginatedResult<RankingEntry>> {
  const { data } = await apiClient.get<PaginatedResult<RankingEntry>>('/ranking', {
    params: {
      matchDurationSeconds: params.config.matchDurationSeconds,
      enemySpawnIntervalSeconds: params.config.enemySpawnIntervalSeconds,
      page: params.page,
      pageSize: params.pageSize,
      playerId: params.playerId,
    },
    signal: params.signal,
  });
  return data;
}
