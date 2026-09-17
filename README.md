# Pirate Battle

A top-down naval shooter built for the "Pirate Battle" challenge: React 19 +
TypeScript (strict) + PixiJS 8 for the arena, TanStack Query + Axios + MSW
for a fully mocked ranking/match-history backend.

Set sail, survive waves of enemy ships and the clock, and see how your score
stacks up on the Captain's Log.

## Requirements

- Node.js 20+
- npm

## Getting started

```bash
npm install
npm run dev       # http://localhost:5173
```

There is no real backend: `msw` intercepts every `/api/*` request in the
browser (dev **and** the production build) and serves it from a small
`localStorage`-backed mock database. See [ARCHITECTURE.md](./ARCHITECTURE.md)
for how that's wired up.

## Scripts

| Command                | What it does                                                   |
|-------------------------|-----------------------------------------------------------------|
| `npm run dev`           | Start the Vite dev server.                                     |
| `npm run build`         | Type-check (`tsc --noEmit`) then produce a production build.   |
| `npm run preview`       | Serve the production build locally.                            |
| `npm run typecheck`     | Type-check only.                                                |
| `npm run test:e2e`      | Run the Playwright end-to-end suite (starts/reuses the dev server automatically). |
| `npm run test:e2e:ui`   | Same, with Playwright's interactive UI runner.                 |
| `npm run profile`       | Measure FPS / frame time / memory across 5 restart cycles (needs `npm run dev` running). See [PERFORMANCE.md](./PERFORMANCE.md). |

## Playing

- **Move**: `W` / `↑` forward, `A` `D` or `←` `→` to turn (or the on-screen
  touch controls on small screens).
- **Fire**: `Space` (front), `Q` (left broadside), `E` (right broadside).
- **Pause**: `Esc`, or the pause button in the HUD.

Survive until the timer runs out, or go down fighting - either way the match
is saved to your Match History and, if it's a good run, the Ranking.

## Features

- **Arena**: fixed-camera-follow PixiJS rendering, tile-built islands with
  circle-vs-box collision, alternating hit/explosion/sinking effects, a front
  cannon plus two broadsides, three enemy archetypes (a melee chaser, a
  ranged shooter, and a charger that winds up then dashes in a straight,
  un-steerable line).
- **HUD**: health bar, score/timer counters, pause menu, touch controls for
  mobile.
- **Ranking & Match History**: paginated, config-scoped ranking plus a
  per-player match history, both backed by real `axios` calls through
  TanStack Query (`useQuery`/`useMutation`, retries, `keepPreviousData`).
- **Idempotent match registration**: each match gets a client-generated id;
  if the save fails or the tab closes mid-request, the pending result is
  retried on the next load without ever creating a duplicate.
- **Network scenario widget** (bottom-right corner, every screen): swap
  between 12 canned network conditions (slow, timeout, connection error,
  4xx/5xx, partial ranking/history failure, retry-then-succeed registration,
  etc.) to see how the UI behaves, plus a one-click reset back to the seeded
  fixtures.
- **Accessibility**: every action is a real `<button>`, focus-visible
  outlines throughout, no duplicate accessible names between an icon and its
  label.
- **Persisted options**: session length and enemy spawn interval survive a
  reload (`localStorage`).
- **Island editor** (main menu → ISLAND EDITOR): design your own map. Drag
  islands to reposition them, add/delete, resize with +/- - built from the
  exact same tiles as the real arena, so what you see is exactly what the
  next match will look like. Saved to `localStorage` and picked up
  automatically the next time you hit PLAY; RESET restores the built-in map.
- **Sound**: cannon fire, broadsides, splashes, collisions, explosions, a
  low-health cue and match start/pause/resume/end stingers, plus a looping
  ambient ocean track under gameplay - all Web Audio, all optional (never
  blocks or crashes if a clip isn't loaded yet). Every menu button also gets
  a hover/click/open/back sound.

## Testing

`npm run test:e2e` runs the Playwright suite in [e2e/](./e2e): menu
navigation, options persistence, a gameplay smoke test (Pixi canvas loads,
HUD renders, keyboard input drives the ship, no console errors), every
ranking/history network scenario, pending-match recovery + idempotency,
accessibility checks, the island editor, and sound (every clip loads,
UI/gameplay actions actually trigger playback).

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) - how the game engine, data layer and
  mocking are put together, and why.
- [PERFORMANCE.md](./PERFORMANCE.md) - FPS/memory profiling methodology and
  results.
