import { test, expect, type Page } from '@playwright/test';
import { resetAppStorage } from './helpers';

/** Counts every AudioBufferSourceNode.start() call, without needing real audio output. */
async function installPlaybackSpy(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __soundStarts: number }).__soundStarts = 0;
    const OriginalCtx = window.AudioContext;
    if (!OriginalCtx) return;
    const proto = OriginalCtx.prototype;
    const originalCreateBufferSource = proto.createBufferSource;
    proto.createBufferSource = function (...args: Parameters<typeof originalCreateBufferSource>) {
      const node = originalCreateBufferSource.apply(this, args);
      const originalStart = node.start.bind(node);
      node.start = (...startArgs: Parameters<typeof originalStart>) => {
        (window as unknown as { __soundStarts: number }).__soundStarts += 1;
        return originalStart(...startArgs);
      };
      return node;
    };
  });
}

/** page.evaluate can transiently throw if it races a same-tab navigation; treat that as "no change yet". */
async function soundStarts(page: Page): Promise<number> {
  try {
    return await page.evaluate(() => (window as unknown as { __soundStarts: number }).__soundStarts ?? 0);
  } catch {
    return -1;
  }
}

test.beforeEach(async ({ page }) => {
  await resetAppStorage(page);
});

test('every sound asset loads (no 404s) across menu, options and a match', async ({ page }) => {
  const failedAudio: string[] = [];
  page.on('response', (response) => {
    // 304 (Not Modified, served from cache) is a success, not a failure.
    if (/\.wav($|\?)/i.test(response.url()) && response.status() >= 400) {
      failedAudio.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'OPTIONS' }).click();
  await page.getByRole('button', { name: 'MAIN MENU' }).click();
  await page.getByRole('button', { name: 'PLAY' }).click();
  await expect(page.getByText('Loading arena…')).toBeHidden({ timeout: 15_000 });
  await page.keyboard.press('Space');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'RESUME' }).click();

  expect(failedAudio).toEqual([]);
});

test('hovering and clicking a menu button plays a sound', async ({ page }) => {
  await installPlaybackSpy(page);
  await page.goto('/');

  const before = await soundStarts(page);
  await page.getByRole('button', { name: 'OPTIONS' }).hover();
  await expect.poll(() => soundStarts(page)).toBeGreaterThan(before);

  const afterHover = await soundStarts(page);
  await page.getByRole('button', { name: 'OPTIONS' }).click();
  await expect.poll(() => soundStarts(page)).toBeGreaterThan(afterHover);
});

test('firing, pausing and resuming a match each trigger a sound, with no console errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await installPlaybackSpy(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY' }).click();
  await expect(page.getByText('Loading arena…')).toBeHidden({ timeout: 15_000 });

  // game_start + the ocean ambience loop should have fired on their own already.
  await expect.poll(() => soundStarts(page)).toBeGreaterThanOrEqual(2);

  const beforeFire = await soundStarts(page);
  await page.keyboard.press('Space');
  await expect.poll(() => soundStarts(page)).toBeGreaterThan(beforeFire);

  const beforePause = await soundStarts(page);
  await page.keyboard.press('Escape');
  await expect.poll(() => soundStarts(page)).toBeGreaterThan(beforePause);
  await expect(page.getByText('Paused')).toBeVisible();

  const beforeResume = await soundStarts(page);
  await page.getByRole('button', { name: 'RESUME' }).click();
  await expect.poll(() => soundStarts(page)).toBeGreaterThan(beforeResume);

  expect(errors).toEqual([]);
});

test('sounds and effects from the killing hit do not keep replaying after the player is defeated', async ({
  page,
}) => {
  // Regression test: hitEvents/soundEvents used to only get cleared inside
  // updateMatch, which GameEngine stops calling once the match isn't
  // 'playing' - but its tick() kept calling renderer.sync() and replaying
  // the last tick's soundEvents every single frame forever afterward.
  test.setTimeout(90_000);
  await installPlaybackSpy(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'PLAY' }).click();
  await expect(page.getByText('Loading arena…')).toBeHidden({ timeout: 15_000 });

  // Sit still - a chaser will path in and ram the player (a kamikaze contact
  // kill), which is what used to trigger the replay loop.
  await expect(page.getByText('Ship defeated')).toBeVisible({ timeout: 60_000 });

  // Well past the ~0.6s death/explosion window - the count must have settled.
  await page.waitForTimeout(1_500);
  const settled = await soundStarts(page);
  await page.waitForTimeout(2_000);
  const later = await soundStarts(page);

  expect(later).toBe(settled);
});
