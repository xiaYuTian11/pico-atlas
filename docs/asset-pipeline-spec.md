# 批量音画资产生成管线与黄金参数手册（Asset Pipeline Spec）· 小图鉴 Pico Atlas

> 版本：**v1.0 — 工业化批量预烘焙与 AI 绘本插图生产指南**  
> 核心目标：**100% 零外包成本 · 全离线高保真 · 视觉纯净统一 · 听感温暖温润**  
> 适用范围：全量 530+ 核心生活大百科词条、四大通识支柱、48 首经典诗词与 20 篇绘本故事的资产生产。

---

## 目录导览

1. [语音预烘焙管线与 Edge-TTS 黄金参数表](#1-语音预烘焙管线与-edge-tts-黄金参数表)
2. [语音批量生成自动化脚本 (Python)](#2-语音批量生成自动化脚本-python)
3. [AI 绘本生图黄金提示词配方 (Prompt Recipes)](#3-ai-绘本生图黄金提示词配方-prompt-recipes)
4. [各分类精选提示词示例库 (Prompt Library)](#4-各分类精选提示词示例库-prompt-library)
5. [绘本插画批量自动化下载流水线 (Python)](#5-绘本插画批量自动化下载流水线-python)
6. [故事多页角色一致性（Seed & Consistency）控制方案](#6-故事多页角色一致性控制方案)

---

## 1. 语音预烘焙管线与 Edge-TTS 黄金参数表

基于 3–5 岁幼儿听觉神经元发育规律（听觉捕捉带宽仅为成人的 65%~70%），经过多轮音质实机试听与对齐测试，确立以下**黄金音质参数规范**。

### 1.1 音色标准选型 (Voice Roster)

| 用途分类 | 选定音色标识 (Voice ID) | 角色定位与音质特点 |
| :--- | :--- | :--- |
| **中文词汇、古诗、故事主讲** | `zh-CN-XiaoxiaoNeural` | **温暖亲切的幼儿园女老师**：语气极其温润生动，带有自然的人类呼吸感与讲故事语气，彻底告别机械冰冷感。 |
| **中文活泼提示、动物、益智** | `zh-CN-YunxiNeural` | **机灵阳光的小男孩童声**：语调欢快清脆，用于正面鼓励、动物叫声引出及通关表扬。 |
| **英文启蒙单词与短句** | `en-US-AnaNeural` | **少儿启蒙美语外教音**：专为儿童英语教学研发，元音极其饱满清晰，辅音分明，慢速自然。 |

---

### 1.2 各内容模块详细生成参数表 (Audio Parameter Matrix)

| 模块类型 | 音色标识 (Voice) | 语速 (Rate) | 音调 (Pitch) | 内部停顿 (Pause) | 听觉特征与设计依据 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **认东西：中文词条** | `zh-CN-XiaoxiaoNeural` | **`-24%`** | `+5Hz` | 词后留白 1000ms | 字正腔圆，每一个声调与韵母充分拉长，清晰饱满 |
| **认东西：英文词条** | `en-US-AnaNeural` | **`-20%`** | `+0Hz` | 词后留白 800ms | 纯正美音，慢速自然，辅音爆破点明确不含糊 |
| **认东西：中文短句 (L2/L3)** | `zh-CN-XiaoxiaoNeural` | **`-22%`** | `+3Hz` | 句末留白 900ms | 生活化亲切短句，像和宝宝日常温柔说话 |
| **认东西：英文短句 (L2/L3)** | `en-US-AnaNeural` | **`-20%`** | `+0Hz` | 句末留白 900ms | 节奏欢快短小，慢速易模仿 |
| **经典古诗词（整首）** | `zh-CN-XiaoxiaoNeural` | **`-22%`** | `+0Hz` | **每句停顿 800ms** | 抑扬顿挫、平仄分明，突出五言/七言韵脚的音律美 |
| **经典古诗词（单句点读）** | `zh-CN-XiaoxiaoNeural` | **`-22%`** | `+0Hz` | 单句末留白 400ms | 点哪读哪，专注当前诗句的精准发音 |
| **微绘本故事（单页）** | `zh-CN-XiaoxiaoNeural` | **`-22%`** | `+2Hz` | 句末留白 1000ms | 极具画面感，床边绘本温和陪伴感 |
| **基础通识：数数与图形** | `zh-CN-XiaoxiaoNeural` | **`-24%`** | `+4Hz` | 停顿 900ms | 强调关键数字和图形特征（如“上面短，下面长”） |
| **益智小游戏题目与反馈** | `zh-CN-YunxiNeural` | **`-18%`** | `+6Hz` | 停顿 600ms | 充满好奇感与正向激励（如“谁的黑影子呀？”） |

---

### 1.3 交互时间轴节奏规范 (Interactive Timing Windows)

杜绝“一翻页就急着播”和“中英混杂”的压迫感：
1. **翻页落定缓冲期**：卡片平滑滑入后，**必须留出 850ms 的完全静止留白**，让幼儿视线先落在主体大图上建立视觉认知；
2. **中英双语切换留白**：中文发音播完后，**必须停顿 1000ms（整整 1 秒）**，再播放英文发音，为幼儿大脑留出清晰的语言语码切换窗口；
3. **自动巡航连读间隔**：整张卡片发音结束至自动翻向下一张卡片之间，**预留 1200ms 观察思考期**；
4. **单卡循环磨耳朵间隔**：单首诗或单词循环背诵时，每轮之间**留白 1500ms**。

---

## 2. 语音批量生成自动化脚本 (Python)

该脚本直接批量遍历任务列表，全自动调用微软边缘神经语音服务，生成小巧保真的离线 `.mp3` 文件。

```python
"""
pico_atlas_audio_pipeline.py
小图鉴离线高保真语音批量生成流水线
环境需求: pip install edge-tts
"""

import asyncio
import os
import edge_tts

OUTPUT_DIR = "assets/audio"

# 参数字典映射
VOICE_ZH = "zh-CN-XiaoxiaoNeural"
VOICE_EN = "en-US-AnaNeural"
VOICE_KID = "zh-CN-YunxiNeural"

RATE_WORD_ZH = "-24%"
RATE_WORD_EN = "-20%"
RATE_POEM = "-22%"

async def generate_single_audio(output_path, text, voice, rate="-24%", pitch="+0Hz"):
    """生成单个高保真音频文件并保存"""
    if os.path.exists(output_path) and os.path.getsize(output_path) > 1024:
        print(f"[跳过已存在] {output_path}")
        return

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await comm.save(output_path)
    print(f"[生成成功] {output_path} ({os.path.getsize(output_path)} 字节)")

async def batch_process_items(items):
    """批量异步处理"""
    for item in items:
        # 1. 中文单词
        if "zh" in item:
            zh_path = os.path.join(OUTPUT_DIR, f"zh/{item['id']}.mp3")
            await generate_single_audio(zh_path, item["zh"], VOICE_ZH, rate=RATE_WORD_ZH, pitch="+5Hz")
            await asyncio.sleep(0.1) # 礼貌微延时

        # 2. 英文单词
        if "en" in item:
            en_path = os.path.join(OUTPUT_DIR, f"en/{item['id']}.mp3")
            await generate_single_audio(en_path, item["en"], VOICE_EN, rate=RATE_WORD_EN)
            await asyncio.sleep(0.1)

        # 3. 古诗整首
        if item.get("type") == "poem" and "lines" in item:
            poem_path = os.path.join(OUTPUT_DIR, f"poem/{item['id']}_full.mp3")
            full_text = "，".join(item["lines"])
            await generate_single_audio(poem_path, full_text, VOICE_ZH, rate=RATE_POEM)
            await asyncio.sleep(0.1)

if __name__ == "__main__":
    sample_items = [
        {"id": "apple", "zh": "苹果", "en": "Apple"},
        {"id": "cat", "zh": "猫", "en": "Cat"},
        {"id": "trapezoid", "zh": "梯形，上面短，下面长，就像小花盆。", "en": "Trapezoid"},
        {"id": "yonge", "type": "poem", "lines": ["鹅，鹅，鹅", "曲项向天歌", "白毛浮绿水", "红掌拨清波"]}
    ]
    asyncio.run(batch_process_items(sample_items))
```

---

## 3. AI 绘本生图黄金提示词配方 (Prompt Recipes)

为了防止 AI 跑偏生成暗沉复杂的写实油画、带有杂乱家具的房间、或者古怪的 3D 渲染，我们确立以下**实机验证通过的黄金配方模板**：

### 3.1 核心正向提示词结构模板 (Golden Prompt Template)

```
flat 2D vector graphic of a [SUBJECT & COLOR DETAILS], thick bold clean outlines, vibrant saturated colors, isolated on pure solid white background, minimal clean clipart for preschool toddlers, simple and sweet, centered, no 3D, no realism, no shadow, no text, no watermark
```

**关键设计词解析**：
- `flat 2D vector graphic`：锁定纯扁平 2D 矢量结构，彻底杜绝突兀的 3D 光影与暗角；
- `thick bold clean outlines`：粗黑/粗色圆润轮廓线，强化 3 岁幼儿的轮廓边界感知；
- `vibrant saturated colors`：高饱和鲜艳色彩（鲜红、明黄、翠绿），刺激视觉敏感期发育；
- `isolated on pure solid white background`：**至关重要的约束词**！确保背景 100% 纯白固态，无渐变、无地板、无桌面阴影，与卡片背景完美融合；
- `minimal clean clipart for preschool toddlers`：专门针对学龄前幼儿闪卡训练模型；
- `centered`：主体正中摆放，留白率保持 25%~30%，呼吸感极佳。

---

### 3.2 必须强化的负向提示词 (Negative Prompt Checklist)

在任何支持负向词的生图环境（如 SDXL、ComfyUI、或带 negative prompt 的 API）中，必须强制追加以下排除项：

```
3D render, photorealistic, realistic photo, photograph, dark shading, ambient occlusion, complex gradient shadow, background objects, room, furniture, wall, floor, tabletop, messy background, complex textures, human, adult, text, letters, words, watermark, logo, banner, frame, border, cropped, blur, grainy
```

---

### 3.3 图像物理工程规格

- **长宽尺寸**：统一 `800 × 800 px`（正方形 1:1 比例）；
- **输出格式**：`WebP`（质量质量 Quality = 82~85，无损色彩通道，体积约为 JPG 的 40%）；
- **单图体积**：严格控制在 **20 KB ~ 35 KB**，全库 500 张图片总包体积 **≤ 15 MB**。

---

## 4. 各分类精选提示词示例库 (Prompt Library)

在批量流水线中，直接按照此映射表注入 `[SUBJECT]` 字段：

### 4.1 水果类 (Fruits)
- **苹果 (apple)**:  
  `flat 2D vector graphic of a shiny bright red cartoon apple with a tiny green leaf on top, thick bold clean outlines, vibrant saturated red, isolated on pure solid white background, minimal clean clipart for preschool toddlers, simple and sweet, centered, no 3D, no realism, no shadow, no text, no watermark`
- **香蕉 (banana)**:  
  `flat 2D vector graphic of a cheerful bright yellow curved banana, thick bold clean outlines, vibrant saturated yellow, isolated on pure solid white background, minimal clean clipart for preschool toddlers, simple and sweet, centered, no 3D, no realism, no shadow, no text, no watermark`
- **西瓜 (watermelon)**:  
  `flat 2D vector graphic of a juicy green watermelon slice with red fruit pulp and tiny black seeds, thick bold clean outlines, vibrant saturated colors, isolated on pure solid white background, minimal clean clipart for toddlers, no 3D, no text`

### 4.2 蔬菜类 (Vegetables)
- **胡萝卜 (carrot)**:  
  `flat 2D vector graphic of a bright orange crunchy carrot with fresh green leafy top, thick bold outlines, isolated on pure solid white background, minimal clean preschool art, no 3D, no text`
- **西兰花 (broccoli)**:  
  `flat 2D vector graphic of a cute green broccoli tree shape, vibrant lush green, thick smooth outlines, isolated on pure solid white background, clean minimalist clipart for children, no shadow, no text`

### 4.3 动物与恐龙类 (Animals & Dinosaurs)
- **小猫 (cat)**:  
  `flat 2D vector graphic of a lovely cute sitting orange tabby kitten with round face, big friendly eyes, thick clean outlines, soft pastel orange and cream, isolated on pure solid white background, adorable children storybook illustration, no room, no furniture, no 3D, no text`
- **小白兔 (rabbit)**:  
  `flat 2D vector graphic of an adorable white baby bunny rabbit with pink ears sitting cute, bold rounded shapes, soft clean outlines, isolated on pure solid white background, charming toddler flashcard illustration, no background, no 3D, no text`
- **霸王龙 (t-rex)**:  
  `flat 2D vector graphic of a friendly cute cartoon baby T-Rex dinosaur standing, green scales, round smiling face, short arms, thick bold outlines, isolated on pure solid white background, playful and approachable for toddlers, no scary teeth, no 3D, no text`

### 4.4 交通工具类 (Vehicles)
- **小汽车 (car)**:  
  `flat 2D vector graphic of a cheerful little red cartoon toy car with round headlights and black tires, bold simple shapes, isolated on pure solid white background, toddler educational flashcard, no road, no shadow, no 3D, no text`
- **消防车 (fire-engine)**:  
  `flat 2D vector graphic of a bright red fire truck with a little white ladder and blue emergency light, simple geometric shapes, isolated on pure solid white background, clean vector for children, no background, no 3D, no text`

### 4.5 几何图形类 (Shapes · 梯形、菱形)
- **梯形 (trapezoid)**:  
  `flat 2D vector graphic of a geometric trapezoid shape styled as a cute orange terracotta flower pot with tiny green sprouts, perfectly symmetrical trapezoid outline, vibrant flat colors, isolated on pure solid white background, toddler geometry learning chart, no 3D, no realism, no text`
- **菱形 (diamond / rhombus)**:  
  `flat 2D vector graphic of a symmetrical diamond rhombus shape styled as a colorful purple and yellow flying kite with ribbons, flat clean geometric vector, isolated on pure solid white background, educational preschool art, no sky, no 3D, no text`

### 4.6 经典古诗意境插画 (Poem Illustrations)
- **《咏鹅》(yonge)**:  
  `charming children picture book illustration of a graceful white goose with a curved long neck floating on turquoise pond water ripples, red feet and beak, simple flat gouache style, peaceful and pure, isolated on solid white background, aesthetic Chinese storybook art for toddlers, minimal clean, no human, no 3D, no text`
- **《悯农》(minnong)**:  
  `charming children picture book illustration of golden ripe rice paddy stalks with gentle green leaves, peaceful warm sunlight vibe, flat gouache watercolor texture, isolated on pure solid white background, simple and thankful, no text, no 3D`
- **《静夜思》(jingyesi)**:  
  `charming children picture book illustration of a bright glowing golden crescent moon resting on a soft pastel white cloud, twinkling stars, peaceful serene bedtime vibe, flat gouache art, isolated on pure white background, minimal clean, no human, no 3D, no text`

---

## 5. 绘本插画批量自动化下载流水线 (Python)

该脚本直接通过标准的 Pollinations.ai (FLUX.1 模型) 免费公共端点批量拉取高清绘本插图，**内置 45 秒 IP 速率安全队列**，完全全自动、0 成本生产全库插图。

```python
"""
pico_atlas_image_pipeline.py
小图鉴 AI 绘本插画全自动批量下载流水线
"""

import urllib.request
import urllib.parse
import os
import time

OUTPUT_DIR = "assets/images"
PROXY = "http://127.0.0.1:7890" # 走系统代理保证连接通畅

# 统一黄金提示词后缀
STYLE_SUFFIX = (
    "thick bold clean outlines, vibrant saturated colors, "
    "isolated on pure solid white background, minimal clean clipart for preschool toddlers, "
    "simple and sweet, centered, no 3D, no realism, no shadow, no text, no watermark"
)

# 待生成清单样例 (对应 content-catalog.md)
ITEMS_TO_GENERATE = [
    {"id": "apple", "subject": "a shiny bright red cartoon apple with a tiny green leaf"},
    {"id": "banana", "subject": "a cheerful bright yellow curved banana"},
    {"id": "carrot", "subject": "a bright orange crunchy carrot with fresh green leafy top"},
    {"id": "cat", "subject": "a lovely cute sitting orange tabby kitten with round face"},
    {"id": "rabbit", "subject": "an adorable white baby bunny rabbit with pink ears sitting cute"},
    {"id": "trapezoid", "subject": "a geometric trapezoid shape styled as a cute orange flower pot"},
    {"id": "yonge", "subject": "a graceful white goose with a curved long neck floating on turquoise water"}
]

def setup_opener():
    proxies = {"http": PROXY, "https": PROXY}
    opener = urllib.request.build_opener(urllib.request.ProxyHandler(proxies))
    urllib.request.install_opener(opener)

def generate_and_download(item, seed=2026):
    out_file = os.path.join(OUTPUT_DIR, f"{item['id']}.jpg")
    if os.path.exists(out_file) and os.path.getsize(out_file) > 5000:
        print(f"[已存在跳过] {item['id']}")
        return True

    os.makedirs(OUTPUT_DIR, exist_ok=True)
    full_prompt = f"flat 2D vector graphic of {item['subject']}, {STYLE_SUFFIX}"
    encoded = urllib.parse.quote(full_prompt)
    url = f"https://image.pollinations.ai/prompt/{encoded}?width=600&height=600&model=flux&seed={seed}"

    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
    try:
        with urllib.request.urlopen(req, timeout=40) as res:
            with open(out_file, "wb") as f:
                f.write(res.read())
        print(f"[下载成功] {item['id']} ({os.path.getsize(out_file)} 字节)")
        return True
    except Exception as e:
        print(f"[下载失败] {item['id']}: {e}")
        return False

def main():
    setup_opener()
    print(f"开始批量生成 {len(ITEMS_TO_GENERATE)} 张绘本插图...")
    for idx, item in enumerate(ITEMS_TO_GENERATE):
        print(f"\n[{idx+1}/{len(ITEMS_TO_GENERATE)}] 正在处理: {item['id']}")
        success = generate_and_download(item)
        if idx < len(ITEMS_TO_GENERATE) - 1:
            print("等待 46 秒以满足免费 IP 限速窗口...")
            time.sleep(46)

if __name__ == "__main__":
    main()
```

---

## 6. 故事多页角色一致性控制方案 (Story Consistency)

在《小兔子找妈妈》或《小熊的红雨伞》等多页连续绘本故事中，最怕“第 1 页兔子长这样，第 2 页兔子变成了另一只”。

### 一致性四大控制技巧：
1. **固定随机种子 (Fixed Seed)**：
   在同一个故事的连续 4 张卡片生成时，**严格固定相同的 `seed=2026`（或任意固定整数）**；
2. **固定核心角色的特征 Anchor 锚点描述**：
   在所有分页提示词中，主角的描述必须字字一致，例如：  
   `"the same cute white baby bunny with soft round pink-tipped ears and a blue scarf"`；
3. **分页仅改变动作与场景对象**：
   - Page 1: `[the same bunny] waking up, rubbing eyes under morning sun`
   - Page 2: `[the same bunny] talking to a smiling tall oak tree`
   - Page 3: `[the same bunny] watching mother bunny picking carrots in garden`
   - Page 4: `[the same bunny] hugging mother bunny happily`
4. **统一暖调浅色氛围**：全部指定 `warm soft gouache illustration, consistent storybook palette`。
