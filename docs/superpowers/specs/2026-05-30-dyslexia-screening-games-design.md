# Design: Dyslexia Screening Games (companions to Paratroopers)

**Created:** 2026-05-30
**Status:** PROPOSED

## Context

The arcade currently has 13 **math** games (which exist to help with math and stay
untouched) and exactly **one dyslexia game: Paratroopers** (retro "Sabotage" shell,
trains b/d/p/q mirror-letter discrimination).

This project adds **new dyslexia games** — companions to Paratroopers — that borrow the
*feel* of classic arcade shells but are built fresh for dyslexia. They will eventually
feed a combined **"Reading Check-Up"** screener that outputs a defensible
**warning / no-warning / inconclusive** conclusion.

The math games are NOT modified. Only shared infrastructure is reused:
`i18n.js` (EN/FR/ES), `audio.js`, and the high-contrast glyph styling from Paratroopers.

## Scope decisions (locked)

- **Structure:** one combined screener, made of standalone mini-games.
- **Target age band:** 6–9.
- **Norms:** no normative data yet → ship **provisional, research-based thresholds**,
  every screen clearly labeled **"screening only — not a diagnosis"**, and log anonymized
  metrics to calibrate real norms later.
- **Output:** three-state — `⚠ Warning (recommend assessment)` / `✓ No warning` /
  `↻ Inconclusive – retest`. The third state is mandatory: never force a binary when
  trial reliability is low.

## The three games & the markers they measure

| # | Retro feel | New game | Dyslexia marker | Detection metrics logged |
|---|-----------|----------|-----------------|--------------------------|
| 1 | whack-a-mole | **Letter Whack** | RAN naming speed + letter reversals | median reaction time, hit rate, reversal-specific error rate |
| 2 | falling crates (numberfall) | **Recall Crates** | phonological/visual working memory + sequencing | max correct span (2→6), transposition error rate |
| 3 | frogger | **Rhyme Frogger** | phonological awareness (rhyme / onset) | rhyme/onset accuracy, false-alarm rate |

All three must work in **EN / FR / ES**. Phonics/word content is **per-language**
(rhyme families and letter-sound mappings do not translate); reuse the `i18n.js` pattern
with a new phonics word bank keyed by language.

## Build phases

- **Phase 1 — Letter Whack** (`letterwhack-html5/`): playable, trilingual, logs metrics.
- **Phase 2 — Recall Crates** (`recallcrates-html5/`): playable, trilingual, logs metrics.
- **Phase 3 — Rhyme Frogger** (`rhymefrogger-html5/`): evaluated after Phase 1–2.
- **Phase 4 — Reading Check-Up screener**: session shell that runs all three, computes
  the composite, renders the three-state result, exports anonymized JSON for calibration.

## Per-game design (ages 6–9)

### 1. Letter Whack
- Target letter shown + spoken; letters pop from holes; tap the matches. ~30 moles.
- Confusable sets escalate: `b/d/p/q` first, then visually/phonetically near letters.
- **Logs:** median + distribution of reaction time, hit rate, and a *separate*
  reversal-error rate (e.g. whacking `d` when target is `b`).

### 2. Recall Crates
- A short letter / pronounceable-nonword string flashes (e.g. `b d p`), then the child
  types it back before the crate lands. Span grows 2 → 6.
- **Logs:** max correct span, transposition rate (right letters, wrong order — the
  was/saw signature).

### 3. Rhyme Frogger (later)
- A word is spoken (`cat`); the frog hops only onto logs/pads showing rhymes
  (`hat`, `bat`) and avoids non-rhymes (`dog`). Deliberate pace so it measures phonology,
  not motor speed.
- **Logs:** rhyme/onset accuracy, false-alarm rate. Word lists per language.

## Scoring → conclusion (Phase 4)

```
per game → raw metrics → age-normed percentile (norms[age][marker])
3 marker percentiles → weighted composite (phonology weighted highest)
  composite < 10th pct AND >=2 markers flagged       -> ⚠ Warning
  composite >= 25th pct                               -> ✓ No warning
  otherwise OR high trial-to-trial variance           -> ↻ Inconclusive – retest
```

- `norms[age][marker]` ships with provisional research-based values, isolated in
  `scoring.js` so the detection logic is unit-testable without rendering.
- Each session writes an anonymized record (age band + raw scores, **no PII**) to
  `localStorage` + a downloadable JSON, accumulating data to replace provisional norms.

## Tech notes

- Vanilla JS + canvas, one folder per game, matching the existing arcade pattern.
- Reuse `i18n.js`, `audio.js`, Paratroopers glyph styling. New per-language phonics bank.
- No backend; fully client-side. JSON export is a local download.
- Mandatory intro gate: age picker (6/7/8/9) + "screening only, not a diagnosis" notice.

## Non-goals

- No changes to the 13 math games.
- No clinical diagnosis claims — screening risk indicator only.
- No backend / accounts / network calls.
