import { test, expect } from '@playwright/test';
import { resetAppStorage } from './helpers';

test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

test('every menu action is a real, keyboard-focusable button with an accessible name', async ({ page }) => {
  await page.goto('/');

  for (const name of ['PLAY', 'OPTIONS', 'RANKING', 'MATCH HISTORY']) {
    const button = page.getByRole('button', { name });
    await expect(button).toBeVisible();
    expect(await button.evaluate((el) => el.tagName)).toBe('BUTTON');
  }
});

test('the main menu is fully operable by keyboard alone', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY' }).focus();
  await expect(page.getByRole('button', { name: 'PLAY' })).toBeFocused();

  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'OPTIONS' })).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'OPTIONS' })).toBeVisible();

  // The stepper +/- controls must be reachable and operable without a mouse.
  const increase = page.getByRole('button', { name: 'Increase session time' });
  await increase.focus();
  await expect(increase).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByText('130 s')).toBeVisible();
});

test('a focused interactive element gets a visible focus outline', async ({ page }) => {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'PLAY' });
  await play.focus();
  const outline = await play.evaluate((el) => getComputedStyle(el).outlineStyle);
  expect(outline).not.toBe('none');
});

test('decorative images do not duplicate the button label for screen readers', async ({ page }) => {
  await page.goto('/');
  const play = page.getByRole('button', { name: 'PLAY' });
  const img = play.locator('img');
  await expect(img).toHaveAttribute('alt', '');
});

test('the network scenario widget exposes a labeled control', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('combobox', { name: 'Network scenario' })).toBeVisible();
  await expect(page.getByRole('button', { name: /reset network scenario/i })).toBeVisible();
});
