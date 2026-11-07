#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""生成 PWA / 桌面图标（纯 PIL，无外部素材）。"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "media" / "icons"
CREAM = (253, 248, 243)
ORANGE = (245, 144, 74)
INK = (46, 42, 38)

SIZES = {
    "icon-180.png": 180,
    "icon-192.png": 192,
    "icon-512.png": 512,
    "icon-512-maskable.png": 512,
}


def font(size: int):
    for name in ("msyhbd.ttc", "msyh.ttc", "simhei.ttf", "arialbd.ttf"):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()


def draw_icon(size: int, maskable: bool = False) -> Image.Image:
    ss = 4  # 超采样，边缘更干净
    s = size * ss
    img = Image.new("RGB", (s, s), CREAM)
    d = ImageDraw.Draw(img)

    pad = int(s * (0.18 if maskable else 0.08))
    r = int((s - pad * 2) * 0.24)
    d.rounded_rectangle([pad, pad, s - pad, s - pad], radius=r, fill=ORANGE)

    f = font(int(s * (0.30 if maskable else 0.40)))
    text = "图鉴"
    box = d.textbbox((0, 0), text, font=f)
    tw, th = box[2] - box[0], box[3] - box[1]
    d.text(((s - tw) / 2 - box[0], (s - th) / 2 - box[1] - s * 0.02), text, font=f, fill=(255, 255, 255))

    # 下面一行小字：PICO ATLAS
    f2 = font(int(s * 0.055))
    t2 = "PICO ATLAS"
    b2 = d.textbbox((0, 0), t2, font=f2)
    d.text(((s - (b2[2] - b2[0])) / 2, s * 0.70), t2, font=f2, fill=(255, 255, 255))

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for name, size in SIZES.items():
        draw_icon(size, maskable="maskable" in name).save(OUT / name)
        print("wrote", name)
    # 安卓/桌面都用得上的一张原图
    draw_icon(1024).save(OUT / "icon-1024.png")
    print("wrote icon-1024.png")


if __name__ == "__main__":
    main()
