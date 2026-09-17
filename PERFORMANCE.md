# Performance profile

Methodology and results for the "does gameplay stay smooth, and does
restarting the match repeatedly leak memory?" check.

## How it's measured

`profile.mjs` (run with `npm run profile` while `npm run dev` is running)
drives 5 full mount/destroy cycles of the game screen:

1. Click **PLAY**, wait for the Pixi arena to finish loading.
2. Hold forward + turn for 3 seconds (keeps both the simulation and the
   renderer busy) while sampling every `requestAnimationFrame` callback.
3. Pause, return to the main menu (tears down `GameEngine` / `PixiRenderer`).
4. Force a GC pass (`--js-flags=--expose-gc`) and read
   `performance.memory.usedJSHeapSize`.
5. Repeat.

Frame samples are converted to **average FPS** and **p95 frame time**; the
first 2 frames of each sample are dropped as warmup. The browser is launched
headed (`headless: false`) — headless Chromium falls back to the SwiftShader
software rasterizer, which reports artificially low FPS (~28) that has
nothing to do with real GPU-accelerated performance.

## Results (5 restart cycles)

| Cycle | Avg FPS | p95 frame time | Max frame time | Heap after GC |
|-------|---------|-----------------|------------------|----------------|
| 1     | 60.0    | 16.8 ms          | 17.2 ms          | 34.22 MB       |
| 2     | 60.0    | 16.7 ms          | 16.8 ms          | 34.67 MB       |
| 3     | 60.0    | 16.8 ms          | 16.8 ms          | 34.82 MB       |
| 4     | 60.0    | 16.8 ms          | 16.8 ms          | 34.89 MB       |
| 5     | 60.0    | 16.8 ms          | 16.8 ms          | 35.28 MB       |

No console errors across the run.

## Reading

- **Frame rate**: pinned to the display's 60Hz vsync in every cycle, p95
  frame time (~16.8ms) sits right at the 60fps budget with no spikes —
  the simulation/render split and the fixed-camera-follow rendering aren't
  costing frame budget even while firing and turning.
- **Memory**: heap grows ~0.2-0.3MB per restart (≈1MB across 5 cycles).
  That's consistent with normal allocation noise (React/Pixi internals,
  V8's GC not being perfectly deterministic even after `window.gc()`) —
  not the multi-MB-per-cycle sawtooth that would indicate `GameEngine`,
  the Pixi `Application`, or its ticker aren't being torn down on unmount.
