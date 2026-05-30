# Design: Bee Buzz Says 🐝 — honeycomb sequence-memory + dyslexia game

**Created:** 2026-05-30
**Status:** PROPOSED

> **Name:** "Bee Buzz Says" (a riff on *Simon Says* — signals the follow-the-sequence
> mechanic). Identifiers: folder `beebuzzsays-html5/`, storage keys `beebuzzsays_best`
> and `dyslexiaScreening.beebuzzsays`, probe `window.__bbs()`, hub card class
> `beebuzzsays`.

## Problem

The arcade needs a new game that trains/screens **two** things at once:

1. **Working memory** — reproduce a growing sequence (classic Simon).
2. **Letter discrimination (dyslexia signal)** — recognize and select the correct
   reversal-prone letter (`b d p q m w n u`), distinguishing visual mirrors.

It must match the existing family: a single-file HTML5 canvas game, cartoonish
style, self-contained EN/FR/ES localization, `TWEAKS` edit-mode block, local-only
metrics under `dyslexiaScreening.*`, a 3-strike life model, and a hub card.

It is a **new, distinct game** — it does not replace or modify the existing
`recallcrates-html5` game (which is a type-back recall game). Bee Buzz Says is
spatial-stimulus + letter-keypad input.

## Concept

A bee hops across a **honeycomb** in a growing Simon trail. Each landing makes a
cell glow, buzz a tone, and **pop a letter**. The player reproduces the trail by
**tapping the letters in order on a separate letter keypad** below the comb.

- The honeycomb is the **stimulus**: position adds visual scanning + charm but is
  NOT the answer.
- The **answer is the letter sequence**, entered on the keypad → fully
  pointer/touch driven (no physical keyboard required; first-class mobile).

This is a deliberate evolution of an earlier "tap the hex positions" idea: routing
input through a letter keypad turns it into a genuine letter-recognition /
discrimination task, which is the dyslexia signal we want.

## Core Mechanic

### Trail (cumulative Simon)
- A run maintains one growing sequence `seq` of **letters** (each with an associated
  honeycomb cell for display).
- Round N: the bee replays the whole length-N trail (cell glow + letter pop + tone,
  in order), then the player reproduces all N letters on the keypad.
- **Success** (all N letters correct, in order) → award points, then grow the trail
  by one: append a new step (new cell + a letter drawn from the active keypad set;
  avoid an immediate repeat of the previous letter). Replay the longer trail.
- Letters MAY repeat across the trail (Simon reuses its inputs); only immediate
  back-to-back repeats are avoided for clarity.

### Input (letter keypad)
- Below/beside the comb sits a pad of tappable letter tiles.
- The trail only ever uses letters present on the **active** pad, and **both members
  of each confusable pair are always present** as distractors (if `b` can appear, so
  can `d`; if `p`, then `q`).
- Player taps letters left-to-right to match `seq`. Each correct tap echoes into an
  answer strip and pulses the tile green.

### Strikes / failure
- A **wrong tap** ends the attempt immediately: red shake on the tile + answer strip,
  `strikes += 1`, and the bee **replays the SAME trail** for another try (gentle,
  training-friendly — matches Recall Crates).
- `strikes >= maxStrikes (3)` → game over.
- Score rewards the **maximum trail length** (`maxSpan`) reached.

### Patience timer
- During input, a per-tap "bee patience" timer runs (visual honey-drip / wing
  flutter). Letting it expire counts as a miss (strike + replay same trail).
- Duration scales with difficulty and child age (longer for easy / younger).

## Difficulty Scaling (driven by `TWEAKS`)

`TWEAKS = { difficulty: "easy|normal|hard", age: "" | "6".."9", colorCues: false }`
(edit-mode block, same shape/markers as Recall Crates).

| Knob | Easy | Normal | Hard |
|------|------|--------|------|
| Keypad letters | `b d p q` | `+ m w n u` | `+ a e o` |
| Honeycomb cells | 7-hex flower (r=1) | 19-hex (r=2) | 19-hex (r=2) |
| Flash reveal / hop speed | slow | medium | fast |
| Input patience window | long | medium | short |

