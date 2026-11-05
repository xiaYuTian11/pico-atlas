# 内容规范（Content Spec）· 小图鉴 Pico Atlas

所有内容必须符合本规范。新增内容前先读这里。

---

## 0. 两条根本原则

### 0.1 一切皆卡片

App 里只有一种东西：**卡片**。没有详情页，没有二级页面。

- 识物 = 1 张卡片
- 古诗 = 1 张卡片
- 故事 = **5 张卡片连续排列**，用角标标记 `1/5`、`2/5`…

「滑」这个动作本身就是翻书，孩子不需要知道"故事开始了""故事结束了"。

### 0.2 内容不重复，只加深

同一物品跨年龄**增加字段**，不重复教学。

> ❌ 3–4 岁学"苹果/apple"，4–5 岁再学一遍
> ✅ 3–4 岁认"苹果/apple"；4–5 岁多出拼音和例句；5–6 岁再多出汉字和小知识

---

## 1. 卡片统一结构

```json
{
  "id": "apple",
  "lane": "look",
  "type": "object",
  "section": "fruits",
  "emoji": "🍎",
  "palette": "#FFF1E8",
  "zh": "苹果",
  "en": "apple",
  "pinyin": "píng guǒ",
  "levels": {
    "L1": {},
    "L2": { "sentence_zh": "红红的苹果", "sentence_en": "A red apple." },
    "L3": {
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
| `id` | ✅ | **全局唯一**，全小写，短横线分隔 |
| `lane` | ✅ | `look` / `read` / `play` —— 属于哪个入口 |
| `type` | ✅ | `object` / `poem` / `story` / `number` / `shape` |
| `section` | ✅ | 内容分段，决定卡片流的**顺序**（不是导航） |
| `emoji` | ✅ | 原型占位；正式版替换为 `image` |
| `palette` | ✅ | 卡片底色，与主体协调的浅色 |
| `zh` / `en` | ✅ | 中文词 / 英文词 |
| `pinyin` | L2+ | 带声调 |
| `levels` | ✅ | 至少要有 `L1` |

### `section` 固定值（顺序即卡片流顺序）

```
look 通道：
  fruits     水果
  vegetables 蔬菜
  animals    动物
  appliance  家用电器
  daily      日常用品
  toys       玩具
  clothing   衣物
  vehicle    交通工具
  body       身体部位

read 通道：
  poems      古诗
  stories    故事

play 通道：
  numbers    数数
  shapes     形状
  drawing    涂鸦
