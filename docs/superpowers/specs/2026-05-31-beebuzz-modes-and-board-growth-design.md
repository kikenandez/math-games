# Design: Bee Buzz Says — Board-Growth Levels & Multiplayer Modes

**Created:** 2026-05-31
**Status:** PROPOSED
**Game:** `beebuzzsays-html5/` (`core.js` pure logic, `game.js` UI, `test/core.test.js`)

## Problem

Bee Buzz Says currently:

- Reuses cells — `growTrail` only avoids the *immediately previous* cell, so the trail can revisit a cell later (see `core.js:56-64`).
- Uses a **fixed-size** honeycomb (radius 1 = 7 cells for easy/age ≤7, radius 2 = 19 otherwise) and an **infinitely growing** trail; a level never "completes by filling the board," and the grid never expands.
- Is **single-player only**.

We want two changes:

1. **Board-growth levels.** Each round adds a letter on a *previously unused* cell. A **level = fill the board** (recall every cell in order). On clear, the honeycomb **grows one ring** (radius 1 → 2 → 3 → …; 7 → 19 → 37 → … cells) and the trail **resets to length 1** on the bigger board.
2. **Game modes.** Add a title-screen mode selector with three hot-seat (one-device) modes: **1P Standard**, **2P Co-op (relay)**, **2P Versus (challenge)**.

## Goals / Non-Goals

**Goals**

- Unique-cell trails; deterministic, testable trail generation.
- Per-board levels with a celebratory ring-growth transition.
- Everyone starts at **radius 1 (7 cells)** so level 1 is a gentle span-7 board; difficulty/age keep tuning *timing* (flash gap, input budget), not board size.
- Three modes sharing one round engine via a thin session layer.
- Seeded RNG so 2P Versus is provably fair (identical board sequence for both players).

**Non-Goals (out of scope)**

- **2P Versus turn-duel** (shared-trail, first-to-3-strikes) — deferred; revisit after Co-op + Challenge feel good.
- Online/remote play, player name entry, persistent multiplayer leaderboards beyond the end-of-match card.
- Changing the frozen `LETTER_FREQ` / `LETTER_COLOR` constants.

## Core Mechanic Changes (`core.js`)

### Unique-cell trail growth

`growTrail(seq, letters, cellCount, rng)` changes so the chosen cell is **not already used in `seq`**:

- Build `used = new Set(seq.map(s => s.cell))`.
- Pick a `letter` as today (avoid immediate-previous-letter repeat; letters still repeat across the trail since there are only 11).
- Pick a `cell` uniformly from cells **not** in `used`. If `used.size >= cellCount`, the board is full — `growTrail` returns `null` (caller treats `null` as "board complete").

### Helpers

- `boardFull(seq, cellCount) → boolean` — `seq.length >= cellCount`.
- Keep `axialCells(radius)` (already returns 7/19/37 for radius 1/2/3). Board growth = `radius + 1`.

### Determinism

