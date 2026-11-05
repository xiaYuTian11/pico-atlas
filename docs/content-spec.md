# 内容规范（Content Spec）· 小图鉴 Pico Atlas

> 版本：**v2.0 — 统一数据契约、大百科扩展、全诗排版与 6 大真益智游戏契约**  
> 所有入库内容必须严格遵守本契约。

---

## 0. 两大核心哲学

### 0.1 一切皆卡片（All-as-Cards）
应用内所有模块只有一种数据形态：**卡片（Card）**。没有详情页、没有树状二级子页面。
- **识物**：1 件物品 = 1 张卡片。
- **古诗**：1 首古诗 = 1 张卡片（**全诗完整呈现，逐句发光点读**）。
- **故事**：1 个故事 = 连续 4~5 张卡片（依靠 `storyId` 与 `page / pageCount` 串联，末页提供连续画卷）。
- **玩一玩益智互动**：每道益智关卡 = 1 张卡片（一屏一题，单关自成一体）。

### 0.2 内容不重复，只加深（Grow with Age）
同一件物品跨年龄档**只扩展字段，不重复教学**：
- **L1 (3–4 岁)**：纯大图 + 拟声词 + 极简中英文词。
- **L2 (4–5 岁)**：同一张卡片自动长出拼音和短句描述。
- **L3 (5–6 岁)**：同一张卡片自动长出生活小常识（Fact）与深层表达。

---

## 1. 卡片通用统一数据契约 (Universal Card Schema)

```typescript
type CardType = 
  | 'object'         // 识物百科
  | 'poem'           // 经典古诗
  | 'story'          // 微绘本故事
  | 'number'         // 数数认知
  | 'shape'          // 几何形状 (圆/正方/长方/三角/梯形/菱形/立体)
  | 'color'          // 色彩认知 (红/黄/蓝/绿/橙/紫/粉等)
  | 'opposite'       // 对比与空间方位 (大与小/长与短/上与下)
  | 'drawing'        // 自由手指画板
  | 'quiz_shadow'    // 益智：影子剪影配对
  | 'quiz_sound'     // 益智：听声辨物寻踪
  | 'quiz_sort'      // 益智：大小与颜色分类
  | 'tracing'        // 益智：手眼轨迹描绘
  | 'part_to_whole'  // 益智：视觉捉迷藏
  | 'cause_habit';   // 益智：生活习惯因果

interface UniversalCard {
  // 1. 基础身份
  id: string;               // 全局唯一标识，英文小写与短横线（如 "cat", "rabbit-1", "shadow-1"）
  lane: 'look' | 'read' | 'play'; // 所属三大入口之一
  type: CardType;           // 内容类型
  section: string;          // 卡片流内部排列分区（如 "fruits", "animals", "shadow"）
  palette: string;          // 卡片低饱和背景色（如 "#FFF5E8"）
  
  // 2. 视觉资源
  emoji: string;            // 原型占位 emoji
  image?: string;           // 正式版绘本插图路径（如 "assets/images/cat.webp"）
  gestureLock?: boolean;    // 是否锁定滑动手势（画板、轨迹类设为 true）

  // 3. 核心文本
  zh: string;               // 主中文名称 / 标题
  en: string;               // 主英文对应词
  pinyin?: string;          // 带调拼音（L2/L3 自动展示，L1 静默隐藏）
  
  // 4. 音频与拟声契约
  sound?: string;           // 拟声词/环境音标识（如 "meow", "bark", "honk", "water"）
  audio?: {
    zh?: string;            // 中文发音路径（如 "assets/audio/zh/cat.mp3"）
    en?: string;            // 英文发音路径（如 "assets/audio/en/cat.mp3"）
  };

  // 5. 亲子抽屉（Parent Drawer · 供陪读家长查看）
  parentGuide?: {
    explain?: string;       // 通俗白话讲解 / 背景
    prompt?: string;        // 启发提问建议（如："问问宝宝大白鹅在水里怎么划水的呀？"）
  };

  // 6. 年龄深度扩展
  levels?: {
    L1: Record<string, any>;
    L2?: Record<string, any>;
    L3?: Record<string, any>;
  };

  // 7. 益智专用扩展负载 (Payload for Educational Mini-Games)
  quizPayload?: QuizShadowPayload | QuizSoundPayload | QuizSortPayload | TracingPayload | PartToWholePayload | CauseHabitPayload;
}
```

