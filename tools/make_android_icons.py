#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把桌面图标铺到 Android 的 mipmap 目录（含自适应图标前景层）。"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "public" / "media" / "icons" / "icon-1024.png"
RES = ROOT / "android" / "app" / "src" / "main" / "res"

LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FOREGROUND = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}


def main() -> None:
    src = Image.open(SRC).convert("RGB")

    for dpi, size in LEGACY.items():
        d = RES / f"mipmap-{dpi}"
        d.mkdir(parents=True, exist_ok=True)
        icon = src.resize((size, size), Image.LANCZOS)
        icon.save(d / "ic_launcher.png")
        # 圆形图标：圆形裁切
        round_icon = icon.convert("RGBA")
        mask = Image.new("L", (size, size), 0)
        from PIL import ImageDraw

        ImageDraw.Draw(mask).ellipse([0, 0, size - 1, size - 1], fill=255)
        round_icon.putalpha(mask)
        round_icon.save(d / "ic_launcher_round.png")

    for dpi, size in FOREGROUND.items():
        d = RES / f"mipmap-{dpi}"
        d.mkdir(parents=True, exist_ok=True)
        canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        # 自适应图标安全区：内容缩到 66%
        inner = int(size * 0.66)
        art = src.resize((inner, inner), Image.LANCZOS)
        mask = Image.new("L", (inner, inner), 0)
        from PIL import ImageDraw

        ImageDraw.Draw(mask).rounded_rectangle(
            [0, 0, inner - 1, inner - 1], radius=int(inner * 0.22), fill=255
        )
        canvas.paste(art, ((size - inner) // 2, (size - inner) // 2), mask)
        canvas.save(d / "ic_launcher_foreground.png")

    (RES / "values" / "ic_launcher_background.xml").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#FDF8F3</color>\n</resources>\n',
        encoding="utf-8",
    )
    print("android icons done")


if __name__ == "__main__":
    main()
