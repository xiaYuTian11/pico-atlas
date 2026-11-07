#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
素材体检：还缺哪些图、哪些语音，各自多大。

用法：
  python tools/media_report.py            # 全量
  python tools/media_report.py --lane read
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))

from gen_audio import jobs_for  # noqa: E402

CARDS = ROOT / "src" / "content" / "cards.json"
IMG = ROOT / "public" / "media" / "images"

ART_TYPES = {"object", "poem", "story", "quiz_shadow", "part_to_whole"}


def size_of(p: Path) -> int:
    return p.stat().st_size if p.exists() else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--lane", default="")
    ap.add_argument("--missing-only", action="store_true")
    args = ap.parse_args()

    cards = json.loads(CARDS.read_text(encoding="utf-8"))
    if args.lane:
        cards = [c for c in cards if c.get("lane") == args.lane]

    need_img = [c for c in cards if c.get("art") or c.get("type") in ART_TYPES]
    missing_img = [c for c in need_img if not (IMG / f"{c['id']}.webp").exists()]

    audio_jobs = []
    for c in cards:
        audio_jobs.extend(jobs_for(c))
    missing_audio = [p for (p, _t, _v) in audio_jobs if not p.exists() or p.stat().st_size < 800]

    img_total = sum(size_of(IMG / f"{c['id']}.webp") for c in need_img)
    audio_total = sum(size_of(p) for (p, _t, _v) in audio_jobs)

    print(f"卡片 {len(cards)} 张")
    print(f"插图 {len(need_img) - len(missing_img)}/{len(need_img)} 张，{img_total / 1024 / 1024:.1f} MB")
    print(f"语音 {len(audio_jobs) - len(missing_audio)}/{len(audio_jobs)} 条，{audio_total / 1024 / 1024:.1f} MB")

    if missing_img and not args.missing_only:
        print("\n缺插图：")
        for c in missing_img[:60]:
            print(f"  {c['id']:<22} {c.get('zh', '')}")
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
