#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""分区图标审片：透明底铺在卡片色上，按实际显示尺寸看。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "media" / "images" / "section"
OUT = ROOT / "assets" / "review" / "icons.png"


def font(size):
    for n in ("msyhbd.ttc", "msyh.ttc", "simhei.ttf"):
        try:
            return ImageFont.truetype(n, size)
        except Exception:
            continue
    return ImageFont.load_default()


def main() -> None:
    files = sorted(SRC.glob("*.webp"))
    if not files:
        print("还没有图标")
        return
    cell, cols = 120, 6
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * cell, rows * (cell + 22)), (253, 248, 243))
    d = ImageDraw.Draw(sheet)
    f = font(12)
    for i, p in enumerate(files):
        r, c = divmod(i, cols)
        x, y = c * cell, r * (cell + 22)
        d.rounded_rectangle([x + 6, y + 6, x + cell - 6, y + cell - 6], radius=16, fill=(255, 245, 236))
        with Image.open(p) as im:
            im = im.convert("RGBA")
            im.thumbnail((cell - 30, cell - 30), Image.LANCZOS)
            sheet.paste(im, (x + (cell - im.width) // 2, y + (cell - im.height) // 2), im)
        d.text((x + 8, y + cell - 2), p.stem, fill=(70, 62, 54), font=f)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT)
    print(f"{len(files)} 个图标 -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
