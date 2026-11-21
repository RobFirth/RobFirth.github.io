# Spec: Espresso — charts across all beans, and days off roast

**Status:** ready to build (review answers below) · **Scope:** UI only, `static/family/index.html` · **Rules change:** none · **New data:** none

## Why

The bean page charts (#21) show how one bag is converging. Two questions they can't answer:

1. **Across bags:** where do shots usually land, which grind and time combinations come up most, and does caff behave differently from decaf?
2. **Age of the beans:** fresh beans pull differently from beans three weeks off roast. The dial-in chart's x-axis is shot number, which hides that.

So this adds:

- a **days off roast** option on the bean page's Dial-in chart, and
- a **global Charts card** on the bean list with four charts across every bean.

## Shared definitions

- **Days off roast** for a shot = `(pulledAt − local midnight of the bean's roastDate) / 1 day`, as a fraction (e.g. 6.4). Same calendar convention as `friendlyDate()` (`YYYY-MM-DD` parsed as local midnight). A pure helper `daysOffRoast(shot, bean)` returns `null` when the bean has no `roastDate` or the shot has no `pulledAt` yet.
- A shot before its roast date (a typo in the date) gets a negative value. Plot it as is: it shows the typo instead of hiding it.
- Shots with a pending `pulledAt` are left out, as in `chartShots()`.
- **Constants:** reuse `ESPRESSO_TARGET` (25–32 s, 1:1.8–2.2). No new settings.

## Part 1 — Dial-in chart: shot number or days off roast

- Above the Dial-in chart (inside the open Charts card), a two-option switch: **`Shot no.` | `Days off roast`**. Reuse `.crossword-tabs` / `.crossword-tab` (with `role="tablist"`/`role="tab"`, `aria-selected`).
- Remember the choice per device in `localStorage` (`espresso.dialinAxis` = `'shot'` | `'roast'`), with `try/catch` and a fallback to `'shot'`, like `espresso.chartsOpen`.
- **Bean with no roast date:** the `Days off roast` option is disabled, with a muted hint "Add a roast date to see days off roast", and the chart uses shot number whatever the saved choice. Don't overwrite the saved choice (the next bean may have a date).
- **Days off roast mode:**
  - x = days off roast, as a fraction, so shots pulled on the same day sit side by side. Integer ticks (`day 0`, `day 7`…), axis title `days off roast`.
  - x range: from `min(0, first − 0.5)` to `last + 0.5`, at least 7 days wide.
  - Line and markers in time order, newest highlighted, older fading. Same as now (`chartShots()` order, opacity, latest).
  - **Grind changes:** the dashed line sits halfway between the two shots' x values, with the `G<n>` label as now.
  - Band 25–32 s unchanged.
- Tooltip in **both** modes gains the age when known: `#7 · G6 · 17.8→36.1g · 29s · 1:2.0 · day 6` (rounded to whole days), then the date line.
- Caption follows the mode: `Dial-in · shot time by shot, grind changes marked` / `Dial-in · shot time by days off roast, grind changes marked`.
- Switching mode redraws only the Dial-in chart (`Plotly.react`), and only while the card is open.

## Part 2 — Global Charts card on the bean list

### Placement and behaviour

- New `crossword-card` in `#espresso-pane-list`, **below the Beans card**. Same collapsible heading pattern as #21: `Charts ▾` / `Charts ▴`, `aria-expanded`/`aria-controls`, collapsed by default, remembered in `espresso.globalChartsOpen`.
- Shown only when there are **≥ 3 plotted shots** across all beans.
- **All beans, always:** archived beans are included whether or not "Show archived" is ticked. Beans that no longer exist (a shot whose `beanId` doesn't match) are left out.
- **Data:** `loadBeans()` already reads the whole `espresso_shots` collection for the list order. Keep the shot docs (e.g. `espressoAllShots`) as well as the `espressoLastShot` map. **No extra Firestore reads.** If that read failed, the card stays hidden.
- Inside the card the charts are **stacked**, in three titled sections: **Target**, **Ageing**, **Heat maps**. Small section headings (`h3`, muted), no tabs. Every chart is drawn when the card opens.
- Redraw after `loadBeans()` only if the card is open. Purge all global charts when the card closes, when leaving the Espresso view, and when the list pane is hidden (opening a bean).
- Same rules as #21: Plotly via `chartTheme()`, `baseLayout()`, `CHART_CONFIG`; guard for Plotly not loaded (inline "Charts couldn't load" message); draw only into a visible box; `fixedrange` on every axis, `dragmode: false`; resize on window resize.

### Bean colours

With every bag included, a colour per bag would run out fast. Proposal:

- The **4 most recently used bags** (by `beanLastUsed()`, the list order) get `--chart-setter-1…4`, in that order.
- Every older bag is drawn in one muted grey as **"Older bags"**.
- Legend above the plot (`legendAbovePlot()`), labels `Roaster — Name` via `escapeHtml()`, truncated at ~22 characters with the full label in the tooltip.

### Section 1 — Target: "Where shots land, all beans"

- Chart 1 from #21 (x = time, y = ratio, the target box, the same ranges logic), with every shot from every bean.
- One trace per coloured bag, plus one "Older bags" trace. Within a trace, older shots fade as in #21 (opacity by recency across *all* shots, not per bag).
- The single newest shot overall is ringed and labelled `latest`.
- Tooltip: the bean label, then the #21 tooltip (`#n` = that shot's number within its bean).
- Caption: `Where shots land · all beans · target 25–32s, 1:1.8–2.2`.

### Section 2 — Ageing: two charts, beans with a roast date only

1. **Grind vs days off roast:** x = days off roast, y = grind (integer ticks, 1–16 range trimmed to the data ± 1). One line per bag (`lines+markers`, `line.shape: 'hv'` so a grind holds until it changes), coloured as above.
   Caption: `Grind by days off roast · one line per bag`.
2. **Shot time vs days off roast:** x = days off roast, y = shot time, the 25–32 s band, one line per bag.
   Caption: `Shot time by days off roast · one line per bag`.

- Shared x range across both charts: `min(0, earliest) … max(14, latest) + 0.5`.
- Bags without a roast date are left out, with a muted note under the section heading: `2 bags without a roast date aren't shown.` (pluralised; omitted when 0).
- If no bag has a roast date, the section shows only that note, and no charts.

### Section 3 — Heat maps: where shots cluster

- A **`Caff` | `Decaf`** switch (`.crossword-tabs`), defaulting to whichever has more shots. Remember it in `espresso.heatSplit`. When one side has no shots, that option is disabled.
- A second switch, **`Coarse` | `Fine`**, sets the bin size. Coarse is the default (**3 s** for time, **0.2** for ratio), and Fine is 2 s and 0.1. Grind always gets one bin per setting. Remember it in `espresso.heatBins`. Changing either switch redraws only the two heat maps.
- Two `histogram2d` charts (in the full Plotly bundle we already load):
  1. **Grind × time:** x = grind, one bin per setting; y = shot time, in time bins. Caption: `Grind × shot time · <n> shots`.
  2. **Time × ratio:** x = shot time, in time bins; y = ratio, in ratio bins. The target box drawn as an outline on top. Caption: `Shot time × ratio · <n> shots`.
- Colour scale from `--chart-seq-light` → `--chart-seq-dark` (as the tracker uses), empty bins transparent (`zmin: 1`, so 0 isn't coloured). **No colour bar** (`showscale: false`): these show where shots cluster, not a measurement, and the tooltip gives the count.
- Tooltip: `G6 · 27–30s: 5 shots` / `27–30s · 1:1.8–2.0: 3 shots` (bin edges follow the bin size).

## Pure helpers (testable without Plotly)

- `daysOffRoast(shot, bean)` → number | `null`.
- `beanColours(beans, lastShotMap)` → `Map<beanId, colour | 'older'>`, by recency.
- `globalShots(beans, shots)` → plotted shots with `bean`, `n` (number within its bean), `daysOff`, `opacity` (recency across all), `isLatest` (overall newest).
- `binCounts(values, binWidth)` is optional; Plotly can bin itself. Use whichever is easier to test.

## Out of scope

- Sour / balanced / bitter tagging, and colouring by it (backlog 2).
- Tapping a point to open that shot (backlog 4).
- Comparing roasters or origins (the origin fields exist; a later chart).
- Any new field such as `lastShotAt`. If reading the whole shots collection ever gets slow, that's the follow-up.

## Review decisions

1. **Bean colours:** the 4 most recently used bags in colour, the rest grey as "Older bags". Confirmed.
2. **Layout:** the four charts stacked in the global card, in sections, no tabs.
3. **Heat-map bins:** coarser by default (3 s, 0.2), with a Coarse / Fine switch (2 s, 0.1).
4. **Colour bar:** none. The heat maps are a visual guide, not a statistical measure.
5. **Grind line:** steps (`hv`).

## Acceptance checks

### Dial-in axis (bean page)
- [ ] `Shot no.` / `Days off roast` switch above the Dial-in chart; the choice is remembered on reload; a `localStorage` failure falls back to `Shot no.` without errors.
- [ ] Days off roast mode: x is fractional days since local midnight of the roast date; same-day shots don't overlap; integer ticks; range at least 7 days.
- [ ] Grind-change lines sit halfway between shots in both modes; labels on every segment.
- [ ] Bean without a roast date: option disabled with the hint, chart uses shot number, saved choice untouched.
- [ ] Tooltip shows `· day N` when the bean has a roast date, in both modes.
- [ ] Switching mode redraws only the Dial-in chart, and nothing is drawn while the card is closed.

### Global card (bean list)
- [ ] Card below the Beans card, collapsed on first visit, open state remembered; hidden below 3 plotted shots or when the shots read failed.
- [ ] Includes archived beans whether or not "Show archived" is ticked; shots for missing beans left out.
- [ ] No Firestore reads beyond the existing two in `loadBeans()`.
- [ ] Charts stacked in Target / Ageing / Heat maps sections; all drawn on open, none while closed; closing the card, opening a bean or leaving the view purges them.
- [ ] Target: every plotted shot; target box; 4 most recent bags coloured in list order, the rest "Older bags"; overall newest shot ringed and labelled.
- [ ] Ageing: both charts share an x range; one line per bag with a roast date; the "N bags without a roast date" note is correct and pluralised; only the note when no bag has a date.
- [ ] Heat maps: Caff/Decaf switch defaults to the larger side and disables an empty side; Coarse (3 s, 0.2) by default and Fine (2 s, 0.1) on the switch, remembered; grind one bin per setting; target outline on time × ratio; empty bins uncoloured; no colour bar; switches redraw only the heat maps.
- [ ] User text (bean labels) escaped in legends, tooltips and notes.

### Everywhere
- [ ] Phone: vertical scroll over every chart works (no zoom or drag); no horizontal overflow at 390px in the Espresso view.
- [ ] Missing Plotly shows the inline message and throws nothing.
- [ ] `node --check` passes on all inline script blocks.
- [ ] Page harness in `firth-family-functions/tests/` covers: `daysOffRoast()` (fractions, local midnight, no roast date, before roast date), `beanColours()`, `globalShots()`, the axis switch and its fallbacks, the card's threshold, sections and purge, the without-roast-date note, and the heat-map split and bin switch. Rules suite unchanged and passing.
- [ ] `docs/CHANGELOG.md` gets lines under Unreleased → Added.
