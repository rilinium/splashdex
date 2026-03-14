'use strict';

const fs   = require('fs');
const path = require('path');

const { frogFullName, parseWeekCode, parseSetsText } = require('./_data');

const HTML_PATH  = path.join(__dirname, '..', 'index.html');
const SETS_PATH  = path.join(__dirname, '..', 'sets.txt');
const CHROMA_ID  = 15;

// Cache sets between warm invocations
let _setsCache = null;
function getSets() {
  if (!_setsCache) {
    try { _setsCache = parseSetsText(fs.readFileSync(SETS_PATH, 'utf8')); }
    catch (_) { _setsCache = []; }
  }
  return _setsCache;
}

// Escape for HTML attribute values
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

module.exports = (req, res) => {
  const { frog, set, builder, name, transparent } = req.query || {};
  const tSuffix = transparent !== undefined ? '&transparent' : '';
  const host    = req.headers.host;
  const BASE    = `https://${host}`;

  // ── Determine OG values ────────────────────────────────────────────────────
  let ogTitle     = 'Splashdex';
  let ogDesc      = 'Pocket Frogs breed reference — 44,160 combinations, weekly sets, and frog builder.';
  let ogImage     = `${BASE}/embedbanner.png`;
  let ogUrl       = `${BASE}/`;
  let ogImageType = 'image/png';

  if (frog) {
    const parts = frog.split('-').map(Number);
    if (parts.length === 3 && parts.every(n => !isNaN(n))) {
      const [c, p, g] = parts;
      const fname     = frogFullName(c, p, g);
      const isChroma  = p === CHROMA_ID;
      // Append &gif=1 for Chroma frogs so Discord doesn't serve a cached PNG
      const gifSuffix = isChroma ? '&gif=1' : '';
      ogTitle     = `${fname} — Splashdex`;
      ogDesc      = `${fname} · Pocket Frogs frog reference`;
      ogImage     = `${BASE}/api/og?frog=${encodeURIComponent(frog)}${gifSuffix}${tSuffix}`;
      ogUrl       = `${BASE}/frog?frog=${encodeURIComponent(frog)}${tSuffix}`;
      if (isChroma) ogImageType = 'image/gif';
    }
  } else if (set) {
    const found = getSets().find(s => String(s.code) === String(set));
    if (found) {
      ogTitle = `${found.name} — Splashdex`;
      ogDesc  = `${found.name} · ${parseWeekCode(found.code)} · Pocket Frogs weekly set`;
    } else {
      ogTitle = 'Weekly Set — Splashdex';
      ogDesc  = 'Pocket Frogs weekly set · Splashdex';
    }
    const hasChroma = found && found.frogs.some(([, , p]) => p === CHROMA_ID);
    const gifSuffix = hasChroma ? '&gif=1' : '';
    ogImage = `${BASE}/api/og?set=${encodeURIComponent(set)}${gifSuffix}${tSuffix}`;
    ogUrl   = `${BASE}/set?set=${encodeURIComponent(set)}${tSuffix}`;
    if (hasChroma) ogImageType = 'image/gif';
  } else if (builder && name) {
    // Check custom builder frogs for Chroma (format: count:c:p:g,...)
    const hasChroma = builder.split(',').some(part => {
      const segs = part.trim().split(':');
      return segs.length === 4 && Number(segs[2]) === CHROMA_ID;
    });
    const gifSuffix = hasChroma ? '&gif=1' : '';
    ogTitle = `${name} — Splashdex`;
    ogDesc  = `${name} · Custom set · Splashdex`;
    ogImage = `${BASE}/api/og?builder=${encodeURIComponent(builder)}&name=${encodeURIComponent(name)}${gifSuffix}${tSuffix}`;
    ogUrl   = `${BASE}/customset?builder=${encodeURIComponent(builder)}&name=${encodeURIComponent(name)}${tSuffix}`;
    if (hasChroma) ogImageType = 'image/gif';
  }

  // ── Read and patch index.html ──────────────────────────────────────────────
  let html;
  try {
    html = fs.readFileSync(HTML_PATH, 'utf8');
  } catch (err) {
    console.error('[page] failed to read index.html:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
    return;
  }

  html = html
    .replace(/(<meta\s+property="og:title"\s+content=")[^"]*(")/,       `$1${esc(ogTitle)}$2`)
    .replace(/(<meta\s+property="og:description"\s+content=")[^"]*(")/,`$1${esc(ogDesc)}$2`)
    .replace(/(<meta\s+property="og:image"\s+content=")[^"]*(")/,       `$1${esc(ogImage)}$2`)
    .replace(/(<meta\s+property="og:image:type"\s+content=")[^"]*(")/,  `$1${esc(ogImageType)}$2`)
    .replace(/(<meta\s+property="og:url"\s+content=")[^"]*(")/,         `$1${esc(ogUrl)}$2`)
    .replace(/(<meta\s+name="twitter:title"\s+content=")[^"]*(")/,      `$1${esc(ogTitle)}$2`)
    .replace(/(<meta\s+name="twitter:image"\s+content=")[^"]*(")/,      `$1${esc(ogImage)}$2`);

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  res.end(html);
};
