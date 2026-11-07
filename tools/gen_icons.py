#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
分区图标（替换 emoji）。

为什么要单独做：
  emoji 在网格胶囊里只有 24px，跨设备字形还不一样（安卓/苹果两套），
  整体质感被它拖累得最厉害。这里用同一套水彩风格出 30 个小图标。

产物：public/media/images/section/<id>.webp（透明底，256×256）
"""

from __future__ import annotations

import argparse
import json
import os
import time
from pathlib import Path

os.environ.setdefault("HF_HOME", "D:/dev/hf-cache")
os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
CFG = json.loads((ROOT / "tools" / "art.config.json").read_text(encoding="utf-8"))
OUT = ROOT / "public" / "media" / "images" / "section"
RAW = ROOT / "assets" / "gen_raw" / "section"

# 图标必须"一眼认出 + 细节少"，所以每个分区只给一个具体主体
ICONS = {
    # 三个入口
    "look": "a cute open picture book with a red apple on it",
    "read": "an open storybook with a tiny moon and stars above it",
    "play": "a wooden toy block with a star and a small ball beside it",
    # 认东西
    "fruits": "a shiny red apple with a green leaf and a yellow banana beside it",
    "vegetables": "an orange carrot and a red tomato side by side",
    "animals": "a cute cat face with whiskers and round ears",
    "food": "a slice of strawberry cake with a cherry on top",
    "vehicle": "a cute small red car seen from the side",
    "daily": "a wooden chair and a small table",
    "appliance": "a small home refrigerator with a round handle",
    "toys": "a teddy bear sitting with a red ball",
    "body": "a smiling child face with two hands waving",
    "nature": "a round green tree with a small sun",
    "clothing": "a folded blue t-shirt with a collar",
    "roles": "a friendly doctor with a white coat and a stethoscope",
    "plants": "a yellow sunflower with two green leaves",
    "places": "a small house with a red roof and a chimney",
    # 读一读
    "poems": "an ancient Chinese scroll with a brush and ink stone",
    "stories": "a closed storybook with a ribbon bookmark",
    # 玩一玩
    "numbers": "three colorful wooden counting blocks one two three",
    "shapes": "a red circle, a blue square and a yellow triangle together",
    "colors": "three paint blobs in red, yellow and blue with a brush",
    "opposites": "a big elephant and a tiny ant side by side",
    "quiz_shadow": "a cat silhouette shadow on a light wall",
    "quiz_sound": "a big orange speaker with sound waves",
    "quiz_sort": "two woven baskets with fruits inside",
    "tracing": "a dotted curvy line with a pencil at the end",
    "peek": "two long rabbit ears peeking above tall grass",
    "habit": "a toothbrush and a tube of toothpaste",
    "drawing": "a crayon and a blank sheet of paper",
}

NEG = (
    "photo, photorealistic, 3d render, oil painting, gradient, glossy, "
    "text, letters, watermark, signature, frame, border, dark background, "
    "blurry, deformed, multiple panels, collage, human face photo"
)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--ids", default="")
    ap.add_argument("--steps", type=int, default=16)
    ap.add_argument("--force", action="store_true")
    args = ap.parse_args()

    from diffusers import DPMSolverMultistepScheduler, StableDiffusionPipeline
    from rembg import remove
    from PIL import Image

    import torch

    ids = [s for s in args.ids.split(",") if s] or list(ICONS)
    OUT.mkdir(parents=True, exist_ok=True)
    RAW.mkdir(parents=True, exist_ok=True)

    todo = [i for i in ids if args.force or not (OUT / f"{i}.webp").exists()]
    if not todo:
        print("图标都有了")
        return 0
    print(f"待生成 {len(todo)} 个图标")

    pipe = StableDiffusionPipeline.from_pretrained(
        CFG["model"], torch_dtype=torch.float16, safety_checker=None, requires_safety_checker=False
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config, algorithm_type="dpmsolver++", use_karras_sigmas=True
    )
    pipe.set_progress_bar_config(disable=True)
    pipe.enable_attention_slicing()
    pipe.to("cuda")

    start = time.time()
    for i, sid in enumerate(todo, 1):
        prompt = (
            f"{ICONS[sid]}, {CFG['style']}, "
            "single centered subject, thick simple shapes, icon design, few details"
        )
        t0 = time.time()
        g = torch.Generator(device="cuda").manual_seed(abs(hash(sid)) % (2**31))
        img = pipe(
            prompt=prompt,
            negative_prompt=NEG,
            width=512,
            height=512,
            num_inference_steps=args.steps,
            guidance_scale=7.0,
            generator=g,
        ).images[0]
        img.save(RAW / f"{sid}.png")

        cut = remove(img)  # RGBA
        bbox = cut.getbbox()
        if bbox:
            cut = cut.crop(bbox)
        side = max(cut.width, cut.height)
        canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
        canvas.paste(cut, ((side - cut.width) // 2, (side - cut.height) // 2), cut)
        canvas = canvas.resize((256, 256), Image.LANCZOS)
        canvas.save(OUT / f"{sid}.webp", "WEBP", quality=86, method=4)

        done = time.time() - start
        print(
            f"[{i}/{len(todo)}] {sid} {time.time() - t0:.0f}s "
            f"(已用 {done / 60:.1f} 分，还要 {(done / i) * (len(todo) - i) / 60:.1f} 分)",
            flush=True,
        )

    print("完成")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
