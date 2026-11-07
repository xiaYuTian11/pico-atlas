#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
语音批量生成（edge-tts，免费、离线可重跑、无需 key）。

为什么必须预烘焙、不能用 WebSpeech：
  1. WebSpeech 的韵律是系统 TTS，机械、断句差、声调常错；
  2. 每台设备音色不一样，孩子听到的"妈妈的声音"会变；
  3. 无网/飞行模式直接失声。

产物（与 src/content/media.ts 的查找规则一一对应）：
  media/audio/zh/<id>.mp3            中文主词
  media/audio/en/<id>.mp3            英文主词
  media/audio/sent/zh/<id>_<band>.mp3 中文短句（按年龄档）
  media/audio/sent/en/<id>_<band>.mp3 英文短句
  media/audio/poem/<id>.mp3          古诗整首
  media/audio/poem/<id>_<n>.mp3      古诗第 n 句（1..4）
  media/audio/story/<id>_<band>.mp3  故事单页正文
  media/audio/quiz/<id>.mp3          益智题面
  media/audio/ui/mode_<mode>.mp3     模式切换人声

韵律策略（解决"语调不对"）：
  - 古诗：整首放慢 22%，句间用"。"制造停顿；逐句单独生成，句尾自然降调
  - 故事：放慢 12%，逗号处留气口
  - 识物：主词 -6%，短句 -8%
  - 英文：en-US-JennyNeural -10%，比默认慢，3 岁能跟上

多音字：卡片可写 `tts.zh` / `tts.sentZh` 覆盖"读出来的字"（显示的仍是原字）。

用法：
  python tools/gen_audio.py --ids apple,banana
  python tools/gen_audio.py --types poem,story
  python tools/gen_audio.py --all --force
  python tools/gen_audio.py --ui            # 只出 4 条模式语音
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys
from pathlib import Path

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "src" / "content" / "cards.json"
CARDS_AUTO = ROOT / "src" / "content" / "cards-auto.json"
OUT = ROOT / "public" / "media" / "audio"

VOICE = {
    "zh_word": ("zh-CN-XiaoxiaoNeural", "-6%", "-1Hz"),
    "zh_sent": ("zh-CN-XiaoxiaoNeural", "-8%", "-1Hz"),
    "zh_poem": ("zh-CN-XiaoxiaoNeural", "-22%", "-2Hz"),
    "zh_story": ("zh-CN-XiaoxiaoNeural", "-12%", "-1Hz"),
    "zh_quiz": ("zh-CN-XiaoxiaoNeural", "-6%", "-1Hz"),
    "en_word": ("en-US-JennyNeural", "-10%", "+0Hz"),
    "en_sent": ("en-US-JennyNeural", "-8%", "+0Hz"),
}

MODE_LINES = {
    "flip": "翻一页，读一读",
    "loop": "这一页，再读一遍",
    "tap": "点一点，读一读",
    "mute": "安静看书，不出声音",
}


def section_lines() -> list[tuple[str, str]]:
    """从 sections.ts 里抽出分区 id/中文名（避免两处维护）。"""
    text = (ROOT / "src" / "content" / "sections.ts").read_text(encoding="utf-8")
    pairs = re.findall(r"id:\s*'([a-z0-9_]+)'.*?zh:\s*'([^']+)'", text)
    return [(i, zh) for i, zh in pairs]


SECTION_LINES = section_lines()

BANDS = ("L1", "L2", "L3")


def load_cards() -> list[dict]:
    """手写版 + 词库版合并（同 id 以手写版为准）。"""
    merged: dict[str, dict] = {}
    if CARDS_AUTO.exists():
        for c in json.loads(CARDS_AUTO.read_text(encoding="utf-8")):
            merged[c["id"]] = c
    for c in json.loads(CARDS.read_text(encoding="utf-8")):
        merged[c["id"]] = c
    return list(merged.values())


