import type { MatchRecord } from '../api/types';
import { createFixtureRecords } from './fixtures';

const RECORDS_KEY = 'pirate-battle:mock-db:records';
const FAILED_ONCE_KEY = 'pirate-battle:mock-db:failed-once';

function readRecords(): MatchRecord[] {
  try {
    const raw = localStorage.getItem(RECORDS_KEY);
    if (raw) return JSON.parse(raw) as MatchRecord[];
  } catch {
    // fall through to reseed
  }
  const seeded = createFixtureRecords();
  writeRecords(seeded);
  return seeded;
}

function writeRecords(records: MatchRecord[]): void {
  localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
}

export function listRecords(): MatchRecord[] {
  return readRecords();
}

export function findRecordById(matchId: string): MatchRecord | undefined {
  return readRecords().find((record) => record.matchId === matchId);
}

/** Inserts a new record unless `matchId` already exists (idempotent registration). */
export function insertRecordIfAbsent(record: MatchRecord): { record: MatchRecord; created: boolean } {
  const records = readRecords();
  const existing = records.find((item) => item.matchId === record.matchId);
  if (existing) return { record: existing, created: false };

  const updated = [record, ...records];
  writeRecords(updated);
  return { record, created: true };
}

export function resetMockData(): void {
  localStorage.removeItem(RECORDS_KEY);
  localStorage.removeItem(FAILED_ONCE_KEY);
}

/** Tracks match ids that have already failed once, so "recover on retry" scenarios only fail the first attempt. */
function readFailedOnce(): string[] {
  try {
    const raw = localStorage.getItem(FAILED_ONCE_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

export function hasFailedOnce(matchId: string): boolean {
  return readFailedOnce().includes(matchId);
}

export function markFailedOnce(matchId: string): void {
  const failed = readFailedOnce();
  if (!failed.includes(matchId)) {
    localStorage.setItem(FAILED_ONCE_KEY, JSON.stringify([...failed, matchId]));
  }
}
