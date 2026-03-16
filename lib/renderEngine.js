import { hsvToRgb } from './gameHelpers.js';

export const _spriteCache = {};  // name → Promise<HTMLImageElement>
export const _imgCache    = {};  // name → HTMLImageElement (resolved, for sync use)
export let   _gdCache     = null; // resolved gameData module

export function loadSprite(name) {
  if (_spriteCache[name]) return _spriteCache[name];
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { _imgCache[name] = img; resolve(img); };
    img.onerror = () => reject(new Error('sprite load failed: ' + name));
    img.src = '/frog_sprites/' + name;
  });
  _spriteCache[name] = p;
  return p;
}

export function _tintLayer(ctx, img, dx, dy, dw, dh, r, g, b) {
  const tmp = document.createElement('canvas');
  tmp.width = dw; tmp.height = dh;
  const tctx = tmp.getContext('2d');
  tctx.drawImage(img, 0, 0, 256, 256, 0, 0, dw, dh);
  const id = tctx.getImageData(0, 0, dw, dh);
  const d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = d[i]   * r / 255;
    d[i+1] = d[i+1] * g / 255;
    d[i+2] = d[i+2] * b / 255;
  }
  tctx.putImageData(id, 0, 0);
  ctx.drawImage(tmp, dx, dy);
}

export function _multiplyOverlay(ctx, img, dx, dy, dw, dh) {
  const tmp = document.createElement('canvas');
  tmp.width = dw; tmp.height = dh;
  tmp.getContext('2d').drawImage(img, 0, 0, 256, 256, 0, 0, dw, dh);
  const ov = tmp.getContext('2d').getImageData(0, 0, dw, dh).data;
  const cId = ctx.getImageData(dx, dy, dw, dh);
  const cv = cId.data;
  for (let i = 0; i < ov.length; i += 4) {
    const a = ov[i + 3] / 255;
    if (a > 0) {
      const v = ov[i] / 255;
      for (let ch = 0; ch < 3; ch++) {
        const c = cv[i + ch] / 255;
        const result = v < 0.5
          ? 2 * v * c
          : 1 - 2 * (1 - v) * (1 - c);
        cv[i + ch] = Math.min(255, Math.round((1 - a) * cv[i + ch] + a * result * 255));
      }
    }
  }
  ctx.putImageData(cId, dx, dy);
}

export function _drawFrogPlaceholder(canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = 'rgba(100,80,40,0.3)';
  ctx.beginPath();
  ctx.ellipse(canvas.width/2, canvas.height*0.55, canvas.width*0.32, canvas.height*0.28, 0, 0, Math.PI*2);
  ctx.fill();
}

// ── Sync resize helper (shared by both render paths) ─────────────────────────
function _ensureSize(canvas) {
  const dpr = window.devicePixelRatio || 1;
  if (!canvas._cssW) {
    const sw = parseFloat(canvas.style.width);
    canvas._cssW = isNaN(sw) ? canvas.width : sw;
  }
  const cssW = canvas._cssW;
  if (canvas.width !== Math.round(cssW * dpr)) {
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssW * dpr);
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssW + 'px';
  }
  return canvas.width;
}

// ── Synchronous render — ONLY call after renderFrog has run at least once
//    (ensures _imgCache and _gdCache are populated). Used by the RAF loop. ───
export function renderFrogSync(canvas, colorId, patternId, genusId, chromaHue) {
  if (!_gdCache) return;
  const baseImg  = _imgCache['frog_base_256.png'];
  const genusImg = _imgCache['frog_' + genusId + '_256.png'];
  const ovImg    = _imgCache['overlay_256.png'];
  if (!baseImg || !genusImg || !ovImg) return;

  const { COLORS, PATTERN_COLORS } = _gdCache;
  const isGlass = colorId === 22;
  const [, cr, cg, cb] = COLORS[colorId]           || [null, 128, 128, 128];
  const [, pr, pg, pb] = PATTERN_COLORS[patternId]  || [null, 128, 128, 128];
  const [effPr, effPg, effPb] = patternId === 15 ? hsvToRgb(chromaHue * 360, 1, 1) : [pr, pg, pb];

  const w = _ensureSize(canvas);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, w);
  if (isGlass) ctx.globalAlpha = 0.5;
  _tintLayer(ctx, baseImg,  0, 0, w, w, cr, cg, cb);
  ctx.globalAlpha = 1.0;
  _tintLayer(ctx, genusImg, 0, 0, w, w, effPr, effPg, effPb);
  _multiplyOverlay(ctx, ovImg, 0, 0, w, w);
}

// ── Async render — used for initial/one-shot renders; populates caches ───────
export async function renderFrog(canvas, colorId, patternId, genusId, chromaHue = 0) {
  if (!_gdCache) _gdCache = await import('./gameData.js');
  const { COLORS, PATTERN_COLORS } = _gdCache;

  const isChroma = patternId === 15;
  const isGlass  = colorId  === 22;
  canvas.style.opacity = '';

  const [, cr, cg, cb] = COLORS[colorId]           || [null, 128, 128, 128];
  const [, pr, pg, pb] = PATTERN_COLORS[patternId]  || [null, 128, 128, 128];

  const w = _ensureSize(canvas);

  try {
    const [baseImg, genusImg, ovImg] = await Promise.all([
      loadSprite('frog_base_256.png'),
      loadSprite('frog_' + genusId + '_256.png'),
      loadSprite('overlay_256.png'),
    ]);
    const ctx = canvas.getContext('2d');
    const [effPr, effPg, effPb] = isChroma ? hsvToRgb(chromaHue * 360, 1, 1) : [pr, pg, pb];
    ctx.clearRect(0, 0, w, w);
    if (isGlass) ctx.globalAlpha = 0.5;
    _tintLayer(ctx, baseImg,  0, 0, w, w, cr, cg, cb);
    ctx.globalAlpha = 1.0;
    _tintLayer(ctx, genusImg, 0, 0, w, w, effPr, effPg, effPb);
    _multiplyOverlay(ctx, ovImg, 0, 0, w, w);
  } catch (_) {
    _drawFrogPlaceholder(canvas);
  }
}

export async function renderFrogOffscreen(colorId, patternId, genusId, size, chromaHue = 0) {
  if (!_gdCache) _gdCache = await import('./gameData.js');
  const { COLORS, PATTERN_COLORS } = _gdCache;

  const isChroma = patternId === 15;
  const isGlass  = colorId  === 22;
  const [, cr, cg, cb] = COLORS[colorId]           || [null, 128, 128, 128];
  const [, pr, pg, pb] = PATTERN_COLORS[patternId]  || [null, 128, 128, 128];

  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d');

  const [baseImg, genusImg, ovImg] = await Promise.all([
    loadSprite('frog_base_256.png'),
    loadSprite('frog_' + genusId + '_256.png'),
    loadSprite('overlay_256.png'),
  ]);

  const [effPr, effPg, effPb] = isChroma ? hsvToRgb(chromaHue * 360, 1, 1) : [pr, pg, pb];
  ctx.clearRect(0, 0, size, size);
  if (isGlass) ctx.globalAlpha = 0.5;
  _tintLayer(ctx, baseImg,  0, 0, size, size, cr, cg, cb);
  ctx.globalAlpha = 1.0;
  _tintLayer(ctx, genusImg, 0, 0, size, size, effPr, effPg, effPb);
  _multiplyOverlay(ctx, ovImg, 0, 0, size, size);
  return canvas;
}
