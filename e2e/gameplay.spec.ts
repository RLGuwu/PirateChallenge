import { test, expect } from '@playwright/test';
import { resetAppStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

test('a match loads the PixiJS canvas, renders the HUD, and reacts to input without console errors', async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (error) => consoleErrors.push(error.message));

  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY' }).click();

  // Loading overlay must appear then clear once Pixi finishes initializing.
  await expect(page.getByText('Loading arena…')).toBeVisible();
  await expect(page.getByText('Loading arena…')).toBeHidden({ timeout: 15_000 });

  const canvas = page.locator('.game-canvas canvas');
  await expect(canvas).toBeVisible();

  await expect(page.locator('.hud-counter-value').first()).toHaveText('0'); // score starts at 0
  await expect(page.getByText(/^\d+s$/)).toBeVisible(); // time remaining
  await expect(page.locator('.player-health-hud')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Pause game' })).toBeVisible();

  const initialTimeText = await page.locator('.hud-counter-value').nth(1).textContent();

  // Drive the ship for a moment - this should never throw inside the sim/render loop.
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  await page.keyboard.press('Space');
  await page.waitForTimeout(1500);
  await page.keyboard.up('w');
  await page.keyboard.up('d');

  const laterTimeText = await page.locator('.hud-counter-value').nth(1).textContent();
  expect(laterTimeText).not.toBe(initialTimeText);

  await page.keyboard.press('Escape');
  await expect(page.getByText('Paused')).toBeVisible();
  await page.getByRole('button', { name: 'RESUME' }).click();
  await expect(page.getByText('Paused')).toBeHidden();

  expect(consoleErrors).toEqual([]);
});

test('pausing then returning to the main menu tears down the game cleanly', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY' }).click();
  await expect(page.getByText('Loading arena…')).toBeHidden({ timeout: 15_000 });

  await page.keyboard.press('Escape');
  await expect(page.getByText('Paused')).toBeVisible();
  await page.getByRole('button', { name: 'MAIN MENU' }).click();

  await expect(page.getByRole('button', { name: 'PLAY' })).toBeVisible();
  await expect(page.locator('.game-canvas canvas')).toHaveCount(0);
});