```

**`section` 只影响排序，不出现在任何界面上。**

---

## 2. 各类型结构

### 2.1 识物（type: object）

```json
{
  "id": "cat", "lane": "look", "type": "object", "section": "animals",
  "emoji": "🐱", "palette": "#FFF5E8",
  "zh": "猫", "en": "cat", "pinyin": "māo",
  "levels": {
    "L1": {},
    "L2": { "sentence_zh": "小猫喵喵叫", "sentence_en": "A cat says meow." },
    "L3": {
      "sentence_zh": "小猫喜欢晒太阳。",
      "sentence_en": "Cats like to sit in the sun.",
      "fact": "猫的胡子可以量宽度。"
    }
  }
}
```

### 2.2 古诗（type: poem）—— 一张卡片

```json
{
  "id": "yonge", "lane": "read", "type": "poem", "section": "poems",
  "emoji": "🦢", "palette": "#EAF6FB",
  "title": "咏鹅", "dynasty": "唐", "author": "骆宾王",
  "levels": {
    "L1": { "lines": ["鹅，鹅，鹅"] },
    "L2": { "lines": ["鹅，鹅，鹅", "曲项向天歌"] },
    "L3": {
      "lines": ["鹅，鹅，鹅", "曲项向天歌", "白毛浮绿水", "红掌拨清波"],
      "explain": "大白鹅弯着脖子对天唱歌。"
    }
  }
}
```

**选诗标准：** 五言绝句优先 · 全诗 ≤ 4 句 · 画面感强 · 押韵明显 · **L1 只读第 1 句**。

**不做：** 逐字讲解、诗人介绍、创作背景。

### 2.3 故事（type: story）—— 每页一张卡片

一个故事 = 5 张卡片，`id` 用 `{story}-{page}`：

```json
{
  "id": "rabbit-1", "lane": "read", "type": "story", "section": "stories",
  "storyId": "rabbit", "page": 1, "pageCount": 5,
  "title": "小兔子找妈妈",
  "emoji": "🐰", "palette": "#FFF0F4",
  "levels": {
    "L1": { "text": "小兔子醒了。" },
    "L2": { "text": "小兔子睡醒了，妈妈不见了。" },
    "L3": { "text": "小兔子睡醒了，发现妈妈不在身边，有点着急。" }
  }
}
```

**L1 故事规则：**
- 最多 5 页
- 每页 ≤ 8 字
- 每页一张图，图和文字一一对应
- **结局必须是好的、安全的**（3 岁怕分离，不讲危险和失去）

### 2.4 数数（type: number）

```json
{
  "id": "count-3", "lane": "play", "type": "number", "section": "numbers",
  "emoji": "🍎", "count": 3, "palette": "#FFF1E8",
  "zh": "三", "en": "three", "pinyin": "sān",
  "levels": { "L1": {}, "L2": {}, "L3": { "sentence_zh": "三个苹果" } }
}
```

**呈现方式：** 大数字 + 对应数量的图标排开（3 → 🍎🍎🍎）。具象优先，不做算术。

### 2.5 形状（type: shape）

```json
{
  "id": "shape-circle", "lane": "play", "type": "shape", "section": "shapes",
  "shape": "circle", "emoji": "🔵", "palette": "#EAF6FB",
  "zh": "圆形", "en": "circle", "pinyin": "yuán xíng"
}
```

---

## 3. 语言规则

### 3.1 中文（按年龄）

| 阶段 | 句子长度 | 规则 |
| --- | --- | --- |
| L1 | 无句子 | 只有词 |
| L2 | ≤ 8 字 | 幼儿园口语常用词 |
| L3 | ≤ 12 字 | 可有一个简单因果 |

**全阶段禁止：** 生僻字、「虽然/因为/其实」等逻辑连接词、抽象概念。

### 3.2 英文

| 规则 | 说明 |
| --- | --- |
| 词性 | 优先具体名词、可数名词 |
| 难度 | CEFR A1 以内 |
| 例句 | ≤ 5 个单词 |
| 大小写 | 例句首字母大写 |

---

## 4. 图片规则

| 规则 | 说明 |
| --- | --- |
| 风格 | **全库统一**（不混照片和插画） |
| 格式 | WebP，≤ 200KB |
| 尺寸 | 长边 1024px |
| 背景 | 透明或纯色，主体占画面 ≥ 60% |
| 视角 | 正面平视，避免透视变形 |
| 数量 | 一张卡片一个主体 |

---

## 5. 朗读规则

| 模式 | 行为 |
| --- | --- |
| **连读** | 中文 ×2 → 英文 ×2 → 自动翻下一张 |
| **单读** | 点卡片，读当前内容一次 |

**节奏：** 每次重复间隔 0.6s，语言切换时**必须有视觉变化**，切换后停 1.2s 再翻页。

**语速：** 中文 0.85×、英文 0.9×。

**降级：** 音频缺失时静音 + 显示文字，不能报错。

---

## 6. 内容检查清单

- [ ] `id` 全局唯一
- [ ] `lane` / `type` / `section` 取值合法
- [ ] 至少配置 `L1`
- [ ] L1 无句子
- [ ] 各阶段句子长度符合上限
- [ ] 拼音声调正确
- [ ] 英文拼写正确、例句 ≤5 词
- [ ] 图片风格与全库一致
- [ ] `palette` 与主体协调、饱和度低
- [ ] 故事每个故事恰好 `pageCount` 张卡，页码连续
- [ ] 无广告、无外链、无社交入口

---

## 7. 待定

- 真人录音方案
- 插画来源与风格规范
- 粤语 / 繁体版本
- 涂鸦功能的卡片形态
