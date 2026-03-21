'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const GIFEncoder = require('gif-encoder-2');
const path = require('path');
const fs   = require('fs');

const { COLORS, PATTERN_COLORS, GENERA, frogFullName, parseWeekCode, parseSetsText } = require('./_data');

const SPRITES_DIR  = path.join(__dirname, '..', 'frog_sprites');
const BANNER_PATH  = path.join(__dirname, '..', 'embedbanner.png');
const FROGBG_PATH  = path.join(__dirname, '..', 'embedfrogbg.png');
const SETS_PATH    = path.join(__dirname, '..', 'sets.txt');

const CHROMA_ID  = 15;
const EXTRA_LAYER_GENERA = new Set([115, 116, 119]);
const GIF_FRAMES = 16;
const GIF_DELAY  = 160; // ms per frame → 2.56 s full cycle


// ── Sprite cache (warm across invocations in the same Lambda instance) ────────
const _imgCache = {};
async function getSprite(name) {
  if (!_imgCache[name]) _imgCache[name] = await loadImage(path.join(SPRITES_DIR, name));
  return _imgCache[name];
}


// ── Rendering helpers ─────────────────────────────────────────────────────────

// Convert HSL (h: 0-360, s/l: 0-1) → [r, g, b] (0-255)
function hslToRgb(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r, g, b;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function _tintLayer(ctx, img, dx, dy, dw, dh, r, g, b) {
  const tmp = createCanvas(dw, dh);
  const tc  = tmp.getContext('2d');
  tc.drawImage(img, 0, 0, 256, 256, 0, 0, dw, dh);
  const id = tc.getImageData(0, 0, dw, dh);
  const d  = id.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = d[i]   * r / 255;
    d[i+1] = d[i+1] * g / 255;
    d[i+2] = d[i+2] * b / 255;
  }
  tc.putImageData(id, 0, 0);
  ctx.drawImage(tmp, dx, dy);
}

function _multiplyOverlay(ctx, img, dx, dy, dw, dh) {
  const tmp = createCanvas(dw, dh);
  tmp.getContext('2d').drawImage(img, 0, 0, 256, 256, 0, 0, dw, dh);
  const ov  = tmp.getContext('2d').getImageData(0, 0, dw, dh).data;
  const cId = ctx.getImageData(dx, dy, dw, dh);
  const cv  = cId.data;
  for (let i = 0; i < ov.length; i += 4) {
    const a = ov[i + 3] / 255;
    if (a > 0) {
      const v = ov[i] / 255;
      for (let ch = 0; ch < 3; ch++) {
        const c      = cv[i + ch] / 255;
        const result = v < 0.5 ? 2 * v * c : 1 - 2 * (1 - v) * (1 - c);
        cv[i + ch]   = Math.min(255, Math.round((1 - a) * cv[i + ch] + a * result * 255));
      }
    }
  }
  ctx.putImageData(cId, dx, dy);
}

// patternRgbOverride: [r, g, b] replaces PATTERN_COLORS[patternId] for this render
async function renderFrog(canvas, colorId, patternId, genusId, patternRgbOverride) {
  const isGlass = colorId === 22;
  const [, cr, cg, cb]   = COLORS[colorId]          || [null, 128, 128, 128];
  const [, pr0, pg0, pb0] = PATTERN_COLORS[patternId] || [null, 128, 128, 128];
  const [pr, pg, pb]      = patternRgbOverride || [pr0, pg0, pb0];
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');

  const spritePromises = [
    getSprite('frog_base_256.png'),
    getSprite(`frog_${genusId}_256.png`),
    getSprite('overlay_256.png'),
  ];
  if (EXTRA_LAYER_GENERA.has(genusId)) spritePromises.push(getSprite(`frog_${genusId}_extra_256.png`));
  const [baseImg, genusImg, ovImg, extraImg] = await Promise.all(spritePromises);

  ctx.clearRect(0, 0, w, h);
  if (isGlass) ctx.globalAlpha = 0.5;
  _tintLayer(ctx, baseImg,  0, 0, w, h, cr, cg, cb);
  ctx.globalAlpha = 1.0;
  _tintLayer(ctx, genusImg, 0, 0, w, h, pr, pg, pb);
  if (extraImg) ctx.drawImage(extraImg, 0, 0, 256, 256, 0, 0, w, h);
  _multiplyOverlay(ctx, ovImg, 0, 0, w, h);
}

