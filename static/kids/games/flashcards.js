// Flashcards: one sight word at a time, large. Not a quiz: no score, no timer, nothing recorded.
// A grown-up (2 s press-and-hold) switches the mode, picks Focus words and marks decks passed in class
// with a rosette; all of it stays on this device.
// Deck order and stepping are pure functions; the DOM code below only renders them.
import { flashModes, flashDecks } from '../data/words.js';

export const HOLD_MS = 2000;
export const SWIPE_PX = 50;
export const FOCUS = 'focus';
export const ALL = 'all';

// ── Pure logic ──
export function shuffle(items, rand = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const decksFor = (decks, mode) => decks.filter(d => d.mode === mode);
export const wordsFor = (decks, mode) => decksFor(decks, mode).flatMap(d => d.words);
// The deck a word belongs to in a mode (words are unique within a mode)
export const groupOf = (decks, mode, word) => decksFor(decks, mode).find(d => d.words.includes(word)) || null;
// Rosettes: ids of known decks, in deck order
export const cleanRosettes = (decks, ids) => { const list = Array.isArray(ids) ? ids : []; return decks.map(d => d.id).filter(id => list.includes(id)); };
export const toggleRosette = (decks, ids, id) => cleanRosettes(decks, ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]);

// Focus words kept in deck order, only words of that mode, no repeats
export const cleanFocus = (decks, mode, words) => {
  const list = Array.isArray(words) ? words : [];
  return [...new Set(wordsFor(decks, mode).filter(w => list.includes(w)))];
};
export const toggleWord = (decks, mode, focus, word) =>
  cleanFocus(decks, mode, focus.includes(word) ? focus.filter(w => w !== word) : [...focus, word]);

// Settings from storage, made safe: unknown mode, decks or words are dropped
export function readSettings(saved, decks = flashDecks, modes = flashModes) {
  const s = saved && typeof saved === 'object' ? saved : {};
  const mode = modes.some(m => m.id === s.mode) ? s.mode : modes[0].id;
  const raw = s.focus && typeof s.focus === 'object' ? s.focus : {};
  const focus = Object.fromEntries(modes.map(m => [m.id, cleanFocus(decks, m.id, raw[m.id])]));
  const deck = s.deck === FOCUS || s.deck === ALL || decks.some(d => d.id === s.deck) ? s.deck : null;
  return { mode, deck, focus, rosettes: cleanRosettes(decks, s.rosettes) };
}

// A run through a deck: index 0..n-1 is a card, index n is the end screen
export const newRun = (words, rand = Math.random) => ({ words: shuffle(words, rand), index: 0 });
export const isEnd = run => run.index >= run.words.length;
export const canBack = run => run.index > 0 && !isEnd(run);
export const next = run => (isEnd(run) ? run : { ...run, index: run.index + 1 });
export const back = run => (canBack(run) ? { ...run, index: run.index - 1 } : run);
export const counter = run => `${run.index + 1} / ${run.words.length}`;

