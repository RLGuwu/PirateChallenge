import { http, HttpResponse, delay } from 'msw';
import type { MatchRecord, PaginatedResult, RankingEntry, RegisterMatchPayload } from '../api/types';
import { findRecordById, insertRecordIfAbsent, listRecords, hasFailedOnce, markFailedOnce } from './db';
import { getScenario } from './scenarios';

function paginate<T>(items: T[], page: number, pageSize: number): PaginatedResult<T> {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages: Math.max(1, Math.ceil(items.length / pageSize)),
  };
}

/** Ranking sort: highest score first; on a tie, whoever reached it first ranks higher. */
function compareForRanking(a: MatchRecord, b: MatchRecord): number {
  if (b.score !== a.score) return b.score - a.score;
  return a.playedAt.localeCompare(b.playedAt);
}

async function applyBaselineLatency(): Promise<void> {
  await delay(150 + Math.random() * 150);
}

/** Returns a Response for scenarios that should fail every request of any kind, else null to continue. */
async function applyGenericFailure(): Promise<Response | null> {
  const scenario = getScenario();
  switch (scenario) {
    case 'timeout':
      await delay('infinite');
      return null; // unreachable, delay('infinite') never resolves
    case 'connection-error':
      return HttpResponse.error();
    case 'error-4xx':
      return HttpResponse.json({ message: 'Bad request' }, { status: 400 });
    case 'error-5xx':
      return HttpResponse.json({ message: 'Internal server error' }, { status: 500 });
    case 'slow':
      await delay(2500);
      return null;
    case 'variable-latency':
      await delay(200 + Math.random() * 2000);
      return null;
    default:
      await applyBaselineLatency();
      return null;
  }
}

export const handlers = [
  http.get('/api/ranking', async ({ request }) => {
    const failure = await applyGenericFailure();
    if (failure) return failure;
    if (getScenario() === 'ranking-failure') {
      return HttpResponse.json({ message: 'Ranking temporarily unavailable' }, { status: 500 });
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '5');
    const matchDurationSeconds = Number(url.searchParams.get('matchDurationSeconds'));
    const enemySpawnIntervalSeconds = Number(url.searchParams.get('enemySpawnIntervalSeconds'));
    const playerId = url.searchParams.get('playerId') ?? '';

    if (getScenario() === 'empty') {
      return HttpResponse.json(paginate<RankingEntry>([], page, pageSize));
    }

    const comparable = listRecords().filter(
      (record) =>
        record.config.matchDurationSeconds === matchDurationSeconds &&
        record.config.enemySpawnIntervalSeconds === enemySpawnIntervalSeconds,
    );
    const sorted = [...comparable].sort(compareForRanking);
    const entries: RankingEntry[] = sorted.map((record, index) => ({
      ...record,
      rank: index + 1,
      isYou: record.playerId === playerId,
    }));

    return HttpResponse.json(paginate(entries, page, pageSize));
  }),

  http.get('/api/history', async ({ request }) => {
    const failure = await applyGenericFailure();
    if (failure) return failure;
    if (getScenario() === 'history-failure') {
      return HttpResponse.json({ message: 'History temporarily unavailable' }, { status: 500 });
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') ?? '1');
    const pageSize = Number(url.searchParams.get('pageSize') ?? '5');
    const playerId = url.searchParams.get('playerId') ?? '';

    if (getScenario() === 'empty') {
      return HttpResponse.json(paginate<MatchRecord>([], page, pageSize));
    }

    const own = listRecords()
      .filter((record) => record.playerId === playerId)
      .sort((a, b) => b.playedAt.localeCompare(a.playedAt));

    return HttpResponse.json(paginate(own, page, pageSize));
  }),

  http.post('/api/matches', async ({ request }) => {
    const payload = (await request.json()) as RegisterMatchPayload;
    const scenario = getScenario();

    if (scenario === 'register-timeout') {
      if (!hasFailedOnce(payload.matchId)) {
        markFailedOnce(payload.matchId);
        await delay('infinite');
      }
    } else if (scenario === 'match-end-unavailable') {
      if (!hasFailedOnce(payload.matchId)) {
        markFailedOnce(payload.matchId);
        return HttpResponse.json({ message: 'Service unavailable' }, { status: 503 });
      }
    } else {
      const failure = await applyGenericFailure();
      if (failure) return failure;
    }

    const existing = findRecordById(payload.matchId);
    if (existing) {
      return HttpResponse.json(existing, { status: 200 });
    }

    const record: MatchRecord = { ...payload, playedAt: new Date().toISOString() };
    const { record: stored, created } = insertRecordIfAbsent(record);
    return HttpResponse.json(stored, { status: created ? 201 : 200 });
  }),
];
