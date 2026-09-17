import { chromium } from 'playwright';

const CYCLES = 5;
const SAMPLE_MS = 3000;

// Headed on purpose: headless Chromium falls back to the SwiftShader software
// rasterizer, which reports artificially low FPS that has nothing to do with
// real GPU-accelerated performance. See PERFORMANCE.md.
const browser = await chromium.launch({
  headless: false,
  args: ['--enable-precise-memory-info', '--js-flags=--expose-gc'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

const consoleErrors = [];
page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => consoleErrors.push(err.message));

await page.goto('http://localhost:5173/');

async function forceGc() {
  await page.evaluate(() => {
    if (typeof window.gc === 'function') window.gc();
  });
}

async function readHeapMB() {
  return page.evaluate(() => {
    const mem = performance.memory;
    return mem ? mem.usedJSHeapSize / (1024 * 1024) : null;
  });
}

async function sampleFrameTimes(durationMs) {
  return page.evaluate((duration) => {
    return new Promise((resolve) => {
      const samples = [];
      let last = performance.now();
      function tick(now) {
        samples.push(now - last);
        last = now;
        if (now < duration.start + duration.ms) {
          requestAnimationFrame(tick);
        } else {
          resolve(samples);
        }
      }
      const start = performance.now();
      duration.start = start;
      requestAnimationFrame(tick);
    });
  }, { ms: durationMs, start: 0 });
}

function stats(samplesMs) {
  const sorted = [...samplesMs].sort((a, b) => a - b);
  const p95Index = Math.floor(sorted.length * 0.95);
  const avgFrameMs = samplesMs.reduce((a, b) => a + b, 0) / samplesMs.length;
  return {
    avgFps: 1000 / avgFrameMs,
    p95FrameMs: sorted[Math.min(p95Index, sorted.length - 1)],
    maxFrameMs: sorted[sorted.length - 1],
    frames: samplesMs.length,
  };
}

const results = [];

for (let cycle = 1; cycle <= CYCLES; cycle += 1) {
  await page.getByRole('button', { name: 'PLAY' }).click();
  await page.getByText('Loading arena…').waitFor({ state: 'hidden', timeout: 15000 });

  // Drive the ship so simulation + render both stay busy during the sample.
  await page.keyboard.down('w');
  await page.keyboard.down('d');
  const frameSamples = await sampleFrameTimes(SAMPLE_MS);
  await page.keyboard.up('w');
  await page.keyboard.up('d');

  const { avgFps, p95FrameMs, maxFrameMs } = stats(frameSamples.slice(2)); // drop first 2 warmup frames

  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'MAIN MENU' }).click();
  await page.getByRole('button', { name: 'PLAY' }).waitFor({ state: 'visible' });

  await forceGc();
  await page.waitForTimeout(200);
  const heapMB = await readHeapMB();

  results.push({ cycle, avgFps, p95FrameMs, maxFrameMs, heapMB });
  console.log(
    `cycle ${cycle}: avgFps=${avgFps.toFixed(1)} p95Frame=${p95FrameMs.toFixed(2)}ms max=${maxFrameMs.toFixed(2)}ms heap=${heapMB ? heapMB.toFixed(2) + 'MB' : 'n/a'}`,
  );
}

console.log('\nconsole errors during run:', consoleErrors.length ? consoleErrors : 'none');
console.log('\nheap trend (MB):', results.map((r) => r.heapMB?.toFixed(2)).join(' -> '));

await browser.close();
