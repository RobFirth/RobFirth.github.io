// Kids page shell: sign-in, role routing, menu, game host, settings, speech helper.
// Games are self-contained modules registered below. A game gets only the ctx object.
import { matchSets, pictureFor } from './data/words.js';
import match from './games/match.js';
import flashcards from './games/flashcards.js';

// Registry: adding a game is one file, one import and one entry here.
const GAMES = [match, flashcards];

// ── Firebase (public web config, duplicated from the family page by design) ──
const firebaseConfig = {
  apiKey:            "AIzaSyCJnQMozwTpWT0QTd2Nd_e4XZpuqi1HRCs",
  authDomain:        "family-project-490909.firebaseapp.com",
  projectId:         "family-project-490909",
  storageBucket:     "family-project-490909.appspot.com",
  messagingSenderId: "777532140341",
  appId:             "1:777532140341:web:a061c843351a58aed9ba7c"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();

const $ = id => document.getElementById(id);
const VIEWS = ['loading', 'signin', 'norole', 'menu', 'game', 'sheet'];
function showView(name) {
  VIEWS.forEach(v => $('view-' + v).classList.toggle('hidden', v !== name));
}

// ── Settings: one localStorage key, in-memory fallback, nothing personal ──
const SETTINGS_KEY = 'kids-settings';
const DEFAULTS = { sound: true, timer: true, games: {} };
let memorySettings = null;
function loadSettings() {
  let s = memorySettings;
  try { const raw = localStorage.getItem(SETTINGS_KEY); if (raw) s = JSON.parse(raw); } catch (e) { /* storage blocked or bad JSON */ }
  s = s && typeof s === 'object' ? s : {};
  return {
    sound: typeof s.sound === 'boolean' ? s.sound : DEFAULTS.sound,
    timer: typeof s.timer === 'boolean' ? s.timer : DEFAULTS.timer,
    games: s.games && typeof s.games === 'object' ? s.games : {}
  };
}
function saveSettings(s) {
  memorySettings = s;
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(s)); } catch (e) { /* keep the in-memory copy */ }
}
function updateSettings(patch) { const s = { ...loadSettings(), ...patch }; saveSettings(s); return s; }

// ── Speech helper: never throws, nothing depends on it ──
let voice = null;
function pickVoice() {
  try {
    const voices = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
    voice = voices.find(v => /^en[-_]GB$/i.test(v.lang)) || voices.find(v => /^en\b/i.test(v.lang)) || null;
  } catch (e) { voice = null; }
}
try {
  if (window.speechSynthesis) {
    pickVoice();
    if (speechSynthesis.addEventListener) speechSynthesis.addEventListener('voiceschanged', pickVoice);
    else speechSynthesis.onvoiceschanged = pickVoice;
  }
} catch (e) { voice = null; }
function canSpeak() {
  try { if (!voice) pickVoice(); return !!voice && typeof SpeechSynthesisUtterance === 'function'; } catch (e) { return false; }
}
function say(word) {
  try {
    if (!canSpeak()) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(String(word));
    u.voice = voice; u.lang = voice.lang; u.rate = 0.8;
    speechSynthesis.speak(u);
  } catch (e) { /* speech is a bonus */ }
}

// ── Role: a custom claim on the ID token, refreshed once if missing ──
const ROLES = ['adult', 'child'];
async function readRole(user) {
  const claim = async () => (await user.getIdTokenResult()).claims.role;
  try {
    let role = await claim();
    if (!ROLES.includes(role)) { await user.getIdToken(true); role = await claim(); }
    return ROLES.includes(role) ? role : null;
  } catch (e) {
    console.warn('Could not read the account role:', e && (e.code || e.message));
    return null;
  }
}

// ── State ──
let currentRole = null;
let cleanupGame = null;
let authSeq = 0;

function stopGame() {
  if (cleanupGame) { try { cleanupGame(); } catch (e) { console.error('Game cleanup failed:', e); } }
  cleanupGame = null;
  $('game-root').replaceChildren();
}

auth.onAuthStateChanged(async user => {
  const seq = ++authSeq;
  stopGame(); closeCorner();
  if (!user) { currentRole = null; showView('signin'); return; }
  showView('loading');
  const role = await readRole(user);
  if (seq !== authSeq) return; // signed out or changed meanwhile
  currentRole = role;
  if (!role) { showView('norole'); return; }
  showMenu(user);
});

// ── Sign in / out ──
$('btn-signin').addEventListener('click', async () => {
  const msg = $('signin-msg');
  msg.textContent = '';
  try {
    await auth.signInWithPopup(provider);
  } catch (err) {
    const code = err && err.code, text = (err && err.message) || '';
    if (code === 'auth/internal-error' || text.includes('BLOCKING_FUNCTION_ERROR') || text.includes('PERMISSION_DENIED')) {
      msg.textContent = 'This page is for family. Ask a grown-up.';
    } else if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
      // closed the popup: nothing to say
    } else {
      console.warn('Sign-in error:', code || text);
      msg.textContent = 'That did not work. Please try again.';
    }
  }
});
function signOut() { closeCorner(); try { auth.signOut(); } catch (e) { console.error(e); } }
$('btn-norole-signout').addEventListener('click', signOut);
$('corner-signout').addEventListener('click', signOut);

