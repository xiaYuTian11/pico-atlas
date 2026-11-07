#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把截图拼成审片图（一屏看完 26 类卡片）。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "assets" / "shots"
OUT = ROOT / "assets" / "review"


def font(size: int):
    for name in ("msyh.ttc", "msyhbd.ttc", "simhei.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def main() -> None:
    files = sorted(SRC.glob("card-*.png"))
    if not files:
        print("没有截图")
        return
    cols, w = 8, 190
    lab = 20
    h = int(w * 844 / 390)
    per = 24
    OUT.mkdir(parents=True, exist_ok=True)
    for page, start in enumerate(range(0, len(files), per), 1):
        chunk = files[start : start + per]
        rows = (len(chunk) + cols - 1) // cols
        sheet = Image.new("RGB", (cols * w, rows * (h + lab)), (245, 240, 234))
        d = ImageDraw.Draw(sheet)
        f = font(12)
        for i, p in enumerate(chunk):
            r, c = divmod(i, cols)
            x, y = c * w, r * (h + lab)
            with Image.open(p) as im:
                sheet.paste(im.convert("RGB").resize((w, h), Image.LANCZOS), (x, y))
            d.text((x + 5, y + h + 3), p.stem.replace("card-", ""), fill=(60, 52, 46), font=f)
        dst = OUT / f"cards-{page}.png"
        sheet.save(dst)
        print(f"{len(chunk)} 张 -> {dst.relative_to(ROOT)} ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    main()
