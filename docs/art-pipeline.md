# 素材生产线（图 + 语音）

> 这套东西只解决一件事：**内容进来，代码不动**。
> 卡片是数据（`src/content/cards.json`），图是文件（`public/media/images/<id>.webp`），
> 语音也是文件（`public/media/audio/**`）。两边**按 id 自动对上**，谁都不需要认识谁。

---

## 0. 三条命令

```powershell
npm run media:report     # 体检：还缺哪些图 / 哪些语音，占多少 MB
npm run media:images     # 出图（本地 SD，断点续跑，已有就跳过）
npm run media:audio      # 出语音（edge-tts，免费）
npm run media:sheet      # 审片：把所有插图拼成一张总览图
```

加一张卡片 = 往 `cards.json`（或词库 `cards-auto.json`）里加一条，
跑一次 `media:images` + `media:audio`。**永远不需要改 `.vue`。**

### 内容分两份

| 文件                          | 来源                       | 用途                                                         |
| ----------------------------- | -------------------------- | ------------------------------------------------------------ |
| `src/content/cards.json`      | 手写                       | 精修版：短句、亲子锦囊、古诗、故事、益智题                   |
| `src/content/cards-auto.json` | `node tools/gen-cards.mjs` | 词库批量版：从 `tools/wordlist.json` 生成中英 + 拼音 + emoji |

同 id 时**手写版覆盖词库版**。所以想把某张词库卡升级成精修卡：
在 `cards.json` 里写一条同 id 即可。

新增词库：改 `tools/wordlist.json` → `node tools/gen-cards.mjs`。

### 分区图标

```powershell
.venv\Scripts\python.exe tools/gen_icons.py          # 30 个分区图标（水彩 + 透明底）
.venv\Scripts\python.exe tools/gen_icons.py --ids fruits,animals --force
```

产物在 `public/media/images/section/<id>.webp`，
`media.ts` 的 `sectionImage()` 会自动优先用它，缺了才回退 emoji。

---

## 1. 出图

### 参数在哪

`tools/art.config.json` —— 全局的模型 / 步数 / 尺寸 / 风格词 / 负向词。
换风格只改这一个文件。

卡片级的差异写在卡片的 `art` 字段里：

```jsonc
{
  "id": "rabbit-1",
  "type": "story",
  "art": {
    "subject": "a small white bunny with long floppy ears ... waking up in a burrow",
    "seed": 4101, // 同一故事的所有页锁同一个 seed，角色才像同一只
    "cutout": false, // 场景图不抠背，抠了反而脏
  },
}
```

字段全集见 `src/content/types.ts` 的 `CardArt`。

| 字段             | 作用                                   | 缺省                          |
| ---------------- | -------------------------------------- | ----------------------------- |
| `subject`        | 主体描述（英文，给 SD 看）             | 用 `en`                       |
| `prompt`         | 完全覆盖正向提示词                     | —                             |
| `scene_template` | 覆盖该类型的句式模板，`{subject}` 占位 | 按 `type` 取                  |
| `style_extra`    | 追加风格词                             | —                             |
| `seed`           | 固定随机种子                           | 由 `id` 哈希                  |
| `cutout`         | 是否去背合成纸底                       | 场景类型 `false`，其余 `true` |

### 出图的四个阶段（每一段都可单独重跑）

```
cards.json ──► SD 出 512px 原图 ──► rembg 去背 ──► 合成 #FFFDF8 纸底 ──► 768px WebP
              assets/gen_raw/<id>.png           （非场景图才做）        public/media/images/<id>.webp
```

`assets/gen_raw/` 保留原图：后处理参数调好了可以直接重做，不用重新跑 SD。

### 为什么是这套参数

- **fp16 / 512px / 20 步**：GTX 1050Ti 4G 上约 90 秒一张。fp32 反而更慢（Pascal 架构 fp16 单元少，但显存省一半，整体仍更快）。
- **统一纸底 `#FFFDF8`**：700 张图来自 700 次独立推理，背景白一定不一样。先去背、再合成同一个纸色，才能看起来像一本书。
- **固定 seed**：同一 id 重跑得到同一张，不会"每跑一次全家都变了"。
- **风格词锁 "watercolor wash + cold-press paper texture + thin dark contour"**：水彩的柔 + 轮廓的清晰，两头都要。

### 太慢怎么办

| 手段                  | 效果                       |
| --------------------- | -------------------------- |
| `--steps 14`          | 快 30%，细节略降           |
| `--gen-size 448`      | 快 25%，小图看不出差别     |
| 换 LCM-LoRA（4–8 步） | 快 3 倍，水彩纹理变薄      |
| 挂机跑一晚上          | 700 张 ≈ 17 小时（90s/张） |

---

## 2. 语音

`python tools/gen_audio.py`，音色与韵律集中在文件顶部的 `VOICE` 表：

| 场景     | 音色                 | 语速                 |
| -------- | -------------------- | -------------------- |
| 中文主词 | zh-CN-XiaoxiaoNeural | -6%                  |
| 中文短句 | 同上                 | -8%                  |
| 古诗     | 同上                 | **-22%**（一句一顿） |
| 故事     | 同上                 | -12%                 |
| 英文     | en-US-JennyNeural    | -10%                 |

举措说明：

- **不用 WebSpeech**。系统 TTS 的断句和声调不可控，而且每台设备音色都不同。全部预烘焙。
- **古诗逐句单独生成**（`poem/<id>_1..4.mp3`），句尾自然降调；同时生成整首（`poem/<id>.mp3`）供连播。
- **故事按年龄档各生成一条**（`story/<id>_L1|L2|L3.mp3`），三个档的正文长度不同。
- **多音字**：卡片可以写 `tts.zh` / `tts.sentZh` 覆盖"读出来的字"，显示仍是原字。

> 语音的"语气"只有一次机会定死在这里。觉得某个字读错，改 `cards.json` 的 `tts` 字段后
> `python tools/gen_audio.py --ids <id> --force` 重出这一条即可。

---

## 3. 审片（别一张张点开看）

```powershell
npm run media:sheet      # → assets/review/contact.png
```

40 张一屏看完。**批量出图后第一件事就是这个**：不合格的整批重跑，不要逐张修。

---

## 4. 环境

| 依赖        | 位置                 | 说明                                    |
| ----------- | -------------------- | --------------------------------------- |
| Python 3.13 | 系统                 | `edge-tts` 装在系统 Python              |
| `.venv`     | 仓库内               | torch cu124 + diffusers + rembg，出图用 |
| HF 缓存     | `D:\dev\hf-cache`    | 模型 2 GB，别放 C 盘                    |
| Android SDK | `D:\dev\android-sdk` | `ANDROID_HOME` 已写进用户环境变量       |

重装出图环境：

```powershell
python -m venv .venv
.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu124
.venv\Scripts\python.exe -m pip install diffusers transformers accelerate safetensors rembg onnxruntime pillow
```
