#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
素材审片：把所有插图拼成一张带标签的总览图，一屏看完。
（一次看 40 张图，比逐个点开快得多 —— 批量出图后第一件事就是看这个）

用法：
  python tools/contact_sheet.py
  python tools/contact_sheet.py --cols 6 --size 220
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

from PIL import Image, ImageDraw, ImageFont  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "src" / "content" / "cards.json"
IMG = ROOT / "public" / "media" / "images"
OUT = ROOT / "assets" / "review"


def load_font(size: int):
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--cols", type=int, default=6)
    ap.add_argument("--size", type=int, default=200)
    args = ap.parse_args()

    cards = json.loads(CARDS.read_text(encoding="utf-8"))
    have = [(c, IMG / f"{c['id']}.webp") for c in cards if (IMG / f"{c['id']}.webp").exists()]
    if not have:
        print("还没有任何插图")
        return 1

    cols = args.cols
    cell = args.size
    label_h = 26
    rows = (len(have) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + label_h)), (252, 248, 243))
    draw = ImageDraw.Draw(sheet)
    font = load_font(15)

    for i, (card, path) in enumerate(have):
        r, c = divmod(i, cols)
        x, y = c * cell, r * (cell + label_h)
        with Image.open(path) as im:
            im = im.convert("RGB")
            im.thumbnail((cell - 8, cell - 8), Image.LANCZOS)
            sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2))
        label = f"{card.get('zh', card['id'])}"
        w = draw.textlength(label, font=font)
        draw.text((x + (cell - w) / 2, y + cell + 3), label, fill=(70, 62, 54), font=font)

    OUT.mkdir(parents=True, exist_ok=True)
    dst = OUT / "contact.png"
    sheet.save(dst)
    print(f"{len(have)} 张 -> {dst.relative_to(ROOT)}  ({sheet.width}×{sheet.height})")
    return 0


if __name__ == "__main__":
    sys.exit(main())
