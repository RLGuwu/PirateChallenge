import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { fetchHistory } from '../api/history';

const PAGE_SIZE = 5;

export function useHistoryQuery(playerId: string, page: number) {
  return useQuery({
    queryKey: ['history', playerId, page],
    queryFn: ({ signal }) => fetchHistory({ playerId, page, pageSize: PAGE_SIZE, signal }),
    placeholderData: keepPreviousData,
  });
}
