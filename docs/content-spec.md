# 内容规范（Content Spec）· 小图鉴 Pico Atlas

所有词条内容必须符合本规范。新增内容前先读这里。

---

## 0. 核心原则：内容不重复，只加深

产品按**年龄段分层**，跟随孩子成长。但同一个物品**不重复教学**，而是用**不同的卡片深度**呈现。

> ❌ 错误做法：3–4 岁学"苹果/apple"，4–5 岁再学一遍"苹果/apple"
> ✅ 正确做法：3–4 岁认"苹果/apple"；4–5 岁在同一个苹果上增加拼音和例句；5–6 岁再增加汉字与短句

这样孩子的体验是「这个东西我认识，但我又发现了新东西」，而不是「这个我学过了，跳过」。

---

## 1. 阶段定义

| 阶段 | 年龄 | 卡片深度 | 单次注意时长 | 句子上限 |
| --- | --- | --- | --- | --- |
| **L1** | 3–4 岁 | 图 + 中文 + 英文 + 朗读 | 3 分钟 | 无句子 |
| **L2** | 4–5 岁 | + 拼音 + 中文短句 + 英文短语 | 5 分钟 | 中文 ≤ 8 字 / 英文 ≤ 4 词 |
| **L3** | 5–6 岁 | + 汉字字形 + 英文短句 + 一句小知识 | 8 分钟 | 中文 ≤ 12 字 / 英文 ≤ 6 词 |

阶段是**内容属性**，不是用户属性。同一条内容可以同时挂在多个阶段，只是呈现字段不同。

---

## 2. 识物词条结构

```json
{
  "id": "apple",
  "type": "object",
  "category": "fruit",
  "image": "assets/img/fruit/apple.webp",
  "palette": "#FFF2E5",
  "zh": "苹果",
  "en": "apple",
  "pinyin": "píng guǒ",
  "audio": {
    "zh": "assets/audio/zh/apple.mp3",
    "en": "assets/audio/en/apple.mp3"
  },
  "levels": {
    "L1": {
      "show": ["image", "zh", "en"],
      "sentence_zh": null,
      "sentence_en": null
    },
    "L2": {
      "show": ["image", "zh", "pinyin", "en"],
      "sentence_zh": "红红的苹果",
      "sentence_en": "A red apple."
    },
    "L3": {
      "show": ["image", "zh", "pinyin", "en", "hanzi"],
      "sentence_zh": "苹果红红的，甜甜的。",
      "sentence_en": "Apples are red and sweet.",
      "fact": "苹果长在树上。"
    }
  }
}
```

### 字段说明

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `id` | ✅ | 全小写，短横线分隔，与文件名一致 |
| `type` | ✅ | `object` / `poem` / `story` |
| `category` | ✅ | 取自固定列表（见 §5） |
| `image` | ✅ | WebP，纯色背景 |
| `palette` | ✅ | 卡片背景色，与该物品主色协调 |
| `zh` / `en` | ✅ | 中文词 / 英文词 |
| `pinyin` | L2+ | 带声调拼音 |
| `audio` | ✅ | 中文音频必填，英文音频可选 |
| `levels` | ✅ | **至少要有 L1** |

### `show` 数组的可用值

```
image      图片
zh         中文词
pinyin     拼音
en         英文词
hanzi      汉字字形（大字展示，不教笔顺）
```

---

## 3. 古诗词词条

```json
{
  "id": "yonge",
  "type": "poem",
  "category": "poem",
  "image": "assets/img/poem/yonge.webp",
  "palette": "#E8F4F8",
  "title": "咏鹅",
  "dynasty": "唐",
  "author": "骆宾王",
  "levels": {
    "L1": {
      "lines": ["鹅，鹅，鹅"],
      "audio": "assets/audio/poem/yonge-l1.mp3"
    },
    "L2": {
      "lines": ["鹅，鹅，鹅", "曲项向天歌"],
      "pinyin": true,
      "audio": "assets/audio/poem/yonge-l2.mp3"
    },
    "L3": {
      "lines": ["鹅，鹅，鹅", "曲项向天歌", "白毛浮绿水", "红掌拨清波"],
      "pinyin": true,
      "explain": "大白鹅弯着脖子对天唱歌，白毛浮在绿水上，红脚掌拨着清水。",
      "audio": "assets/audio/poem/yonge-l3.mp3"
    }
  }
}
```

**选诗标准（L1）：**
- 五言绝句优先，全诗 ≤ 4 句
- 画面感强（有动物、颜色、动作）
- 押韵明显，好上口
- L1 阶段**只读前 1–2 句**，孩子不需要理解整首诗

