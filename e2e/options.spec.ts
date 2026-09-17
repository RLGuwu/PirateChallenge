import { test, expect } from '@playwright/test';
import { resetAppStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

test('session and spawn steppers persist across reloads', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'OPTIONS' }).click();

  await expect(page.getByText('120 s')).toBeVisible();
  await page.getByRole('button', { name: 'Increase session time' }).click();
  await expect(page.getByText('130 s')).toBeVisible();

  await expect(page.getByText('3 s')).toBeVisible();
  await page.getByRole('button', { name: 'Decrease enemy spawn time' }).click();
  await expect(page.getByText('2 s')).toBeVisible();

  await page.reload();
  await page.getByRole('button', { name: 'OPTIONS' }).click();
  await expect(page.getByText('130 s')).toBeVisible();
  await expect(page.getByText('2 s')).toBeVisible();
});

test('steppers clamp at their configured bounds', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'OPTIONS' }).click();

  // Default spawn time is 3s with a 1s step: two clicks reach the 1s floor.
  const decreaseSpawn = page.getByRole('button', { name: 'Decrease enemy spawn time' });
  await decreaseSpawn.click();
  await decreaseSpawn.click();
  await expect(page.getByText('1 s')).toBeVisible();
  await expect(decreaseSpawn).toBeDisabled();
});
