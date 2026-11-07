#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
批量插图生成（本地 Stable Diffusion 1.5 / GTX 1050Ti 4G 可跑）。

设计原则：**加内容不改代码**
  - 卡片 JSON 里带一个可选的 `art` 字段，脚本读它出图
  - 没写 art 的 object 卡片自动用 `en` 兜底
  - 已有同名输出的跳过（可断点续跑），--force 才重画

产物：
  assets/gen_raw/<id>.png            原图（512×512，方便重做后处理）
  public/media/images/<id>.webp      上线图（768×768，去背 + 统一纸底 + 调色）

用法：
  .venv\\Scripts\\python.exe tools\\gen_images.py --ids apple,banana
  .venv\\Scripts\\python.exe tools\\gen_images.py --types object,poem,story
  .venv\\Scripts\\python.exe tools\\gen_images.py --types object --limit 6 --force
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

os.environ.setdefault("HF_HUB_ENABLE_HF_TRANSFER", "0")
os.environ.setdefault("HF_HOME", str(Path("D:/dev/hf-cache").resolve()))
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "src" / "content" / "cards.json"
CARDS_AUTO = ROOT / "src" / "content" / "cards-auto.json"
CONFIG = ROOT / "tools" / "art.config.json"
RAW_DIR = ROOT / "assets" / "gen_raw"
OUT_DIR = ROOT / "public" / "media" / "images"

# 统一纸底（D2 决策：所有插画同一个纸色，否则 700 张会出 700 种白）
PAPER = (255, 253, 248)

def load_config() -> dict:
    if CONFIG.exists():
        return json.loads(CONFIG.read_text(encoding="utf-8"))
    return {}


CFG = load_config()

STYLE = CFG.get("style", "")
NEG = CFG.get("negative", "")
TYPE_HINTS = CFG.get("type_templates", {})
SCENE_TYPES = set(CFG.get("scene_types", []))
txt_pipe_holder: dict = {}


def sha_seed(text: str, base: int = 0) -> int:
    h = hashlib.sha256(text.encode("utf-8")).hexdigest()
    return (int(h[:8], 16) + base) % (2**31 - 1)


def load_cards() -> list[dict]:
    """手写版 + 词库版合并（同 id 以手写版为准）。"""
    merged: dict[str, dict] = {}
    if CARDS_AUTO.exists():
        for c in json.loads(CARDS_AUTO.read_text(encoding="utf-8")):
            merged[c["id"]] = c
    for c in json.loads(CARDS.read_text(encoding="utf-8")):
        merged[c["id"]] = c
    return list(merged.values())


def build_prompt(card: dict) -> tuple[str, str, int, bool]:
    """返回 (正向, 负向, seed, 是否抠图)"""
    art = card.get("art") or {}
    ctype = card.get("type", "object")

    subject = art.get("subject")
    if not subject:
        en = card.get("en") or card.get("zh") or card.get("id")
        subject = en

    template = art.get("scene_template") or TYPE_HINTS.get(ctype, "{subject}")
    body = template.replace("{subject}", subject)

    extra = art.get("style_extra", "")
    prompt = f"{body}, {STYLE}"
    if extra:
        prompt = f"{body}, {extra}, {STYLE}"
    if art.get("prompt"):
        prompt = f"{art['prompt']}, {STYLE}"

    cutout = art.get("cutout")
    if cutout is None:
        cutout = ctype not in SCENE_TYPES

    seed = int(art.get("seed") or sha_seed(card["id"]))
    return prompt, NEG, seed, cutout


def make_pipe(model: str):
    import torch
    from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

    print(f"[model] {model} ...", flush=True)
    pipe = StableDiffusionPipeline.from_pretrained(
        model,
        torch_dtype=torch.float16,
        safety_checker=None,
        requires_safety_checker=False,
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config,
        algorithm_type="dpmsolver++",
        use_karras_sigmas=True,
    )
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()
    try:
        pipe.enable_vae_slicing()
    except Exception:
        pass
    pipe.to("cuda")
    return pipe


def make_img2img():
    from diffusers import StableDiffusionImg2ImgPipeline

    pipe = StableDiffusionImg2ImgPipeline.from_pipe(txt_pipe_holder["pipe"])
    pipe.set_progress_bar_config(disable=True)
    return pipe


