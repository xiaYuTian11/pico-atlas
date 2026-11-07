"""风格试片：同一主体、6 种风格描述，出图对比，用来定 STYLE 常量。"""
import os, sys, time, torch
os.environ.setdefault("HF_HOME", "D:/dev/hf-cache")
from diffusers import StableDiffusionPipeline, DPMSolverMultistepScheduler
from PIL import Image

torch.backends.cudnn.benchmark = True

SUBJECT = sys.argv[1] if len(sys.argv) > 1 else "a single shiny red apple with one green leaf"
OUT = "assets/style_test"

NEG = (
    "photo, photorealistic, 3d render, cgi, oil painting, gradient, glossy, shiny highlight, "
    "text, letters, watermark, frame, border, dark background, blurry, deformed, multiple objects"
)

STYLES = {
    "A_watercolor": (
        "children's picture book illustration, hand painted watercolor wash, visible cold-press paper texture, "
        "gentle color bleed, soft edges with clean thin dark contour, muted-bright cheerful palette, flat matte, "
        "plain warm off-white paper background"
    ),
    "B_gouache": (
        "children's book gouache painting, matte flat opaque colors, thick visible brush strokes, "
        "simple rounded shapes, bold dark outline, cheerful saturated palette, plain warm off-white background"
    ),
    "C_clipart": (
        "flat vector illustration, thick bold dark outline, solid flat colors, no gradients, no shading, "
        "cute simple shapes, children's flashcard style, plain white background"
    ),
    "D_crayon": (
        "children's drawing style with crayon and watercolor, textured strokes, naive and playful, "
        "soft muted palette, plain paper background"
    ),
    "E_beatrix": (
        "classic English storybook watercolor illustration in the style of Beatrix Potter, "
        "delicate ink linework, soft transparent washes, warm natural palette, plain paper background"
    ),
    "F_collage": (
        "paper collage illustration in the style of Eric Carle, hand painted textured paper cut shapes, "
        "bright cheerful colors, thick outline, plain light background"
    ),
}

t0 = time.time()
pipe = StableDiffusionPipeline.from_pretrained(
    "Lykon/dreamshaper-8", torch_dtype=torch.float32, safety_checker=None, requires_safety_checker=False
)
pipe.scheduler = DPMSolverMultistepScheduler.from_config(
    pipe.scheduler.config, algorithm_type="dpmsolver++", use_karras_sigmas=True
)
pipe.set_progress_bar_config(disable=True)
pipe.enable_attention_slicing()
pipe.to("cuda")
print(f"loaded in {time.time()-t0:.1f}s", flush=True)

os.makedirs(OUT, exist_ok=True)
for name, style in STYLES.items():
    t = time.time()
    g = torch.Generator(device="cuda").manual_seed(2026)
    img = pipe(
        prompt=f"{SUBJECT}, {style}",
        negative_prompt=NEG,
        width=512,
        height=512,
        num_inference_steps=20,
        guidance_scale=7.5,
        generator=g,
    ).images[0]
    img.save(f"{OUT}/{name}.png")
    print(f"{name}: {time.time()-t:.1f}s", flush=True)

# 拼成一张对比图
files = [f"{OUT}/{n}.png" for n in STYLES]
cols, w = 3, 512
rows = (len(files) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * w), (255, 255, 255))
for i, f in enumerate(files):
    sheet.paste(Image.open(f), ((i % cols) * w, (i // cols) * w))
sheet.save(f"{OUT}/contact.png")
print("contact sheet ->", f"{OUT}/contact.png")
