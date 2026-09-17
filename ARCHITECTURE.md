# Architecture

## Folder structure

```
src/
  api/            axios calls + client-side identity/pending-match persistence
  audio/          Web Audio sound manager + the sound asset map (src/assets/sounds)
  components/     small presentational pieces shared across screens
  game/           the game engine - simulation, rendering, input (no React)
  hooks/          generic UI hooks (drag-to-scroll)
  mocks/          MSW handlers + the fake "server" they read/write
  query/          TanStack Query client + hooks
  screens/        one component per app screen, composed in App.tsx
  utils/          tiny stateless helpers
e2e/              Playwright end-to-end tests
```

## The game engine (`src/game`)

The engine is plain TypeScript with zero React or Pixi leakage across its
internal boundaries, split into three independent layers:

- **`simulation.ts`** - pure(ish) game rules: movement, weapons cooldowns,
  spawning, collisions, scoring, win/lose conditions. Operates on a single
  `MatchState` object and advances it by a `dtSeconds` each call
  (`updateMatch`). Nothing here touches the DOM or Pixi.

  Three enemy kinds, spawned round-robin (`ENEMY_SPAWN_CYCLE`): `chaser`
  (homes in continuously, rams on contact), `shooter` (keeps its distance,
  fires a ranged shot), and `charger` - approaches to `triggerRange`, sits
  still tracking the player for `windupSeconds` (a telegraphed pause), then
  locks in whatever direction it's currently facing and dashes at
  `chargeSpeed` for `chargeDurationSeconds` with `rotationDelta` pinned to
  `0` - `updateShipMovement` only ever turns a ship by the delta it's given,
  so passing `0` *is* the "can't steer mid-charge" rule, not a separate
  check. A miss just costs it the dash; a hit works exactly like the
  chaser's (contact damage, no score, both ships destroyed via the same
  `killShip`).
- **`renderer.ts`** (`PixiRenderer`) - owns the Pixi `Application`, sprites
  and tickers. `sync(state, dt)` reads the current `MatchState` and updates
  sprite positions/textures/visibility to match; it never mutates game state.
- **`input.ts`** (`InputController`) - keyboard listeners collapsed into a
  single `InputState` snapshot (`forward`/`left`/`right`/`fire*`), consumed
  once per tick.

**`GameEngine.ts`** is the only class React talks to. It wires the three
layers together: the Pixi ticker (owned by the renderer) drives one
`tick(dtSeconds)` per frame, which runs `updateMatch` then `renderer.sync`,
so simulation and rendering always advance on the same frame clock. It also
owns pause-on-blur/visibility-change, restart, and reports two things back to
React via callbacks: `onHudUpdate` (score/timer/health, only when something
actually changed) and `onMatchEnd` (fired exactly once per match).

Keeping simulation, rendering and input as separate, independently
constructible pieces is what makes `GameEngine` restartable in place
(`restart()` just builds a fresh `MatchState` without recreating the Pixi
`Application`) and safe to mount/unmount repeatedly - see
[PERFORMANCE.md](./PERFORMANCE.md) for the restart-cycle memory check that
this design was validated against.

### Rendering approach

- **Fixed-camera-follow**: the world is drawn at a constant `CAMERA_SCALE`
  inside a container that gets repositioned every frame so the player's ship
  stays centered, rather than scaling the world to fit the ship. Simpler
  math, and the arena can be much larger than the viewport (`ARENA_WIDTH` /
  `ARENA_HEIGHT` in `config.ts`) without extra camera-zoom logic.
- **Islands** (`game/islandTiles.ts`): each island is a 5x5 tile grid - an
  inner 3x3 of solid sand/grass tiles plus a soft, mostly-transparent
  "shallow water" glow ring around it. Collision (`arena.ts`,
  `distanceToIsland`) only uses the inner `ISLAND_SOLID_RATIO` fraction of
  the configured `halfSize`, so ships can visually drift over the glow
  without being blocked by it - the glow reads as shallow water, not solid
  ground. That 5x5 layout itself is fixed: most of the source tileset
  (`assets/png/*/tiles`) turned out to be one-off painted shapes meant for a
  single spot rather than a true autotile set - even placing two copies of
  the same "edge" tile side by side leaves a visible gap, because the sand
  blob is painted inset from the tile's own bounds. This one combination of
  16 tiles is the one that was confirmed to actually line up seam-free.
  Every island still ends up looking different via a random center-fill
  variant (always green - plain, speckled, or tufted grass; a "sand
  clearing ringed by grass" tile was tried too but reads as a beige hole
  rather than a coastline feature, so it's deliberately excluded - all the
  kept options are edge-to-edge-opaque tiles, so swapping between them
  carries no seam risk), a random horizontal/vertical mirror of the whole
  shape, and a few scattered rock/leaf props layered independently on top.
  `buildIslandContainer(x, y, halfSize, textures, seed)` takes that `seed`
  (the island's index in its list) so the same island renders the same way
  every time instead of reshuffling on every re-render.
- **Ships are hull + sail, not one sprite**: each ship is a `hullSprite` and
  a `sailSprite` (from `assets/png/default/ship_parts/hull_large_*` /
  `sail_large_*`) stacked in a rotating container, not the old single
  combined `ships/ship_*.png` image. Which pair is showing is purely a
  function of health ratio each frame (`healthTierFor` in `renderer.ts`):
  `healthy` (hull_large_1) → `damaged` (hull_large_2, once the health bar
  would read amber) → `critical` (hull_large_3, red) → `wreck`
  (hull_large_4, once `ship.alive` is false). The sail carries each ship
  kind's identity (blank for the player, crossed swords for the chaser, a
  horse head for the shooter) and gets progressively more worn/faded through
  the same four tiers, so the swap reads as "this specific ship is beat up,"
  not just a generic color tint. Only the texture changes between tiers -
  every hull/sail variant shares the same pixel dimensions, so the scale and
  the sail's position relative to the hull are computed once, at first
  render, from the tileset's own proportions (not eyeballed manually).