- `age` 6–7 biases toward the easy end (smaller grid, longer windows) even at
  Normal; older ages tighten timings. Exact multipliers mirror Recall Crates'
  `watchDuration` / `recallBudget` style helpers.
- Grid capped at 19 cells so popped letters stay legible.

## State Machine

`title → watch → input → resolve → (level_clear → watch | game_over)`

- **title** — overlay card; a decorative idle bee/comb behind it.
- **watch** — bee replays the full trail (sequential cell glow + letter pop + tone).
  Keypad is disabled/dimmed.
- **input** — keypad active; player taps letters; patience timer runs.
- **resolve** — classify the attempt: `correct` → grow + score; `wrong`/`timeout`
  → strike. Brief floater feedback ("PERFECT!" / "OOPS").
- **level_clear** — short transition before the next `watch`.
- **game_over** — overlay results card (Score, Best length, Best score, reversal %).

`window.__bbs()` exposes a read-only probe `{ phase, seq, typed, span, strikes }`
for scripted checks (parallels `window.__rc`).

## Components & Files

### `beebuzzsays-html5/index.html`
Cloned from `recallcrates-html5/index.html`, with:
- Honeycomb amber/gold palette in `:root`.
- HUD badges: **Score · Level (current span) · Best · Strikes** (`○○○` / `✕`).
- Gear → tweaks panel: **Difficulty** + **Child age** + **Color cues (ON/OFF)**
  (same markup/ids pattern; color row defaults OFF).
- A **keypad container** (`#keypad`) — a DOM row of letter-tile buttons rendered by
  JS, OR drawn on-canvas. Decision: **on-canvas** keypad (consistent hit-testing,
  scales with canvas, single render path), with a thin DOM answer strip reused from
  the existing `#answer-display` LCD.
- Title card: bee/honeycomb art, localized intro.
- Loads `../i18n.js`, `../audio.js`, `game.js`.

### `beebuzzsays-html5/game.js`
Single-file IIFE canvas game. Sections mirror Recall Crates:
- Canvas resize + DPR handling.
- Self-contained `STR` for `en`/`fr`/`es` + `applyStaticText()`.
- `TWEAKS` edit-mode block + `setupTweaks()` (postMessage edit-mode protocol).
- Active keypad set derivation from difficulty; cell/letter pool from confusables.
- `state` machine, trail generation, hop/flash animation, keypad hit-testing.
- Metrics (below), `gameOver()` results card, particle/floater effects.
- `LETTER_FREQ` frozen constant; tones via `window.MathArcadeAudio?.note(freq)` on
  bee flash + keypad tap; preset cues (`correct`/`wrong`/`levelClear`/`gameOver`) via
  the existing API.
- `LETTER_COLOR` frozen constant, applied only when `TWEAKS.colorCues` is ON
  (otherwise neutral honey theme).
- Boot: `applyStaticText()`, `setupTweaks()`, edit-mode availability postMessage,
  decorative idle state, RAF loop, `visibilitychange` resync.

Target: < 800 lines; extract pure helpers (hex geometry, trail gen, classify) into
small functions for readability/testability within the single file.

### `audio.js` (shared)
Add the additive `note(freq, dur, opts)` method to `window.MathArcadeAudio` (see
Audio section). Only additive change; no existing cue is modified.

### `index.html` (root hub)
- Add `.card.beebuzzsays .art { background: <honey gradient>; }` near the other
  `.card.* .art` rules.
- Add a static `<a class="card beebuzzsays" href="beebuzzsays-html5/index.html">` card
  near Recall Crates: inline honeycomb+bee SVG art, tagline **"Sequence memory"**,
  `<h2>Bee Buzz Says</h2>`, a short English `desc`, chips
  `mobile ok · tap · memory · puzzle`, `PLAY ▶` CTA. (Hub cards are static English,
  no `data-i18n`; the game itself owns EN/FR/ES.)

## Audio — fixed letter→tone association (reinforcement)

