# 内容规范（Content Spec）· 小图鉴 Pico Atlas

所有词条内容必须符合本规范。新增内容前先读这里。

---

## 1. 词条统一结构

四个模块（识物 / 双语 / 古诗 / 故事）共用同一套底层结构，只是 `text` 的丰富度不同。

### 1.1 识物词条

```json
{
  "id": "apple",
  "type": "object",
  "category": "fruit",
  "image": "assets/img/fruit/apple.webp",
  "zh": "苹果",
  "en": "apple",
  "pinyin": "píng guǒ",
  "audio_zh": "assets/audio/zh/apple.mp3",
  "audio_en": "assets/audio/en/apple.mp3",
  "sentence_zh": "红红的苹果",
  "sentence_en": "A red apple.",
  "tags": ["红色", "水果", "圆的"]
}
```

### 1.2 古诗词词条

```json
{
  "id": "yonge",
  "type": "poem",
  "image": "assets/img/poem/yonge.webp",
  "title": "咏鹅",
  "dynasty": "唐",
  "author": "骆宾王",
  "lines": [
    { "text": "鹅，鹅，鹅", "pinyin": "é, é, é" },
    { "text": "曲项向天歌", "pinyin": "qū xiàng xiàng tiān gē" }
  ],
  "audio": "assets/audio/poem/yonge.mp3",
  "explain": "大白鹅弯着脖子，对着天空唱歌。",
  "tags": ["动物", "水", "白"]
}
```

### 1.3 故事词条

```json
{
  "id": "little-rabbit",
  "type": "story",
  "cover": "assets/img/story/little-rabbit/cover.webp",
  "title": "小兔子找妈妈",
  "pages": [
    {
      "image": "assets/img/story/little-rabbit/p1.webp",
      "text": "小兔子睡醒了，妈妈不见了。",
      "audio": "assets/audio/story/little-rabbit/p1.mp3"
    }
  ],
  "age_min": 3,
  "age_max": 5,
  "tags": ["动物", "亲情"]
}
```

---

## 2. 内容规则

### 2.1 语言（3–5 岁）

| 规则 | 说明 |
| --- | --- |
| 句子长度 | **≤ 12 字**，故事页 ≤ 20 字 |
| 生僻字 | **禁止**。必须用幼儿园口语常用词 |
| 抽象词 | 避免「虽然」「因为」「其实」等逻辑连接词 |
| 语气 | 短句、有节奏、可朗读 |
| 拼音 | 所有中文词条必须配拼音（带声调） |

### 2.2 英文

| 规则 | 说明 |
| --- | --- |
| 词性 | 优先可数名词、具体动作词 |
| 难度 | 高频词，CEFR A1 以内 |
| 例句 | 一个短语或极短句，**≤ 5 个单词** |
| 大小写 | 例句首字母大写，其余小写 |
| 发音 | 优先真人录制的自然发音，不用机械 TTS |

### 2.3 图片

| 规则 | 说明 |
| --- | --- |
| 格式 | WebP（源文件另存 PSD/AI 在 `assets/raw/`，不入库） |
| 尺寸 | 长边 1024px 足够，单图 ≤ 200KB |
| 背景 | **纯白或纯色**，主体占画面 ≥ 60%，减少干扰 |
| 风格 | 全部词条**风格统一**，不能写实和卡通混用 |
| 数量 | 一个词条 **只放一张主图**，不做多角度 |

### 2.4 分类（category）

固定值，不要自创：

```
fruit       水果
vegetable   蔬菜
animal      动物
vehicle     交通工具
daily       日常物品
nature      自然（天气、植物）
body        身体部位
color       颜色
shape       形状
```

---

## 3. 文件命名

```
assets/img/{category}/{id}.webp
assets/img/poem/{id}.webp
assets/img/story/{id}/p{页码}.webp
assets/audio/zh/{id}.mp3
assets/audio/en/{id}.mp3
```

- `id` 全小写，单词间用 `-`
- 页码从 `p1` 开始，两位数以上补零：`p01`、`p12`

---

## 4. 内容检查清单

发布前逐条确认：

- [ ] `id` 唯一，且与文件名一致
- [ ] 中文句子 ≤ 12 字，无生僻字
- [ ] 拼音带正确声调
- [ ] 英文例句 ≤ 5 词，拼写正确
- [ ] 图片为 WebP，≤ 200KB，纯色背景
- [ ] 全库视觉风格统一
- [ ] 每个词条都有中文音频
- [ ] `category` 取自固定列表
- [ ] 无广告、无外链、无社交入口

---

## 5. 待定

- 音频从哪里来？（真人录制 / TTS / 采购）
- 图片从哪里来？（原创插画 / 采购 / AI 生成）
- 是否需要繁体中文版本？
- 是否需要方言（粤语等）？
