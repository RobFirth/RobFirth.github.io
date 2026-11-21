// "Our drawings": the adults' screen for the Our pictures game. Add a picture (choose
// or take a photo, crop it square, say who drew it), and hide, rename or delete one.
// The shell mounts this only for an adult account; the rules refuse anyone else's writes.
import {
  listDrawings, loadImages, release, addDrawing, setActive, setArtist, deleteDrawing,
  distinctNames, matchName, nameError, cleanName, openPhoto, fitCrop, rotatedSize, drawSquare, ARTIST_MAX
} from './drawings-store.js';

const ZOOM_MAX = 4;

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}
function button(text, cls = 'btn btn-plain') { const b = el('button', cls, text); b.type = 'button'; return b; }

export const countText = list => {
  const n = list.length, shown = list.filter(d => d.active).length;
  return `${n} picture${n === 1 ? '' : 's'}, ${shown} showing`;
};

// One plain line for anything that goes wrong while saving
function plain(e) {
  const code = (e && e.code) || '';
  if (code.includes('permission')) return 'That was not allowed. Sign in again as a grown-up and try again.';
  if (code.includes('unavailable') || (typeof navigator !== 'undefined' && navigator.onLine === false)) return 'You seem to be offline. Try again when you are connected.';
  return (e && e.message && !code) ? e.message : 'That did not save. Please try again.';
}