// ── DOM ──
const ARROW = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 4l8 8-8 8"/></svg>';
const SPEAKER = '<svg viewBox="0 0 24 24" aria-hidden="true"><path class="fill" d="M3 9h4l5-4v14l-5-4H3z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8l2.8 5.8 6.3.9-4.6 4.4 1.1 6.3L12 17.2l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/></svg>';
const COG = `<svg class="cog-ring" viewBox="0 0 64 64" aria-hidden="true"><circle class="ring-track" cx="32" cy="32" r="29"/><circle class="ring-fill" cx="32" cy="32" r="29" pathLength="100"/></svg>
<svg class="cog-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2.1-1.6-2-3.5-2.5 1a7.4 7.4 0 0 0-1.7-1L15 3.3h-4l-.4 2.6a7.4 7.4 0 0 0-1.7 1l-2.5-1-2 3.5L6.5 11a7.6 7.6 0 0 0 0 2l-2.1 1.6 2 3.5 2.5-1a7.4 7.4 0 0 0 1.7 1l.4 2.6h4l.4-2.6a7.4 7.4 0 0 0 1.7-1l2.5 1 2-3.5zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>`;
const ROSETTE = `<svg viewBox="0 0 48 56" aria-hidden="true"><g stroke="#1F2A44" stroke-width="2.5" stroke-linejoin="round">
<path d="M15 30 8 53l8-4 5 7 5-22z" fill="#3D348B"/><path d="M33 30l7 23-8-4-5 7-5-22z" fill="#C73E3E"/>
<path fill="#FFC93C" d="M24 2l4.2 4.6 6-1.6 1.6 6 6 1.6-1.6 6L44.8 23l-4.6 4.2 1.6 6-6 1.6-1.6 6-6-1.6L24 44l-4.2-4.6-6 1.6-1.6-6-6-1.6 1.6-6L3.2 23l4.6-4.2-1.6-6 6-1.6 1.6-6 6 1.6z"/>
<circle cx="24" cy="23" r="9.5" fill="#FFFFFF"/></g><path d="M19.5 23.5l3 3 6-6.5" fill="none" stroke="#2A7A44" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
const MIXED_COLOUR = '#1F2A44', MIXED_TINT = '#FFFFFF';
// Hard stripes of the mode's deck colours, for the All tile's edge
const stripes = decks => `linear-gradient(135deg, ${decks.map((d, i) => `${d.colour} ${(i * 100 / decks.length).toFixed(2)}% ${((i + 1) * 100 / decks.length).toFixed(2)}%`).join(', ')})`;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function button(cls, text) { const b = el('button', cls, text); b.type = 'button'; return b; }
const plural = n => `${n} word${n === 1 ? '' : 's'}`;

function mount(container, ctx) {
  let prefs = readSettings(ctx.settings.load());
  const store = () => ctx.settings.save({ mode: prefs.mode, deck: prefs.deck, focus: prefs.focus, rosettes: prefs.rosettes });
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  const speakable = () => { try { return !!ctx.settings.sound && !!ctx.canSpeak(); } catch (e) { return false; } };

  // Things to undo when the screen changes or the game closes
  let teardown = [];
  const onScreen = fn => teardown.push(fn);
  const clearScreen = () => { teardown.forEach(fn => { try { fn(); } catch (e) { /* already gone */ } }); teardown = []; };
  const listen = (target, type, fn, opts) => { target.addEventListener(type, fn, opts); onScreen(() => target.removeEventListener(type, fn, opts)); };

  const root = el('div', 'flash');
  container.replaceChildren(root);

  const modeLabel = id => (flashModes.find(m => m.id === id) || flashModes[0]).label;
  const deckById = id => {
    if (id === FOCUS) return { id: FOCUS, label: 'Focus', colour: MIXED_COLOUR, tint: MIXED_TINT, words: prefs.focus[prefs.mode], mixed: true };
    if (id === ALL) return { id: ALL, label: 'All', colour: MIXED_COLOUR, tint: MIXED_TINT, words: wordsFor(flashDecks, prefs.mode), mixed: true };
    return flashDecks.find(d => d.id === id && d.mode === prefs.mode) || null;
  };

  // ── Deck picker ──
  function showPicker() {
    clearScreen();
    const wrap = el('div', 'flash-picker');
    const head = el('div', 'flash-head');
    head.append(el('h2', 'flash-mode', modeLabel(prefs.mode)));
    const cog = button('cog flash-cog');
    cog.setAttribute('aria-label', 'Grown-ups: press and hold');
    cog.innerHTML = COG;
    holdToOpen(cog, openPanel);

    const tiles = el('div', 'flash-decks');
    const focusWords = prefs.focus[prefs.mode];
    const decks = [...(focusWords.length ? [deckById(FOCUS)] : []), ...decksFor(flashDecks, prefs.mode), deckById(ALL)];
    tiles.append(...decks.map(deck => {
      const b = button('deck-tile' + (deck.id === FOCUS ? ' focus-tile' : '') + (deck.id === ALL ? ' all-tile' : ''));
      b.dataset.deck = deck.id;
      b.style.setProperty('--deck', deck.colour);
      b.style.setProperty('--tint', deck.tint);
      if (deck.id === prefs.deck) { b.classList.add('last'); b.setAttribute('aria-current', 'true'); }
      const name = el('span', 'deck-name', deck.label);
      if (deck.id === FOCUS) { const s = el('span', 'deck-star'); s.innerHTML = STAR; name.prepend(s); }
      if (deck.id === ALL) b.style.setProperty('--stripes', stripes(decksFor(flashDecks, prefs.mode)));
      b.append(name, el('span', 'deck-count', plural(deck.words.length)));
      const passed = prefs.rosettes.includes(deck.id);
      if (passed) { const r = el('span', 'rosette'); r.innerHTML = ROSETTE; b.append(r); }
      b.setAttribute('aria-label', `${deck.label}, ${plural(deck.words.length)}${passed ? ', passed in class' : ''}`);
      b.addEventListener('click', () => { prefs.deck = deck.id; store(); play(deck.id); });
      return b;
    }));
    wrap.append(head, tiles, cog);
    root.replaceChildren(wrap);
  }

  // Press and hold (pointer or Enter/Space) for HOLD_MS; a tap does nothing
  function holdToOpen(btn, open) {
    let timer = null;
    const cancel = () => { if (timer) clearTimeout(timer); timer = null; btn.classList.remove('holding'); };
    const start = e => {
      if (e.type === 'keydown') { if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); e.stopPropagation(); }
      if (e.type === 'pointerdown' && e.button !== 0) return;
      cancel();
      btn.classList.add('holding');
      timer = setTimeout(() => { timer = null; btn.classList.remove('holding'); open(); }, HOLD_MS);
    };
    btn.addEventListener('pointerdown', start);
    btn.addEventListener('keydown', start);
    ['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(t => btn.addEventListener(t, cancel));
    btn.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') cancel(); });
    btn.addEventListener('contextmenu', e => e.preventDefault());
    btn.addEventListener('click', e => e.preventDefault());
    onScreen(cancel);
  }

  // ── Grown-ups panel: mode and Focus words ──
  function openPanel() {
    const overlay = el('div', 'corner flash-panel');
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'flash-panel-title');
    const panel = el('div', 'corner-panel flash-panel-body');
    const title = el('h2', '', 'Grown-ups'); title.id = 'flash-panel-title';

    const modes = el('div', 'flash-modes');
    const words = el('div', 'flash-words');
    const clear = button('btn btn-plain flash-clear', 'Clear focus');
    const done = button('btn btn-primary flash-done', 'Done');

    const render = () => {
      modes.querySelectorAll('.mode-btn').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === prefs.mode)));
      const focus = prefs.focus[prefs.mode];
      const rosettes = el('div', 'rosette-toggles');
      rosettes.append(...decksFor(flashDecks, prefs.mode).map(deck => {
        const b = button('rosette-btn');
        b.dataset.deck = deck.id;
        b.style.setProperty('--deck', deck.colour);
        b.style.setProperty('--tint', deck.tint);
        const on = prefs.rosettes.includes(deck.id);
        b.setAttribute('aria-pressed', String(on));
        const icon = el('span', 'rosette-icon'); icon.innerHTML = ROSETTE;
        b.append(icon, el('span', '', deck.label));
        b.addEventListener('click', () => { prefs.rosettes = toggleRosette(flashDecks, prefs.rosettes, deck.id); store(); render(); });
        return b;
      }));
      const groups = decksFor(flashDecks, prefs.mode).map(deck => {
        const group = el('div', 'word-group');
        group.style.setProperty('--deck', deck.colour);
        const chips = el('div', 'word-chips');
        chips.append(...deck.words.map(w => {
          const c = button('word-chip', w);
          c.dataset.word = w;
          c.setAttribute('aria-pressed', String(focus.includes(w)));
          c.addEventListener('click', () => {
            prefs.focus = { ...prefs.focus, [prefs.mode]: toggleWord(flashDecks, prefs.mode, prefs.focus[prefs.mode], w) };
            if (prefs.deck === FOCUS && !prefs.focus[prefs.mode].length) prefs.deck = null;
            store(); render();
          });
          return c;
        }));
        group.append(el('h4', 'word-group-label', deck.label), chips);
        return group;
      });
      const top = words.scrollTop;
      words.replaceChildren(el('h3', 'flash-section-title', 'Passed in class'), rosettes,
        el('h3', 'flash-section-title', 'Focus words'), el('p', 'flash-hint', 'Tap words to practise them in a Focus deck.'), ...groups);
      words.scrollTop = top;
      clear.disabled = !focus.length;
    };
    flashModes.forEach(m => {
      const b = button('btn btn-toggle mode-btn', m.label);
      b.dataset.mode = m.id;
      b.addEventListener('click', () => { if (prefs.mode !== m.id) { prefs.mode = m.id; store(); render(); words.scrollTop = 0; } });
      modes.append(b);
    });
    clear.addEventListener('click', () => {
      prefs.focus = { ...prefs.focus, [prefs.mode]: [] };
      if (prefs.deck === FOCUS) prefs.deck = null;
      store(); render();
    });
    const close = () => { overlay.remove(); showPicker(); };
    done.addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    listen(document, 'keydown', e => { if (e.key === 'Escape' && overlay.isConnected) close(); });

    const btns = el('div', 'flash-panel-buttons');
    btns.append(clear, done);
    panel.append(title, modes, words, btns);
    overlay.append(panel);
    render();
    root.append(overlay);
    done.focus({ preventScroll: true });
  }

  // ── Cards ──
  function play(deckId) {
    clearScreen();
    const deck = deckById(deckId);
    if (!deck || !deck.words.length) { prefs.deck = null; store(); showPicker(); return; }
    let run = newRun(deck.words);

    const wrap = el('div', 'flash-play');
    wrap.style.setProperty('--deck', deck.colour);
    const stage = el('div', 'flash-stage');
    const card = button('flash-card');
    const word = el('span', 'flash-word');
    card.append(word);
    stage.append(card);
    const count = el('p', 'flash-counter');
    count.setAttribute('aria-live', 'polite');
    const controls = el('div', 'flash-controls');
    const backBtn = button('flash-btn flash-back'); backBtn.innerHTML = ARROW; backBtn.setAttribute('aria-label', 'Back');
    const nextBtn = button('flash-btn flash-next'); nextBtn.innerHTML = ARROW; nextBtn.setAttribute('aria-label', 'Next');
    controls.append(backBtn);
    let speakBtn = null;
    if (speakable()) {
      speakBtn = button('flash-btn flash-speak'); speakBtn.innerHTML = SPEAKER; speakBtn.setAttribute('aria-label', 'Hear the word');
      speakBtn.addEventListener('click', () => { if (isEnd(run)) return; try { ctx.say(run.words[run.index]); } catch (e) { /* speech is a bonus */ } });
      controls.append(speakBtn);
    }
    controls.append(nextBtn);
    wrap.append(stage, count, controls);
    root.replaceChildren(wrap);

    // Card size from the space left after the counter and arrows; wide in landscape, squarer in portrait.
    // Word size: as wide as fits the card, capped by its height.
    const fit = () => {
      if (isEnd(run)) return;
      const cs = getComputedStyle(wrap), gap = parseFloat(cs.rowGap) || 0;
      const sw = wrap.clientWidth;
      const sh = wrap.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom) - count.offsetHeight - controls.offsetHeight - 2 * gap;
      if (sw <= 0 || sh <= 0) return;
      const ratio = sw / sh < 1 ? 1.25 : 1.6;
      let w = Math.min(sw, sh * ratio, 960), h = Math.min(sh, w / ratio);
      w = Math.floor(w); h = Math.floor(h);
      stage.style.height = `${h}px`;
      card.style.width = `${w}px`; card.style.height = `${h}px`;
      word.style.fontSize = '100px';
      const natural = word.scrollWidth || 1;
      const size = Math.max(16, Math.floor(Math.min((100 * w * 0.84) / natural, h * 0.62)));
      word.style.fontSize = `${size}px`;
    };

    const render = dir => {
      if (isEnd(run)) { showEnd(); return; }
      word.textContent = run.words[run.index];
      if (deck.mixed) { const g = groupOf(flashDecks, prefs.mode, run.words[run.index]); wrap.style.setProperty('--deck', g ? g.colour : deck.colour); }
      card.setAttribute('aria-label', `${run.words[run.index]}. Next card`);
      count.textContent = counter(run);
      backBtn.disabled = !canBack(run);
      fit();
      if (dir) {
        const name = reduced() ? 'fade' : dir > 0 ? 'slide-next' : 'slide-back';
        card.classList.remove('fade', 'slide-next', 'slide-back');
        void card.offsetWidth; // restart the animation
        card.classList.add(name);
      }
    };
    const go = dir => {
      if (isEnd(run)) return;
      const r = dir > 0 ? next(run) : back(run);
      if (r === run) return;
      run = r;
      render(dir);
    };

    function showEnd() {
      clearScreen();
      const end = el('div', 'flash-end');
      const box = el('div', 'finish-card');
      box.append(el('h2', '', 'All done!'));
      const btns = el('div', 'finish-buttons');
      const again = button('btn btn-primary flash-again', 'Again');
      const other = button('btn btn-teal flash-other', 'Choose another');
      again.addEventListener('click', () => play(deckId));
      other.addEventListener('click', showPicker);
      btns.append(again, other);
      box.append(btns);
      end.append(box);
      root.replaceChildren(end);
      again.focus({ preventScroll: true });
    }

    // Tap the card or a button
    let swiped = false;
    card.addEventListener('click', () => { if (swiped) { swiped = false; return; } go(1); });
    nextBtn.addEventListener('click', () => go(1));
    backBtn.addEventListener('click', () => go(-1));

    // Swipe on the card: left is next, right is back
    let startX = null, startY = 0;
    card.addEventListener('pointerdown', e => { if (e.button !== 0) return; startX = e.clientX; startY = e.clientY; swiped = false; });
    card.addEventListener('pointercancel', () => { startX = null; });
    card.addEventListener('pointerup', e => {
      if (startX === null) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) >= SWIPE_PX && Math.abs(dx) > Math.abs(dy)) { swiped = true; go(dx < 0 ? 1 : -1); setTimeout(() => { swiped = false; }, 400); }
    });

    // Keys: Right or Space next, Left back. Space is taken here so a focused button is not also pressed.
    listen(document, 'keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    });

    listen(window, 'resize', fit);
    if (typeof ResizeObserver === 'function') { const ro = new ResizeObserver(fit); ro.observe(wrap); onScreen(() => ro.disconnect()); }
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (card.isConnected) fit(); });
    render(0);
  }

  showPicker();
  return () => { clearScreen(); container.replaceChildren(); };
}

export default {
  id: 'flashcards',
  title: 'Flashcards',
  icon: 'img/flashcards.svg',
  mount
};
