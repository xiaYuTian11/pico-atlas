#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
词库扩容批次 1：益智题纯数据扩容（+43 张，零图片）。

生成内容追加到 src/content/cards.json，幂等：按 id 去重，重复运行只补缺。

覆盖玩法（现有 → 目标）：
  找影子  3→12   剪影由 tools/gen_shadows.py 从主图派生
  分一分  3→9    emoji 数据题
  描一描  3→6    组件已支持 6 种轨迹
  颜色    3→7    colorHex 渲染，无图
  图形    3→8    ShapeCard 已支持 8 种形状
  比一比  3→9    emoji 对比
  帮帮忙  3→8    emoji 情景
  画一画  3→8    纯文案
"""
from __future__ import annotations

import json
import os
from pathlib import Path

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "src" / "content" / "cards.json"

def card(id_, type_, section, zh, en, emoji, palette, sound="pop", **kw):
    c = {
        "id": id_, "lane": "play", "type": type_, "section": section,
        "zh": zh, "en": en, "emoji": emoji, "palette": palette, "sound": sound,
    }
    c.update(kw)
    return c

NEW = []

# ============ 找影子 +9（目标主图词库中已有图的动物） ============
def shadow(target_zh, target_en, target_emoji, target_sound, decoys, subject, seed):
    opts = [{"id": f"opt-{target_en}", "zh": target_zh, "emoji": target_emoji, "isCorrect": True, "sound": target_sound}]
    for dz, de, dem in decoys:
        opts.append({"id": f"opt-{de}", "zh": dz, "emoji": dem, "isCorrect": False, "sound": "pop"})
    return card(
        f"quiz-shadow-{target_en.lower()}", "quiz_shadow", "quiz_shadow",
        "找影子：谁的影子？", "Shadow Match", "👤", "var(--pa-pal-stone)",
        sound=target_sound,
        parentGuide={"explain": f"看黑影子的轮廓，猜猜是哪个{target_zh}。",
                     "prompt": f"这个影子是谁的呢？选一选。"},
        quizPayload={"targetEmoji": target_emoji, "options": opts},
        art={"subject": subject, "cutout": True, "seed": seed},
    )

NEW += [
    shadow("小鸭子", "Duck", "🦆", "pop", [("小鸡", "Chick2", "🐔"), ("天鹅", "Swan", "🦢")],
           "a single cute duckling standing in profile, round body, flat orange beak, clear simple outline, plain background", 4211),
    shadow("大象", "Elephant", "🐘", "pop", [("小猪", "Pig2", "🐷"), ("犀牛", "Rhino", "🦏")],
           "a single cute elephant standing in profile with long trunk and big round ears, clear simple outline, plain background", 4212),
    shadow("小狮子", "Lion", "🦁", "pop", [("小猫", "Cat2", "🐱"), ("老虎", "Tiger", "🐯")],
           "a single cute little lion sitting in profile with fluffy round mane, clear simple outline, plain background", 4213),
    shadow("熊猫", "Panda", "🐼", "pop", [("小熊", "Bear2", "🐻"), ("小猪", "Pig3", "🐷")],
           "a single cute panda sitting in profile with round body and round ears, clear simple outline, plain background", 4214),
    shadow("小鱼", "Fish", "🐟", "pop", [("海豚", "Dolphin2", "🐬"), ("鲸鱼", "Whale2", "🐳")],
           "a single cute little fish in profile with round body, small fin and triangular tail, clear simple outline, plain background", 4215),
    shadow("蝴蝶", "Butterfly", "🦋", "pop", [("蜜蜂", "Bee2", "🐝"), ("蜻蜓", "Dragonfly", "🪰")],
           "a single cute butterfly with two big round wings spread open, symmetrical, clear simple outline, plain background", 4216),
    shadow("乌龟", "Turtle", "🐢", "pop", [("蜗牛", "Snail2", "🐌"), ("螃蟹", "Crab2", "🦀")],
           "a single cute little turtle in profile with dome shell and small head, clear simple outline, plain background", 4217),
    shadow("蜗牛", "Snail", "🐌", "pop", [("乌龟", "Turtle2", "🐢"), ("毛毛虫", "Caterpillar", "🐛")],
           "a single cute snail in profile with spiral round shell, clear simple outline, plain background", 4218),
    shadow("蜜蜂", "Bee", "🐝", "pop", [("蝴蝶", "Butterfly2", "🦋"), ("瓢虫", "Ladybug", "🐞")],
           "a single cute little bee in profile, round striped body, two small wings, clear simple outline, plain background", 4219),
]

# ============ 分一分 +6 ============
def sort2(id_, zh, en, explain, prompt, b1, b2, items):
    buckets = [{"id": b1[0], "label": b1[1], "emoji": b1[2], "size": b1[3] if len(b1) > 3 else None},
               {"id": b2[0], "label": b2[1], "emoji": b2[2], "size": b2[3] if len(b2) > 3 else None}]
    buckets = [{k: v for k, v in b.items() if v is not None} for b in buckets]
    its = []
    for iid, label, emoji, key, tb in items:
        it = {"id": iid, "label": label, "emoji": emoji, "targetBucketId": tb}
        it[key[0]] = key[1]
        its.append(it)
    return card(id_, "quiz_sort", "quiz_sort", zh, en, "🧺", "var(--pa-pal-cream)",
                parentGuide={"explain": explain, "prompt": prompt},
                quizPayload={"buckets": buckets, "items": its})

NEW += [
    sort2("quiz-sort-animal-vehicle", "分一分：动物与车", "Sort Animals & Vehicles",
          "小动物放草地盘，车车放马路边。",
          "小狗是动物还是车车呀？",
          ("bucket-animal", "动物的家", "🌳"), ("bucket-vehicle", "车车的家", "🛣️"),
          [("sv-dog", "小狗", "🐶", ("kind", "animal"), "bucket-animal"),
           ("sv-car", "小汽车", "🚗", ("kind", "vehicle"), "bucket-vehicle"),
           ("sv-cat", "小猫", "🐱", ("kind", "animal"), "bucket-animal"),
           ("sv-bus", "公交车", "🚌", ("kind", "vehicle"), "bucket-vehicle")]),
    sort2("quiz-sort-eat-play", "分一分：吃的与玩的", "Sort Food & Toys",
          "吃的放餐盘，玩的放玩具箱。",
          "苹果是吃的还是玩的呀？",
          ("bucket-eat", "餐盘", "🍽️"), ("bucket-play", "玩具箱", "🧸"),
          [("ep-apple", "苹果", "🍎", ("kind", "eat"), "bucket-eat"),
           ("ep-ball", "皮球", "⚽", ("kind", "play"), "bucket-play"),
           ("ep-banana", "香蕉", "🍌", ("kind", "eat"), "bucket-eat"),
           ("ep-blocks", "积木", "🧱", ("kind", "play"), "bucket-play")]),
    sort2("quiz-sort-day-night", "分一分：白天与晚上", "Sort Day & Night",
          "白天的放太阳盘，晚上的放月亮盘。",
          "太阳是白天的还是晚上的呀？",
          ("bucket-day", "太阳盘", "☀️"), ("bucket-night", "月亮盘", "🌙"),
          [("dn-sun", "太阳", "☀️", ("time", "day"), "bucket-day"),
           ("dn-moon", "月亮", "🌙", ("time", "night"), "bucket-night"),
           ("dn-owl", "猫头鹰", "🦉", ("time", "night"), "bucket-night"),
           ("dn-butterfly", "蝴蝶", "🦋", ("time", "day"), "bucket-day")]),
    sort2("quiz-sort-sky-water", "分一分：天上与水里", "Sort Sky & Water",
          "天上飞的放云朵盘，水里游的放池塘盘。",
          "小鸟在哪里飞呀？",
          ("bucket-sky", "云朵盘", "☁️"), ("bucket-water", "池塘盘", "🌊"),
          [("sw-bird", "小鸟", "🐦", ("place", "sky"), "bucket-sky"),
           ("sw-fish", "小鱼", "🐟", ("place", "water"), "bucket-water"),
           ("sw-plane", "飞机", "✈️", ("place", "sky"), "bucket-sky"),
           ("sw-shrimp", "小虾", "🦐", ("place", "water"), "bucket-water")]),
    sort2("quiz-sort-red-blue", "分一分：红与蓝", "Sort Red & Blue",
          "红色的放红盘子，蓝色的放蓝盘子。",
          "草莓是什么颜色的？",
          ("bucket-red2", "红盘子", "🟥"), ("bucket-blue2", "蓝盘子", "🟦"),
          [("rb-strawberry", "草莓", "🍓", ("colorKey", "red"), "bucket-red2"),
           ("rb-blueberry", "蓝莓", "🫐", ("colorKey", "blue"), "bucket-blue2"),
           ("rb-fire-truck", "消防车", "🚒", ("colorKey", "red"), "bucket-red2"),
           ("rb-whale", "鲸鱼", "🐳", ("colorKey", "blue"), "bucket-blue2")]),
    sort2("quiz-sort-big-small2", "分一分：大与小（水果版）", "Sort Big & Small Fruits",
          "大的水果放大盘子，小的水果放小盘子。",
          "西瓜是大还是小呀？",
          ("bucket-big2", "大盘子", "🥘", "large"), ("bucket-small2", "小盘子", "🥣", "small"),
          [("bs-watermelon", "大西瓜", "🍉", ("size", "large"), "bucket-big2"),
           ("bs-grape", "小葡萄", "🍇", ("size", "small"), "bucket-small2"),
           ("bs-pumpkin", "大南瓜", "🎃", ("size", "large"), "bucket-big2"),
           ("bs-cherry", "小樱桃", "🍒", ("size", "small"), "bucket-small2")]),
]

# ============ 描一描 +3（组件已支持 horizontal/zigzag/spiral） ============
NEW += [
    card("trace-horizontal", "tracing", "tracing", "描一描：小火车开呀开", "Train Track", "✏️",
         "var(--pa-pal-mint)", "train", gestureLock=True,
         parentGuide={"explain": "用手指沿着虚线，从左到右画一条横线。",
                      "prompt": "小火车从车站开走喽！"},
         quizPayload={"pathShape": "horizontal_line",
                      "startPoint": {"label": "车站", "emoji": "🚉"},
                      "endPoint": {"label": "小山", "emoji": "⛰️"}}),
    card("trace-zigzag", "tracing", "tracing", "描一描：小鸟飞回家", "Bird Fly Home", "✏️",
         "var(--pa-pal-mint)", "pop", gestureLock=True,
         parentGuide={"explain": "用手指沿着锯齿虚线，帮小鸟飞回家。",
                      "prompt": "小鸟飞呀飞，一上一下回家啦！"},
         quizPayload={"pathShape": "zigzag",
                      "startPoint": {"label": "小鸟", "emoji": "🐦"},
                      "endPoint": {"label": "鸟窝", "emoji": "🪺"}}),
    card("trace-spiral", "tracing", "tracing", "描一描：小蜗牛的壳", "Snail Shell", "✏️",
         "var(--pa-pal-mint)", "pop", gestureLock=True,
         parentGuide={"explain": "用手指从中间开始，一圈一圈向外画螺旋。",
                      "prompt": "小蜗牛的壳是圆圆的圈圈！"},
         quizPayload={"pathShape": "spiral",
                      "startPoint": {"label": "中心", "emoji": "🐌"},
                      "endPoint": {"label": "外面", "emoji": "🌿"}}),
]

# ============ 颜色 +4 ============
def color(id_, zh, en, pinyin, hex_, emoji, palette, examples, l2, l3):
    return card(id_, "color", "colors", zh, en, emoji, palette,
                parentGuide={"explain": l2, "prompt": l3["prompt"]},
                examples=examples,
                colorHex=hex_, pinyin=pinyin,
                levels={"L2": {"sentence_zh": l2}, "L3": l3})

NEW += [
    color("color-green", "绿色", "green", "lǜ sè", "#52C41A", "🥦", "var(--pa-pal-mint)",
          [{"zh": "大树", "emoji": "🌳"}, {"zh": "小青蛙", "emoji": "🐸"}],
          "绿绿的大树", {"sentence_zh": "绿色像草地和大树。", "fact": "树叶是绿色的，能帮大树吃饱阳光。", "prompt": "外面有什么东西是绿色的？"}),
    color("color-orange", "橙色", "orange", "chéng sè", "#FA8C16", "🍊", "var(--pa-pal-cream)",
          [{"zh": "橘子", "emoji": "🍊"}, {"zh": "胡萝卜", "emoji": "🥕"}],
          "橙橙的橘子", {"sentence_zh": "橙色像橘子和太阳。", "fact": "很多水果熟了会变成橙色。", "prompt": "宝宝吃过橙色的水果吗？"}),
    color("color-purple", "紫色", "purple", "zǐ sè", "#722ED1", "🍇", "var(--pa-pal-lilac)",
          [{"zh": "葡萄", "emoji": "🍇"}, {"zh": "茄子", "emoji": "🍆"}],
          "紫紫的葡萄", {"sentence_zh": "紫色像葡萄和茄子。", "fact": "紫色在彩虹的最后一个颜色。", "prompt": "还见过紫色的什么？"}),
    color("color-pink", "粉色", "pink", "fěn sè", "#EB2F96", "🌸", "var(--pa-pal-rose)",
          [{"zh": "桃花", "emoji": "🌸"}, {"zh": "小猪", "emoji": "🐷"}],
          "粉粉的桃花", {"sentence_zh": "粉色像桃花一样温柔。", "fact": "粉色是红色加了白色变出来的。", "prompt": "宝宝喜欢粉色吗？"}),
]

# ============ 图形 +5（ShapeCard 已支持 rectangle/oval/diamond/trapezoid/pentagon） ============
def shape(id_, zh, en, pinyin, shape_name, emoji, palette, examples, l2, l3):
    return card(id_, "shape", "shapes", zh, en, emoji, palette, pinyin=pinyin,
                shape=shape_name,
                parentGuide={"explain": l2, "prompt": l3["prompt"]},
                examples=examples,
                levels={"L2": {"sentence_zh": l2}, "L3": l3})

NEW += [
    shape("shape-rectangle", "长方形", "rectangle", "cháng fāng xíng", "rectangle", "📱", "var(--pa-pal-sky)",
          [{"zh": "门", "emoji": "🚪"}, {"zh": "书本", "emoji": "📖"}],
          "长长方方的门", {"sentence_zh": "长方形长长的，像门和书。", "fact": "长方形有四条边，对面的边一样长。", "prompt": "家里哪些东西是长方形？"}),
    shape("shape-oval", "椭圆", "oval", "tuǒ yuán", "oval", "🥚", "var(--pa-pal-cream)",
          [{"zh": "鸡蛋", "emoji": "🥚"}, {"zh": "橄榄球", "emoji": "🏈"}],
          "椭圆的鸡蛋", {"sentence_zh": "椭圆形像鸡蛋一样圆圆的。", "fact": "椭圆是拉长了的圆。", "prompt": "还有什么东西是椭圆形？"}),
    shape("shape-diamond", "菱形", "diamond", "líng xíng", "diamond", "🎐", "var(--pa-pal-lilac)",
          [{"zh": "风筝", "emoji": "🪁"}, {"zh": "饼干", "emoji": "🍪"}],
          "菱形的风筝", {"sentence_zh": "菱形像飞起来的风筝。", "fact": "菱形四条边一样长，尖尖的。", "prompt": "风筝是什么形状？"}),
    shape("shape-trapezoid", "梯形", "trapezoid", "tī xíng", "trapezoid", "🧺", "var(--pa-pal-stone)",
          [{"zh": "水桶", "emoji": "🪣"}, {"zh": "花盆", "emoji": "🪴"}],
          "梯形的水桶", {"sentence_zh": "梯形上面小，下面大。", "fact": "水桶像梯形，所以能装很多水。", "prompt": "家里有梯形的东西吗？"}),
    shape("shape-pentagon", "五边形", "pentagon", "wǔ biān xíng", "pentagon", "🏠", "var(--pa-pal-rose)",
          [{"zh": "小房子", "emoji": "🏚️"}, {"zh": "足球", "emoji": "⚽"}],
          "五边形的小房子", {"sentence_zh": "五边形有五条边。", "fact": "足球上有好多五边形拼在一起。", "prompt": "数一数小房子有几条边？"}),
]

# ============ 比一比 +6 ============
def opp(id_, zh, en, emoji, palette, a, b, l2, l3, prompt):
    return card(id_, "opposite", "opposites", zh, en, emoji, palette,
                pairA=a, pairB=b,
                parentGuide={"explain": l2, "prompt": prompt},
                levels={"L2": {"sentence_zh": l2}, "L3": l3})

NEW += [
    opp("opp-hot-cold", "热 与 冷", "Hot & Cold", "🌡️", "var(--pa-pal-rose)",
        {"zh": "热", "en": "hot", "emoji": "🔥"}, {"zh": "冷", "en": "cold", "emoji": "❄️"},
        "汤圆热，冰棍冷", {"sentence_zh": "热的东西要吹一吹，冷的东西冰冰的。", "fact": "热的东西会烫嘴，要等一等再吃。"},
        "汤是热的还是冷的？"),
    opp("opp-fast-slow", "快 与 慢", "Fast & Slow", "🏃", "var(--pa-pal-sky)",
        {"zh": "快", "en": "fast", "emoji": "🐇"}, {"zh": "慢", "en": "slow", "emoji": "🐢"},
        "兔子快，乌龟慢", {"sentence_zh": "兔子跑得快，乌龟爬得慢。", "fact": "乌龟背着壳，所以走得慢。"},
        "宝宝走路快还是慢？"),
    opp("opp-happy-sad", "开心 与 难过", "Happy & Sad", "😊", "var(--pa-pal-mint)",
        {"zh": "开心", "en": "happy", "emoji": "😄"}, {"zh": "难过", "en": "sad", "emoji": "😢"},
        "开心地笑，难过地哭", {"sentence_zh": "开心的时候笑一笑，难过的时候抱一抱。", "fact": "难过的时候可以告诉妈妈。"},
        "宝宝现在开心吗？"),
    opp("opp-day-night", "白天 与 黑夜", "Day & Night", "🌗", "var(--pa-pal-lilac)",
        {"zh": "白天", "en": "day", "emoji": "☀️"}, {"zh": "黑夜", "en": "night", "emoji": "🌙"},
        "白天亮，黑夜黑", {"sentence_zh": "白天有太阳，黑夜有月亮和星星。", "fact": "晚上睡一觉，天就亮啦。"},
        "太阳出来是白天还是黑夜？"),
    opp("opp-open-close", "开 与 关", "Open & Close", "🚪", "var(--pa-pal-cream)",
        {"zh": "开", "en": "open", "emoji": "📂"}, {"zh": "关", "en": "close", "emoji": "📕"},
        "开门，关门", {"sentence_zh": "门开了，门关了。", "fact": "出门要随手关门，家里才安全。"},
        "宝宝会开门和关门吗？"),
    opp("opp-many-few", "多 与 少", "Many & Few", "🍬", "var(--pa-pal-rose)",
        {"zh": "多", "en": "many", "emoji": "🍬🍬"}, {"zh": "少", "en": "few", "emoji": "🍬"},
        "糖多，糖少", {"sentence_zh": "这堆糖多，那堆糖少。", "fact": "数一数就知道哪个多。"},
        "哪边的糖多呀？"),
]

# ============ 帮帮忙 +5 ============
def habit(id_, zh, en, emoji, palette, sound, tool, tool_label, tool_emoji, before, after, passes, prompt):
    return card(id_, "cause_habit", "habit", zh, en, emoji, palette, sound,
                parentGuide={"explain": before["text"] + "，" + after["text"], "prompt": prompt},
                quizPayload={"tool": tool, "toolLabel": tool_label, "toolEmoji": tool_emoji,
                             "beforeState": before, "afterState": after, "requiredPasses": passes})

NEW += [
    habit("habit-wash-hands", "帮帮忙：洗手手", "Wash Hands", "🧼", "var(--pa-pal-mint)", "water",
          "soap", "小香皂", "🧼",
          {"text": "小手上有泥巴", "emoji": "🤲"},
          {"text": "小手洗得香喷喷！", "emoji": "🙌", "sound": "chime"}, 6,
          "饭前便后要洗手，宝宝会吗？"),
    habit("habit-hair", "帮帮忙：梳头发", "Comb Hair", "🪮", "var(--pa-pal-rose)", "pop",
          "comb", "小梳子", "🪮",
          {"text": "头发乱蓬蓬", "emoji": "💨"},
          {"text": "头发顺顺滑滑！", "emoji": "💇", "sound": "chime"}, 5,
          "早上起床要梳头发哦。"),
    habit("habit-feed-fish", "帮帮忙：喂小鱼", "Feed the Fish", "🐠", "var(--pa-pal-sky)", "water",
          "fish_food", "鱼食", "🍚",
          {"text": "小鱼饿了，吐泡泡", "emoji": "🐟"},
          {"text": "小鱼吃得饱饱的！", "emoji": "🐠", "sound": "chime"}, 5,
          "小鱼一天吃一点点，不能喂太多。"),
    habit("habit-toys", "帮帮忙：收玩具", "Tidy Up Toys", "🧸", "var(--pa-pal-cream)", "pop",
          "basket", "小篮子", "🧺",
          {"text": "玩具撒了一地", "emoji": "🌀"},
          {"text": "玩具都回家啦！", "emoji": "✨", "sound": "chime"}, 6,
          "玩完玩具要送它们回家。"),
    habit("habit-bird", "帮帮忙：喂小鸟", "Feed the Bird", "🐦", "var(--pa-pal-mint)", "pop",
          "seeds", "小米粒", "🌾",
          {"text": "小鸟叽叽喳喳叫", "emoji": "🕊️"},
          {"text": "小鸟吃饱了，唱歌啦！", "emoji": "🎵", "sound": "chime"}, 5,
          "冬天小鸟找不到吃的，我们帮帮它。"),
]

# ============ 画一画 +5 ============
def draw(id_, zh, en, emoji, palette, l2, l3, prompt):
    return card(id_, "drawing", "drawing", zh, en, emoji, palette, gestureLock=True,
                parentGuide={"explain": l2, "prompt": prompt},
                levels={"L2": {"sentence_zh": l2}, "L3": l3})

NEW += [
    draw("draw-fish", "画小鱼", "Draw a Fish", "🐟", "var(--pa-pal-sky)",
         "画一条小鱼", {"sentence_zh": "圆圆的身体，摆摆的尾巴，就是小鱼。"},
         "小鱼用什么游泳呀？"),
    draw("draw-house", "画小房子", "Draw a House", "🏠", "var(--pa-pal-cream)",
         "画一座小房子", {"sentence_zh": "方方的身子，尖尖的顶，就是小房子。"},
         "小房子里住着谁呀？"),
    draw("draw-flower", "画小花", "Draw a Flower", "🌸", "var(--pa-pal-rose)",
         "画一朵小花", {"sentence_zh": "圆圆的花心，花瓣围一圈，就是小花。"},
         "小花香不香呀？"),
    draw("draw-balloon", "画气球", "Draw a Balloon", "🎈", "var(--pa-pal-lilac)",
         "画一个气球", {"sentence_zh": "圆圆的身体，细细的线，就是气球。"},
         "气球飞到哪里去了？"),
    draw("draw-rainbow", "画彩虹", "Draw a Rainbow", "🌈", "var(--pa-pal-sky)",
         "画一道彩虹", {"sentence_zh": "弯弯的七彩桥，挂在天空上。"},
         "彩虹有几种颜色呀？"),
]

# ============ 猜一猜 +3（需要出图，art 已配） ============
def peek(id_, zh, clue, whole_zh, whole_en, whole_emoji, decoys, subject, seed, prompt):
    opts = [{"id": whole_en, "zh": whole_zh, "emoji": whole_emoji, "isCorrect": True, "sound": "chime"}]
    for dz, de, dem in decoys:
        opts.append({"id": de, "zh": dz, "emoji": dem, "isCorrect": False})
    return card(id_, "part_to_whole", "peek", zh, "Who is Hiding?", "🫣", "var(--pa-pal-mint)",
                parentGuide={"explain": "只露出一点点，猜猜是什么。", "prompt": prompt},
                quizPayload={"coverType": "grass", "partialClue": clue,
                             "wholeItem": {"id": whole_en.lower(), "zh": whole_zh, "emoji": whole_emoji, "sound": "pop"},
                             "options": opts},
                art={"subject": subject, "seed": seed})

NEW += [
    peek("peek-elephant-trunk", "猜一猜：谁的长鼻子？", "露出长长的鼻子", "大象", "Elephant", "🐘",
         [("小猴", "Monkey", "🐵"), ("小猪", "Pig", "🐷")],
         "a cute elephant standing facing viewer with long trunk, only trunk visible from behind big green leaves, playful, peek-a-boo", 4231,
         "长长的鼻子是谁的呀？"),
    peek("peek-watermelon", "猜一猜：切开的红果果？", "露出红红的果肉", "西瓜", "Watermelon", "🍉",
         [("苹果", "Apple", "🍎"), ("番茄", "Tomato", "🍅")],
         "a cut watermelon slice with red flesh and green rind on a wooden table, close-up, juicy, fresh", 4232,
         "红红的果肉，绿绿的皮，是什么呀？"),
    peek("peek-wheel", "猜一猜：圆圆的车轮子？", "露出圆圆的轮子", "小汽车", "Car", "🚗",
         [("自行车", "Bicycle", "🚲"), ("火车", "Train", "🚂")],
         "a cute red toy car with round black wheels on a road, only front wheel visible peeking from behind a bush, playful", 4233,
         "圆圆的轮子是什么车的呀？"),
]

def main():
    data = json.loads(CARDS.read_text(encoding="utf-8"))
    existing = {c["id"] for c in data}
    added = [c for c in NEW if c["id"] not in existing]
    data.extend(added)
    CARDS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"新增 {len(added)} 张（重复跳过 {len(NEW) - len(added)}）→ cards.json 总数 {len(data)}")

if __name__ == "__main__":
    main()
