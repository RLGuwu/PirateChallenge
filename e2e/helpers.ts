import type { Page } from '@playwright/test';
import type { NetworkScenario } from '../src/mocks/scenarios';

/** Selects a mock network scenario before the page's first script runs. */
export async function seedScenario(page: Page, scenario: NetworkScenario): Promise<void> {
  await page.addInitScript((value) => {
    window.localStorage.setItem('pirate-battle:network-scenario', value);
  }, scenario);
}

/**
 * Wipes every key this app owns, so each test starts from a clean slate.
 * Deliberately NOT an addInitScript: that would re-run (and wipe state again)
 * on every later page.reload() a test performs on purpose.
 */
export async function resetAppStorage(page: Page): Promise<void> {
  await page.goto('/');
  await page.evaluate(() => {
    const prefix = 'pirate-battle:';
    Object.keys(window.localStorage)
      .filter((key) => key.startsWith(prefix))
      .forEach((key) => window.localStorage.removeItem(key));
  });
}