- `makeRng(seed)` already exists (mulberry32). The session creates one seeded RNG; `growTrail` consumes exactly **one draw stream per round** (letter pick + cell pick), so two runs with the same seed produce an identical `{letter, cell}` sequence regardless of player input (the bee's path is RNG-driven, never input-driven). This is what makes Versus fair.

## Session / Mode Architecture (`game.js`)

Introduce a `session` object layered **on top of** the existing round engine (watch → input → resolve). The engine keeps its current shape; it just reads "who is the active player" for scoring and strikes.

```
session = {
  mode: 'solo' | 'coop' | 'versus',
  seed: <int>,                 // shared across a match; per-run rng = makeRng(seed)
  players: [                   // length 1 (solo) or 2 (coop/versus)
    { id: 1, score, strikes, maxSpan, metrics, ... },
    { id: 2, ... }
  ],
  active: 0,                   // index into players for whose input counts now
  versusTurn: 0,               // versus: which player's full run is in progress (0 then 1)
  boardRadius: 1,              // starts at 1, +1 each LEVEL CLEAR
}
```

- **Active-player resolution.** `resolveCorrect` / `registerMiss` mutate `session.players[session.active]` instead of top-level `state.score/strikes`. `state` keeps the live round fields (`seq`, `typed`, `phase`, `watchIndex`, …) shared by whoever is at the comb.
- **Board radius** replaces `C.gridRadius(...)` in `layoutBoard()`: `state.radius = session.boardRadius`. Difficulty/age no longer set radius (they still set `flashGap()` / `inputBudget()`).
- **Level clear → grow ring.** When `boardFull` and the player recalls the full board, fire LEVEL CLEAR, then `session.boardRadius++`, re-`layoutBoard()`, reset `seq`/`typed`, and start a fresh trail at length 1 on the bigger board.

## Mode Flows

### 1P Standard (`solo`)

Today's game + the new mechanic. One player, one RNG (unseeded `Math.random` is fine, or a random seed). Fill board → LEVEL CLEAR → grow ring. 3 strikes → GAME OVER with the usual stats card. Default mode; preserves the existing dyslexia-screening `localStorage` write.

### 2P Co-op relay (`coop`)

- Two players share **one** growing trail, **one** strike pool (3), **one** team score, on a shared seed.
- Players **alternate who inputs each round**: P1 recalls round 1, P2 round 2 (one longer), P1 round 3, … A turn banner ("PLAYER 1 — YOUR TURN") shows at the start of each input phase.
- A miss is a **team strike**; retry the same trail with the **same** active player (mirrors current retry behavior). 3 team strikes → team result card ("You reached trail X together!").
- Goal: how far the team gets. No winner.

### 2P Versus challenge (`versus`)

- One shared `seed` for the match. **P1 plays a complete solo run** (to 3 strikes), then **P2 plays the same seed** → identical boards, fully fair.
- Between runs: a "PASS TO PLAYER 2" interstitial card.
- End: two-column scoreboard. **Winner = higher score**; tiebreak by larger max trail, then fewer strikes; exact tie → "DRAW."
- Each player's `metrics` tracked separately for the card.

## UI Changes (`index.html` + `game.js`)

- **Title screen mode selector.** A `.opts` row (reusing the existing `.opt`/`.opt.active` styles) with `1 PLAYER` / `2P CO-OP` / `2P VERSUS`. Selected mode stored on `session.mode`. START launches the chosen mode.
- **HUD.** Solo: unchanged. Co-op: show **Team** score + a small "Turn: P1/P2" indicator. Versus: show the **current player** and (during P2's run) "P1 to beat: NNN".
- **Turn / pass interstitials.** Reuse the floater/overlay pattern: co-op per-round turn banner; versus full-screen "PASS TO PLAYER 2" card with a CONTINUE button.
- **Results card.** Co-op: team summary. Versus: P1 vs P2 columns with the winner highlighted (`.stat-chip.hi`).
- **Localization.** All new strings (mode names, `PLAYER 1/2`, `YOUR TURN`, `TEAM`, `PASS TO PLAYER 2`, `WINS`, `DRAW`, `to beat`) added to the EN/FR/ES `STR` table in `game.js`.

## Settings / Edit-mode Interplay

- The existing gear **Tweaks** (difficulty, age, color cues) stay and apply to all modes (timing + color aid).
- Board size is no longer a difficulty output — note this in the difficulty tweak's behavior (difficulty/age now affect *speed* only).

## Metrics / Screening

- **Solo** continues to write `localStorage['dyslexiaScreening.beebuzzsays']` exactly as today (diagnostic context).
- **Co-op / Versus** are "fun" modes: they are **tagged with `mode`** and **excluded from the screening history write** to keep diagnostic data clean (a 2P session is not a valid single-child screening sample). The end-of-match card still shows per-player stats in-memory.

## Testing (`test/core.test.js`, `node --test`)

New/updated unit tests (pure `core.js`, no DOM):

1. `growTrail` never repeats a used cell; over `cellCount` rounds it fills exactly `cellCount` distinct cells, then returns `null`.
2. `growTrail` still avoids an immediate-previous-letter repeat.
3. `boardFull` true exactly when `seq.length >= cellCount`.
4. **Determinism / fairness:** two runs with the same `makeRng(seed)` produce identical `{letter, cell}` sequences (the Versus guarantee).
5. `axialCells(1|2|3)` → 7 / 19 / 37 (board-growth sizing) — extend existing count test.

UI/mode flows verified manually in-browser (canvas game; no headless E2E).

## Build Order

1. **Core mechanic** — unique cells, `boardFull`, seeded path, tests (RED→GREEN).
2. **1P Standard** on the new mechanic (board growth + ring-grow transition). Ship-able alone.
3. **2P Co-op relay** — session layer, alternating turns, team result.
4. **2P Versus challenge** — seeded dual runs, pass interstitial, scoreboard.

(Duel intentionally omitted; can be appended later as a 4th mode without disturbing the session layer.)

## Risks / Open Questions

- **Span jump at ring growth.** Radius 1→2 jumps the *eventual* board span from 7 to 19 (then 37). Because each board re-ramps from span 1, players build up gradually within a board, but a full radius-2 board (recall 19 in order) is very hard for young children. Mitigation: the LEVEL CLEAR celebration makes reaching even a partial higher board feel rewarding; if 19 proves brutal in playtest, we can cap practical difficulty via timing tweaks rather than board size. Flagged for playtest, not pre-solved.
- **Co-op retry ownership.** On a team strike we retry with the same active player; an alternative (pass to the other player on miss) is possible but adds rules — deferred unless playtest wants it.