function roundRectPath(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBackground(ctx, w, h, diagonal = false, r = 28) {
  const grad = diagonal
    ? ctx.createLinearGradient(0, 0, w, h)
    : ctx.createLinearGradient(0, 0, 0, h);
  grad.addColorStop(0, '#CBD2D8');
  grad.addColorStop(1, '#1e1e2e');
  ctx.fillStyle = grad;
  roundRectPath(ctx, 0, 0, w, h, r);
  ctx.fill();
}


// ── Sets cache (warm between requests) ────────────────────────────────────────
let _setsCache = null;
function getSets() {
  if (!_setsCache) {
    try { _setsCache = parseSetsText(fs.readFileSync(SETS_PATH, 'utf8')); }
    catch (_) { _setsCache = []; }
  }
  return _setsCache;
}


// ── Fallback: stream the static embed banner ──────────────────────────────────
function serveBanner(res) {
  try {
    res.setHeader('Content-Type', 'image/png');
    fs.createReadStream(BANNER_PATH).pipe(res);
  } catch (_) {
    res.statusCode = 500;
    res.end();
  }
}


// ── GIF encoder factory ───────────────────────────────────────────────────────
function makeEncoder(w, h) {
  const enc = new GIFEncoder(w, h);
  enc.setDelay(GIF_DELAY);
  enc.setRepeat(0); // loop forever
  enc.start();
  return enc;
}


// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  const { frog, set, builder, name, transparent } = req.query || {};
  const noBg = transparent !== undefined;

  res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=86400');

  try {
    // ── Single frog card ──────────────────────────────────────────────────────
    if (frog) {
      const [c, p, g] = frog.split('-').map(Number);
      if ([c, p, g].some(isNaN) || !COLORS[c] || !PATTERN_COLORS[p] || !GENERA[g]) {
        return serveBanner(res);
      }

      const SIZE = 512, PAD = 48;
      const W = SIZE + PAD * 2, H = SIZE + PAD * 2;

      if (p === CHROMA_ID) {
        // ── Animated GIF: cycle hue through the Chroma pattern layer ──────────
        const bgImg = await loadImage(FROGBG_PATH);
        const enc   = makeEncoder(W, H);

        for (let f = 0; f < GIF_FRAMES; f++) {
          const hue = (f / GIF_FRAMES) * 360;
          const rgb = hslToRgb(hue, 1.0, 0.55);
          const out = createCanvas(W, H);
          const ctx = out.getContext('2d');
          ctx.drawImage(bgImg, 0, 0, W, H);
          const frogCv = createCanvas(SIZE, SIZE);
          await renderFrog(frogCv, c, p, g, rgb);
          ctx.drawImage(frogCv, PAD, PAD);
          enc.addFrame(ctx);
        }

        enc.finish();
        res.setHeader('Content-Type', 'image/gif');
        res.end(Buffer.from(enc.out.getData()));
      } else {
        // ── Static PNG ────────────────────────────────────────────────────────
        const out = createCanvas(W, H);
        const ctx = out.getContext('2d');
        if (!noBg) {
          const bgImg = await loadImage(FROGBG_PATH);
          ctx.drawImage(bgImg, 0, 0, W, H);
        }
        const frogCv = createCanvas(SIZE, SIZE);
        await renderFrog(frogCv, c, p, g);
        ctx.drawImage(frogCv, PAD, PAD);
        res.setHeader('Content-Type', 'image/png');
        res.end(out.toBuffer('image/png'));
      }
      return;
    }

    // ── Set card (weekly or custom builder) ───────────────────────────────────
    if (set || builder) {
      let rawFrogs = []; // [[count, colorId, patternId, genusId], ...]

      if (set) {
        const found = getSets().find(s => String(s.code) === String(set));
        if (!found) return serveBanner(res);
        rawFrogs = found.frogs;
      } else {
        builder.split(',').forEach(part => {
          const segs = part.trim().split(':');
          if (segs.length === 4) {
            const nums = segs.map(Number);
            if (nums.every(n => !isNaN(n))) rawFrogs.push(nums);
          }
        });
      }

      // Expand counts into [colorId, patternId, genusId] per slot
      const slots = [];
      for (const [count, colorId, patternId, genusId] of rawFrogs) {
        for (let n = 0; n < count; n++) slots.push([colorId, patternId, genusId]);
      }
      if (!slots.length) return serveBanner(res);

      const FROG_SIZE = 160, OVERLAP = 44, STEP = FROG_SIZE - OVERLAP;
      const H_PAD = 28, V_PAD = 20;
      const totalW = slots.length * STEP + OVERLAP;
      const W = totalW + H_PAD * 2, H = FROG_SIZE + V_PAD * 2;
      const pill = Math.floor(H / 2);

      const hasChroma = slots.some(([, p]) => p === CHROMA_ID);

      if (hasChroma) {
        // ── Animated GIF ──────────────────────────────────────────────────────
        // Pre-render static (non-Chroma) frogs once; Chroma frogs re-render per frame
        const staticCanvases = await Promise.all(slots.map(([c, p, g]) => {
          if (p === CHROMA_ID) return Promise.resolve(null); // placeholder
          const fc = createCanvas(FROG_SIZE, FROG_SIZE);
          return renderFrog(fc, c, p, g).then(() => fc);
        }));

        const enc = makeEncoder(W, H);

        for (let f = 0; f < GIF_FRAMES; f++) {
          const hue = (f / GIF_FRAMES) * 360;
          const rgb = hslToRgb(hue, 1.0, 0.55);

          // Render Chroma frogs for this frame
          const frameCanvases = await Promise.all(slots.map(([c, p, g], i) => {
            if (p !== CHROMA_ID) return Promise.resolve(staticCanvases[i]);
            const fc = createCanvas(FROG_SIZE, FROG_SIZE);
            return renderFrog(fc, c, p, g, rgb).then(() => fc);
          }));

          const out = createCanvas(W, H);
          const ctx = out.getContext('2d');
          // GIF has no real alpha; always draw bg with square corners (r=0)
          drawBackground(ctx, W, H, false, 0);
          // Right-to-left so leftmost frog is on top
          for (let i = slots.length - 1; i >= 0; i--)
            ctx.drawImage(frameCanvases[i], H_PAD + i * STEP, V_PAD);

          enc.addFrame(ctx);
        }

        enc.finish();
        res.setHeader('Content-Type', 'image/gif');
        res.end(Buffer.from(enc.out.getData()));
      } else {
        // ── Static PNG ────────────────────────────────────────────────────────
        const out = createCanvas(W, H);
        const ctx = out.getContext('2d');
        if (!noBg) drawBackground(ctx, W, H, false, pill);
        const frogCanvases = await Promise.all(slots.map(([c, p, g]) => {
          const fc = createCanvas(FROG_SIZE, FROG_SIZE);
          return renderFrog(fc, c, p, g).then(() => fc);
        }));
        for (let i = slots.length - 1; i >= 0; i--)
          ctx.drawImage(frogCanvases[i], H_PAD + i * STEP, V_PAD);
        res.setHeader('Content-Type', 'image/png');
        res.end(out.toBuffer('image/png'));
      }
      return;
    }

    // ── No params: serve banner ───────────────────────────────────────────────
    serveBanner(res);

  } catch (err) {
    console.error('[og] error:', err);
    serveBanner(res);
  }
};
