import { hsvToRgb } from './gameHelpers.js';

export const _spriteCache = {};

export function loadSprite(name) {
  if (_spriteCache[name]) return _spriteCache[name];
  const p = new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
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

export async function renderFrog(canvas, colorId, patternId, genusId, chromaHue = 0) {
  // Skip if a render is already in flight for this canvas (prevents flashing on RAF overlap)
  if (canvas._rendering) return;
  canvas._rendering = true;

  try {
  // Dynamically import COLORS and PATTERN_COLORS to avoid SSR issues
  const { COLORS, PATTERN_COLORS } = await import('./gameData.js');

  const isChroma = patternId === 15;
  const isGlass  = colorId  === 22;
  canvas.style.opacity = '';

  const [, cr, cg, cb] = COLORS[colorId]          || [null, 128, 128, 128];
  const [, pr, pg, pb] = PATTERN_COLORS[patternId] || [null, 128, 128, 128];

  // HiDPI / Retina: scale canvas buffer up by devicePixelRatio, shrink back via CSS.
  // Read intended CSS size from style.width (set by FrogCanvas JSX) rather than
  // canvas.width, since React no longer sets the width/height attributes and the
  // HTML default (300px) would be wrong.
  const dpr = window.devicePixelRatio || 1;
  if (!canvas._cssW) {
    const sw = parseFloat(canvas.style.width);
    canvas._cssW = isNaN(sw) ? canvas.width : sw;
    canvas._cssH = isNaN(sw) ? canvas.height : sw;
  }
  const cssW = canvas._cssW, cssH = canvas._cssH;
  if (canvas.width !== Math.round(cssW * dpr)) {
    canvas.width  = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.style.width  = cssW + 'px';
    canvas.style.height = cssH + 'px';
  }
  const w = canvas.width, h = canvas.height;

  try {
    const [baseImg, genusImg, ovImg] = await Promise.all([
      loadSprite('frog_base_256.png'),
      loadSprite('frog_' + genusId + '_256.png'),
      loadSprite('overlay_256.png'),
    ]);
    const ctx = canvas.getContext('2d');
    const [effPr, effPg, effPb] = isChroma ? hsvToRgb(chromaHue * 360, 1, 1) : [pr, pg, pb];
    ctx.clearRect(0, 0, w, h);
    if (isGlass) ctx.globalAlpha = 0.5;
    _tintLayer(ctx, baseImg,  0, 0, w, h, cr, cg, cb);
    ctx.globalAlpha = 1.0;
    _tintLayer(ctx, genusImg, 0, 0, w, h, effPr, effPg, effPb);
    _multiplyOverlay(ctx, ovImg, 0, 0, w, h);
  } catch (_) {
    _drawFrogPlaceholder(canvas);
  }
  } finally {
    canvas._rendering = false;
  }
}

export async function renderFrogOffscreen(colorId, patternId, genusId, size, chromaHue = 0) {
  const { COLORS, PATTERN_COLORS } = await import('./gameData.js');

  const isChroma = patternId === 15;
  const isGlass  = colorId  === 22;
  const [, cr, cg, cb] = COLORS[colorId]          || [null, 128, 128, 128];
  const [, pr, pg, pb] = PATTERN_COLORS[patternId] || [null, 128, 128, 128];

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