def postprocess(src_png: Path, dst_webp: Path, cutout: bool, size: int, quality: int) -> None:
    from PIL import Image, ImageEnhance, ImageDraw, ImageFilter

    img = Image.open(src_png).convert("RGB")

    if cutout:
        try:
            from rembg import remove

            cut = remove(img)  # RGBA
            # 主体稍微内缩，避免贴边
            canvas = Image.new("RGB", (size, size), PAPER)
            subject = cut
            scale = min((size * 0.88) / subject.width, (size * 0.88) / subject.height)
            if scale != 1:
                subject = subject.resize(
                    (max(1, int(subject.width * scale)), max(1, int(subject.height * scale))),
                    Image.LANCZOS,
                )
            # 柔和落地阴影，让"贴纸"有实体感
            alpha = subject.split()[-1]
            shadow = Image.new("RGBA", subject.size, (120, 95, 70, 0))
            shadow.putalpha(alpha.filter(ImageFilter.GaussianBlur(14)).point(lambda v: int(v * 0.28)))
            x = (size - subject.width) // 2
            y = (size - subject.height) // 2
            canvas.paste(shadow, (x, y + 14), shadow)
            canvas.paste(subject, (x, y), subject)
            img = canvas
        except Exception as exc:  # rembg 没装 / 模型下载失败 → 保留原图
            print(f"  [warn] 抠图失败，保留原图：{exc}", flush=True)

    if img.size != (size, size):
        img = img.resize((size, size), Image.LANCZOS)

    # 色彩补偿（水彩天然低饱和）
    img = ImageEnhance.Color(img).enhance(1.12)
    img = ImageEnhance.Contrast(img).enhance(1.04)

    dst_webp.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst_webp, "WEBP", quality=quality, method=4)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default=CFG.get("model", "Lykon/dreamshaper-8"))
    ap.add_argument("--ids", default="")
    ap.add_argument("--types", default="")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--size", type=int, default=CFG.get("out_size", 768))
    ap.add_argument("--gen-size", type=int, default=CFG.get("gen_size", 512))
    ap.add_argument("--steps", type=int, default=CFG.get("steps", 20))
    ap.add_argument("--cfg", type=float, default=CFG.get("cfg", 7.5))
    ap.add_argument("--quality", type=int, default=CFG.get("webp_quality", 82))
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--no-cutout", action="store_true")
    args = ap.parse_args()

    cards = load_cards()
    ids = {s.strip() for s in args.ids.split(",") if s.strip()}
    types = {s.strip() for s in args.types.split(",") if s.strip()}

    todo = []
    for c in cards:
        if ids and c["id"] not in ids:
            continue
        if types and c.get("type") not in types:
            continue
        out = OUT_DIR / f"{c['id']}.webp"
        if out.exists() and not args.force:
            continue
        todo.append(c)

    if args.limit:
        todo = todo[: args.limit]

    if not todo:
        print("没有需要生成的卡片（都已存在，或筛选为空）")
        return 0

    print(f"待生成 {len(todo)} 张：{', '.join(c['id'] for c in todo)}")
    if args.dry_run:
        for c in todo:
            p, n, s, cut = build_prompt(c)
            print(f"\n--- {c['id']} (seed={s}, cutout={cut})\n{p}")
        return 0

    import torch

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    start = time.time()

    pipe = make_pipe(args.model)
    txt_pipe_holder["pipe"] = pipe
    txt_pipe_holder["pipe"] = pipe

    for i, card in enumerate(todo, 1):
        prompt, neg, seed, cutout = build_prompt(card)
        if args.no_cutout:
            cutout = False
        gen = torch.Generator(device="cuda").manual_seed(seed)
        t0 = time.time()
        result = pipe(
            prompt=prompt,
            negative_prompt=neg,
            width=args.gen_size,
            height=args.gen_size,
            num_inference_steps=args.steps,
            guidance_scale=args.cfg,
            generator=gen,
        )
        raw = RAW_DIR / f"{card['id']}.png"
        result.images[0].save(raw)
        postprocess(raw, OUT_DIR / f"{card['id']}.webp", cutout, args.size, args.quality)
        done = time.time() - start
        avg = done / i
        eta = avg * (len(todo) - i)
        print(
            f"[{i}/{len(todo)}] {card['id']}  {time.time() - t0:.1f}s  "
            f"(已用 {done / 60:.1f} 分，预计还要 {eta / 60:.1f} 分)",
            flush=True,
        )

    print(f"完成：{len(todo)} 张，总耗时 {(time.time() - start) / 60:.1f} 分钟")
    return 0


if __name__ == "__main__":
    sys.exit(main())
