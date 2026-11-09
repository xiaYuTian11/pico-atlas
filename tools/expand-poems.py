#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
词库扩容批次 2：古诗 3 → 20（+17 首五言为主、意象具体的绝句）。

选篇标准（3–5 岁）：
  - 四句成篇（schema 硬约束 lines.length === 4）
  - 意象具体可画（鸟/花/山/水/月/雪），避开战争/思乡/离愁重的篇目
  - 五言为主，七言只收画面感极强的两首（咏柳/绝句）

每首生成：lines + pinyinLines + parentGuide + levels(focusLines) + art 场景词。
幂等：按 id 去重。
"""
from __future__ import annotations

import json
import os
from pathlib import Path

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "src" / "content" / "cards.json"

def poem(id_, zh, en, dynasty, author, emoji, palette, sound, lines, pinyin, explain, prompt, art_subject):
    return {
        "id": id_, "lane": "read", "type": "poem", "section": "poems",
        "zh": zh, "en": en, "emoji": emoji, "palette": palette, "sound": sound,
        "dynasty": dynasty, "author": author,
        "lines": lines, "pinyinLines": pinyin,
        "parentGuide": {"explain": explain, "prompt": prompt},
        "levels": {"L1": {"focusLines": 2}, "L2": {"focusLines": 4}, "L3": {"focusLines": 4}},
        "art": {"subject": art_subject, "scene_template": "{subject}"},
    }

P = []  # 17 首新古诗

P.append(poem("chunxiao", "春晓", "Spring Dawn", "唐", "孟浩然", "🐦", "var(--pa-pal-mint)", "chime",
    ["春眠不觉晓，", "处处闻啼鸟。", "夜来风雨声，", "花落知多少。"],
    ["chūn mián bù jué xiǎo,", "chù chù wén tí niǎo.", "yè lái fēng yǔ shēng,", "huā luò zhī duō shǎo."],
    "春天睡觉真舒服，一觉睡到天亮啦。到处都听到小鸟在唱歌。夜里听到风声雨声，不知道吹落了多少小花。",
    "宝宝早上醒来听到小鸟叫了吗？",
    "spring morning scene, little birds singing on blooming peach tree branches, a few pink petals falling on soft grass, gentle rain just stopped, fresh green leaves, warm sunlight"))

P.append(poem("dengguanquelou", "登鹳雀楼", "On the Stork Tower", "唐", "王之涣", "🌇", "var(--pa-pal-sky)", "pop",
    ["白日依山尽，", "黄河入海流。", "欲穷千里目，", "更上一层楼。"],
    ["bái rì yī shān jìn,", "huáng hé rù hǎi liú.", "yù qióng qiān lǐ mù,", "gèng shàng yī céng lóu."],
    "太阳贴着大山慢慢落下去了，黄河的水哗哗地流向大海。想看得更远更远？那就再爬高一层楼吧！",
    "宝宝站得高，是不是看得远呀？",
    "sunset scene from an ancient chinese tower, big red sun setting behind distant purple mountains, a wide yellow river flowing to the sea, golden sky, a small child silhouette looking far away at the tower railing"))

P.append(poem("chishang", "池上", "On the Pond", "唐", "白居易", "🪷", "var(--pa-pal-mint)", "water",
    ["小娃撑小艇，", "偷采白莲回。", "不解藏踪迹，", "浮萍一道开。"],
    ["xiǎo wá chēng xiǎo tǐng,", "tōu cǎi bái lián huí.", "bù jiě cáng zōng jì,", "fú píng yī dào kāi."],
    "一个小娃娃撑着小船，偷偷采了白莲花就往回划。可是他不会藏起自己的脚印呀——水面上的浮萍被小船分开了一条长长的路。",
    "小娃娃的小船把浮萍分开了一条路，好玩吗？",
    "a cute little child in a small wooden boat on a pond, holding a white lotus flower, a trail opening in the green floating duckweed behind the boat, summer lotus pond, playful"))

P.append(poem("xunyizhebuyu", "寻隐者不遇", "Seeking the Hermit", "唐", "贾岛", "🌲", "var(--pa-pal-mint)", "pop",
    ["松下问童子，", "言师采药去。", "只在此山中，", "云深不知处。"],
    ["sōng xià wèn tóng zǐ,", "yán shī cǎi yào qù.", "zhǐ zài cǐ shān zhōng,", "yún shēn bù zhī chù."],
    "大松树下问小童子：你师父去哪啦？小童子说：师父采药去了。就在这座大山里，可是云太厚太厚，不知道他到底在哪里。",
    "师父躲进云里啦，找得到吗？",
    "a little boy standing under a big old pine tree pointing to misty mountains, white clouds wrapping the green mountain peaks, a small path disappearing into the clouds, peaceful"))

P.append(poem("hua-tang-wangwei", "画", "The Picture", "唐", "王维", "🖼️", "var(--pa-pal-lilac)", "chime",
    ["远看山有色，", "近听水无声。", "春去花还在，", "人来鸟不惊。"],
    ["yuǎn kàn shān yǒu sè,", "jìn tīng shuǐ wú shēng.", "chūn qù huā hái zài,", "rén lái niǎo bù jīng."],
    "远远看去，山有漂亮的颜色；走近听一听，水却一点声音也没有。春天过去了，花还在开着；人走近了，小鸟也不害怕。为什么呀？因为这是一幅画呀！",
    "为什么小鸟不飞走呀？（因为是画呀！）",
    "a traditional chinese landscape painting in a wooden frame, green mountains, a quiet waterfall, blooming flowers and a little blue bird, all painted flat and still like a hanging scroll"))

P.append(poem("jiangxue", "江雪", "River Snow", "唐", "柳宗元", "❄️", "var(--pa-pal-sky)", "soft",
    ["千山鸟飞绝，", "万径人踪灭。", "孤舟蓑笠翁，", "独钓寒江雪。"],
    ["qiān shān niǎo fēi jué,", "wàn jìng rén zōng miè.", "gū zhōu suō lì wēng,", "dú diào hán jiāng xuě."],
    "大雪下得好大好大，所有山上的小鸟都飞走了，所有路上都看不到人。只有一位老爷爷，一个人坐在小船上，在寒冷的江面上钓鱼。他真勇敢呀！",
    "下雪天，老爷爷在钓鱼，冷不冷呀？",
    "a snowy winter scene, all mountains covered in thick white snow, a lone little boat on the frozen river, an old fisherman in a straw hat and cape fishing quietly, falling snowflakes"))

P.append(poem("fengxue", "逢雪宿芙蓉山主人", "Snow Night at the Inn", "唐", "刘长卿", "🐕", "var(--pa-pal-stone)", "bark",
    ["日暮苍山远，", "天寒白屋贫。", "柴门闻犬吠，", "风雪夜归人。"],
    ["rì mù cāng shān yuǎn,", "tiān hán bái wū pín.", "chái mén wén quǎn fèi,", "fēng xuě yè guī rén."],
    "天黑啦，青山看起来远远的；天冷啦，小茅屋白白的。忽然听见柴门后面有小狗汪汪叫——原来是大风雪的夜里，有人回家来了。",
    "小狗汪汪叫，是谁回家啦？",
    "a cozy small cottage with warm yellow window light at dusk, snow falling heavily, a little dog standing at the wooden gate barking, a person with a lantern walking home through the snow"))

P.append(poem("jueju-huangli", "绝句", "Two Orioles", "唐", "杜甫", "🐤", "var(--pa-pal-mint)", "chime",
    ["两个黄鹂鸣翠柳，", "一行白鹭上青天。", "窗含西岭千秋雪，", "门泊东吴万里船。"],
    ["liǎng gè huáng lí míng cuì liǔ,", "yī háng bái lù shàng qīng tiān.", "chuāng hán xī lǐng qiān qiū xuě,", "mén bó dōng wú wàn lǐ chuán."],
    "两只黄鹂鸟在绿绿的柳树上唱歌，一行白鹭排着队飞上蓝蓝的天。窗外是西岭山顶上千年的白雪，门口停着要去很远很远地方的大船。",
    "黄鹂鸟在唱什么歌呀？",
    "two yellow orioles singing on bright green willow branches, a line of white egrets flying into the blue sky, distant snowy mountains seen through a window, a big sailboat moored by the door"))

P.append(poem("shancun", "山村咏怀", "Counting the Village", "宋", "邵雍", "🏘️", "var(--pa-pal-cream)", "pop",
    ["一去二三里，", "烟村四五家。", "亭台六七座，", "八九十枝花。"],
    ["yī qù èr sān lǐ,", "yān cūn sì wǔ jiā.", "tíng tái liù qī zuò,", "bā jiǔ shí zhī huā."],
    "走出去二三里路，看到冒着炊烟的小村庄有四五户人家。路边有六七座小亭子，还有八朵、九朵、十朵花开得正好。这首诗里藏着一到十的数字哦！",
    "宝宝来找一找，诗里藏了哪些数字呀？",
    "a peaceful little village in morning mist with four or five cottages, small pavilions along a path, colorful flowers blooming, counting song feeling, gentle colors"))

P.append(poem("feng", "风", "The Wind", "唐", "李峤", "🍃", "var(--pa-pal-mint)", "soft",
    ["解落三秋叶，", "能开二月花。", "过江千尺浪，", "入竹万竿斜。"],
    ["jiě luò sān qiū yè,", "néng kāi èr yuè huā.", "guò jiāng qiān chǐ làng,", "rù zhú wàn gān xié."],
    "风儿真厉害呀！它能把秋天的叶子吹落，能把春天的花朵吹开。它跑过大江，能掀起大浪；钻进竹林，能把竹子吹得歪歪的。",
    "宝宝的脸上有风吗？风吹在脸上什么感觉？",
    "autumn leaves swirling in the wind, spring flowers opening, wind sweeping waves on a wide river, a bamboo grove bending gracefully, invisible wind made visible through movement"))

P.append(poem("yongliu", "咏柳", "Ode to the Willow", "唐", "贺知章", "🌿", "var(--pa-pal-mint)", "soft",
    ["碧玉妆成一树高，", "万条垂下绿丝绦。", "不知细叶谁裁出，", "二月春风似剪刀。"],
    ["bì yù zhuāng chéng yī shù gāo,", "wàn tiáo chuí xià lǜ sī tāo.", "bù zhī xì yè shéi cái chū,", "èr yuè chūn fēng sì jiǎn dāo."],
    "高高的柳树像用碧玉打扮过一样，千万条柳枝垂下来，像绿色的丝带。细细的柳叶是谁剪出来的呀？哦——原来二月的春风就像一把剪刀！",
    "春风剪刀把柳叶剪成什么形状啦？",
    "a tall willow tree by a river with thousands of soft green branches hanging down like silk ribbons, fresh spring scene, small new leaves, gentle breeze"))

P.append(poem("xiaochi", "小池", "Little Pond", "宋", "杨万里", "🪷", "var(--pa-pal-mint)", "water",
    ["泉眼无声惜细流，", "树阴照水爱晴柔。", "小荷才露尖尖角，", "早有蜻蜓立上头。"],
    ["quán yǎn wú shēng xī xì liú,", "shù yīn zhào shuǐ ài qíng róu.", "xiǎo hé cái lù jiān jiān jiǎo,", "zǎo yǒu qīng tíng lì shàng tóu."],
    "小小的泉眼悄悄地流出细细的水，大树喜欢在晴天把影子照在水面上。小荷叶才刚刚露出尖尖的小角，小蜻蜓就早早地飞来站在上面啦！",
    "小蜻蜓站在荷叶尖上当秋千，好玩吗？",
    "a tiny lotus leaf just emerging from a quiet pond with a pointed tip, a little dragonfly perched on top of it, soft tree shadows on water, sunny day, delicate and fresh"))

P.append(poem("suojian", "所见", "What I Saw", "清", "袁枚", "🐄", "var(--pa-pal-cream)", "pop",
    ["牧童骑黄牛，", "歌声振林樾。", "意欲捕鸣蝉，", "忽然闭口立。"],
    ["mù tóng qí huáng niú,", "gē shēng zhèn lín yuè.", "yì yù bǔ míng chán,", "hū rán bì kǒu lì."],
    "一个小牧童骑着大黄牛，唱歌的声音传遍了小树林。忽然他想捉树上叫个不停的知了——立刻闭上嘴巴，站在那里不动啦！",
    "小牧童为什么不唱歌了呀？",
    "a little shepherd boy riding a big yellow water buffalo under green trees, the boy suddenly quiet and still looking up at a cicada on a tree branch, summer afternoon"))

P.append(poem("niaminiao", "鸟鸣涧", "Birdsong Valley", "唐", "王维", "🌙", "var(--pa-pal-lilac)", "chime",
    ["人闲桂花落，", "夜静春山空。", "月出惊山鸟，", "时鸣春涧中。"],
    ["rén xián guì huā luò,", "yè jìng chūn shān kōng.", "yuè chū jīng shān niǎo,", "shí míng chūn jiàn zhōng."],
    "安安静静的晚上，桂花瓣轻轻落下来。春天的山林空空的，月亮升起来，把睡着的小鸟都惊醒啦，小鸟在山间的小溪边叫了几声。",
    "月亮出来了，小鸟醒了吗？",
    "a quiet spring night in the mountains, osmanthus flowers falling softly, a bright full moon rising over empty hills, a small bird waking up on a branch above a stream"))

P.append(poem("jiangshangyuzhe", "江上渔者", "Fisherman on the River", "宋", "范仲淹", "🐟", "var(--pa-pal-sky)", "water",
    ["江上往来人，", "但爱鲈鱼美。", "君看一叶舟，", "出没风波里。"],
    ["jiāng shàng wǎng lái rén,", "dàn ài lú yú měi.", "jūn kàn yī yè zhōu,", "chū mò fēng bō lǐ."],
    "江边来来往往的人，都夸鲈鱼好吃。可是你看那只小小的船，在大风大浪里一会儿看得见，一会儿看不见——打鱼的人真辛苦呀。",
    "鱼是渔夫伯伯辛苦打来的，要好好吃光光哦。",
    "a tiny fishing boat appearing and disappearing among big waves on a wide river, wind and spray, a brave fisherman working hard, people walking on the riverside far away"))

P.append(poem("youziyin", "游子吟", "Song of the Wanderer", "唐", "孟郊", "🧵", "var(--pa-pal-rose)", "soft",
    ["慈母手中线，", "游子身上衣。", "临行密密缝，", "意恐迟迟归。"],
    ["cí mǔ shǒu zhōng xiàn,", "yóu zǐ shēn shàng yī.", "lín xíng mì mì féng,", "yì kǒng chí chí guī."],
    "妈妈手里的针线，缝成孩子身上的衣服。孩子要出远门啦，妈妈一针一针缝得密密的，就怕孩子回来得太晚、衣服破了没人补。妈妈最爱宝宝啦！",
    "宝宝的新衣服是谁买的呀？",
    "a gentle mother sewing clothes by warm candlelight with needle and thread, a little coat on her lap, cozy traditional home interior at night, tender feeling"))

P.append(poem("minnong-2", "悯农·其二", "Pity for Farmers II", "唐", "李绅", "🌾", "var(--pa-pal-cream)", "pop",
    ["春种一粒粟，", "秋收万颗子。", "四海无闲田，", "农夫犹饿死。"],
    ["chūn zhòng yī lì sù,", "qiū shōu wàn kē zǐ.", "sì hǎi wú xián tián,", "nóng fū yóu è sǐ."],
    "春天种下一粒小小的种子，秋天就能收到好多好多粮食。可是古时候的农民伯伯种了那么多粮食，还是有人吃不饱饭。所以我们吃饭一粒米都不要浪费哦！",
    "宝宝吃饭能吃光光吗？",
    "a farmer planting seeds in spring field, then golden autumn harvest with abundant grain, wide farmland, warm earth colors, farmers working hard under the sun"))

def main():
    data = json.loads(CARDS.read_text(encoding="utf-8"))
    existing = {c["id"] for c in data}
    added = [c for c in P if c["id"] not in existing]
    data.extend(added)
    CARDS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    poems = [c for c in data if c["type"] == "poem"]
    print(f"新增古诗 {len(added)} 首 → 共 {len(poems)} 首: {[c['zh'] for c in poems]}")

if __name__ == "__main__":
    main()
