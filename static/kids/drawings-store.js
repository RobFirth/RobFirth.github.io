// Our pictures: drawings kept as Firestore bytes, so the security rules apply to
// every read (no download URLs). Two documents share an id: `kids_drawings` is the
// small listing (thumbnail, artist, shown or hidden), `kids_drawing_images` the full
// card image, fetched only for the drawings dealt into a game.
// Plain ES module; uses the global compat `firebase` the shell has initialised.

const LIST = 'kids_drawings';
const IMAGES = 'kids_drawing_images';
export const IMAGE_PX = 512;
export const THUMB_PX = 160;
export const IMAGE_MAX = 400000; // bytes, as the rules allow
export const THUMB_MAX = 20000;
export const ARTIST_MAX = 40;
const QUALITIES = [0.85, 0.75, 0.6]; // stepped down only if a picture is over its limit

const db = () => firebase.firestore();
const uid = () => (firebase.auth().currentUser || {}).uid;
const now = () => firebase.firestore.FieldValue.serverTimestamp();

// ── Object URLs: every one made here is tracked until release() ──
const made = new Set();

// WebP or JPEG, from the first bytes (the type isn't stored)
export function sniffType(u8) {
  const s = (a, b) => String.fromCharCode(...u8.slice(a, b));
  if (u8.length > 12 && s(0, 4) === 'RIFF' && s(8, 12) === 'WEBP') return 'image/webp';
  if (u8.length > 2 && u8[0] === 0xFF && u8[1] === 0xD8) return 'image/jpeg';
  return 'application/octet-stream';
}

function urlFor(fsBlob) {
  const u8 = fsBlob.toUint8Array();
  const url = URL.createObjectURL(new Blob([u8], { type: sniffType(u8) }));
  made.add(url);
  return url;
}

// Revoke object URLs made here: the given ones, or all of them
export function release(urls) {
  for (const u of urls || [...made]) { if (made.delete(u)) URL.revokeObjectURL(u); }
}

export const liveUrlCount = () => made.size;

// ── Names ──
export const cleanName = s => String(s || '').trim().replace(/\s+/g, ' ');

