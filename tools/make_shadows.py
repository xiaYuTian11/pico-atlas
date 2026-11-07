#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
从成品插画生成剪影图（找影子卡用）。

为什么要单独生成：
  CSS 用 filter: brightness(0) 压黑时，彩色 emoji 会变成一团糊，
  水彩图的浅色边缘也会留下灰边。真正的剪影要从主体轮廓抠出来。

产物：public/media/images/<id>_shadow.webp（透明底 + 深色剪影）
"""

from __future__ import annotations

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
IMG = ROOT / "public" / "media" / "images"
PAPER = np.array([255, 253, 248], dtype=np.int16)
INK = (46, 42, 38)


def largest_component(mask: np.ndarray) -> np.ndarray:
    """只保留最大的连通块，去掉零碎的噪点。"""
    h, w = mask.shape
    seen = np.zeros((h, w), dtype=bool)
    best = np.zeros((h, w), dtype=bool)
    best_size = 0
    for y in range(0, h, 4):
        for x in range(0, w, 4):
            if not mask[y, x] or seen[y, x]:
                continue
            q = deque([(y, x)])
            seen[y, x] = True
            comp = []
            while q:
                cy, cx = q.popleft()
                comp.append((cy, cx))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = cy + dy, cx + dx
                    if 0 <= ny < h and 0 <= nx < w and mask[ny, nx] and not seen[ny, nx]:
                        seen[ny, nx] = True
                        q.append((ny, nx))
            if len(comp) > best_size:
                best_size = len(comp)
                best = np.zeros((h, w), dtype=bool)
                for cy, cx in comp:
                    best[cy, cx] = True
    return best


def make_shadow(card_id: str) -> bool:
    src = IMG / f"{card_id}.webp"
    if not src.exists():
        print(f"跳过 {card_id}：没有主图")
        return False

    img = Image.open(src).convert("RGB").resize((384, 384), Image.LANCZOS)
    arr = np.asarray(img).astype(np.int16)
    dist = np.abs(arr - PAPER).sum(axis=2)
    mask = dist > 60

    # 粗略清理：先腐蚀去噪点，再膨胀补回
    m = Image.fromarray((mask * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))
    mask = np.asarray(m) > 127

    mask = largest_component(mask)
    # 填洞：从边缘泛洪，没被淹到的内部孔洞就是主体内部
    filled = mask.copy()
    h, w = mask.shape
    outside = np.zeros((h, w), dtype=bool)
    q = deque()
    for x in range(w):
        for y in (0, h - 1):
            if not mask[y, x]:
                outside[y, x] = True
                q.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if not mask[y, x]:
                outside[y, x] = True
                q.append((y, x))
    while q:
        cy, cx = q.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not mask[ny, nx] and not outside[ny, nx]:
                outside[ny, nx] = True
                q.append((ny, nx))
    filled = ~outside

    alpha = Image.fromarray((filled * 255).astype(np.uint8)).resize((768, 768), Image.LANCZOS)
    alpha = alpha.filter(ImageFilter.GaussianBlur(1.2))
    out = Image.new("RGBA", (768, 768), (*INK, 0))
    out.putalpha(alpha.point(lambda v: int(v * 0.92)))
    dst = IMG / f"{card_id}_shadow.webp"
    out.save(dst, "WEBP", quality=86, method=4)
    print(f"剪影 -> {dst.name}")
    return True


if __name__ == "__main__":
    ids = sys.argv[1:] or ["quiz-shadow-cat", "quiz-shadow-car", "quiz-shadow-apple"]
    for cid in ids:
        make_shadow(cid)
