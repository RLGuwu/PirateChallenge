import { apiClient } from './client';
import type { MatchRecord, PaginatedResult, RegisterMatchPayload } from './types';

export interface FetchHistoryParams {
  playerId: string;
  page: number;
  pageSize: number;
  signal?: AbortSignal;
}

export async function fetchHistory(params: FetchHistoryParams): Promise<PaginatedResult<MatchRecord>> {
  const { data } = await apiClient.get<PaginatedResult<MatchRecord>>('/history', {
    params: {
      playerId: params.playerId,
      page: params.page,
      pageSize: params.pageSize,
    },
    signal: params.signal,
  });
  return data;
}

/** Idempotent by `payload.matchId`: resubmitting the same match returns the existing record. */
export async function registerMatch(payload: RegisterMatchPayload): Promise<MatchRecord> {
  const { data } = await apiClient.post<MatchRecord>('/matches', payload);
  return data;
}
