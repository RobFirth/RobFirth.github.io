# Spec: Espresso bean page — dial-in charts

**Status:** ready to build · **Scope:** UI only, `static/family/index.html` · **Rules change:** none · **New data:** none

## Why

The bean page records shots but doesn't show how a bag is converging. Two small charts on the bean detail page answer "where are my shots landing?" and "what did each grind change do?". **Logging stays the most important thing on the page**: the charts sit below the log form and start collapsed.

## Placement and behaviour

- New `crossword-card` in `#espresso-pane-detail`, **between the "Log a shot" card and the "Shot history" card**.
- The card heading is a toggle button: `Charts ▾` / `Charts ▴` (`aria-expanded`, `aria-controls`). Collapsed by default.
- Remember open/closed per device in `localStorage` (key e.g. `espresso.chartsOpen`), wrapped in `try/catch`; fall back to collapsed.
- Show the card only when the bean has **≥ 3 shots**; hide it otherwise.
- Data: `espressoShots`, already loaded by `renderBeanDetail()`. **No extra Firestore reads.** Re-render the charts after every `renderBeanDetail()` (log, edit, delete, make-current) **only if the card is open**; render on open.
- Draw with **Plotly** (already loaded with `defer` on line 15), reusing `chartTheme()`, `baseLayout(t)` and `CHART_CONFIG`, as the crossword charts do. Guard for `window.Plotly` not being ready yet, the same way the crossword charts do.
- Plotly must draw into a visible container: render after removing `hidden`, and call `Plotly.Plots.resize` / `Plotly.react` on open. `Plotly.purge` both charts in `closeBeanDetail()`.
- Static, phone-first: `staticPlot`-like behaviour isn't required, but no zoom/drag (`fixedrange: true` on both axes) so scrolling the page on a phone never gets captured by a chart. Tap/hover tooltips are fine.

## Constants

```js
const ESPRESSO_TARGET = { timeMin: 25, timeMax: 32, ratioMin: 1.8, ratioMax: 2.2 };
```

Plain constants, not settings. Ratio = `yield / dose` from each shot's actual dose (Rob's dose varies ~17.4–18.2 g; that's expected and already reflected in the ratio).

## Colour: recency, not rating

Ratings aren't used, so colour encodes **recency**: older shots fade, the newest is highlighted.

- Shots sorted oldest → newest; shot *i* of *n* gets grey (`t.text` dimmed / muted theme colour) with opacity ramping ~0.2 → 0.85.
- The **newest shot** uses the theme accent colour, slightly larger marker, with a ring in the card colour.
- The target band uses a muted green at ~12% fill with a dashed edge (one new colour; add it to `chartTheme()` if there isn't a suitable one).
- Must read in both the page's dark theme and any light variant `chartTheme()` supports.

## Chart 1 — "Where shots land" (target box)

- Scatter: **x = shot time (s)**, **y = ratio** (1 decimal on ticks/tooltips).
- Shaded rectangle (layout `shapes`) for the target: 25–32 s × 1.8–2.2.
- Axis ranges: include the target box and all points with a little padding (min x range ~18–36 s, y ~1.6–2.4, expanding if data lies outside).
- Tooltip: `#7 · G6 · 17.8→36.1g · 29s · 1:2.0` plus the date (reuse `shotWhen()` formatting).
- Small "latest" annotation beside the newest point.
- Caption above the chart (muted, small): `Where shots land · target 25–32s, 1:1.8–2.2`.

## Chart 2 — "Dial-in" (timeline)

- **x = shot number** within this bean (1 = oldest), not date, so a weekend off doesn't stretch the line. Integer ticks.
- **y = shot time (s)**, with the 25–32 s band shaded horizontally.
- Grey line + markers through all shots; newest marker highlighted as in chart 1.
- **Grind changes:** a dashed vertical line (layout `shapes`) wherever grind differs from the previous shot, with a small label `G7` at the top of each segment (the first segment labelled too).
- Tooltip as chart 1.
- Caption: `Dial-in · shot time, grind changes marked`.

## Pure helpers (testable without Plotly)

- `chartShots(shots)` → oldest-first array with `n` (1-based), `ratio`, `isLatest`, `opacity`. Ignores shots with no `pulledAt` yet (pending server timestamp), or places them last — pick one and document it.
- `grindSegments(chartShots)` → `[{ grind, fromN, toN }]`, a new segment each time grind changes.

## Out of scope (backlog, in order)

1. Days off roast per shot + grind-vs-days-off-roast chart (one line per bag).
2. Sour / balanced / bitter tap per shot, replacing the 1–5 rating; then colour chart 1 by it.
3. Heat map across all shots (grind × time, and time × ratio), split caff vs decaf.
4. Tapping a point to open that shot.

## Acceptance checks

- [ ] Card sits between "Log a shot" and "Shot history"; collapsed on first visit.
- [ ] Open/closed is remembered on reload; a `localStorage` failure falls back to collapsed without errors.
- [ ] Card hidden with 0–2 shots, shown from 3.
- [ ] Opening the card draws both charts at full width (no zero-width Plotly render).
- [ ] Logging, editing or deleting a shot updates the open charts; with the card closed, no Plotly work happens.
- [ ] Chart 1: target box at 25–32 s × 1.8–2.2; every shot plotted; ratio uses each shot's own dose.
- [ ] Chart 2: x is shot number; band at 25–32 s; a dashed line and `G<n>` label at each grind change, none where grind is unchanged.
- [ ] Newest shot highlighted in both charts; older shots fade with age.
- [ ] Vertical page scroll over a chart works on a phone (no zoom/drag capture).
- [ ] No horizontal overflow at 390px.
- [ ] Leaving the bean purges both charts; opening another bean shows only that bean's shots.
- [ ] `node --check` passes on all inline script blocks.
- [ ] Page-check harness in `firth-family-functions/tests/` covers: hidden below 3 shots, collapsed default, `chartShots()` ordering/opacity/latest, `grindSegments()` boundaries.
- [ ] `docs/CHANGELOG.md` gets a line under Unreleased → Added.
