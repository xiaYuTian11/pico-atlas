#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""素材体检：还缺哪些图、哪些语音，各自多大。

用法：
  python tools/media_report.py            # 全量
  python tools/media_report.py --lane read
  python tools/media_report.py --missing-only

注意：卡片有两份（cards.json 手写精修 + cards-auto.json 词库批量），
运行时是合并的，所以体检也必须按合并后的来 —— 只看 cards.json 会漏报一半。
"""

from __future__ import annotations

import argparse
import os
import sys
from pathlib import Path

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

from gen_audio import jobs_for, load_cards  # noqa: E402

IMG = ROOT / "public" / "media" / "images"

ART_TYPES = {"object", "poem", "story", "quiz_shadow", "part_to_whole"}


def size_of(paths: list[Path]) -> int:
    return sum(p.stat().st_size for p in paths if p.exists())


def image_targets(card: dict) -> list[Path]:
    """这张卡片真正会渲染的图片文件。

    影子题（quiz_shadow）的视觉是剪影 `_shadow`，主图根本不参与渲染，
    别把它算成"缺图"，否则永远体检不过。
    """
    if card.get("type") not in ART_TYPES:
        return []
    if (card.get("art") or {}).get("skip"):
        return []
    cid = card["id"]
    if card.get("type") == "quiz_shadow":
        return [IMG / f"{cid}_shadow.webp"]
    return [IMG / f"{cid}.webp"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lane", default="")
    ap.add_argument("--missing-only", action="store_true")
    args = ap.parse_args()

    cards = load_cards()
    if args.lane:
        cards = [c for c in cards if c.get("lane") == args.lane]

    img_jobs: list[tuple[dict, Path]] = []
    for c in cards:
        for p in image_targets(c):
            img_jobs.append((c, p))
    missing_img = [(c, p) for (c, p) in img_jobs if not p.exists()]

    audio_jobs = []
    for c in cards:
        audio_jobs.extend(jobs_for(c))
    missing_audio = [p for (p, _t, _v) in audio_jobs if not p.exists() or p.stat().st_size < 800]

    print(f"卡片 {len(cards)} 张（cards.json + cards-auto.json 合并）")
    print(
        f"插图 {len(img_jobs) - len(missing_img)}/{len(img_jobs)} 张，"
        f"{size_of([p for (_c, p) in img_jobs]) / 1024 / 1024:.1f} MB"
    )
    print(
        f"语音 {len(audio_jobs) - len(missing_audio)}/{len(audio_jobs)} 条，"
        f"{size_of([p for (p, _t, _v) in audio_jobs]) / 1024 / 1024:.1f} MB"
    )

    if missing_img and not args.missing_only:
        print("\n缺插图：")
        for c, p in missing_img[:60]:
            print(f"  {c['id']:<22} {c.get('type', ''):<14} {c.get('zh', '')}")
        if len(missing_img) > 60:
            print(f"  ... 还有 {len(missing_img) - 60} 张")

    if missing_audio:
        print("\n缺语音：" + "、".join(p.name for p in missing_audio[:20]))
        if len(missing_audio) > 20:
            print(f"  ... 还有 {len(missing_audio) - 20} 条")

    if not missing_img and not missing_audio:
        print("\n素材齐了 ✅")
    return 0


if __name__ == "__main__":
    sys.exit(main())
