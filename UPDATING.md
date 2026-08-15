# Updating Splashdex from a new Pocket Frogs release

Everything Splashdex mirrors — genera, colours, patterns, levels, scenery, sprites — can be
pulled straight out of the Android build. This is the process, plus the traps that have
bitten us before.

Last run against **3.20.1** (versionCode 187), which added genera **121 Tempero** and
**122 Flagro** and the Dry Desert field trip scenery.

---

## 0. Prerequisites

The game is a Unity (il2cpp) build. Balance tables ship as Unity `TextAsset`s holding plain
CSV, and every sprite is an uncompressed **RGBA32** `Texture2D` — so extraction is lossless
and there is no need to decompile any native code.

```bash
python3 -m venv /tmp/pfvenv
/tmp/pfvenv/bin/pip install UnityPy Pillow
```

`tools/pf_extract.py` wraps everything below. It accepts a `.xapk`, a `.apk`, or an
already-unpacked directory, and finds the base APK inside an XAPK on its own.

---

## 1. Dump the game data

```bash
/tmp/pfvenv/bin/python tools/pf_extract.py data PocketFrogs.xapk -o /tmp/pf_data
```

That writes ~17 files. The ones that matter:

| File | Feeds |
|---|---|
| `patternTable.csv` | `GENERA` + `GENUS_LEVEL` |
| `baseColors.csv` | `COLORS` (id, name, R, G, B) |
| `patternColors.csv` | `PATTERNS` + `PATTERN_COLORS` |
| `animatedPatternTable.csv` | `ANIMATED_GENERA` |
| `scenery.csv` | `SCENERY_DATA` |
| `stockFrogs.csv` | `FROG_TYPES` |
| `monthFrogs.csv` | monthly frogs (not yet surfaced in the UI) |
| `awards` | award list (not yet surfaced in the UI) |
| `release-notes` | quick sanity check on what the update actually changed |

### ⚠️ The game's vocabulary is not Splashdex's

This is the single biggest source of mistakes. In the game's own CSVs:

| Game says | Actually means | Splashdex calls it |
|---|---|---|
| `patternTable.csv`, column `pattern ID` | the **genus** (Anura, Flagro, …) | `GENERA` |
| `patternColors.csv` | the pattern (Picea, Aurum, …) | `PATTERNS` / `PATTERN_COLORS` |
| `baseColors.csv` | the body colour | `COLORS` |
| `stockFrogs.csv`, column `pattern` | the **genus id** | `genusId` |
| `stockFrogs.csv`, column `pattern color` | the pattern id | `patternId` |
| `animatedPatternTable.csv`, column `patternId` | the **genus id** | key of `ANIMATED_GENERA` |

So `patternTable.csv` row `122,Flagro,50,XXO|OXO|OOX` reads as: **genus** 122, named Flagro,
unlocked at level 50, with that breeding search grid. The third column is exactly
`GENUS_LEVEL`.

---

## 2. Diff against what Splashdex already has

```bash
# genera: compare the tail against GENERA in index.html
tail -8 /tmp/pf_data/patternTable.csv

# colours / patterns: these change very rarely, but check
diff <(cut -d, -f1,2 /tmp/pf_data/baseColors.csv) ...
```

If `baseColors.csv` and `patternColors.csv` are unchanged (23 and 16 rows), only the genus,
scenery and stock-frog tables need touching.

---

## 3. Extract the sprites

List what's new, then pull it:

```bash
/tmp/pfvenv/bin/python tools/pf_extract.py list PocketFrogs.xapk --match '^frog_12'

/tmp/pfvenv/bin/python tools/pf_extract.py sprite PocketFrogs.xapk -o frog_sprites \
    -n frog_121_256 frog_122_256 frog_122_anim
```

### Sprite naming

| Unity object | Splashdex file | Notes |
|---|---|---|
| `frog_<n>_256` | `frog_sprites/frog_<n>_256.png` | genus mask, 512×256 (adult + juvenile side by side) |
| `frog_<n>_top_256` | `frog_sprites/frog_<n>_extra_256.png` | **renamed** — game calls it `_top_`, we call it `_extra_` |
| `frog_<n>_anim` | `frog_sprites/frog_<n>_anim.png` | scrolling texture for animated genera |
| `frog_base_256` | `frog_sprites/frog_base_256.png` | |
| `overlay_256` | `frog_sprites/overlay_256.png` | |
| `scenery_<n>` | `scenery_sprites/scenery_<n>.png` | |

Scenery needs a regex sweep instead of a name list:

