import { COLORS, PATTERNS, GENERA } from './gameData.js';

export function frogFullName(colorId, patternId, genusId) {
  const color   = (COLORS[colorId]         || [String(colorId)])[0];
  const pattern = PATTERNS[patternId]       || ('Pat' + patternId);
  const genus   = GENERA[genusId]           || ('Gen' + genusId);
  return color + ' ' + pattern + ' ' + genus;
}

// Froggydex bit index: colorId * 1920 + patternId * 120 + genusId
export function fdexBit(colorId, patternId, genusId) {
  return colorId * 1920 + patternId * 120 + genusId;
}

export function toHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

export function parseWeekCode(code) {
  const s = String(code);
  if (s.length < 5) return s;
  const yr = s.slice(0, 4), wk = parseInt(s.slice(4), 10);
  return 'Week\u00a0' + wk + ', ' + yr;
}

export function parseSetsText(raw) {
  const sets = [];
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let i = 0;
  while (i + 2 < lines.length) {
    const code = lines[i];
    const name = lines[i + 1];
    const frogsStr = lines[i + 2];
    const frogs = [];
    frogsStr.split(',').forEach(part => {
      const p = part.trim().split(':');
      if (p.length === 4) {
        try { frogs.push([parseInt(p[0]), parseInt(p[1]), parseInt(p[2]), parseInt(p[3])]); }
        catch (_) {}
      }
    });
    if (frogs.length > 0) sets.push({ code, name, frogs });
    i += 3;
  }
  return sets; // oldest-first from file; caller applies sort
}

export function hsvToRgb(h, s, v) {
  const i = Math.floor(h * 6), f = h * 6 - i;
  const p = v * (1 - s), q = v * (1 - f * s), t = v * (1 - (1 - f) * s);
  let r, g, b;
  switch (i % 6) {
    case 0: r=v; g=t; b=p; break;  case 1: r=q; g=v; b=p; break;
    case 2: r=p; g=v; b=t; break;  case 3: r=p; g=q; b=v; break;
    case 4: r=t; g=p; b=v; break;  case 5: r=v; g=p; b=q; break;
  }
  return [Math.round(r*255), Math.round(g*255), Math.round(b*255)];
}