- On death, the ship keeps rendering as the `wreck` hull/sail (instead of
  vanishing immediately) for the rest of its `deathTimer`, while the
  explosion and crew-burst effects play on top - it only disappears once the
  simulation actually drops it from `state.ships`.
- **Crow's nest + flag**: each ship also gets a `nest.png` + faction-coloured
  `flag_*.png` (from `ship_parts`), positioned just past the sail's far edge
  - the nest drawn first, the flag on top so it reads as flying out of the
    nest. Static per ship (doesn't change with health tier), scaled up past
  the tileset's own pixel density (`NEST_FLAG_SCALE_MULTIPLIER`) since the
  source art is tiny (20x18 / 6x22px) next to a ~50x108px hull.
- **Bow sail**: each *enemy* additionally gets a small `sail_small_*.png`
  near the bow, in its faction colour (`BOW_SAIL_TEXTURE_BY_KIND` - the
  player has no entry, so it gets none). Positioned at
  `hullTexture.height * BOW_SAIL_POSITION_RATIO` toward the bow from the
  hull's centre - the hull art has a small porthole a bit short of the tip,
  and this sits just past it, closer to the point. Static, like the nest.
- Damage fire (`fireSprite`) is deliberately sized well below the sail's own
  width (`sailTexture.width * 0.4`) so it reads as "the sail caught fire,"
  not "the sail is on fire and also huge."
- Ship/enemy visuals swap textures based on state (alternating explosion
  frames on a hit, crew sprites scattering when a ship sinks) purely as a
  function of the simulation state each frame - no separate animation state
  machine to keep in sync.
- **Damage debris**: every `MatchState.hitEvents` entry (any ship taking
  damage, not just enemies hit by the player - see `simulation.ts`) also
  spawns one loose wood-plank sprite (`renderer.ts`, `spawnDebris`, picked
  from `ship_parts/wood_1..4.png` only - no hull fragments, so it never
  looks like part of the ship itself broke off) that drifts a short distance
  and fades over ~3s, left behind as the ship keeps moving. This is separate
  from `spawnCrewBurst`, which only plays once, when a ship actually sinks.

### React boundary

`screens/GameScreen.tsx` owns a `GameEngine` instance in a ref, creates/tears
it down in a `useEffect` keyed on `[config, retryToken]`, and mirrors its
callbacks into React state for the HUD overlay. Pixi's `Application.init()`
is async; because React 19 StrictMode double-invokes effects in development,
`PixiRenderer` tracks a `destroyRequested` flag so a destroy that arrives
while `init()` is still in flight is honored once init actually resolves,
instead of tearing down a half-constructed `Application`.

## Island editor

`screens/IslandEditorScreen.tsx` + `game/islandEditorRenderer.ts` let the
player design their own island layout instead of editing raw coordinates in
`config.ts`.

- **Shared visuals, not a re-implementation**: `game/islandTiles.ts` holds
  the island tile URLs and the `buildIslandContainer` function that turns
  `{x, y, halfSize}` into a 5x5 sprite grid. Both `PixiRenderer` (the real
  match) and `IslandEditorRenderer` (the editor) call the same function, so
  an island in the editor is pixel-for-pixel what it'll look like in a match
  - there's no separate "preview" representation to fall out of sync.
- **`IslandEditorRenderer`** is a second, much smaller Pixi renderer: just
  water + islands + an arena-bounds outline, drawn at a static fit-to-arena
  scale (no camera-follow, since there's no ship to follow). Each island is
  an interactive container (`eventMode: 'static'`) that reports drag-start/
  drag-end through callbacks; the drag itself moves the sprite directly for
  smooth 60fps feedback; only the final position on release is written back
  to React state, which is what actually persists.
- **Persistence**: `game/islandLayout.ts` reads/writes the layout as plain
  `IslandConfig[]` under `pirate-battle:island-layout`, clamping every
  island to the arena bounds and the editor's configured size range
  (`ISLAND_HALFSIZE_MIN/MAX` in `config.ts`). `App.tsx`'s `startMatch` calls
  `loadIslandLayout()` and passes it into `cloneGameplayConfig({ islands })`
  - the exact same override mechanism already used for session length and
    enemy spawn interval - so a custom layout is genuinely what the next
    match plays on, not just what the editor shows.
- Every edit (add/move/resize/delete) saves immediately, matching the same
  "autosave on change" pattern as the Options screen; there's no separate
  Save button to forget to press.

## Sound (`src/audio`)

`soundManager.ts` is a small Web Audio wrapper, not `<audio>` elements: every
clip in `src/assets/sounds` is fetched and `decodeAudioData`'d once into an
`AudioBuffer` (`soundManager.preload()`, fired from `main.tsx` on boot), and
`play(key)` spins up a fresh `AudioBufferSourceNode` per call - which is what
lets overlapping sounds (three broadside cannons, a volley of hits) all play
without cutting each other off, the way reusing one `<audio>` element would.
`play()` and `startMusic()`/`stopMusic()` (the looping `ocean_ambience_loop`,
started in `GameEngine.init()` and stopped in `destroy()`) are total no-ops
if a clip hasn't finished decoding yet or the browser hasn't unlocked audio -
sound is a nice-to-have layered on top of working gameplay, never something
that can throw or block it.

- **Gameplay sounds are simulation-driven, not renderer-driven**: `MatchState`
  carries a `soundEvents: SoundEvent[]` array (`types.ts`) alongside the
  existing `hitEvents`, populated at the exact call sites in `simulation.ts`
  that already know a cannon fired, a shot splashed into the water instead of
  hitting something, a ship collided, was destroyed, or scored. `GameEngine.
  tick()` is the single place that reads it and maps each event to a sound
  (`SOUND_EVENT_HANDLERS`), which keeps `simulation.ts` free of any direct
  Audio calls (it only ever describes *what happened*, never *how it
  sounds*) and keeps `renderer.ts` about Pixi only.

  Both arrays are only ever *populated* inside `updateMatch`, which
  `GameEngine.tick()` stops calling once the match isn't `'playing'` (paused
  or ended) - but `tick()` keeps calling `renderer.sync()` and replaying
  `soundEvents` **every frame regardless of status**. The fix is that
  `tick()` clears both arrays itself immediately after consuming them, every
  frame, unconditionally - not inside `updateMatch`, since clearing them
  there doesn't help once `updateMatch` itself stops being called. Missing
  this the first time around caused exactly the bug it now prevents: the
  hit/explosion sound from the killing blow replaying once per frame,
  forever, for as long as the result screen stayed mounted. When the player
  is defeated, `updateMatch` also clears `state.projectiles` outright -
  there's no one left to fire back, and leftover balls in flight could still
  collide into enemies (and trigger more explosion sound) after the match
  is already over.
- Three sound groups **alternate round-robin** instead of always playing the
  same clip or picking randomly (`cannon_fire_1/2/3`, `cannonball_water_hit_
  1/2`, `ship_explosion_1/2`) - `soundManager.playAlternating(groupKey,
  keys)` keeps one cycling index per group.
- `health_low` isn't tied to a discrete simulation event; `GameEngine`
  derives the player's health tier from the same `HEALTH_RATIO_AMBER_
  THRESHOLD` the renderer uses for the red health bar / `critical` hull tier
  (`config.ts`, shared rather than duplicated) and plays it once on the
  transition into that range, not every frame the bar stays red.
- **UI sounds live in the shared button components**, not at each call site:
  `PrimaryButton`/`SecondaryButton`/`RoundButton` always play `ui_hover` on
  hover and default to `ui_click` on click, via a `sound?: SoundKey | null`
  prop a caller can override - `sound="uiOpen"` for the buttons that open
  Options/Ranking/Match History/the island editor, `sound="uiBack"` for
  every "MAIN MENU" button, and `sound={null}` for RESUME (its click would
  otherwise overlap the dedicated `game_resume` cue `GameEngine.resume()`
  already plays).

## Data layer: ranking, history, mocking

There is no real backend. `msw`'s `setupWorker` intercepts every `/api/*`
call unconditionally - in dev **and** in the production build
(`main.tsx`) - because the challenge requires the mocked ranking/history
flow to keep working after a real deploy, not just under `vite dev`.

- **`api/client.ts`**: a single `axios` instance with a fixed 8s timeout, so
  every call (including the "timeout" network scenario) behaves consistently.
- **`api/ranking.ts` / `api/history.ts`**: thin functions that call that
  client and shape the response.
- **`query/`**: one `useQuery` hook per read (`useRankingQuery`,
  `useHistoryQuery`, with `keepPreviousData` so pagination doesn't flash a
  loading state) and one `useMutation` hook for registering a match
  (`useRegisterMatchMutation`). `queryClient.ts` sets `retry: 2` with
  exponential backoff for both queries and mutations - safe for mutations
  here specifically because registration is idempotent (see below).
- **`mocks/handlers.ts`**: the fake server. Reads the current scenario
  (`mocks/scenarios.ts`) and either injects a failure/delay
  (`applyGenericFailure`) or serves real data out of `mocks/db.ts`, a
  `localStorage`-backed store seeded from `mocks/fixtures.ts`.

### Idempotent match registration

Every match gets a client-generated `matchId` (`crypto.randomUUID()`) the
moment it ends. That id is:

1. Written to `localStorage` immediately (`api/pendingMatch.ts`), before the
   network call is even attempted.
2. Sent as the idempotency key on `POST /api/matches`. The mock server
   (`insertRecordIfAbsent` in `mocks/db.ts`) only inserts a record the first
   time it sees a given `matchId`; a resend of the same id returns the
   existing record instead of creating a second one.
3. Cleared from `localStorage` only once the server confirms the write.

If the tab closes (or the request times out/fails) between steps 1 and 3,
`App.tsx` retries that one pending match on the next app load. Because the
retry reuses the same `matchId`, it can never create a duplicate history
row - this is exactly what the `register-timeout` and
`match-end-unavailable` network scenarios, and the `e2e/match-flow.spec.ts`
tests, exercise.

### Network scenario widget

`components/NetworkScenarioCorner.tsx` is a small, deliberately
unobtrusive control fixed to the bottom-right corner on every screen (it's a
QA/dev affordance for exercising the mocked backend, not a player-facing
setting - that's why it isn't in Options). It just writes the chosen
scenario to `localStorage` (read synchronously by every mock handler call)
and can reset both the scenario and the mock database back to their seeded
state, invalidating the `ranking`/`history` queries so the UI reflects it
immediately.

## Persistence summary

Everything is `localStorage`-backed and namespaced under `pirate-battle:`:

| Key                              | What                                              |
|-----------------------------------|----------------------------------------------------|
| `pirate-battle:options`           | Session length / enemy spawn interval             |
| `pirate-battle:player-id` / `-name` | The local player's stable identity              |
| `pirate-battle:pending-match`     | A completed match not yet confirmed by the server |
| `pirate-battle:network-scenario`  | The currently selected mock network scenario      |
| `pirate-battle:mock-db:*`         | The fake server's data (match records, one-shot failure tracking) |

## Testing strategy

`e2e/` (Playwright) drives the app exactly as a user would - no internal
imports, no mocked React internals:

- `navigation.spec.ts` - every screen is reachable and back again; the
  network scenario widget is present everywhere without overlapping the logo.
- `options.spec.ts` - stepper persistence across a reload, and clamping at
  configured bounds.
- `gameplay.spec.ts` - the Pixi canvas loads, HUD renders, keyboard input
  actually advances the match (timer ticks down) with zero console errors,
  and pausing/exiting tears the canvas down cleanly.
- `ranking-scenarios.spec.ts` - one test per relevant network scenario
  (success, empty, ranking-only failure, history-only failure, connection
  error, slow/timeout loading states), including that a fixed "RETRY"
  button actually recovers.
- `match-flow.spec.ts` - pending-match recovery, and that recovering the
  same match twice never duplicates a history row.
- `accessibility.spec.ts` - every action is a real, keyboard-focusable
  `<button>`, focus-visible outlines are present, decorative icons don't
  duplicate the accessible name, and the corner widget exposes a labeled
  control.
- `island-editor.spec.ts` - add/select/resize/delete an island, the size
  stepper's bounds, persistence across a reload, reset, and that a saved
  custom layout is genuinely what the next match loads (not just what the
  editor displays).
- `audio.spec.ts` - every sound file actually loads (no 404s) across menu,
  options and a match; hovering/clicking a menu button plays a sound; firing,
  pausing and resuming all trigger one too, with zero console errors; and a
  regression test that lets a chaser kill the player, then asserts the sound
  counter stays flat for several seconds afterward (the fixed replay-forever
  bug). It spies on `AudioBufferSourceNode.start()` rather than asserting on
  real audio output, since headless Chromium has no speakers to check.

Scenarios are seeded straight into `localStorage` before navigation
(`e2e/helpers.ts`) rather than through the UI, so each test only exercises
the one thing it's named after.
