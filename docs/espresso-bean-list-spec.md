# Spec: Espresso bean list — most recently used first, shown as tiles

**Status:** ready to build · **Scope:** UI only, `static/family/index.html` · **Rules change:** none expected

## Why

1. **Order.** The bean list sorts active first, then alphabetically by roaster and name. In practice there is one bag (or one caff + one decaf) in use at a time, so the bean you want is whichever you used last — it should be at the top.
2. **Separation.** List rows (`.solve-row` inside `.solves-list`) have no border or background until hovered, so on a phone the beans run together and it isn't obvious each one is a separate, tappable entry.

## Change 1 — sort by most recently used

### Definition of "last used"

`lastUsed(bean)` = the later of:

- the `pulledAt` of the bean's **newest shot** (any family member's), and
- the bean's `createdAt` (so a bag added today, with no shots yet, still rises to the top).

Do **not** use `updatedAt`: fixing a typo or archiving a bean isn't "using" it.

### Data

- In `loadBeans()`, fetch shots alongside the beans in one `Promise.all`:
  `db.collection(SHOTS).get()` — whole collection, no `where`, so no index is needed. Household volume (a few shots a day) makes this cheap for years; note it in a comment.
- Reduce to a `Map<beanId, millis>` of each bean's newest `pulledAt` (reuse `shotMillis()`). Keep it in a module-level variable (e.g. `espressoLastShot`) next to `espressoBeans`.
- A shot with a pending/missing `pulledAt` counts as 0 (same as `shotMillis()` today).
- If the shots read fails, still render the beans (fall back to `createdAt` only) and log the error — don't block the list on it.
- The list already reloads via `closeBeanDetail()` → `loadBeans()`, so a shot logged on the detail page moves that bean to the top on return. Confirm this; don't add listeners.

### Sort

Replace the comparator in `renderBeanList()` with a pure, testable function, e.g. `sortBeansForList(beans, lastShotMap)`:

1. Active before archived (unchanged — only matters when "Show archived" is ticked).
2. `lastUsed` descending.
3. Tie-break: roaster, then name, `localeCompare` (the current order), so the result is stable.

`espressoBeanRows` must still be the sorted array, because click handling uses `data-index` into it.

## Change 2 — beans as tiles

Each bean becomes a visually distinct card. Scope the styles to the espresso list (`#espresso-bean-list` / `.espresso-bean-row`) — **the crossword list shares `.solves-list` / `.solve-row` and must not change.**

- **Tile:** `background: var(--bg-card)`, `border: 1px solid var(--border)`, `border-radius: 10px`, padding ~12–14px. Keep it a `<button>` inside the `<li>` (whole tile tappable, keyboard focusable).
- **Spacing:** `display: flex; flex-direction: column; gap: 8px` on the list (or margin between `<li>`s).
- **Hover/focus:** border to `var(--accent)` plus the existing `--accent-dim` background; keep a visible `:focus-visible` outline.
- **Height cap:** `.solves-list` has `max-height: 340px; overflow-y: auto`. Remove the cap for the espresso list — a nested scroll area of tiles is awkward on a phone, and the list is short.
- **Content inside the tile** (top to bottom):
  1. `Roaster — Name` + tags (Decaf / Archived), as now.
  2. Recipe line, e.g. `G7 · 18→36g · 28s · 1:2.0`, or "No recipe yet", as now.
  3. **New, small muted line:** `Last shot today` / `yesterday` / `3 days ago` / `12 Oct` (older than ~2 weeks). Omit when the bean has no shots. Uses `var(--text-dim)` and a smaller font. This makes the new ordering self-explanatory.
- **Most recent tile:** no extra highlight for now (keep it minimal); being first is enough.
- **Archived tiles:** reduce to ~0.7 opacity so they read as secondary when "Show archived" is ticked.
- **Layout:** single column at all widths. Must not overflow at 390px (existing check); long roaster/name text wraps.
- All user text still goes through `escapeHtml()`.

## Out of scope

- No new Firestore fields (e.g. `lastShotAt` on the bean) and no rules change. If whole-collection shot reads ever get slow, that's the follow-up.
- No change to the bean detail page, shot history, or crossword list.
- The backlog items (new-bag flow, auto-open when one bean is active, days off roast) are separate.

## Acceptance checks

- [ ] Bean with the newest shot is first, regardless of roaster name.
- [ ] A bean created today with no shots sorts above a bean last used last week.
- [ ] Logging a shot on bean B then going back moves B to the top.
- [ ] Editing a bean's details (no shot) does **not** change its position.
- [ ] With "Show archived" ticked, every active bean is above every archived bean; each group is by recency.
- [ ] Equal recency falls back to roaster then name.
- [ ] Shots read failing still shows the beans (by `createdAt`), with the error logged.
- [ ] Each bean is a bordered tile with a visible gap; whole tile is tappable and keyboard focusable.
- [ ] "Last shot …" line correct for today / yesterday / N days / older date; absent with no shots.
- [ ] Crossword solves list looks and behaves exactly as before.
- [ ] No horizontal overflow at 390px; no nested scroll on the espresso list.
- [ ] `node --check` passes on all inline script blocks.
- [ ] Page-check harness in `firth-family-functions/tests/` updated for the new order and markup and passing; rules suite unchanged and passing (it should already permit an adult listing `espresso_shots` — add a case if not covered).
- [ ] `docs/CHANGELOG.md` gets a line under Unreleased → Changed.
