"""测速：不同精度/优化开关下 SD1.5 在 1050Ti 上的单张耗时。"""
import os, time, torch
os.environ.setdefault("HF_HOME", "D:/dev/hf-cache")
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler

torch.backends.cudnn.benchmark = True

PROMPT = "children's picture book illustration, soft watercolor, thick ink outline, a cute red apple, plain cream background"
NEG = "photo, 3d render, text, watermark"

def bench(tag, dtype, slicing, size=512, steps=12):
    t0 = time.time()
    pipe = StableDiffusionPipeline.from_pretrained(
        "Lykon/dreamshaper-8", torch_dtype=dtype, safety_checker=None, requires_safety_checker=False
    )
    pipe.scheduler = DPMSolverMultistepScheduler.from_config(
        pipe.scheduler.config, algorithm_type="dpmsolver++", use_karras_sigmas=True
    )
    pipe.set_progress_bar_config(disable=True)
    if slicing:
        pipe.enable_attention_slicing()
    pipe.to("cuda")
    g = torch.Generator(device="cuda").manual_seed(7)
    # warmup
    pipe(PROMPT, negative_prompt=NEG, height=size, width=size, num_inference_steps=4, guidance_scale=7, generator=g)
    torch.cuda.synchronize()
    t1 = time.time()
    pipe(PROMPT, negative_prompt=NEG, height=size, width=size, num_inference_steps=steps, guidance_scale=7, generator=g)
    torch.cuda.synchronize()
    print(f"{tag}: load {t1-t0:.1f}s, gen {time.time()-t1:.1f}s ({steps} steps), vram {torch.cuda.max_memory_allocated()/2**30:.2f} GB", flush=True)
    del pipe
    torch.cuda.empty_cache()

for tag, dtype, slicing in [
    ("fp16+slicing", torch.float16, True),
    ("fp16", torch.float16, False),
    ("fp32", torch.float32, False),
]:
    try:
        bench(tag, dtype, slicing)
    except Exception as e:
        print(f"{tag}: FAILED {type(e).__name__}: {str(e)[:160]}", flush=True)
