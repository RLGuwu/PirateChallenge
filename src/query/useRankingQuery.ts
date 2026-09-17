import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchRanking } from '../api/ranking';
import type { MatchConfigKey } from '../api/types';

const PAGE_SIZE = 5;

export function useRankingQuery(config: MatchConfigKey, page: number, playerId: string) {
  return useQuery({
    queryKey: ['ranking', config.matchDurationSeconds, config.enemySpawnIntervalSeconds, page, playerId],
    queryFn: ({ signal }) => fetchRanking({ config, page, pageSize: PAGE_SIZE, playerId, signal }),
    placeholderData: keepPreviousData,
  });
}
