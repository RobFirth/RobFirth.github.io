// Match: a face-down memory game pairing a picture with its word.
// Dealing and matching are pure functions; the DOM code below only renders them.
import { matchSets, pictureFor } from '../data/words.js';

export const SIZES = [6, 8, 10];
export const FLIP_MS = 250;
export const MISS_MS = 1500;

// ── Pure logic ──
export function shuffle(items, rand = Math.random) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const sizesFor = set => SIZES.filter(n => set.words.length >= n);

// 2N cards: each picked word once as a picture and once as a word
export function deal(words, n, rand = Math.random) {
  const picked = shuffle(words, rand).slice(0, n);
  const cards = picked.flatMap(word => [{ word, kind: 'picture' }, { word, kind: 'word' }]);
  return shuffle(cards, rand);
}

export const isMatch = (a, b) => a.word === b.word && a.kind !== b.kind;

export const newGame = cards => ({ cards, up: [], matched: [], locked: false });

// Tap card i. Returns the next state and what happened:
// 'ignored' | 'first' | 'match' | 'miss'. After a miss the state is locked until hideMiss().
export function flip(state, i) {
  if (state.locked || i < 0 || i >= state.cards.length || state.up.includes(i) || state.matched.includes(i)) {
    return { state, result: 'ignored' };
  }
  if (state.up.length === 0) return { state: { ...state, up: [i] }, result: 'first' };
  const j = state.up[0];
  if (isMatch(state.cards[i], state.cards[j])) {
    return { state: { ...state, up: [], matched: [...state.matched, j, i] }, result: 'match' };
  }
  return { state: { ...state, up: [j, i], locked: true }, result: 'miss' };
}
export const hideMiss = state => ({ ...state, up: [], locked: false });
export const isDone = state => state.matched.length === state.cards.length;
export const pairsFound = state => state.matched.length / 2;