def jobs_for(card: dict) -> list[tuple[Path, str, str]]:
    """返回 [(目标文件, 文本, 音色键), ...]"""
    out: list[tuple[Path, str, str]] = []
    tts = card.get("tts") or {}
    cid = card["id"]
    ctype = card.get("type", "object")
    levels = card.get("levels") or {}

    if ctype == "poem":
        lines = card.get("lines") or []
        for i, line in enumerate(lines, 1):
            out.append((OUT / "poem" / f"{cid}_{i}.mp3", line, "zh_poem"))
        if lines:
            # 整首：先去掉每句末尾的标点再拼接，否则会出现"，，。，"这种双标点，
            # TTS 会把停顿拉得很怪（这是之前语气不对的主因之一）
            bare = [line.rstrip("，。！？、；：,.!?;: ") for line in lines]
            out.append((OUT / "poem" / f"{cid}.mp3", "，".join(bare) + "。", "zh_poem"))
        return out

    if ctype == "story":
        for band in BANDS:
            text = (levels.get(band) or {}).get("text")
            if text:
                out.append((OUT / "story" / f"{cid}_{band}.mp3", text, "zh_story"))
        return out

    if ctype in {"quiz_shadow", "quiz_sound", "quiz_sort", "tracing", "part_to_whole", "cause_habit"}:
        out.append((OUT / "quiz" / f"{cid}.mp3", tts.get("zh") or card.get("zh", ""), "zh_quiz"))
        return out

    # 识物 / 数数 / 图形 / 颜色 / 对比 / 画板
    out.append((OUT / "zh" / f"{cid}.mp3", tts.get("zh") or card.get("zh", ""), "zh_word"))
    if card.get("en"):
        out.append((OUT / "en" / f"{cid}.mp3", tts.get("en") or card["en"], "en_word"))
    for band in BANDS:
        lv = levels.get(band) or {}
        if lv.get("sentence_zh"):
            out.append(
                (OUT / "sent" / "zh" / f"{cid}_{band}.mp3", lv["sentence_zh"], "zh_sent")
            )
        if lv.get("sentence_en"):
            out.append(
                (OUT / "sent" / "en" / f"{cid}_{band}.mp3", lv["sentence_en"], "en_sent")
            )
    return out


async def synth(text: str, voice_key: str, dst: Path) -> None:
    import edge_tts

    voice, rate, pitch = VOICE[voice_key]
    dst.parent.mkdir(parents=True, exist_ok=True)
    # 句末补一个句号，让 TTS 收尾降调，不要"念一半"的感觉
    speak_text = text if text.endswith(("。", "！", "？", ".", "!", "?")) else text + "。"
    comm = edge_tts.Communicate(speak_text, voice, rate=rate, pitch=pitch)
    await comm.save(str(dst))


async def run(jobs: list[tuple[Path, str, str]], force: bool, jobs_parallel: int = 4) -> None:
    todo = [(p, t, v) for (p, t, v) in jobs if force or not p.exists() or p.stat().st_size < 800]
    if not todo:
        print("没有需要生成的语音（都已存在）")
        return
    print(f"待生成 {len(todo)} 条语音")

    sem = asyncio.Semaphore(jobs_parallel)
    done = 0
    failed: list[str] = []

    async def one(p: Path, t: str, v: str) -> None:
        nonlocal done
        async with sem:
            try:
                await synth(t, v, p)
                done += 1
                if done % 10 == 0 or done == len(todo):
                    print(f"  {done}/{len(todo)}", flush=True)
            except Exception as exc:  # 网络抖动重试一次
                try:
                    await asyncio.sleep(1.5)
                    await synth(t, v, p)
                    done += 1
                except Exception:
                    failed.append(f"{p.name}: {exc}")

    await asyncio.gather(*(one(p, t, v) for p, t, v in todo))
    if failed:
        print("失败：\n  " + "\n  ".join(failed))
        sys.exit(1)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", default="")
    ap.add_argument("--types", default="")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--ui", action="store_true", help="只生成模式切换的 4 条人声")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    jobs: list[tuple[Path, str, str]] = []

    if args.ui:
        for key, line in MODE_LINES.items():
            jobs.append((OUT / "ui" / f"mode_{key}.mp3", line, "zh_sent"))
        for key, line in SECTION_LINES:
            jobs.append((OUT / "section" / f"{key}.mp3", line, "zh_sent"))
    else:
        ids = {s.strip() for s in args.ids.split(",") if s.strip()}
        types = {s.strip() for s in args.types.split(",") if s.strip()}
        for card in load_cards():
            if ids and card["id"] not in ids:
                continue
            if types and card.get("type") not in types:
                continue
            jobs.extend(jobs_for(card))

    if args.dry_run:
        for p, t, v in jobs:
            print(f"{p.relative_to(ROOT)}  [{v}]  {t}")
        return 0

    asyncio.run(run(jobs, args.force))
    return 0


if __name__ == "__main__":
    sys.exit(main())
