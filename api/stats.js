'use strict';

const fs   = require('fs');
const path = require('path');
const { COLORS, PATTERN_COLORS, GENERA, parseSetsText } = require('./_data');

const SETS_PATH   = path.join(__dirname, '..', 'sets.txt');
const BANNER_PATH = '/embedbanner.png'; // served as static asset

const N_COLORS   = Object.keys(COLORS).length;          // 23
const N_PATTERNS = Object.keys(PATTERN_COLORS).length;  // 16
const N_GENERA   = Object.keys(GENERA).length;          // 120
const N_TOTAL    = N_COLORS * N_PATTERNS * N_GENERA;    // 44,160

function getSetsCount() {
  try { return parseSetsText(fs.readFileSync(SETS_PATH, 'utf8')).length; }
  catch (_) { return 0; }
}

function fmt(n) { return n.toLocaleString('en-US'); }

function uptimeStr(sec) {
  const s = Math.floor(sec);
  if (s < 60)   return `${s}s`;
  if (s < 3600) return `${Math.floor(s/60)}m ${s%60}s`;
  return `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;
}

module.exports = (req, res) => {
  const host   = req.headers.host;
  const BASE   = `https://${host}`;
  const sets   = getSetsCount();
  const uptime = uptimeStr(process.uptime());
  const now    = new Date().toUTCString();

  const ogTitle = 'Splashdex Stats';
  const ogDesc  = `${fmt(N_TOTAL)} frog combinations · ${N_COLORS} colors · ${N_PATTERNS} patterns · ${N_GENERA} genera · ${sets} weekly sets tracked`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Stats — Splashdex</title>
  <meta property="og:type"        content="website">
  <meta property="og:title"       content="${ogTitle}">
  <meta property="og:description" content="${ogDesc}">
  <meta property="og:image"       content="${BASE}/embedbanner.png">
  <meta property="og:url"         content="${BASE}/stats">
  <meta name="twitter:card"       content="summary_large_image">
  <meta name="twitter:title"      content="${ogTitle}">
  <meta name="twitter:image"      content="${BASE}/embedbanner.png">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --base:    #1e1e2e;
      --mantle:  #181825;
      --crust:   #11111b;
      --surface0:#313244;
      --surface1:#45475a;
      --overlay1:#7f849c;
      --text:    #cdd6f4;
      --subtext0:#a6adc8;
      --lavender:#b4befe;
      --blue:    #89b4fa;
      --sapphire:#74c7ec;
      --teal:    #94e2d5;
      --green:   #a6e3a1;
      --yellow:  #f9e2af;
      --peach:   #fab387;
      --mauve:   #cba6f7;
    }
    body {
      background: var(--crust);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1rem 4rem;
    }
    header {
      text-align: center;
      margin-bottom: 2.5rem;
    }
    header a {
      display: inline-block;
      color: var(--lavender);
      text-decoration: none;
      font-size: 0.85rem;
      margin-bottom: 0.75rem;
      opacity: 0.7;
    }
    header a:hover { opacity: 1; }
    h1 {
      font-size: 2rem;
      font-weight: 700;
      color: var(--lavender);
      letter-spacing: -0.5px;
    }
    h1 span { color: var(--subtext0); font-weight: 400; }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 1rem;
      width: 100%;
      max-width: 680px;
      margin-bottom: 2rem;
    }
    .card {
      background: var(--base);
      border: 1px solid var(--surface0);
      border-radius: 12px;
      padding: 1.25rem 1rem;
      text-align: center;
    }
    .card .value {
      font-size: 2rem;
      font-weight: 700;
      line-height: 1;
      margin-bottom: 0.35rem;
    }
    .card .label {
      font-size: 0.8rem;
      color: var(--subtext0);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .card.accent-blue   .value { color: var(--blue); }
    .card.accent-green  .value { color: var(--green); }
    .card.accent-mauve  .value { color: var(--mauve); }
    .card.accent-peach  .value { color: var(--peach); }
    .card.accent-teal   .value { color: var(--teal); }
    .card.accent-yellow .value { color: var(--yellow); }
    .card.accent-sapph  .value { color: var(--sapphire); }
    .divider {
      width: 100%;
      max-width: 680px;
      border: none;
      border-top: 1px solid var(--surface0);
      margin: 0.5rem 0 2rem;
    }
    .server-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      width: 100%;
      max-width: 680px;
      margin-bottom: 2.5rem;
    }
    .server-row {
      background: var(--mantle);
      border: 1px solid var(--surface0);
      border-radius: 10px;
      padding: 0.9rem 1.1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
    }
    .server-row .srv-label {
      font-size: 0.8rem;
      color: var(--overlay1);
      text-transform: uppercase;
      letter-spacing: 0.06em;
    }
    .server-row .srv-value {
      font-size: 0.9rem;
      color: var(--text);
      font-variant-numeric: tabular-nums;
      text-align: right;
    }
    footer {
      font-size: 0.75rem;
      color: var(--overlay1);
    }
    footer a { color: var(--lavender); text-decoration: none; }
    footer a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <header>
    <a href="/">← Back to Splashdex</a>
    <h1>Splashdex <span>Stats</span></h1>
  </header>

  <div class="grid">
    <div class="card accent-blue">
      <div class="value">${fmt(N_TOTAL)}</div>
      <div class="label">Total Combinations</div>
    </div>
    <div class="card accent-green">
      <div class="value">${N_COLORS}</div>
      <div class="label">Colors</div>
    </div>
    <div class="card accent-mauve">
      <div class="value">${N_PATTERNS}</div>
      <div class="label">Patterns</div>
    </div>
    <div class="card accent-peach">
      <div class="value">${N_GENERA}</div>
      <div class="label">Genera</div>
    </div>
    <div class="card accent-teal">
      <div class="value">${sets}</div>
      <div class="label">Weekly Sets Tracked</div>
    </div>
  </div>

  <hr class="divider">

  <div class="server-grid">
    <div class="server-row">
      <span class="srv-label">Container Uptime</span>
      <span class="srv-value">${uptime}</span>
    </div>
    <div class="server-row">
      <span class="srv-label">Server Time</span>
      <span class="srv-value">${now}</span>
    </div>
    <div class="server-row">
      <span class="srv-label">Runtime</span>
      <span class="srv-value">Node ${process.version} / Vercel</span>
    </div>
    <div class="server-row">
      <span class="srv-label">Platform</span>
      <span class="srv-value">${process.platform} ${process.arch}</span>
    </div>
  </div>

  <footer>
    <a href="https://github.com/rilinium/splashdex" target="_blank" rel="noopener">GitHub</a>
    · Splashdex is a fan site, not affiliated with Nimblebit.
  </footer>
</body>
</html>`;

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(html);
};
