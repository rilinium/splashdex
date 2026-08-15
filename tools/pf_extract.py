#!/usr/bin/env python3
"""Pull game data and sprites out of a Pocket Frogs APK/XAPK.

The game is a Unity (il2cpp) build. Everything Splashdex needs lives in
assets/bin/Data as Unity serialized objects: the balance tables are TextAssets
holding plain CSV, and every frog/scenery sprite is an uncompressed RGBA32
Texture2D.

Requires UnityPy:  pip install UnityPy Pillow

Usage
-----
  # Dump every CSV/TextAsset (patternTable, baseColors, scenery, ...)
  python3 tools/pf_extract.py data  <apk|xapk|dir> -o /tmp/pf_data

  # List texture names (optionally filtered by a regex)
  python3 tools/pf_extract.py list  <apk|xapk|dir> --match '^frog_'

  # Extract specific textures to PNG (names are Unity object names, no .png)
  python3 tools/pf_extract.py sprite <apk|xapk|dir> -o frog_sprites \
      -n frog_122_256 frog_122_anim

  # Or extract everything matching a regex
  python3 tools/pf_extract.py sprite <apk|xapk|dir> -o out --match '^scenery_1[5-8][0-9]$'
"""

import argparse
import os
import re
import shutil
import sys
import tempfile
import zipfile

try:
    import UnityPy
except ImportError:
    sys.exit("UnityPy is required:  pip install UnityPy Pillow")


def resolve_data_dir(path, workdir):
    """Accept a .xapk, a .apk, or an already-unpacked directory; return .../assets/bin/Data."""
    if os.path.isdir(path):
        candidate = os.path.join(path, "assets", "bin", "Data")
        return candidate if os.path.isdir(candidate) else path

    if not zipfile.is_zipfile(path):
        sys.exit(f"not a directory or zip archive: {path}")

    stage = os.path.join(workdir, "unpacked")
    os.makedirs(stage, exist_ok=True)
    with zipfile.ZipFile(path) as zf:
        names = zf.namelist()
        # An XAPK wraps the real APK plus per-ABI splits; the base APK holds the assets.
        inner = [n for n in names if n.endswith(".apk") and not n.startswith("config.")]
        if inner:
            base = max(inner, key=lambda n: zf.getinfo(n).file_size)
            print(f"[xapk] base APK: {base}")
            zf.extract(base, stage)
            return resolve_data_dir(os.path.join(stage, base), workdir)
        zf.extractall(stage)

    candidate = os.path.join(stage, "assets", "bin", "Data")
    if not os.path.isdir(candidate):
        sys.exit(f"no assets/bin/Data inside {path}")
    return candidate


def iter_objects(data_dir, type_name):
    for fn in sorted(os.listdir(data_dir)):
        p = os.path.join(data_dir, fn)
        if not os.path.isfile(p):
            continue
        try:
            env = UnityPy.load(p)
        except Exception:
            continue
        for obj in env.objects:
            if obj.type.name != type_name:
                continue
            try:
                yield obj.read(), fn
            except Exception:
                continue


def safe_name(name):
    return "".join(c if c.isalnum() or c in "._-" else "_" for c in name)


def cmd_data(args, data_dir):
    os.makedirs(args.out, exist_ok=True)
    count = 0
    for d, src in iter_objects(data_dir, "TextAsset"):
        name = getattr(d, "m_Name", "") or "unnamed"
        raw = getattr(d, "m_Script", None)
        if raw is None:
            continue
        if isinstance(raw, str):
            raw = raw.encode("utf-8", "surrogateescape")
        out = os.path.join(args.out, safe_name(name))
        if not out.endswith((".csv", ".txt", ".json")):
            out += ".txt"
        with open(out, "wb") as f:
            f.write(raw)
        print(f"{name:38s} {len(raw):8d} bytes   ({src})")
        count += 1
    print(f"\n{count} TextAssets -> {args.out}")


def cmd_list(args, data_dir):
    rx = re.compile(args.match) if args.match else None
    seen = set()
    for d, src in iter_objects(data_dir, "Texture2D"):
        name = getattr(d, "m_Name", "")
        if not name or name in seen:
            continue
        if rx and not rx.search(name):
            continue
        seen.add(name)
        print(f"{name:32s} {getattr(d,'m_Width','?')}x{getattr(d,'m_Height','?')}   ({src})")
    print(f"\n{len(seen)} textures", file=sys.stderr)


def cmd_sprite(args, data_dir):
    if not args.names and not args.match:
        sys.exit("pass -n/--names and/or --match")
    os.makedirs(args.out, exist_ok=True)
    want = set(args.names or [])
    rx = re.compile(args.match) if args.match else None

    got = set()
    for d, _src in iter_objects(data_dir, "Texture2D"):
        name = getattr(d, "m_Name", "")
        if not name or name in got:
            continue
        if not (name in want or (rx and rx.search(name))):
            continue
        out = os.path.join(args.out, name + ".png")
        d.image.save(out)
        got.add(name)
        print(f"saved {out}  {d.image.size}")

    missing = sorted(want - got)
    if missing:
        print(f"\nNOT FOUND: {missing}", file=sys.stderr)
    print(f"\n{len(got)} textures -> {args.out}")


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    for name in ("data", "list", "sprite"):
        s = sub.add_parser(name)
        s.add_argument("apk", help="path to .xapk, .apk, or unpacked directory")
        if name != "list":
            s.add_argument("-o", "--out", required=True, help="output directory")
        if name in ("list", "sprite"):
            s.add_argument("--match", help="regex filter on texture name")
        if name == "sprite":
            s.add_argument("-n", "--names", nargs="*", help="exact Unity object names")

    args = ap.parse_args()
    workdir = tempfile.mkdtemp(prefix="pf_extract_")
    try:
        data_dir = resolve_data_dir(args.apk, workdir)
        print(f"[data] {data_dir}\n")
        {"data": cmd_data, "list": cmd_list, "sprite": cmd_sprite}[args.cmd](args, data_dir)
    finally:
        shutil.rmtree(workdir, ignore_errors=True)


if __name__ == "__main__":
    main()