```bash
/tmp/pfvenv/bin/python tools/pf_extract.py sprite PocketFrogs.xapk -o scenery_sprites \
    --match '^scenery_1[5-8][0-9]$'
```

### Always extract one sprite you already have

Re-extract something already in the repo and compare it. A scenery sprite should come out
**pixel-identical**; a frog mask matches on RGB with sub-1% alpha drift at anti-aliased
edges (art gets retouched between releases). If a control sprite comes out flipped, shifted,
or wildly different, the pipeline is wrong — stop and fix it before trusting the new files.

---

## 4. Apply the changes

| File | What to update |
|---|---|
| `index.html` | `GENERA`, `GENUS_LEVEL`, `FROG_TYPES`, `SCENERY_DATA`, `EXTRA_LAYER_GENERA`, `ANIMATED_GENERA`, the header counts, and the `og:description` |
| `api/_data.js` | `COLORS`, `PATTERNS`, `PATTERN_COLORS`, `GENERA` — **must stay in sync with `index.html`** |
| `api/og.js` | `EXTRA_LAYER_GENERA`, `ANIMATED_GENERA` |
| `README.md` | only if the rendering rules changed |

`api/stats.js` derives its totals from `api/_data.js`, so it needs no edit.

Header counts are `colors × patterns × genera` — 23 × 16 × 123 = **45,264** at 3.20.1.
Remember `GENERA` is zero-indexed, so genus 122 means 123 genera.

### Special rendering cases

Both live in `index.html` **and** `api/og.js`, and both must be updated together:

- **`EXTRA_LAYER_GENERA`** — genera with an untinted third layer. Add the id, drop
  `frog_<id>_extra_256.png` into `frog_sprites/`. Layer order is genus-specific; see the
  README. Currently `{115, 116, 119, 120}` — i.e. every genus with a `_top_256` texture.
- **`ANIMATED_GENERA`** — genera whose pattern layer is a scrolling tiled texture instead of
  a flat tint. Read the row straight out of `animatedPatternTable.csv`:
  `122,Atlases/frogs/frog_122_anim,v-scroll,0.25,1.35,1.0` becomes
  `122: { texture: 'frog_122_anim.png', speed: 0.25, scaleX: 1.35, scaleY: 1.0 }`.
  `scaleX`/`scaleY` are how many times the texture repeats across the 256px frog cell.
  In the browser these frogs register in `chromaCanvases` and redraw every rAF tick; in
  `api/og.js` they force the GIF path so Discord embeds animate too.

---

## 5. Verify

Serve the site (`python3 -m http.server 8777`) — `file://` taints the canvas and breaks
`getImageData`, so the frogs will silently fail to render.

- [ ] New genera appear in the builder dropdown and render
- [ ] Static frogs stay static; sample the canvas twice ~500ms apart and confirm 0% change
- [ ] Chroma frogs still cycle hue
- [ ] Animated genera actually move (~7% of pixels change over 500ms)
- [ ] Porto (115) still composites genus *above* the overlay
- [ ] Every `SCENERY_DATA` filename resolves — `HEAD` each one and check for 404s
- [ ] `node` render of `api/og.js` returns `image/gif` for animated genera, `image/png` otherwise

---

## Known quirks in the game data

These are Nimblebit's, not ours — reproduce them faithfully rather than "fixing" them.

- **`stockFrogs.csv` IDs are unreliable.** ID 210 is used three times, and genus 110 (Imbris)
  has no stock frog at all. Re-index sequentially on import; do not assume `id == genusId`.
  An earlier import trusted the ID column and left `FROG_TYPES` genus ids shifted −2 from
  their names for the whole tail.
- **`stockFrogs.csv` row 185** is genus 90 (Frondis) but named "Palma", duplicating row 166.
  That's a typo in the source.
- **`patternColors.csv` gives Picea `(0,0,0)` and Chroma `(1,1,1)`.** Splashdex deliberately
  uses `(30,20,10)` for both. Tinting here is multiplicative, so a pure-black pattern colour
  would flatten every bit of detail in the genus mask. Do not "correct" these from the CSV.
- **`scenery.csv` mixes two kinds of row.** `type` 0 is placeable scenery (what
  `SCENERY_DATA` tracks, `scenery_*.png`); `type` 2 is a habitat background (`bg_*.jpg`),
  which Splashdex does not use. Filter on `type == 0`.
- **`FROG_TYPES` is currently dead data** — defined in `index.html` and referenced nowhere.
  Kept as a reference table.
