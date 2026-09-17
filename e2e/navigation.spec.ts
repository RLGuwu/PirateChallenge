import { test, expect } from '@playwright/test';
import { resetAppStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

test('menu links to every screen and back again', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'PLAY' })).toBeVisible();

  await page.getByRole('button', { name: 'OPTIONS' }).click();
  await expect(page.getByRole('heading', { name: 'OPTIONS' })).toBeVisible();
  await page.getByRole('button', { name: 'MAIN MENU' }).click();
  await expect(page.getByRole('button', { name: 'PLAY' })).toBeVisible();

  await page.getByRole('button', { name: 'RANKING' }).click();
  await expect(page.getByRole('heading', { name: "CAPTAIN'S LOG" })).toBeVisible();
  await page.getByRole('button', { name: 'MAIN MENU' }).click();
  await expect(page.getByRole('button', { name: 'PLAY' })).toBeVisible();

  await page.getByRole('button', { name: 'MATCH HISTORY' }).click();
  await expect(page.getByRole('heading', { name: "CAPTAIN'S LOG" })).toBeVisible();
});

test('the network scenario widget is available on every screen without hiding the logo', async ({ page }) => {
  await page.goto('/');
  const corner = page.locator('.network-scenario-corner');
  await expect(corner).toBeVisible();

  await page.getByRole('button', { name: 'RANKING' }).click();
  await expect(corner).toBeVisible();

  const cornerBox = await corner.boundingBox();
  const logoBox = await page.locator('.brand-logo').boundingBox();
  expect(cornerBox).not.toBeNull();
  expect(logoBox).not.toBeNull();
  // The widget must sit strictly above the logo, never overlapping it.
  expect(cornerBox!.y + cornerBox!.height).toBeLessThanOrEqual(logoBox!.y);
});