Each letter is permanently bound to **one frequency**. The SAME tone plays both when
the bee reveals that letter (WATCH) and when the player taps it on the keypad
(INPUT) — so hearing and producing the letter use the identical cue. This builds a
stable cross-modal (visual letter ↔ pitch) association, like Simon's fixed pad tones.
**These frequencies are frozen constants and must never change** (changing them would
break the reinforced association for returning players).

### Shared-infra change (additive, low-risk)
`audio.js` only exposes preset cues today; its internal `tone()` synth (which already
honors the master gain + global mute) is not public. Add ONE additive method:

```js
// in window.MathArcadeAudio
note(freq, dur = 0.22, opts = {}) {
  const t = now();
  tone(freq, t, dur, { type: 'triangle', gain: 0.16, cutoff: 2600, ...opts });
}
```

This is the only change outside the new game folder. It is purely additive (no
existing behavior changes) and benefits any future game. The game calls
`window.MathArcadeAudio?.note(LETTER_FREQ[ch])`; if audio is muted or unavailable the
call is a safe no-op (mute is respected because `note` routes through `tone`/master).

### Frozen mapping (`LETTER_FREQ`, Hz)
Notes from C-major across ~2 octaves, with **confusable pair members placed far apart
in pitch** so b/d, p/q, m/w, n/u are easy to disambiguate by ear (a deliberate
multimodal aid):

```
b: 261.63 (C4)   d: 392.00 (G4)
p: 293.66 (D4)   q: 440.00 (A4)
m: 329.63 (E4)   w: 523.25 (C5)
n: 587.33 (D5)   u: 880.00 (A5)
a: 659.25 (E5)   e: 783.99 (G5)   o: 1046.50 (C6)
```

### When tones play
- **WATCH:** as the bee lands on each trail cell, play that letter's tone (synced to
  the glow + letter pop).
- **INPUT:** every keypad tap plays the tapped letter's tone (correct OR wrong — the
  child always hears what they chose). A wrong tap additionally fires the existing
  `wrong()` cue + red shake; a completed-correct sequence fires `correct()`.

## Color cues — optional fixed letter→color (toggle, default OFF)

A `TWEAKS.colorCues` toggle (default **false**) controls an optional third modality:
a frozen per-letter color, shown identically on the bee's flash cell and the keypad
tile.

- **OFF (default, "screener"):** all keypad tiles + flash cells use the neutral honey
  theme. Color carries NO information, so the child must read the letter shape — the
  honest dyslexia signal. Tone + shape still active.
- **ON ("trainer"):** each letter wears its `LETTER_COLOR`, reinforcing
  color ↔ letter ↔ pitch. Friendlier for younger kids / engagement. Confusable pair
  members get clearly different hues (parallels the spread-apart tones), so b/d, p/q,
  m/w, n/u differ in color too.

The toggle is a third tweak row (`Color cues: ON / OFF`) in the gear panel, same
markup pattern as the difficulty/age rows. The active value is recorded in the saved
metrics summary (`colorCues: true|false`) so a session's data is interpretable (ON
sessions are training, not clean screening). Like `LETTER_FREQ`, the palette is a
**frozen constant** — not tunable beyond the on/off switch.

### Frozen palette (`LETTER_COLOR`, only applied when colorCues ON)
```
b: #ff5c7c (pink)    d: #3a8ad9 (blue)
p: #5cd97a (green)   q: #ffd24d (gold)
m: #b07cff (violet)  w: #ff8a3d (orange)
n: #2fb8a8 (teal)    u: #e2434b (red)
a: #f4d35e           e: #7ad1ff           o: #c87543
```

## Data: letters & confusable pairs

```
PAIRS   = [['b','d'], ['p','q'], ['m','w'], ['n','u']]
VOWELS  = ['a','e','o']
keypad(difficulty):
  easy   -> b d p q
  normal -> b d p q m w n u
  hard   -> b d p q m w n u a e o
mirrorOf = { b:'d', d:'b', p:'q', q:'p', m:'w', w:'m', n:'u', u:'n' }
```

