'use strict';

const { createCanvas, loadImage } = require('@napi-rs/canvas');
const path = require('path');
const fs   = require('fs');

const { COLORS, PATTERN_COLORS, GENERA, frogFullName, parseWeekCode, parseSetsText } = require('./_data');

const SPRITES_DIR  = path.join(__dirname, '..', 'frog_sprites');
const BANNER_PATH  = path.join(__dirname, '..', 'embedbanner.png');
const FROGBG_PATH  = path.join(__dirname, '..', 'embedfrogbg.png');
const SETS_PATH    = path.join(__dirname, '..', 'sets.txt');


// ── Sprite cache (warm across invocations in the same Lambda instance) ────────
const _imgCache = {};
async function getSprite(name) {
  if (!_imgCache[name]) _imgCache[name] = await loadImage(path.join(SPRITES_DIR, name));
  return _imgCache[name];
}

// ── Rendering helpers (same logic as the browser) ─────────────────────────────
function _tintLayer(ctx, img, dx, dy, dw, dh, r, g, b) {
  const tmp  = createCanvas(dw, dh);
  const tc   = tmp.getContext('2d');
  tc.drawImage(img, 0, 0, 256, 256, 0, 0, dw, dh);
  const id   = tc.getImageData(0, 0, dw, dh);
  const d    = id.data;
  for (let i = 0; i < d.length; i += 4) {
    d[i]   = d[i]   * r / 255;
    d[i+1] = d[i+1] * g / 255;
    d[i+2] = d[i+2] * b / 255;
  }
  tc.putImageData(id, 0, 0);
  ctx.drawImage(tmp, dx, dy);
}

function _multiplyOverlay(ctx, img, dx, dy, dw, dh) {
  const tmp  = createCanvas(dw, dh);
  tmp.getContext('2d').drawImage(img, 0, 0, 256, 256, 0, 0, dw, dh);
  const ov   = tmp.getContext('2d').getImageData(0, 0, dw, dh).data;
  const cId  = ctx.getImageData(dx, dy, dw, dh);
  const cv   = cId.data;
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

async function renderFrog(canvas, colorId, patternId, genusId) {
  const isGlass  = colorId   === 22;
  const isChroma = patternId === 15;
  const [, cr, cg, cb] = COLORS[colorId]          || [null, 128, 128, 128];
  const [, pr, pg, pb] = PATTERN_COLORS[patternId] || [null, 128, 128, 128];
  const w = canvas.width, h = canvas.height;
  const ctx = canvas.getContext('2d');

  const [baseImg, genusImg, ovImg] = await Promise.all([
    getSprite('frog_base_256.png'),
    getSprite(`frog_${genusId}_256.png`),
    getSprite('overlay_256.png'),
  ]);

  ctx.clearRect(0, 0, w, h);
  _tintLayer(ctx, baseImg,  0, 0, w, h, cr, cg, cb);
  // Chroma: use a fixed red hue for the static OG image
  const [effPr, effPg, effPb] = isChroma ? [255, 30, 30] : [pr, pg, pb];
  _tintLayer(ctx, genusImg, 0, 0, w, h, effPr, effPg, effPb);
  _multiplyOverlay(ctx, ovImg, 0, 0, w, h);

  if (isGlass) {
    const id = ctx.getImageData(0, 0, w, h);
    const d  = id.data;
    for (let i = 3; i < d.length; i += 4) d[i] = (d[i] * 0.5) | 0;
    ctx.putImageData(id, 0, 0);
  }
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

// ── Main handler ──────────────────────────────────────────────────────────────
module.exports = async (req, res) => {
  let { frog, set, builder, name, transparent, random } = req.query || {};
  const noBg = transparent !== undefined;

  // Resolve ?random=frog / ?random=set into concrete values
  if (random === 'frog') {
    frog = `${Math.floor(Math.random() * COLORS.length)}-` +
           `${Math.floor(Math.random() * PATTERN_COLORS.length)}-` +
           `${Math.floor(Math.random() * GENERA.length)}`;
  } else if (random === 'set') {
    const sets = getSets();
    if (sets.length) set = String(sets[Math.floor(Math.random() * sets.length)].code);
  }

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Cache-Control',
    random !== undefined ? 'no-store' : 'public, max-age=604800, stale-while-revalidate=86400');

  try {
    // ── Single frog card ──────────────────────────────────────────────────────
    if (frog) {
      const [c, p, g] = frog.split('-').map(Number);
      if ([c, p, g].some(isNaN) || !COLORS[c] || !PATTERN_COLORS[p] || !GENERA[g]) {
        return serveBanner(res);
      }

      const SIZE   = 512, PAD = 48;
      const out    = createCanvas(SIZE + PAD * 2, SIZE + PAD * 2);
      const ctx    = out.getContext('2d');

      if (!noBg) {
        const bgImg = await loadImage(FROGBG_PATH);
        ctx.drawImage(bgImg, 0, 0, out.width, out.height);
      }

      const frogCv = createCanvas(SIZE, SIZE);
      await renderFrog(frogCv, c, p, g);
      ctx.drawImage(frogCv, PAD, PAD);

      res.end(out.toBuffer('image/png'));
      return;
    }

    // ── Set card (weekly or custom builder) ───────────────────────────────────
    if (set || builder) {
      let setName  = name || 'Custom Set';
      let rawFrogs = [];           // [[count, colorId, patternId, genusId], ...]
      let weekCode = null;

      if (set) {
        weekCode     = set;
        const found  = getSets().find(s => String(s.code) === String(set));
        if (!found)  return serveBanner(res);
        setName      = found.name;
        rawFrogs     = found.frogs;
      } else {
        // Custom builder data: "count:c:p:g,..."
        builder.split(',').forEach(part => {
          const segs = part.trim().split(':');
          if (segs.length === 4) {
            const nums = segs.map(Number);
            if (nums.every(n => !isNaN(n))) rawFrogs.push(nums);
          }
        });
      }

      // Expand counts into individual frog canvases
      const FROG_SIZE = 160, OVERLAP = 44;
      const frogCanvases = [];
      for (const [count, colorId, patternId, genusId] of rawFrogs) {
        for (let n = 0; n < count; n++) {
          const fc = createCanvas(FROG_SIZE, FROG_SIZE);
          await renderFrog(fc, colorId, patternId, genusId);
          frogCanvases.push(fc);
        }
      }
      if (!frogCanvases.length) return serveBanner(res);

      const STEP   = FROG_SIZE - OVERLAP;
      const totalW = frogCanvases.length * STEP + OVERLAP; // = N*STEP + leftover
      const H_PAD  = 28, V_PAD = 20;
      const out    = createCanvas(totalW + H_PAD * 2, FROG_SIZE + V_PAD * 2);
      const ctx    = out.getContext('2d');
      const pill   = Math.floor(out.height / 2);

      if (!noBg) drawBackground(ctx, out.width, out.height, false, pill);
      // Draw right-to-left so leftmost frog sits on top
      for (let i = frogCanvases.length - 1; i >= 0; i--)
        ctx.drawImage(frogCanvases[i], H_PAD + i * STEP, V_PAD);

      res.end(out.toBuffer('image/png'));
      return;
    }

    // ── No params: serve banner ───────────────────────────────────────────────
    serveBanner(res);

  } catch (err) {
    console.error('[og] error:', err);
    serveBanner(res);
  }
};
