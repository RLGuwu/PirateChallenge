import { test, expect, type Page } from '@playwright/test';
import { resetAppStorage, seedScenario } from './helpers';

const PLAYER_ID = 'e2e-test-player';

/** page.evaluate can transiently throw if it races a same-tab navigation; treat that as "not settled yet". */
async function readPendingMatch(page: Page): Promise<string | null> {
  try {
    return await page.evaluate(() => localStorage.getItem('pirate-battle:pending-match'));
  } catch {
    return 'not-settled';
  }
}

/** Seeds a completed-but-unconfirmed match, as if the tab closed mid-request last session. */
async function seedPendingMatch(page: Page, matchId: string) {
  await page.addInitScript(
    ({ playerId, id }) => {
      window.localStorage.setItem('pirate-battle:player-id', playerId);
      window.localStorage.setItem('pirate-battle:player-name', 'E2E Tester');
      window.localStorage.setItem(
        'pirate-battle:pending-match',
        JSON.stringify({
          matchId: id,
          playerId,
          playerName: 'E2E Tester',
          score: 42,
          durationSeconds: 90,
          endReason: 'time-up',
          config: { matchDurationSeconds: 120, enemySpawnIntervalSeconds: 3 },
        }),
      );
    },
    { playerId: PLAYER_ID, id: matchId },
  );
}

test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

test('a pending match from a previous session is recovered and saved exactly once', async ({ page }) => {
  const matchId = `pending-${Date.now()}`;
  await seedScenario(page, 'match-end-unavailable');
  await seedPendingMatch(page, matchId);
  await page.goto('/');

  // The recovery mutation fails once (503) then succeeds on retry - give it room for both attempts.
  await expect.poll(() => readPendingMatch(page), { timeout: 8_000 }).toBeNull();

  await page.getByRole('button', { name: 'MATCH HISTORY' }).click();
  const rows = page.locator('tbody tr');
  await expect(rows).toHaveCount(1, { timeout: 10_000 });
  await expect(rows.first()).toContainText('42');
});

test('recovering the same pending match twice never creates a duplicate history row', async ({ page }) => {
  const matchId = `dup-${Date.now()}`;
  await seedScenario(page, 'success');
  await seedPendingMatch(page, matchId);
  await page.goto('/');

  await expect.poll(() => readPendingMatch(page), { timeout: 8_000 }).toBeNull();

  // Re-seed the exact same matchId as pending and let the app "recover" it again.
  await seedPendingMatch(page, matchId);
  await page.reload();
  await expect.poll(() => readPendingMatch(page), { timeout: 8_000 }).toBeNull();

  await page.getByRole('button', { name: 'MATCH HISTORY' }).click();
  await expect(page.locator('tbody tr')).toHaveCount(1, { timeout: 10_000 });
});