A wrong tap where `tapped === mirrorOf[expected]` is logged as a `mirrorConfusion`.

## Metrics (local only — `dyslexiaScreening.beebuzzsays`)

```
{
  date, lang, age, level, score,
  difficulty, colorCues,        // session config (colorCues true => trainer, not clean screen)
  rounds, correct, strikes,
  maxSpan,                       // longest trail reproduced exactly
  spanAttempts: { [len]: {ok, fail} },
  mirrorConfusions,             // tapped the mirror of the expected letter
  wrongTaps,                    // any incorrect tap (incl. mirror)
  reversalRate                  // mirrorConfusions / wrongTaps (0 if none)
}
```
- Saved on game over (rolling history, last 50), same storage discipline as
  Recall Crates (wrapped in try/catch; game stays playable if storage fails).
- Best score persisted separately in `beebuzzsays_best`.
- `window.DyslexiaScreening.beebuzzsays()` returns the stored summary.

## Error Handling

- All `localStorage` access wrapped in try/catch — failures never break play.
- Input ignored outside the `input` phase; taps clamped to `seq.length`.
- Canvas hit-testing validates against current keypad layout each frame (no stale
  coordinates after resize).
- `dt` clamped (`> 0.1 → 0.1`) and `visibilitychange` resync to avoid jumps.

## Testing

Static-file repo, no automated suite. Manual verification in-browser via the
`.playwright-mcp` tooling already present, plus the `window.__bbs()` probe:

- Title → START enters `watch`; bee replays a length-1 trail.
- Correct keypad entry grows the trail (span increments; HUD updates).
- Wrong tap → red shake + strike + same trail replays.
- 3 strikes → game over card with Score / Best length / reversal %.
- Tweaks: switching difficulty changes keypad letters + grid size + speed; age
  adjusts timing.
- Mirror confusion: tapping `d` when `b` was shown increments `mirrorConfusions`.
- EN/FR/ES strings render (via `?lang=` and stored `mathArcadeLang`).
- Mobile/touch: taps register on keypad tiles; layout fits small viewport.
- Audio: the bee's flash tone for a letter equals that letter's keypad-tap tone
  (same `LETTER_FREQ` value); `audio.js note()` exists and respects the global mute
  toggle; confusable pair members are audibly distinct.
- Color cues: default OFF (neutral tiles, no color info); toggling ON applies the
  same `LETTER_COLOR` on flash + tile; pair members are visibly distinct; the saved
  summary records `colorCues`.

## Out of Scope (YAGNI)

- No physical-keyboard input path (pointer/touch only — that's the point).
- No server/network, accounts, or remote analytics (local metrics only).
- No grids larger than 19 cells.
- No drag-and-drop / letter-to-cell placement (input is keypad taps).
- No changes to other games. The only shared-infra touch is the additive
  `audio.js` `note()` method.
- Letter frequencies and the color palette are FROZEN constants — only color's
  on/off is exposed in `TWEAKS`; the specific Hz/hex values are never tuned.

## Resolved Decisions

- **Name:** Bee Buzz Says (locked) → folder `beebuzzsays-html5`, keys
  `beebuzzsays_best` / `dyslexiaScreening.beebuzzsays`, probe `window.__bbs`, hub
  card class `beebuzzsays`.
- **Input:** letter keypad (taps), not hex positions.
- **Keypad:** scales with difficulty (`b d p q` → `+m w n u` → `+a e o`), both
  members of each confusable pair always present.
- **On wrong tap:** strike + replay same trail; 3 strikes → game over.
- **Keypad rendering:** on-canvas (single render/hit-test path).
- **Letter→tone:** each letter has a frozen frequency (`LETTER_FREQ`), played the
  same on bee-flash and keypad-tap to reinforce the association; delivered via a new
  additive `audio.js note()` method.
- **Letter→color:** optional `TWEAKS.colorCues` toggle, **default OFF** (honest
  screener); ON applies a frozen `LETTER_COLOR` palette as a training aid; recorded
  in metrics.