export function formatTime(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

// Columns: 4 in portrait; in landscape 4 for 12 and 16 cards, 5 for 20
export const columnsFor = (count, landscape) => (landscape && count >= 20 ? 5 : 4);

// ── DOM ──
const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CONFETTI_COLOURS = ['#0E9AA7', '#FFC93C', '#FF6B6B', '#3DA35D', '#3D348B'];

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function mount(container, ctx) {
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  let tickTimer = null, resizeObs = null, onResize = null;
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  const saved = ctx.settings.load();
  let setId = matchSets.some(s => s.id === saved.set) ? saved.set : matchSets[0].id;
  let size = SIZES.includes(saved.size) ? saved.size : SIZES[0];
  const currentSet = () => matchSets.find(s => s.id === setId);
  const fitSize = () => { const ok = sizesFor(currentSet()); if (!ok.includes(size)) size = ok.filter(n => n <= size).pop() || ok[0]; };

  const root = el('div', 'match');
  container.replaceChildren(root);

  function stopPlay() {
    timers.forEach(clearTimeout); timers.clear();
    if (tickTimer) clearInterval(tickTimer);
    tickTimer = null;
    if (resizeObs) resizeObs.disconnect();
    resizeObs = null;
    if (onResize) window.removeEventListener('resize', onResize);
    onResize = null;
  }

  // ── Setup screen ──
  function showSetup() {
    stopPlay();
    fitSize();
    const wrap = el('div', 'match-setup');
    const sets = el('div', 'match-sets');
    const sizes = el('div', 'match-sizes');
    const render = () => {
      sets.querySelectorAll('.set-tile').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.set === setId)));
      sizes.replaceChildren(...sizesFor(currentSet()).map(n => {
        const b = el('button', 'size-btn', `${n} pairs`);
        b.type = 'button'; b.dataset.size = n;
        b.setAttribute('aria-pressed', String(n === size));
        b.addEventListener('click', () => { size = n; render(); });
        return b;
      }));
    };
    matchSets.forEach(set => {
      const b = el('button', 'set-tile');
      b.type = 'button'; b.dataset.set = set.id;
      b.setAttribute('aria-label', `sounds ${set.label}`);
      const pics = el('span', 'set-pics');
      set.words.slice(0, 3).forEach(w => { const img = el('img'); img.src = pictureFor(w); img.alt = ''; pics.append(img); });
      b.append(el('span', 'set-label', set.label), pics);
      b.addEventListener('click', () => { setId = set.id; fitSize(); render(); });
      sets.append(b);
    });
    const start = el('button', 'btn btn-primary btn-huge match-start', 'Start');
    start.type = 'button';
    start.addEventListener('click', () => { ctx.settings.save({ set: setId, size }); play(); });
    wrap.append(el('h2', '', 'Choose a set'), sets, el('h2', '', 'Choose a size'), sizes, start);
    render();
    root.replaceChildren(wrap);
  }

  // ── Board ──
  function play() {
    stopPlay();
    const set = currentSet();
    let state = newGame(deal(set.words, size));
    const total = size;
    let startedAt = 0;

    const bar = el('div', 'match-bar');
    const progress = el('div', 'match-progress');
    const track = el('div', 'progress-track');
    const fill = el('div', 'progress-fill');
    const ptext = el('span', 'progress-text');
    track.append(fill);
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'pairs found');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(total));
    progress.append(track, ptext);
    bar.append(progress);
    let timerEl = null;
    if (ctx.settings.timer) { timerEl = el('div', 'match-timer', '0:00'); timerEl.setAttribute('aria-label', 'time'); bar.append(timerEl); }

    const boardWrap = el('div', 'match-board-wrap');
    const board = el('div', 'match-board');
    boardWrap.append(board);
    root.replaceChildren(bar, boardWrap);

    const updateProgress = () => {
      const n = pairsFound(state);
      fill.style.width = `${(n / total) * 100}%`;
      ptext.textContent = `${n} / ${total}`;
      track.setAttribute('aria-valuenow', String(n));
    };
    updateProgress();

    const cardEls = state.cards.map((card, i) => {
      const b = el('button', 'card');
      b.type = 'button'; b.dataset.index = i; b.dataset.kind = card.kind; b.dataset.word = card.word;
      b.setAttribute('aria-label', 'Card');
      const inner = el('span', 'card-inner');
      const back = el('span', 'card-face card-back');
      const backImg = el('img'); backImg.src = 'img/card-back.svg'; backImg.alt = '';
      back.append(backImg);
      const front = el('span', 'card-face card-front');
      if (card.kind === 'picture') { const img = el('img'); img.src = pictureFor(card.word); img.alt = ''; front.append(img); }
      else front.append(el('span', 'card-word', card.word));
      inner.append(back, front);
      const tick = el('span', 'tick'); tick.innerHTML = TICK;
      b.append(inner, tick);
      b.addEventListener('click', () => onTap(i));
      board.append(b);
      return b;
    });

    const faceUpLabel = c => (c.kind === 'picture' ? `picture of ${c.word}` : c.word);
    const show = (i, up) => {
      cardEls[i].classList.toggle('up', up);
      cardEls[i].setAttribute('aria-label', up ? faceUpLabel(state.cards[i]) : 'Card');
    };

    function startTimer() {
      startedAt = Date.now();
      if (!timerEl) return;
      tickTimer = setInterval(() => { timerEl.textContent = formatTime(Date.now() - startedAt); }, 250);
    }

    function onTap(i) {
      const r = flip(state, i);
      if (r.result === 'ignored') return;
      if (!startedAt) startTimer();
      state = r.state;
      show(i, true);
      if (r.result === 'match') {
        state.matched.slice(-2).forEach(k => cardEls[k].classList.add('matched'));
        updateProgress();
        if (ctx.settings.sound) { try { if (ctx.canSpeak()) ctx.say(state.cards[i].word); } catch (e) { /* speech is a bonus */ } }
        if (isDone(state)) finish();
      } else if (r.result === 'miss') {
        const pair = state.up.slice();
        board.dataset.locked = 'true';
        later(() => {
          pair.forEach(k => show(k, false));
          later(() => { state = hideMiss(state); delete board.dataset.locked; }, FLIP_MS);
        }, MISS_MS);
      }
    }

    // Size cards from the space available
    const layout = () => {
      const w = boardWrap.clientWidth, h = boardWrap.clientHeight - parseFloat(getComputedStyle(boardWrap).paddingTop || 0);
      if (!w || !h) return;
      const count = state.cards.length;
      const cols = columnsFor(count, window.innerWidth > window.innerHeight);
      const rows = Math.ceil(count / cols);
      const gap = Math.max(6, Math.min(14, Math.round(Math.min(w, h) / 60)));
      let cw = (w - gap * (cols - 1)) / cols, ch = (h - gap * (rows - 1)) / rows;
      if (cw > ch * 1.2) cw = ch * 1.2;
      if (ch > cw * 1.3) ch = cw * 1.3;
      cw = Math.floor(cw); ch = Math.floor(ch);
      board.style.setProperty('--gap', `${gap}px`);
      board.style.gridTemplateColumns = `repeat(${cols}, ${cw}px)`;
      board.style.setProperty('--card-w', `${cw}px`);
      board.style.setProperty('--card-h', `${ch}px`);
      board.querySelectorAll('.card-word').forEach(span => {
        const len = Math.max(span.textContent.length, 2);
        span.style.fontSize = `${Math.floor(Math.min(ch * 0.42, (cw * 0.82) / (len * 0.56)))}px`;
      });
    };
    layout();
    if (typeof ResizeObserver === 'function') { resizeObs = new ResizeObserver(layout); resizeObs.observe(boardWrap); }
    onResize = layout;
    window.addEventListener('resize', onResize);

    function finish() {
      const elapsed = Date.now() - startedAt;
      if (tickTimer) clearInterval(tickTimer);
      tickTimer = null;
      if (timerEl) timerEl.textContent = formatTime(elapsed);
      const showCard = () => {
        const overlay = el('div', 'match-finish');
        const card = el('div', 'finish-card');
        card.append(el('h2', '', `You found all ${total} pairs!`));
        if (timerEl) card.append(el('p', 'finish-time', `Time ${formatTime(elapsed)}`));
        const btns = el('div', 'finish-buttons');
        const again = el('button', 'btn btn-primary', 'Play again'); again.type = 'button';
        const other = el('button', 'btn btn-teal', 'Choose another'); other.type = 'button';
        again.addEventListener('click', play);
        other.addEventListener('click', showSetup);
        btns.append(again, other);
        card.append(btns);
        overlay.append(card);
        root.append(overlay);
        again.focus({ preventScroll: true });
      };
      if (reduced()) { later(showCard, FLIP_MS); return; }
      root.append(confetti());
      later(showCard, 1500);
    }
  }

  function confetti() {
    const box = el('div', 'confetti');
    box.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 48; i++) {
      const p = el('i', i % 3 === 0 ? 'round' : '');
      p.style.left = `${Math.random() * 100}%`;
      p.style.background = CONFETTI_COLOURS[i % CONFETTI_COLOURS.length];
      p.style.setProperty('--delay', `${(Math.random() * 0.4).toFixed(2)}s`);
      p.style.setProperty('--dur', `${(1 + Math.random() * 0.6).toFixed(2)}s`);
      p.style.setProperty('--dx', `${Math.round((Math.random() - 0.5) * 160)}px`);
      p.style.setProperty('--rot', `${Math.round(360 + Math.random() * 540)}deg`);
      box.append(p);
    }
    later(() => box.remove(), 2200);
    return box;
  }

  showSetup();
  return () => { stopPlay(); container.replaceChildren(); };
}

export default {
  id: 'match',
  title: 'Match',
  icon: 'img/match.svg',
  mount
};
