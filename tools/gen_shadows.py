#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
影子剪影图生成器（quiz_shadow 卡专用）。

问题：quiz-shadow-*-shadow.webp 曾是纯色废图（生成管线 bug 产物，整图单一颜色），
ShadowQuiz 组件 <img> 分支直接整幅显示它，"猜影子"玩法失效。

原理：剪影不需要单独出图 —— 从已合纸底的主图按色差分离前景，
填充统一剪影色（深暖黑，延续原设计），边缘按色差比例渐变抗锯齿。

    public/media/images/apple.webp
        → 色差分离前景（纸底 #FFFDF8）
        → 前景填 (46,42,39)，alpha 按边缘渐变
        → public/media/images/quiz-shadow-apple_shadow.webp

用法：
    python tools/gen_shadows.py               # 全部 quiz_shadow 卡
    python tools/gen_shadows.py --ids apple   # 只重出 apple 一张
"""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

from PIL import Image

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "src" / "content" / "cards.json"
IMG = ROOT / "public" / "media" / "images"

# 剪影色：深暖黑（与原设计色一致）；纸底色：全局合成纸底
SILHOUETTE = (46, 42, 39)
PAPER = (0xFF, 0xFD, 0xF8)
# 与纸底的色差超过此值算前景；60~90 之间按比例渐变（抗锯齿边）
FG_FULL = 90
FG_START = 60


def make_shadow(src: Path, dst: Path) -> bool:
    """主图 → 剪影图。返回 False 表示主图缺失或前景为空。"""
    if not src.exists():
        print(f"  ✗ 主图不存在: {src.name}")
        return False
    im = Image.open(src).convert("RGB")
    w, h = im.size
    px = im.load()

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()
    touched = False
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            diff = abs(r - PAPER[0]) + abs(g - PAPER[1]) + abs(b - PAPER[2])
            if diff > FG_START:
                alpha = 255 if diff >= FG_FULL else int(255 * (diff - FG_START) / (FG_FULL - FG_START))
                if alpha > 0:
                    op[x, y] = (*SILHOUETTE, alpha)
                    touched = True
    if not touched:
        print(f"  ✗ 主图无前景（可能也是纯色图）: {src.name}")
        return False
    out.save(dst, "WEBP", lossless=True)
    return True


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", default="", help="只处理这些目标（逗号分隔，如 apple,car）")
    args = ap.parse_args()
    only = {s.strip() for s in args.ids.split(",") if s.strip()}

    cards = json.loads(CARDS.read_text(encoding="utf-8"))
    shadows = [c for c in cards if c.get("type") == "quiz_shadow"]

    done = 0
    for c in shadows:
        target = c["id"].replace("quiz-shadow-", "")
        if only and target not in only:
            continue
        src = IMG / f"{target}.webp"
        dst = IMG / f"{c['id']}_shadow.webp"
        if make_shadow(src, dst):
            done += 1
            print(f"  ✓ {c['id']} ← {target}.webp")

    print(f"完成 {done}/{len(shadows)} 张剪影")
    return 0 if done == len([c for c in shadows if not only or c['id'].replace('quiz-shadow-','') in only]) else 1


if __name__ == "__main__":
    raise SystemExit(main())