// Distinct names, ignoring case; the newest spelling wins. `drawings` newest first.
export function distinctNames(drawings) {
  const seen = new Map();
  for (const d of drawings) { const k = d.artist.toLowerCase(); if (!seen.has(k)) seen.set(k, d.artist); }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

// A typed name, matched to an existing one ignoring case
export function matchName(typed, names) {
  const t = cleanName(typed);
  return names.find(n => n.toLowerCase() === t.toLowerCase()) || t;
}

export function nameError(name) {
  const n = cleanName(name);
  if (!n) return 'Please choose or type a name.';
  if (n.length > ARTIST_MAX) return `Names can be up to ${ARTIST_MAX} letters.`;
  return '';
}

// ── Reading ──
const millis = ts => (ts && ts.toMillis ? ts.toMillis() : Infinity); // a pending write sorts first

// [{ id, artist, active, thumbUrl }], newest first
export async function listDrawings({ includeHidden = false } = {}) {
  const snap = await db().collection(LIST).get();
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .filter(d => includeHidden || d.active === true)
    .sort((a, b) => millis(b.createdAt) - millis(a.createdAt))
    .map(d => ({ id: d.id, artist: d.artist, active: d.active === true, thumbUrl: urlFor(d.thumb) }));
}

// Map<id, objectUrl> of full images, fetched in parallel. A missing image is left out.
export async function loadImages(ids) {
  const docs = await Promise.all(ids.map(id => db().collection(IMAGES).doc(id).get()));
  const map = new Map();
  docs.forEach((d, i) => { const data = d.exists && d.data(); if (data && data.image) map.set(ids[i], urlFor(data.image)); });
  return map;
}

export async function artistNames() {
  const list = await listDrawings({ includeHidden: true });
  const names = distinctNames(list);
  release(list.map(d => d.thumbUrl));
  return names;
}

// ── Pictures: crop, rotate, square, re-encode ──
// A crop is { rotate: 0|90|180|270, cx, cy, side } in the rotated photo's pixels:
// the centre and side of the square. The square may reach past the photo; that
// part is white. Drawing to a canvas and re-encoding drops all photo metadata.
export const rotatedSize = (w, h, rotate) => (rotate % 180 ? { w: h, h: w } : { w, h });

// The starting crop: the whole photo fits inside the square
export function fitCrop(w, h, rotate = 0) {
  const r = rotatedSize(w, h, rotate);
  return { rotate, cx: r.w / 2, cy: r.h / 2, side: Math.max(r.w, r.h) };
}

export function drawSquare(canvas, bitmap, crop, px) {
  canvas.width = px; canvas.height = px;
  const g = canvas.getContext('2d');
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.fillStyle = '#FFFFFF';
  g.fillRect(0, 0, px, px);
  const w = bitmap.width, h = bitmap.height, r = rotatedSize(w, h, crop.rotate), k = px / crop.side;
  g.imageSmoothingQuality = 'high';
  g.setTransform(k, 0, 0, k, px / 2 - crop.cx * k, px / 2 - crop.cy * k); // rotated-photo pixels → canvas
  g.translate(r.w / 2, r.h / 2);
  g.rotate((crop.rotate * Math.PI) / 180);
  g.drawImage(bitmap, -w / 2, -h / 2);
  g.setTransform(1, 0, 0, 1, 0, 0);
}

const toBlob = (canvas, type, q) => new Promise(res => canvas.toBlob(res, type, q));

// WebP if the browser can make it, else JPEG; quality stepped down until it fits
async function encode(canvas, max, type) {
  for (const q of QUALITIES) {
    let blob = await toBlob(canvas, type || 'image/webp', q);
    if (!type && (!blob || blob.type !== 'image/webp')) { type = 'image/jpeg'; blob = await toBlob(canvas, type, q); }
    type = type || 'image/webp';
    if (blob && blob.size <= max) return { blob, type };
  }
  return { blob: null, type };
}

export async function openPhoto(file) {
  return createImageBitmap(file, { imageOrientation: 'from-image' }); // respects photo orientation
}

// { image, thumb, type }: Blobs within the limits, or throws with a plain message
export async function processDrawing(bitmap, crop) {
  const canvas = document.createElement('canvas');
  drawSquare(canvas, bitmap, crop, IMAGE_PX);
  const image = await encode(canvas, IMAGE_MAX);
  if (!image.blob) throw new Error('That picture is too detailed to save. Try cropping closer.');
  drawSquare(canvas, bitmap, crop, THUMB_PX);
  const thumb = await encode(canvas, THUMB_MAX, image.type);
  if (!thumb.blob) throw new Error('That picture is too detailed to save. Try cropping closer.');
  return { image: image.blob, thumb: thumb.blob, type: image.type };
}

const fsBytes = async blob => firebase.firestore.Blob.fromUint8Array(new Uint8Array(await blob.arrayBuffer()));

// ── Writing: one batch each, so nothing is ever half-saved ──
// `file` is the chosen photo (or an already opened bitmap) and `crop` the square
// picked on the crop step; without a crop the whole photo fits.
export async function addDrawing({ file, artist, crop }) {
  const name = cleanName(artist);
  const err = nameError(name);
  if (err) throw new Error(err);
  const bitmap = file instanceof ImageBitmap ? file : await openPhoto(file);
  const { image, thumb } = await processDrawing(bitmap, crop || fitCrop(bitmap.width, bitmap.height));
  const ref = db().collection(LIST).doc();
  const batch = db().batch();
  batch.set(ref, { thumb: await fsBytes(thumb), artist: name, active: true,
    createdAt: now(), updatedAt: now(), createdBy: uid(), updatedBy: uid() });
  batch.set(db().collection(IMAGES).doc(ref.id), { image: await fsBytes(image), createdAt: now(), createdBy: uid() });
  await batch.commit();
  return ref.id;
}

export function setActive(id, active) {
  return db().collection(LIST).doc(id).update({ active: !!active, updatedBy: uid(), updatedAt: now() });
}

export function setArtist(id, artist) {
  const name = cleanName(artist), err = nameError(name);
  if (err) return Promise.reject(new Error(err));
  return db().collection(LIST).doc(id).update({ artist: name, updatedBy: uid(), updatedAt: now() });
}

export function deleteDrawing(id) {
  const batch = db().batch();
  batch.delete(db().collection(LIST).doc(id));
  batch.delete(db().collection(IMAGES).doc(id));
  return batch.commit();
}
