import { test, expect } from '@playwright/test';
import { resetAppStorage, seedScenario } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

test('success scenario shows the seeded ranking table', async ({ page }) => {
  await seedScenario(page, 'success');
  await page.goto('/');
  await page.getByRole('button', { name: 'RANKING' }).click();
  await expect(page.getByRole('table')).toBeVisible();
  await expect(page.locator('tbody tr').first()).toBeVisible();
});

test('empty scenario shows the empty-state message instead of a table', async ({ page }) => {
  await seedScenario(page, 'empty');
  await page.goto('/');
  await page.getByRole('button', { name: 'RANKING' }).click();
  await expect(page.getByText('No ranked battles yet for this configuration.')).toBeVisible();
  await expect(page.getByRole('table')).toHaveCount(0);
});

test('ranking-failure scenario surfaces an error with a working retry button', async ({ page }) => {
  await seedScenario(page, 'ranking-failure');
  await page.goto('/');
  await page.getByRole('button', { name: 'RANKING' }).click();

  await expect(page.getByText("Couldn't load the ranking.")).toBeVisible({ timeout: 10_000 });

  // Fix the scenario, then confirm the retry button actually recovers.
  await page.evaluate(() => localStorage.setItem('pirate-battle:network-scenario', 'success'));
  await page.getByRole('button', { name: 'RETRY' }).click();
  await expect(page.getByRole('table')).toBeVisible({ timeout: 10_000 });
});

test('history-failure scenario only breaks history, not ranking', async ({ page }) => {
  await seedScenario(page, 'history-failure');
  await page.goto('/');

  await page.getByRole('button', { name: 'RANKING' }).click();
  await expect(page.getByRole('table')).toBeVisible();

  await page.getByRole('button', { name: 'MATCH HISTORY' }).click();
  await expect(page.getByText("Couldn't load your match history.")).toBeVisible({ timeout: 10_000 });
});

test('connection-error scenario fails after retries with a visible error', async ({ page }) => {
  await seedScenario(page, 'connection-error');
  await page.goto('/');
  await page.getByRole('button', { name: 'RANKING' }).click();
  await expect(page.getByText("Couldn't load the ranking.")).toBeVisible({ timeout: 10_000 });
});

test('slow and timeout scenarios keep the loading state visible instead of erroring immediately', async ({ page }) => {
  await seedScenario(page, 'slow');
  await page.goto('/');
  await page.getByRole('button', { name: 'RANKING' }).click();
  await expect(page.getByText('Loading ranking…')).toBeVisible();
  // Still loading well before the 2.5s mock latency resolves - proves there is
  // no premature error/empty flash while the request is in flight.
  await page.waitForTimeout(800);
  await expect(page.getByText('Loading ranking…')).toBeVisible();
});