**不做的：** 逐字讲解、诗人介绍、创作背景。3 岁不需要。

---

## 4. 故事词条

```json
{
  "id": "little-rabbit",
  "type": "story",
  "category": "story",
  "cover": "assets/img/story/little-rabbit/cover.webp",
  "palette": "#FFF8E7",
  "title": "小兔子找妈妈",
  "levels": {
    "L1": {
      "page_count": 5,
      "max_chars_per_page": 8
    },
    "L2": {
      "page_count": 8,
      "max_chars_per_page": 15
    },
    "L3": {
      "page_count": 10,
      "max_chars_per_page": 22
    }
  },
  "pages": [
    {
      "image": "assets/img/story/little-rabbit/p1.webp",
      "text_l1": "小兔子醒了。",
      "text_l2": "小兔子睡醒了，妈妈不见了。",
      "text_l3": "小兔子睡醒了，发现妈妈不在身边，有点着急。",
      "audio": "assets/audio/story/little-rabbit/p1.mp3"
    }
  ]
}
```

**L1 故事规则：**
- 最多 5 页
- 每页 ≤ 8 字
- 每页必须有一张图，图和文字一一对应
- 结局必须是好的、安全的（3 岁怕分离，不讲危险和失去）

---

## 5. 分类（category）固定值

```
fruit       水果
vegetable   蔬菜
animal      动物
vehicle     交通工具
appliance   家用电器
daily       日常用品
food        食物
clothing    衣物
toy         玩具
nature      自然（天气、植物）
body        身体部位
color       颜色
shape       形状
number      数字
poem        古诗词
story       故事
```

**参考词表：** 首期识物内容优先从 **Dolch Nouns 95 词** 中选取（英语启蒙通行标准词表），再补充中国生活场景特有物品（筷子、碗、电饭锅、自行车等）。

---

## 6. 朗读规则

### 6.1 两种模式

| 模式 | 行为 | 使用场景 |
| --- | --- | --- |
| **连读** | 自动依次播放：中文 ×2 → 英文 ×2 → 自动翻下一张 | 孩子自己看 / 睡前 |
| **单读** | 点击卡片任意位置，读一次当前语言 | 孩子想反复听某一张 |

### 6.2 一次播放的节奏（连读模式）

```
[中文卡] 苹果 → 停 0.6s → 苹果
        ↓ 卡片切换为英文（有视觉过渡）
[英文卡] apple → 停 0.6s → apple
        ↓ 停 1.2s
[自动翻下一页]
```

**关键：语言切换必须有视觉变化**（卡片文字变、背景色微变），不能只是声音换。否则 3 岁孩子会把中英文当成四个不同的东西。

### 6.3 单读模式

- 点击即读，**不要有延时**（3 岁没有耐心等）
- 连续点击要能打断上一条，重新开始
- 读完不自动翻页

### 6.4 语音技术要求

- 中文：`zh-CN`，语速 **0.85×**（比正常慢一档）
- 英文：`en-US`，语速 **0.9×**
- 阶段：TTS 阶段用免费 Web Speech API，后续换真人录音
- 音频缺失时**降级为静音 + 显示文字**，不能报错

---

## 7. 图片规则

| 规则 | 说明 |
| --- | --- |
| 风格 | **全库统一插画风格**（不做照片与插画混用） |
| 格式 | WebP，单图 ≤ 200KB |
| 尺寸 | 长边 1024px |
| 背景 | 透明或纯色，主体占画面 ≥ 60% |
| 视角 | 正面平视为主，避免透视变形 |
| 数量 | 一个词条只放一张主图 |

---

## 8. 内容检查清单

发布前逐条确认：

- [ ] `id` 唯一，与文件名一致
- [ ] 至少配置了 L1
- [ ] L1 阶段无长句子（`sentence_zh` 为 null）
- [ ] 中文句子符合当前阶段的字数上限
- [ ] 拼音带正确声调
- [ ] 英文拼写正确，例句符合词数上限
- [ ] 图片为 WebP，≤ 200KB，风格与全库一致
- [ ] `palette` 与图片主色协调
- [ ] 中文音频存在
- [ ] `category` 取自固定列表
- [ ] 无广告、无外链、无社交入口

---

## 9. 待定

- 真人录音的采购/录制方案
- 插画的来源（自绘 / 采购 / AI 生成）与风格规范
- 是否需要粤语/方言版本
- 是否需要繁体中文
