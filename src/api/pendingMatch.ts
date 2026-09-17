import type { RegisterMatchPayload } from './types';

const PENDING_MATCH_KEY = 'pirate-battle:pending-match';

/**
 * A match result is written here the moment the match ends, before the
 * network call is even attempted, and removed only once the server confirms
 * it. That way a refresh mid-failure (or mid-timeout) doesn't lose the
 * result - `recoverPendingMatch` retries it on the next app load.
 */
export function savePendingMatch(payload: RegisterMatchPayload): void {
  try {
    localStorage.setItem(PENDING_MATCH_KEY, JSON.stringify(payload));
  } catch {
    // Best-effort only; losing this to a full storage quota shouldn't crash the app.
  }
}

export function loadPendingMatch(): RegisterMatchPayload | null {
  try {
    const raw = localStorage.getItem(PENDING_MATCH_KEY);
    return raw ? (JSON.parse(raw) as RegisterMatchPayload) : null;
  } catch {
    return null;
  }
}

export function clearPendingMatch(matchId: string): void {
  const pending = loadPendingMatch();
  if (pending?.matchId === matchId) {
    localStorage.removeItem(PENDING_MATCH_KEY);
  }
}