// ── Menu ──
function showMenu(user) {
  const user_ = user || auth.currentUser;
  const first = user_ && user_.displayName ? user_.displayName.trim().split(/\s+/)[0] : '';
  $('hello').textContent = first ? `Hello, ${first}` : 'Hello';
  const tiles = $('game-tiles');
  tiles.replaceChildren(...GAMES.map(game => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'tile'; b.dataset.game = game.id;
    const img = document.createElement('img');
    img.src = game.icon; img.alt = '';
    const span = document.createElement('span');
    span.textContent = game.title;
    b.append(img, span);
    b.addEventListener('click', () => startGame(game));
    return b;
  }));
  showView('menu');
}

// ── Game host ──
function startGame(game) {
  stopGame();
  const root = $('game-root');
  const s = loadSettings();
  const settings = Object.freeze({
    sound: s.sound,
    timer: s.timer,
    load: () => { const g = loadSettings().games[game.id]; return g && typeof g === 'object' ? { ...g } : {}; },
    save: obj => { const all = loadSettings(); updateSettings({ games: { ...all.games, [game.id]: { ...obj } } }); }
  });
  const ctx = Object.freeze({ exit: goHome, settings, say, canSpeak });
  showView('game');
  try {
    const cleanup = game.mount(root, ctx);
    cleanupGame = typeof cleanup === 'function' ? cleanup : null;
  } catch (e) {
    console.error('Game failed to start:', e);
    goHome();
  }
}
function goHome() { stopGame(); if (currentRole) showMenu(); else showView('signin'); }
$('btn-home').addEventListener('click', goHome);

// ── Grown-ups corner: opens only after a 2 s press-and-hold ──
const HOLD_MS = 2000;
const cog = $('btn-cog');
let holdTimer = null;
function startHold(e) {
  if (e.type === 'keydown') { if (e.repeat || (e.key !== 'Enter' && e.key !== ' ')) return; e.preventDefault(); }
  if (e.type === 'pointerdown' && e.button !== 0) return;
  cancelHold();
  cog.classList.add('holding');
  holdTimer = setTimeout(() => { holdTimer = null; cog.classList.remove('holding'); openCorner(); }, HOLD_MS);
}
function cancelHold() {
  if (holdTimer) clearTimeout(holdTimer);
  holdTimer = null;
  cog.classList.remove('holding');
}
cog.addEventListener('pointerdown', startHold);
cog.addEventListener('keydown', startHold);
['pointerup', 'pointerleave', 'pointercancel', 'blur'].forEach(t => cog.addEventListener(t, cancelHold));
cog.addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') cancelHold(); });
cog.addEventListener('contextmenu', e => e.preventDefault());
cog.addEventListener('click', e => e.preventDefault()); // a tap does nothing

function renderCorner() {
  const s = loadSettings();
  $('set-sound').setAttribute('aria-pressed', String(s.sound));
  $('set-timer').setAttribute('aria-pressed', String(s.timer));
  document.querySelectorAll('.adult-only').forEach(el => el.classList.toggle('hidden', currentRole !== 'adult'));
}
function openCorner() {
  if (!currentRole) return;
  renderCorner();
  $('corner').classList.remove('hidden');
  $('corner-close').focus();
}
function closeCorner() {
  const c = $('corner');
  if (c.classList.contains('hidden')) return;
  c.classList.add('hidden');
  if (!$('view-menu').classList.contains('hidden')) cog.focus();
}
$('set-sound').addEventListener('click', () => { updateSettings({ sound: !loadSettings().sound }); renderCorner(); });
$('set-timer').addEventListener('click', () => { updateSettings({ timer: !loadSettings().timer }); renderCorner(); });
$('corner-close').addEventListener('click', closeCorner);
$('corner').addEventListener('click', e => { if (e.target === e.currentTarget) closeCorner(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCorner(); });
$('corner-sheet').addEventListener('click', () => { if (currentRole === 'adult') { closeCorner(); showSheet(); } });

// ── Picture sheet (adults only) ──
function showSheet() {
  const body = $('sheet-body');
  body.replaceChildren(...matchSets.map(set => {
    const section = document.createElement('section');
    section.className = 'sheet-set';
    const h = document.createElement('h2');
    h.textContent = set.label;
    const grid = document.createElement('div');
    grid.className = 'sheet-grid';
    grid.append(...set.words.map(word => {
      const fig = document.createElement('figure');
      const img = document.createElement('img');
      img.src = pictureFor(word); img.alt = `picture of ${word}`;
      const cap = document.createElement('figcaption');
      cap.textContent = word;
      fig.append(img, cap);
      return fig;
    }));
    section.append(h, grid);
    return section;
  }));
  showView('sheet');
  $('view-sheet').scrollTop = 0;
}
$('btn-sheet-home').addEventListener('click', () => showMenu());
