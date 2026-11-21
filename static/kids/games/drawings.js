// Our pictures: a pairs game with the family's own drawings. Each drawing is dealt
// twice; a found pair shows who drew it. Dealing and flipping are Match's pure
// functions, imported unchanged (deal() gives each drawing a 'picture' and a 'word'
// card, and both are drawn as the picture). Only the DOM below is this game's own.
import { SIZES, FLIP_MS, MISS_MS, deal, newGame, flip, hideMiss, isDone, pairsFound, formatTime, columnsFor } from './match.js';
import { listDrawings, loadImages, release } from '../drawings-store.js';

const STRIP = 6; // thumbnails shown on the setup screen
const TICK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const CONFETTI_COLOURS = ['#0E9AA7', '#FFC93C', '#FF6B6B', '#3DA35D', '#3D348B'];

// Sizes the active drawings can fill; the rest are shown but disabled
export const playableSizes = count => SIZES.filter(n => count >= n);
export const moreNeeded = count => Math.max(0, SIZES[0] - count);

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function mount(container, ctx) {
  const timers = new Set();
  const later = (fn, ms) => { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; };
  let tickTimer = null, resizeObs = null, onResize = null, alive = true;
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };

  const saved = ctx.settings.load();
  let size = SIZES.includes(saved.size) ? saved.size : SIZES[0];
  let drawings = [];        // active drawings, newest first, with thumbnail URLs
  let images = new Map();   // id → full image URL for the current game

  const root = el('div', 'match drawings');
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

  function dropImages() { release([...images.values()]); images = new Map(); }

  function waiting(text) {
    const box = el('div', 'drawings-wait');
    const dots = el('div', 'dots'); dots.setAttribute('aria-hidden', 'true');
    dots.append(el('span'), el('span'), el('span'));
    box.append(dots, el('p', 'message', text));
    root.replaceChildren(box);
  }

  function problem(text, retry) {
    const box = el('div', 'drawings-wait');
    const msg = el('p', 'message', text); msg.setAttribute('role', 'alert');
    const again = el('button', 'btn btn-primary', 'Try again'); again.type = 'button';
    again.addEventListener('click', retry);
    box.append(msg, again);
    root.replaceChildren(box);
  }

  // ── Setup ──
  async function load() {
    stopPlay(); dropImages();
    release(drawings.map(d => d.thumbUrl)); drawings = [];
    waiting('Getting pictures…');
    try {
      const list = await listDrawings();
      if (!alive) { release(list.map(d => d.thumbUrl)); return; }
      drawings = list;
      showSetup();
    } catch (e) {
      console.error('Could not list the drawings:', e && (e.code || e.message));
      if (alive) problem('Could not get the pictures.', load);
    }
  }

  function showSetup() {
    stopPlay(); dropImages();
    const ok = playableSizes(drawings.length);
    if (ok.length && !ok.includes(size)) size = ok.filter(n => n <= size).pop() || ok[0];
    const wrap = el('div', 'match-setup drawings-setup');
    wrap.append(el('h2', '', 'Our pictures'));
    if (drawings.length) {
      const strip = el('div', 'drawings-strip');
      strip.setAttribute('aria-hidden', 'true');
      drawings.slice(0, STRIP).forEach(d => { const img = el('img'); img.src = d.thumbUrl; img.alt = ''; strip.append(img); });
      wrap.append(strip);
    }
    if (!ok.length) {
      const need = moreNeeded(drawings.length);
      wrap.append(el('p', 'message message-big drawings-need', 'Ask a grown-up to add more pictures'));
      if (ctx.role === 'adult') {
        wrap.append(el('p', 'message drawings-need-count',
          `${need} more picture${need === 1 ? '' : 's'} needed. Add them in the grown-ups corner under Our drawings.`));
      }
      root.replaceChildren(wrap);
      return;
    }
    const sizes = el('div', 'match-sizes');
    const render = () => sizes.replaceChildren(...SIZES.map(n => {
      const b = el('button', 'size-btn', `${n} pairs`);
      b.type = 'button'; b.dataset.size = n;
      b.disabled = !ok.includes(n);
      b.setAttribute('aria-pressed', String(n === size));
      b.addEventListener('click', () => { if (ok.includes(n)) { size = n; render(); } });
      return b;
    }));
    render();
    const start = el('button', 'btn btn-primary btn-huge match-start', 'Start');
    start.type = 'button';
    start.addEventListener('click', () => { ctx.settings.save({ size }); play(); });
    wrap.append(el('h2', '', 'Choose a size'), sizes, start);
    root.replaceChildren(wrap);
  }

  // ── Board ──
  async function play() {
    stopPlay(); dropImages();
    const byId = new Map(drawings.map(d => [d.id, d]));
    const cards = deal(drawings.map(d => d.id), size);
    const ids = [...new Set(cards.map(c => c.word))];
    waiting('Getting pictures…');
    let got;
    try { got = await loadImages(ids); }
    catch (e) {
      console.error('Could not load the pictures:', e && (e.code || e.message));
      if (alive) problem('Could not get the pictures.', play);
      return;
    }
    if (!alive) { release([...got.values()]); return; }
    images = got;
    if (ids.some(id => !images.has(id))) { dropImages(); problem('A picture is missing. Ask a grown-up to check Our drawings.', load); return; }

    let state = newGame(cards);
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

    const artistOf = i => byId.get(state.cards[i].word).artist;
    const cardEls = state.cards.map((card, i) => {
      const b = el('button', 'card');
      b.type = 'button'; b.dataset.index = i; b.dataset.drawing = card.word;
      b.setAttribute('aria-label', 'Card');
      const inner = el('span', 'card-inner');
      const back = el('span', 'card-face card-back');
      const backImg = el('img'); backImg.src = 'img/card-back.svg'; backImg.alt = '';
      back.append(backImg);
      const front = el('span', 'card-face card-front');
      const img = el('img'); img.src = images.get(card.word); img.alt = '';
      front.append(img, el('span', 'card-credit', `by ${byId.get(card.word).artist}`));
      inner.append(back, front);
      const tick = el('span', 'tick'); tick.innerHTML = TICK;
      b.append(inner, tick);
      b.addEventListener('click', () => onTap(i));
      board.append(b);
      return b;
    });

    const show = (i, up) => {
      cardEls[i].classList.toggle('up', up);
      cardEls[i].setAttribute('aria-label', up ? `picture${cardEls[i].classList.contains('matched') ? ` by ${artistOf(i)}` : ''}` : 'Card');
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
        state.matched.slice(-2).forEach(k => { cardEls[k].classList.add('matched'); show(k, true); });
        updateProgress();
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
      board.style.setProperty('--credit', `${Math.max(12, Math.min(20, Math.round(cw * 0.12)))}px`);
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

  load();
  return () => {
    alive = false;
    stopPlay();
    dropImages();
    release(drawings.map(d => d.thumbUrl));
    drawings = [];
    container.replaceChildren();
  };
}

export default {
  id: 'drawings',
  title: 'Our pictures',
  icon: 'img/drawings.svg',
  mount
};
