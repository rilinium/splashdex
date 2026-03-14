'use strict';

// ── Game data (mirrors the constants in index.html) ───────────────────────────

const COLORS = {
   0: ['Green',    129, 218,   0],
   1: ['Cocos',    117,  63,   0],
   2: ['Beige',    166, 142,  80],
   3: ['Orange',   255, 168,   0],
   4: ['Red',      255,   0,   0],
   5: ['Lime',     210, 255,   0],
   6: ['Azure',      0, 192, 255],
   7: ['Violet',   255,   0, 109],
   8: ['Emerald',    0, 226,  16],
   9: ['Tangelo',  255, 108,   0],
  10: ['Yellow',   255, 255,   0],
  11: ['Aqua',      29, 255, 251],
  12: ['Purple',    95,   0, 197],
  13: ['Golden',   246, 197,   0],
  14: ['Royal',    174,   0, 205],
  15: ['Blue',       0,  90, 255],
  16: ['Pink',     255,   0, 255],
  17: ['Black',     40,  40,  40],
  18: ['Maroon',   183,   0,   0],
  19: ['White',    255, 255, 255],
  20: ['Marine',     0, 209, 128],
  21: ['Olive',     72, 122,   0],
  22: ['Glass',    213, 226, 226],
};

const PATTERNS = {
   0: 'Callaina',  1: 'Picea',    2: 'Caelus',  3: 'Albeo',
   4: 'Carota',    5: 'Aurum',    6: 'Folium',  7: 'Bruna',
   8: 'Pruni',     9: 'Muscus',  10: 'Ceres',  11: 'Tingo',
  12: 'Floris',   13: 'Viola',   14: 'Cafea',  15: 'Chroma',
};

const PATTERN_COLORS = {
   0: ['Callaina',  13, 229, 255],
   1: ['Picea',     30,  20,  10],
   2: ['Caelus',     0, 138, 255],
   3: ['Albeo',    235, 235, 235],
   4: ['Carota',   255,  78,   0],
   5: ['Aurum',    255, 228,   0],
   6: ['Folium',   150, 255,   0],
   7: ['Bruna',     88,  56,  15],
   8: ['Pruni',     75,  15,  70],
   9: ['Muscus',    67, 255,   0],
  10: ['Ceres',    241, 192, 171],
  11: ['Tingo',    159,   0,   0],
  12: ['Floris',   255,   3, 157],
  13: ['Viola',    174,   0, 255],
  14: ['Cafea',     60,  38,   9],
  15: ['Chroma',    30,  20,  10],
};

const GENERA = {
    0: 'Anura',       1: 'Partiri',    2: 'Crustalli',  3: 'Velatus',
    4: 'Clunicula',   5: 'Marmorea',   6: 'Mixtus',     7: 'Nasus',
    8: 'Stellata',    9: 'Puncti',    10: 'Zebrae',    11: 'Calyx',
   12: 'Nimbilis',   13: 'Roboris',   14: 'Adamantis', 15: 'Africanus',
   16: 'Serpentis',  17: 'Bovis',     18: 'Viduo',     19: 'Spinae',
   20: 'Cesti',      21: 'Sagitta',   22: 'Amfractus', 23: 'Ornatus',
   24: 'Sol',        25: 'Lucus',     26: 'Ligo',      27: 'Corona',
   28: 'Arbor',      29: 'Ocularis',  30: 'Insero',    31: 'Biplex',
   32: 'Pingo',      33: 'Calvaria',  34: 'Floresco',  35: 'Magus',
   36: 'Veru',       37: 'Tribus',    38: 'Lanterna',  39: 'Glacio',
   40: 'Ludo',       41: 'Marinus',   42: 'Dextera',   43: 'Trivium',
   44: 'Obaro',      45: 'Bulla',     46: 'Orbis',     47: 'Vinaceus',
   48: 'Persona',    49: 'Signum',    50: 'Gyrus',     51: 'Geminus',
   52: 'Bulbus',     53: 'Templum',   54: 'Papilio',   55: 'Pluma',
   56: 'Cornus',     57: 'Volta',     58: 'Flecto',    59: 'Figularis',
   60: 'Aceris',     61: 'Lunaris',   62: 'Tabula',    63: 'Pictoris',
   64: 'Shelbus',    65: 'Skeletos',  66: 'Pyramis',   67: 'Lotus',
   68: 'Spira',      69: 'Planeta',   70: 'Mazeus',    71: 'Palma',
   72: 'Coclearis',  73: 'Mustacium', 74: 'Axis',      75: 'Igneous',
   76: 'Infinitas',  77: 'Nodare',    78: 'Dimidius',  79: 'Scutulata',
   80: 'Arcus',      81: 'Botulus',   82: 'Americano', 83: 'Symphonia',
   84: 'Vicis',      85: 'Janus',     86: 'Levar',     87: 'Gemma',
   88: 'Favus',      89: 'Tessera',   90: 'Frondis',   91: 'Pistrix',
   92: 'Nebula',     93: 'Fractus',   94: 'Hennae',    95: 'Pulvillus',
   96: 'Quilta',     97: 'Foramen',   98: 'Emblema',   99: 'Fortuno',
  100: 'Splendico', 101: 'Hexas',    102: 'Spargo',   103: 'Latus',
  104: 'Lentium',   105: 'Altilium', 106: 'Procursus',107: 'Stillas',
  108: 'Inverso',   109: 'Exclamo',  110: 'Imbris',   111: 'Pompeius',
  112: 'Conexus',   113: 'Cerebrum', 114: 'Garcius',  115: 'Porto',
  116: 'Florens',   117: 'Topologia',118: 'Losgann',  119: 'Triquetra',
};

function frogFullName(colorId, patternId, genusId) {
  const color   = (COLORS[colorId]    || ['?'])[0];
  const pattern = PATTERNS[patternId] || '?';
  const genus   = GENERA[genusId]     || '?';
  return `${color} ${pattern} ${genus}`;
}

function parseWeekCode(code) {
  const s = String(code);
  if (s.length < 5) return s;
  return `Week ${parseInt(s.slice(4), 10)}, ${s.slice(0, 4)}`;
}

// Parse the 3-line-per-set sets.txt format
function parseSetsText(raw) {
  const sets  = [];
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
  let i = 0;
  while (i + 2 < lines.length) {
    const code     = lines[i];
    const name     = lines[i + 1];
    const frogsStr = lines[i + 2];
    const frogs    = [];
    frogsStr.split(',').forEach(part => {
      const p = part.trim().split(':');
      if (p.length === 4) {
        const nums = p.map(Number);
        if (nums.every(n => !isNaN(n))) frogs.push(nums); // [count,colorId,patternId,genusId]
      }
    });
    if (frogs.length) sets.push({ code, name, frogs });
    i += 3;
  }
  return sets;
}

module.exports = { COLORS, PATTERNS, PATTERN_COLORS, GENERA, frogFullName, parseWeekCode, parseSetsText };