export function mountDrawingsAdmin(container) {
  let list = [], alive = true, panelCleanup = null;
  const root = el('div', 'drawings-admin');
  const head = el('div', 'admin-head');
  const count = el('p', 'admin-count');
  const add = button('Add picture', 'btn btn-primary admin-add');
  const file = el('input'); file.type = 'file'; file.accept = 'image/*'; file.className = 'sr-only'; file.tabIndex = -1;
  file.setAttribute('aria-hidden', 'true');
  head.append(count, add, file);
  const msg = el('p', 'message admin-msg'); msg.setAttribute('role', 'alert');
  const grid = el('div', 'admin-grid');
  root.append(head, msg, grid);
  container.replaceChildren(root);

  async function refresh() {
    try {
      const next = await listDrawings({ includeHidden: true });
      if (!alive) { release(next.map(d => d.thumbUrl)); return; }
      release(list.map(d => d.thumbUrl));
      list = next;
      render();
    } catch (e) {
      console.error('Could not list the drawings:', e && (e.code || e.message));
      if (alive) msg.textContent = 'Could not get the pictures. Please try again.';
    }
  }

  function render() {
    count.textContent = countText(list);
    grid.replaceChildren(...list.map(d => {
      const b = el('button', `admin-tile${d.active ? '' : ' is-hidden'}`);
      b.type = 'button'; b.dataset.id = d.id;
      const img = el('img'); img.src = d.thumbUrl; img.alt = `picture by ${d.artist}`;
      b.append(img, el('span', 'admin-artist', d.artist));
      if (!d.active) b.append(el('span', 'admin-hidden-tag', 'Hidden'));
      b.addEventListener('click', () => openDetail(d));
      return b;
    }));
    if (!list.length) grid.append(el('p', 'message admin-empty', 'No pictures yet. Add the first one.'));
  }

  // ── Panels ──
  function panel(build) {
    closePanel();
    const wrap = el('div', 'admin-panel-wrap');
    const box = el('div', 'admin-panel');
    box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
    wrap.append(box);
    root.append(wrap);
    panelCleanup = build(box) || null;
    const first = box.querySelector('button:not([disabled]), input');
    if (first) first.focus({ preventScroll: true });
  }
  function closePanel() {
    if (panelCleanup) { try { panelCleanup(); } catch (e) { /* nothing to undo */ } }
    panelCleanup = null;
    root.querySelectorAll('.admin-panel-wrap').forEach(w => w.remove());
  }

  // "Drawn by": chips of existing names, or a new one (matched ignoring case)
  function namePicker(box, initial) {
    const names = distinctNames(list);
    let chosen = initial || '';
    const wrap = el('div', 'name-picker');
    const chips = el('div', 'name-chips');
    const input = el('input', 'name-input'); input.type = 'text'; input.maxLength = ARTIST_MAX; input.autocomplete = 'off';
    input.placeholder = 'New name'; input.setAttribute('aria-label', 'New name');
    const sync = () => chips.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', String(c.dataset.name === chosen && !cleanName(input.value))));
    names.forEach(n => {
      const c = button(n, 'chip'); c.dataset.name = n;
      c.addEventListener('click', () => { chosen = n; input.value = ''; sync(); });
      chips.append(c);
    });
    input.addEventListener('input', sync);
    if (names.length) wrap.append(chips);
    wrap.append(input);
    box.append(wrap);
    sync();
    return { value: () => (cleanName(input.value) ? matchName(input.value, names) : chosen) };
  }

  // ── Add: choose a photo → crop → drawn by → save ──
  add.addEventListener('click', () => { file.value = ''; file.click(); });
  file.addEventListener('change', async () => {
    const f = file.files && file.files[0];
    if (!f) return;
    msg.textContent = '';
    let bitmap;
    try { bitmap = await openPhoto(f); }
    catch (e) { msg.textContent = 'That file could not be opened as a picture.'; return; }
    if (!alive) { bitmap.close(); return; }
    cropStep(bitmap);
  });

  function cropStep(bitmap, startCrop) {
    panel(box => {
      const base = c => Math.max(rotatedSize(bitmap.width, bitmap.height, c.rotate).w, rotatedSize(bitmap.width, bitmap.height, c.rotate).h);
      let crop = startCrop || fitCrop(bitmap.width, bitmap.height);
      box.append(el('h2', '', 'Crop the picture'));
      const frame = el('div', 'crop-frame');
      const canvas = el('canvas', 'crop-canvas');
      frame.append(canvas);
      const zoomLabel = el('label', 'crop-zoom');
      zoomLabel.append(el('span', '', 'Zoom'));
      const zoom = el('input'); zoom.type = 'range'; zoom.min = '1'; zoom.max = String(ZOOM_MAX); zoom.step = '0.01';
      zoom.value = String(base(crop) / crop.side);
      zoomLabel.append(zoom);
      const turn = button('Turn ↻', 'btn btn-plain crop-turn');
      turn.setAttribute('aria-label', 'Turn a quarter turn');
      const tools = el('div', 'crop-tools'); tools.append(zoomLabel, turn);
      const next = button('Next', 'btn btn-primary'), cancel = button('Cancel');
      const btns = el('div', 'admin-buttons'); btns.append(next, cancel);
      box.append(frame, tools, btns);

      let raf = 0;
      const draw = () => { raf = 0; const px = Math.round(frame.clientWidth * (window.devicePixelRatio || 1)); if (px) drawSquare(canvas, bitmap, crop, px); };
      const redraw = () => { if (!raf) raf = requestAnimationFrame(draw); };
      const clampCentre = () => {
        const r = rotatedSize(bitmap.width, bitmap.height, crop.rotate);
        crop.cx = Math.min(r.w, Math.max(0, crop.cx)); crop.cy = Math.min(r.h, Math.max(0, crop.cy));
      };
      zoom.addEventListener('input', () => { crop = { ...crop, side: base(crop) / Number(zoom.value) }; redraw(); });
      turn.addEventListener('click', () => { crop = fitCrop(bitmap.width, bitmap.height, (crop.rotate + 90) % 360); zoom.value = '1'; redraw(); });
      // Drag to move: the picture follows the finger
      let drag = null;
      frame.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; try { frame.setPointerCapture(e.pointerId); } catch (err) { /* moves still arrive */ } });
      frame.addEventListener('pointermove', e => {
        if (!drag) return;
        const k = crop.side / frame.clientWidth;
        crop = { ...crop, cx: crop.cx - (e.clientX - drag.x) * k, cy: crop.cy - (e.clientY - drag.y) * k };
        clampCentre(); drag = { x: e.clientX, y: e.clientY }; redraw();
      });
      ['pointerup', 'pointercancel'].forEach(t => frame.addEventListener(t, () => { drag = null; }));
      next.addEventListener('click', () => nameStep(bitmap, { ...crop }));
      cancel.addEventListener('click', () => { bitmap.close(); closePanel(); });
      draw();
      const obs = typeof ResizeObserver === 'function' ? new ResizeObserver(redraw) : null;
      if (obs) obs.observe(frame);
      root.__crop = () => crop; // read by the harness
      return () => { if (raf) cancelAnimationFrame(raf); if (obs) obs.disconnect(); delete root.__crop; };
    });
  }

  function nameStep(bitmap, crop) {
    let done = false;
    panel(box => {
      box.append(el('h2', '', 'Drawn by'));
      const picker = namePicker(box, '');
      const err = el('p', 'message admin-panel-msg'); err.setAttribute('role', 'alert');
      const save = button('Save', 'btn btn-primary'), back = button('Back');
      const btns = el('div', 'admin-buttons'); btns.append(save, back);
      box.append(err, btns);
      back.addEventListener('click', () => { done = true; cropStep(bitmap, crop); });
      save.addEventListener('click', async () => {
        const name = picker.value(), problem = nameError(name);
        if (problem) { err.textContent = problem; return; }
        err.textContent = ''; save.disabled = back.disabled = true; save.textContent = 'Saving…';
        try {
          await addDrawing({ file: bitmap, artist: name, crop });
          done = true; bitmap.close();
          if (!alive) return;
          closePanel(); msg.textContent = '';
          await refresh();
        } catch (e) {
          console.error('Could not add the drawing:', e && (e.code || e.message));
          if (!alive) return;
          err.textContent = plain(e); save.disabled = back.disabled = false; save.textContent = 'Save';
        }
      });
      return () => { if (!done) bitmap.close(); };
    });
  }

  // ── A drawing: larger view, hide/show, change name, delete ──
  function openDetail(d) {
    let imageUrl = null, gone = false;
    panel(box => {
      const img = el('img', 'admin-big'); img.src = d.thumbUrl; img.alt = `picture by ${d.artist}`;
      const title = el('h2', 'admin-big-title', `by ${d.artist}`);
      const state = el('p', 'admin-state', d.active ? 'Showing in the game' : 'Hidden from the game');
      const err = el('p', 'message admin-panel-msg'); err.setAttribute('role', 'alert');
      const area = el('div', 'admin-detail-area');
      box.append(img, title, state, err, area);
      loadImages([d.id]).then(m => { imageUrl = m.get(d.id) || null; if (gone) { if (imageUrl) release([imageUrl]); } else if (imageUrl) img.src = imageUrl; })
        .catch(() => { /* the thumbnail stays */ });

      const busy = (on, b) => area.querySelectorAll('button').forEach(x => { x.disabled = on; if (b && x === b) x.dataset.busy = on ? '1' : ''; });
      const run = async (fn, b) => {
        err.textContent = ''; busy(true, b);
        try { await fn(); if (!alive) return; closePanel(); await refresh(); }
        catch (e) { console.error('Could not change the drawing:', e && (e.code || e.message)); if (alive) { err.textContent = plain(e); busy(false); } }
      };

      const actions = () => {
        const hide = button(d.active ? 'Hide' : 'Show', 'btn btn-plain admin-toggle');
        const rename = button('Change name', 'btn btn-plain admin-rename');
        const del = button('Delete', 'btn btn-plain admin-delete');
        const close = button('Close', 'btn btn-primary admin-close');
        hide.addEventListener('click', () => run(() => setActive(d.id, !d.active), hide));
        rename.addEventListener('click', renameView);
        del.addEventListener('click', confirmView);
        close.addEventListener('click', closePanel);
        const btns = el('div', 'admin-buttons'); btns.append(hide, rename, del, close);
        area.replaceChildren(btns);
      };
      // Asked in the page, not with confirm()
      const confirmView = () => {
        const q = el('p', 'admin-confirm', 'Delete this picture? This cannot be undone.');
        const yes = button('Delete', 'btn admin-delete-yes'), no = button('Keep', 'btn btn-plain admin-delete-no');
        yes.addEventListener('click', () => run(() => deleteDrawing(d.id), yes));
        no.addEventListener('click', actions);
        const btns = el('div', 'admin-buttons'); btns.append(yes, no);
        area.replaceChildren(q, btns);
        no.focus({ preventScroll: true });
      };
      const renameView = () => {
        area.replaceChildren();
        const picker = namePicker(area, d.artist);
        const save = button('Save name', 'btn btn-primary admin-rename-save'), cancel = button('Cancel', 'btn btn-plain admin-rename-cancel');
        save.addEventListener('click', () => {
          const name = picker.value(), problem = nameError(name);
          if (problem) { err.textContent = problem; return; }
          if (name === d.artist) { actions(); return; }
          run(() => setArtist(d.id, name), save);
        });
        cancel.addEventListener('click', actions);
        const btns = el('div', 'admin-buttons'); btns.append(save, cancel);
        area.append(btns);
      };
      actions();
      return () => { gone = true; if (imageUrl) release([imageUrl]); };
    });
  }

  refresh();
  return () => { alive = false; closePanel(); release(list.map(d => d.thumbUrl)); list = []; container.replaceChildren(); };
}