---

## 2. 核心模块与益智互动卡片 Schema 契约

### 2.1 识物卡片（type: object）
- **特点**：大图突出，支持真实拟声，点击图片播放音效，点击文字朗读中英。

```json
{
  "id": "cat",
  "lane": "look",
  "type": "object",
  "section": "animals",
  "emoji": "🐱",
  "image": "assets/images/cat.webp",
  "sound": "meow",
  "palette": "#FFF5E8",
  "zh": "猫",
  "en": "cat",
  "pinyin": "māo",
  "parentGuide": {
    "explain": "猫是人类常见的家养宠物，喜欢独处和晒太阳。",
    "prompt": "学一学小猫是怎么叫的？小猫的耳朵是什么形状的呀？"
  },
  "levels": {
    "L1": {},
    "L2": {
      "sentence_zh": "小猫喵喵叫",
      "sentence_en": "A cat says meow."
    },
    "L3": {
      "sentence_zh": "小猫喜欢晒太阳。",
      "sentence_en": "Cats like to sit in the sun.",
      "fact": "猫咪的胡须可以用来测量通道的宽度。"
    }
  }
}
```

---

### 2.2 古诗卡片（type: poem）—— 全诗呈现、分句点读

**绝不阉割诗句！五言绝句 20 字必须完整排列。**

```json
{
  "id": "yonge",
  "lane": "read",
  "type": "poem",
  "section": "poems",
  "emoji": "🦢",
  "image": "assets/images/yonge.webp",
  "sound": "water",
  "palette": "#EAF6FB",
  "zh": "咏鹅",
  "en": "Ode to the Goose",
  "dynasty": "唐",
  "author": "骆宾王",
  "lines": [
    "鹅，鹅，鹅，",
    "曲项向天歌。",
    "白毛浮绿水，",
    "红掌拨清波。"
  ],
  "pinyinLines": [
    "é, é, é,",
    "qū xiàng xiàng tiān gē.",
    "bái máo fú lǜ shuǐ,",
    "hóng zhǎng bō qīng bō."
  ],
  "parentGuide": {
    "explain": "大白鹅弯着长长的脖子对天欢快歌唱。雪白的羽毛浮在碧绿的水面上，红红的脚掌在清凌凌的水波中轻轻划动。",
    "prompt": "找一找画面里大白鹅红红的脚掌在哪里？水是什么颜色的？"
  },
  "levels": {
    "L1": { "focusLines": 2 },
    "L2": { "focusLines": 4 },
    "L3": { "focusLines": 4 }
  }
}
```

### 2.3 几何图形卡片（type: shape）
- **特点**：支持标准平面图形（圆、方、三角、长方、梯形、菱形、五边形、椭圆等）与立体几何（球体、立方体、圆柱体）。

```json
{
  "id": "shape-trapezoid",
  "lane": "play",
  "type": "shape",
  "section": "shapes",
  "shape": "trapezoid",
  "palette": "#FFF7E6",
  "zh": "梯形",
  "en": "trapezoid",
  "pinyin": "tī xíng",
  "svg": "<svg viewBox=\"0 0 100 100\"><polygon points=\"24,20 76,20 92,80 8,80\" fill=\"#FFA940\"/></svg>",
  "examples": ["花盆", "梯子", "小金元宝"],
  "levels": {
    "L1": {},
    "L2": { "sentence_zh": "上面短，下面长，平平两条边" },
    "L3": { "sentence_zh": "梯形有两条平行的边，就像小花盆一样。", "fact": "大坝的横截面常常是坚固的梯形。" }
  }
}
```

### 2.4 色彩卡片（type: color）
- **特点**：大面积纯色块感知 + 2个生活具象代表物。

