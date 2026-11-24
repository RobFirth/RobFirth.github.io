# Spec: V60 pour-over on the bean page

**Status:** ready to build · **Repos:** `firth-family-functions` (rules + tests), then `RobFirth.github.io` (UI, `static/family/index.html`) · **Rules change:** yes, additive · **New data:** `pourover_brews` collection, optional `currentV60` on a bean

## Why

Rob also brews V60 pour-over at work. The bags are the same Pact bags as at home: a bag goes to work and stays there, so in practice each bag is either an espresso bag or a V60 bag. He is often in a hurry, so the only numbers he reliably has are **coffee in and water poured** (15 g → 250 g, Hoffmann's one-cup recipe: the scale is tared with cone, filter and grounds on, so it reads water poured) and the grind. Logging must be quicker than espresso, not slower.

## Fixed kit (record in `CLAUDE.local.md`, not stored)

V60 with paper filters, Timemore C3 Pro hand grinder, scales, an on-wall hot-water boiler (temperature not adjustable, so not logged). **Grind = clicks from zero** (burrs fully tight), whole numbers; V60 usually sits around 11–18 clicks. If the kit changes, re-index the data rather than adding fields in advance.

## Data model

```
pourover_brews/{auto-id}
  beanId, uid, displayName, brewedAt (server time),
  dose        number, g of coffee in              (required)
  water       number, g of water poured           (required — scale tared with cone + grounds)
  grind       int, C3 clicks from zero            (required)
  timeSeconds int, first pour → drawdown finished (optional, omitted when blank)
  taste       "sour" | "balanced" | "bitter"      (optional, omitted when not tapped)
  notes       string ≤ 280                        (optional, omitted when blank)

espresso_beans/{id}
  + currentV60: { brewId, dose, water, grind, timeSeconds? }   (optional key; absent until first set)
```

- **A separate collection, not a `method` field on `espresso_shots`.** The espresso ranges (grind 1–16, yield ≤ 100 g) don't fit V60, and every espresso chart (bean page and global: target, ageing, heat maps) reads `espresso_shots` whole. Keeping brews apart means no espresso rule, chart or test changes.
- Beans stay shared: one bean list, one bag, either method.
- Ratio is computed, never stored: `water / dose`, the usual pour-over brew ratio (15 → 250 = 1:16.7). It's named `water`, not `yield`, so it can't be confused with espresso's yield in the cup.

## Rules (`firestore.rules`, additive)

```
function validPourRecipe(d) {
  return d.dose is number && d.dose >= 5 && d.dose <= 40
    && d.water is number && d.water >= 50 && d.water <= 1000
    && d.grind is int && d.grind >= 1 && d.grind <= 40
    && (!('timeSeconds' in d) || (d.timeSeconds is int && d.timeSeconds >= 30 && d.timeSeconds <= 900));
}
```

- `validCurrentV60(c)`: map, `hasAll(['brewId','dose','water','grind'])`, `hasOnly([... ,'timeSeconds'])`, non-empty `brewId`, `validPourRecipe(c)`.
- `validBean`: add `currentV60` to `hasOnly` (**not** `hasAll`, so every existing bean stays valid); `!('currentV60' in d) || validCurrentV60(d.currentV60)`. No `null` form: absent means none.
- `validBrew(d)`: `hasAll(['beanId','uid','displayName','brewedAt','dose','water','grind'])`, `hasOnly` adds `timeSeconds`, `taste`, `notes`; `taste in ['sour','balanced','bitter']`; notes string ≤ 280; same `displayName` check as shots.
- `match /pourover_brews/{brewId}`: identical shape to `espresso_shots` — read `isAdult()`; create own with `brewedAt == request.time`; update own with `uid`, `beanId`, `brewedAt` immutable; delete own.
- `espresso_shots`, `pages`, `crossword_scores`, tracker and kids blocks unchanged.

### Rules tests (`tests/rules.test.js`)

Mirror the existing shot cases for brews: own create/update/delete; another adult's brew can be read but not changed or deleted; child and no-role refused; bounds on each field (just inside / just outside); `timeSeconds`, `taste`, `notes` each optional; bad `taste` value refused; empty `notes` refused; unknown field refused; `brewedAt` must be server time and can't change; `beanId`/`uid` can't change. Beans: existing bean without `currentV60` still updatable; valid `currentV60` with and without `timeSeconds`; bad `currentV60` refused; brew + `currentV60` batch commits as one write and rolls back together. Record the new count.

## UI

### Naming

Visible text only (ids, collections, functions keep their `espresso` names): dashboard card and page heading become **☕ Coffee**, subtitle *Our beans, shots and pour-overs.*

### Bean page: method switch

- A two-tab switch **Espresso | V60** (`crossword-tabs`, as the global charts use) at the top of the bean page, under the header card.
- **Default when opening a bean:** the method of that bean's newest log (newest shot vs newest brew); espresso if it has neither. Not remembered per device — the phone is the same at home and at work, the bag isn't.
- The switch swaps the log card, history card and charts card. The header shows both recipe lines when both exist: `Espresso G7 · 18→36g · 28s · 1:2.0` and `V60 C15 · 15g:250g · 3:10 · 1:16.7`.
- One extra query when a bean opens: `pourover_brews` where `beanId ==` (single field, no index), alongside the shots query in `renderBeanDetail()`.

### Log a brew

Fields, in this order (big tap targets, phone first):
1. **Grind (clicks)** — numeric.
2. **Coffee (g)** and **Water (g)** — decimal. Hint under Water: *poured, scale tared with the cone and grounds on*.
3. **Taste** (optional): three buttons *Sour · Balanced · Bitter*; tap again to clear. A one-line hint under it: *Sour → finer · Bitter → coarser*.
4. **Time** (optional) — M:SS, reuse `wireClockInput()`. Hint: *first pour to drawdown finished; skip if you didn't time it*.
5. **Notes** (optional).
6. **Make this the current V60 recipe** checkbox → writes brew + `currentV60` in one batch, like shots.

- **Prefill** from the bean's newest brew; else `currentV60`; else 15 g / 250 g with grind blank. Taste and notes are never prefilled.
- With prefill, the normal hurried case is: check grind, tap a taste, **Log**.
- Edit and delete your own brews, as with shots. "Make current" on any past brew.
- Validation messages match the rules' ranges.

### Bean list tiles

- "Last used" (sort order and the "Last … " line) counts brews as well as shots: one more whole-collection read of `pourover_brews` in `loadBeans()`, same failure handling as the shots read (a failed read must not hide beans).
- The recipe line shows the recipe for the method last used on that bean, prefixed `V60` for pour-over, e.g. `V60 · C15 · 15g:250g · 1:16.7`. Keep `recipeLine()` for espresso and add `pourLine(r)`.

### V60 charts (bean page only)

One collapsed card, same behaviour as the espresso charts (shown from 3 brews, open state in `localStorage` key `pourover.chartsOpen`, Plotly drawn only while open, purged on leaving).

- **Dial-in:** x = brew number (1 = oldest), y = grind clicks, line + markers. Marker colour = taste (sour / balanced / bitter, three colours added to `chartTheme()`; untasted = muted grey). Newest brew ringed. Tooltip: `#4 · C15 · 15g:250g · 3:10 · 1:16.7 · Balanced` plus date.
- No target box: with a fixed 15 g : 250 g recipe the ratio barely moves, and time is often missing. Revisit when there are a few dozen brews.
- The global charts stay espresso-only; their captions say so if they don't already.

## Backups

Check `firth-family-content/content/backup_all.py` picks up `pourover_brews` (it should if it lists collections rather than naming them). If it names them, add it.

## Build order

1. **Functions PR:** rules + rules tests. Deploy rules only after merge; record the new ruleset id and rollback id.
2. **Site PR:** UI + page-harness checks in `firth-family-functions/tests/` (that suite lives in the functions repo).
3. `CLAUDE.local.md`: fixed V60 kit and the grind = clicks-from-zero convention.
4. `docs/CHANGELOG.md`: line under Unreleased → Added.

## Out of scope

- Logging liquid in the cup, bloom, pour stages, temperature, or recipe names.
- Sour/balanced/bitter for espresso shots (still on the espresso backlog; build it from the same three-button component later).
- Days-off-roast and heat-map charts for V60.
- A home/work filter on the bean list.

## Acceptance checks

- [ ] Rules: every brew case above passes; all existing suites still pass at their baselines (record counts).
- [ ] An existing bean with no `currentV60` can still be edited, archived and made current for espresso.
- [ ] Bean page opens on V60 when the bean's newest log is a brew, on espresso otherwise.
- [ ] Logging a brew with only grind, coffee and water succeeds; time, taste and notes are omitted from the doc, not stored blank.
- [ ] Taste toggles on/off; a cleared taste is removed on edit with `FieldValue.delete()`.
- [ ] Prefill follows newest brew → `currentV60` → 15/250.
- [ ] Make-current writes brew + `currentV60` in one batch; a failed write leaves neither.
- [ ] Bean list order and "Last …" line count brews; tile shows the last-used method's recipe.
- [ ] Global espresso charts unchanged (no brews in them).
- [ ] V60 chart card hidden below 3 brews, collapsed by default, no Plotly work while closed, purged on leaving.
- [ ] No horizontal overflow at 390 px; page scroll over the chart works on a phone.
- [ ] `node --check` passes on all inline script blocks.