```json
{
  "id": "color-yellow",
  "lane": "play",
  "type": "color",
  "section": "colors",
  "colorHex": "#FFD666",
  "palette": "#FFFAE6",
  "zh": "黄色",
  "en": "yellow",
  "pinyin": "huáng sè",
  "examples": [
    { "zh": "香蕉", "emoji": "🍌" },
    { "zh": "小鸭子", "emoji": "🐥" }
  ],
  "levels": {
    "L1": {},
    "L2": { "sentence_zh": "黄黄的香蕉，黄黄的小鸭子" }
  }
}
```

### 2.5 对比与空间方位卡片（type: opposite）
- **特点**：左右双格对比，直观感受相对概念。

```json
{
  "id": "opp-big-small",
  "lane": "play",
  "type": "opposite",
  "section": "opposites",
  "palette": "#F0F5FF",
  "pairA": { "zh": "大", "en": "big", "emoji": "🐘", "label": "大象大大" },
  "pairB": { "zh": "小", "en": "small", "emoji": "🐜", "label": "蚂蚁小小" },
  "zh": "大 与 小",
  "en": "Big & Small"
}
```

---

### 2.6 益智：影子剪影配对卡片 (type: quiz_shadow)
- **目标**：形状抽象与轮廓知觉训练。

```json
{
  "id": "shadow-cat",
  "lane": "play",
  "type": "quiz_shadow",
  "section": "shadow",
  "palette": "#FFF8F0",
  "zh": "找影子：谁的影子？",
  "en": "Shadow Match",
  "quizPayload": {
    "targetShadowImage": "assets/images/shadow/cat_shadow.webp",
    "targetShadowEmoji": "🐱",
    "options": [
      { "id": "opt-cat", "zh": "小猫", "emoji": "🐱", "image": "assets/images/cat.webp", "isCorrect": true, "sound": "meow" },
      { "id": "opt-dog", "zh": "小狗", "emoji": "🐶", "image": "assets/images/dog.webp", "isCorrect": false, "sound": "pop" },
      { "id": "opt-rabbit", "zh": "兔子", "emoji": "🐰", "image": "assets/images/rabbit.webp", "isCorrect": false, "sound": "pop" }
    ]
  }
}
```

---

### 2.4 益智：听声辨物寻踪卡片 (type: quiz_sound)
- **目标**：听觉敏锐度与跨感官联结。

```json
{
  "id": "sound-quiz-train",
  "lane": "play",
  "type": "quiz_sound",
  "section": "sound_quiz",
  "palette": "#EDF5FA",
  "zh": "听一听：谁的声音？",
  "en": "Sound Detective",
  "quizPayload": {
    "soundCue": "train",
    "soundLabel": "呜——哐当哐当",
    "options": [
      { "id": "opt-train", "zh": "火车", "emoji": "🚂", "image": "assets/images/train.webp", "isCorrect": true },
      { "id": "opt-car", "zh": "汽车", "emoji": "🚗", "image": "assets/images/car.webp", "isCorrect": false },
      { "id": "opt-airplane", "zh": "飞机", "emoji": "✈️", "image": "assets/images/airplane.webp", "isCorrect": false }
    ]
  }
}
```

---

### 2.5 益智：大小与颜色分类归位卡片 (type: quiz_sort)
- **目标**：比较概念与分类秩序感。

```json
{
  "id": "sort-big-small-apple",
  "lane": "play",
  "type": "quiz_sort",
  "section": "sort",
  "palette": "#FFF3EB",
  "zh": "分一分：大与小",
  "en": "Sort Big & Small",
  "quizPayload": {
    "buckets": [
      { "id": "bucket-big", "label": "大熊的碗", "size": "large", "emoji": "🐻" },
      { "id": "bucket-small", "label": "小熊的碗", "size": "small", "emoji": "🧸" }
    ],
    "items": [
      { "id": "big-apple-1", "label": "大苹果", "size": "large", "targetBucketId": "bucket-big", "emoji": "🍎" },
      { "id": "small-apple-1", "label": "小苹果", "size": "small", "targetBucketId": "bucket-small", "emoji": "🍎" },
      { "id": "big-apple-2", "label": "大苹果", "size": "large", "targetBucketId": "bucket-big", "emoji": "🍎" },
      { "id": "small-apple-2", "label": "小苹果", "size": "small", "targetBucketId": "bucket-small", "emoji": "🍎" }
    ]
  }
}
```

---

### 2.6 益智：手眼轨迹描绘卡片 (type: tracing)
- **目标**：精细动作与前书写运笔控制。锁定全屏滑动手势 (`gestureLock: true`)。

```json
{
  "id": "trace-rain-flower",
  "lane": "play",
  "type": "tracing",
  "section": "tracing",
  "gestureLock": true,
  "palette": "#F0F7FB",
  "zh": "连一连：小雨滴浇花",
  "en": "Rain to Flower",
  "quizPayload": {
    "pathShape": "vertical_line",
    "startPoint": { "label": "雨云", "emoji": "🌧️" },
    "endPoint": { "label": "小花", "emoji": "🌸" },
    "completeSound": "water"
  }
}
```

---

### 2.7 益智：局部看整体视觉捉迷藏卡片 (type: part_to_whole)
- **目标**：视觉闭合能力与直觉推理。

```json
{
  "id": "peek-rabbit",
  "lane": "play",
  "type": "part_to_whole",
  "section": "peek",
  "palette": "#F4F9EE",
  "zh": "猜一猜：草丛后面是谁？",
  "en": "Who is Hiding?",
  "quizPayload": {
    "coverType": "grass",
    "partialClue": "露出两只长长的兔耳朵",
    "wholeItem": {
      "id": "rabbit",
      "zh": "小兔子",
      "emoji": "🐰",
      "sound": "hop"
    }
  }
}
```

---

### 2.8 益智：生活习惯因果互动卡片 (type: cause_habit)
- **目标**：自理认知与生活行为因果律。

```json
{
  "id": "habit-brush-teeth",
  "lane": "play",
  "type": "cause_habit",
  "section": "habit",
  "palette": "#EDF7F6",
  "zh": "帮小熊刷牙牙",
  "en": "Brush Teeth",
  "quizPayload": {
    "tool": "toothbrush",
    "toolLabel": "小牙刷",
    "beforeState": { "text": "牙齿上有小黄斑", "status": "dirty" },
    "afterState": { "text": "牙齿白白亮晶晶！", "status": "sparkle", "sound": "sparkle" }
  }
}
```

---

## 3. 离线预烘焙音频资产契约 (Audio Asset Naming Scheme)

为保障 100% 离线、高音质、中英双语发音绝对稳定，音频资产统一按照以下结构存储：

```
assets/audio/
  ├── zh/                 # 中文单词发音 (XiaoxiaoNeural, 0.85x)
  ├── en/                 # 英文单词发音 (AnaNeural, 0.9x)
  ├── zh_sent/            # 中文短句发音
  ├── en_sent/            # 英文短句发音
  ├── poem/               # 古诗整首与逐句音频 (yonge_full.mp3, yonge_1.mp3)
  ├── story/              # 故事单页音频 (rabbit_1.mp3)
  └── sfx/                # 真实拟声与益智音效 (meow.mp3, bark.mp3, pop.mp3, chime.mp3)
```

---

## 4. 审核质检清单 (Content QA Checklist)

每次新增内容时必须核对：
- [ ] `id` 符合小写字母和短横线命名规范，全库唯一。
- [ ] 物品与动物必须配置适合该年龄段的 `sound` 拟声标识。
- [ ] 古诗必须包含完整的 4 句 `lines` 数组与对应拼音。
- [ ] 故事卡片页数严格在 4–5 页，且最后一张卡片结局安全温暖。
- [ ] 涂鸦与手眼描绘卡片显式标注 `gestureLock: true`。
- [ ] 益智游戏绝对不得设置扣分、倒计时或打叉惩罚。
- [ ] 严禁任何诱导性词汇、外链与商业推广内容。
