#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
词库扩容批次 3：故事 4 → 68 页（+16 篇 × 4 页 = +64 卡）。

选篇标准（3–5 岁）：
  - 动物/自然主角，情节单线「起-承-转-合」
  - 温暖安全结局，无恐吓、无惩罚桥段
  - 每页 4 档文本：zh 主体词（页面锚点）+ L1 名词级 + L2 简单句 + L3 丰富句
  - 同篇锁同一 seed（角色长相一致），art.subject 首页写全角色，后页复用角色短语
"""
from __future__ import annotations

import json
import os
from pathlib import Path

os.environ.setdefault("PYTHONIOENCODING", "utf-8")

ROOT = Path(__file__).resolve().parent.parent
CARDS = ROOT / "src" / "content" / "cards.json"

# (storyId, 标题, 英文标题, emoji, palette, 音效, seed, 角色英文描述, 4页内容)
# 每页: (zh主体词, en, 页emoji, L1, L2, L3, 页面场景英文, guide_explain, guide_prompt)
S = []

S.append(("duck-swim", "小鸭子学游泳", "Little Duck Learns to Swim", "🦆", "var(--pa-pal-sky)", "water", 5001,
    "a fluffy yellow duckling with a small orange beak and tiny wings",
    [
        ("鸭妈妈", "Mama Duck", "🦢", "鸭妈妈。", "鸭妈妈带着小鸭子来到池塘边。",
         "太阳暖暖的，鸭妈妈带着毛茸茸的小鸭子，一摇一摆来到池塘边。池塘的水亮晶晶的，像一面大镜子。",
         "a fluffy yellow duckling and its white mama duck walking side by side to a shiny pond, sunny morning, reeds and lotus by the water",
         "小鸭子第一次看到池塘，什么感觉呀？", "宝宝敢不敢把脚放进水里呀？"),
        ("小鸭子", "Little Duck", "😰", "小鸭子怕水。", "小鸭子看着水，有点害怕。",
         "小鸭子看着亮晶晶的水，心里怦怦跳：\"水会不会把我淹掉呀？\"它的小脚丫在岸边蹭来蹭去，不敢下去。",
         "the little yellow duckling standing at the pond edge looking down at the water, hesitant, its reflection in the water, mama duck already floating nearby",
         "小鸭子为什么不敢下水呀？", "宝宝第一次做一件事的时候，会不会也有一点点怕？"),
        ("试一试", "Try", "💪", "妈妈等一等它。", "小鸭子先伸出一只脚试试。",
         "鸭妈妈没有催它，只是在水里慢慢游着等它。小鸭子先伸出一只小脚丫，碰碰水——呀，凉凉的，痒痒的，好像也没那么可怕！",
         "the little duckling dipping one tiny orange foot into the pond water, tiny ripples, curious expression, mama duck swimming close by patiently",
         "小鸭子先试了一下，水凉凉的对不对？", "新东西可以先试一点点，对不对？"),
        ("学会啦", "I Can Swim", "🎉", "小鸭子会游泳啦！", "小鸭子游得真开心！",
         "扑通！小鸭子跳进水里，划划小脚丫——浮起来啦！它跟着妈妈游来游去，还钻了个小水花。原来试一试，就学会啦！",
         "the happy yellow duckling splashing and swimming proudly in the pond with mama duck, sparkling water drops, joyful scene, dragonfly above",
         "小鸭子试了一试，就学会游泳啦！", "宝宝学会新本领的时候，是不是也很开心？"),
    ]))

S.append(("hedgehog-fruit", "小刺猬背果子", "Hedgehog Carries Fruit", "🦔", "var(--pa-pal-cream)", "pop", 5002,
    "a small round hedgehog with tiny black eyes and soft brown spikes",
    [
        ("红苹果", "Red Apple", "🍎", "大苹果。", "小刺猬看见一个大苹果。",
         "秋天的果子熟啦。小刺猬在树下看见一个红红的大苹果，圆圆的，香香的，比它的脸还大呢！",
         "a small round hedgehog looking up at a big shiny red apple under an autumn apple tree, fallen leaves, warm afternoon light",
         "苹果好大呀，小刺猬想吃吗？", "宝宝闻过苹果的香味吗？"),
        ("背不动", "Too Heavy", "😫", "背不动呀。", "苹果太大，小刺猬背不动。",
         "小刺猬用鼻子顶一顶，苹果不动；用脚推一推，苹果还是不动。哎呀，苹果太大啦，怎么才能带回家呢？",
         "the little hedgehog trying to push the big red apple with its nose and tiny paws, the apple barely moving, funny effort expression",
         "苹果太重了，推不动怎么办？", "宝宝搬不动东西的时候，可以请谁帮忙？"),
        ("打个滚", "Roll Over", "🤸", "打个滚试试。", "小刺猬在苹果旁边打了个滚。",
         "小刺猬想了想，忽然有了好主意！它缩成一个球，在苹果旁边骨碌碌打了个滚——苹果稳稳地扎在了它的小刺上！",
         "the little hedgehog curled into a ball rolling under the apple, the red apple sticking onto its soft spikes, playful motion lines, autumn leaves",
         "小刺猬想了什么好主意呀？", "小刺猬的刺还能当小挂钩，厉害不厉害？"),
        ("回家喽", "Home", "🏠", "背着苹果回家喽！", "小刺猬背着苹果回家啦！",
         "小刺猬背着红苹果，一摇一摆回家去。妈妈看见啦：\"哇，我们宝宝背回来一个大苹果！\"晚上，一家人吃了甜甜的苹果。",
         "the happy hedgehog walking home carrying the red apple on its back, a cozy hedgehog house with warm window light among the trees, sunset",
         "小刺猬动脑筋，把苹果带回了家。", "宝宝也要像小刺猬一样，遇到问题多想想办法哦。"),
    ]))

S.append(("bear-honey", "小熊找蜂蜜", "Little Bear Finds Honey", "🐻", "var(--pa-pal-cream)", "pop", 5003,
    "a chubby brown bear cub with round ears and a honey-loving smile",
    [
        ("甜甜的", "Sweet Smell", "🍯", "香香甜甜的。", "小熊闻到甜甜的味道。",
         "小熊在森林里散步，忽然闻到一股香香甜甜的味道。\"是什么呀？好香！\"小熊的鼻子一抽一抽，跟着味道走。",
         "a chubby brown bear cub sniffing the air in a green forest, tiny bees flying ahead like a trail, wildflowers on the ground",
         "小熊闻到了什么味道呀？", "宝宝最喜欢闻什么香味？"),
        ("小蜜蜂", "Little Bees", "🐝", "小蜜蜂飞呀飞。", "小蜜蜂带着小熊往前飞。",
         "小熊跟着小蜜蜂走呀走，走到一棵大树下。哇——树上挂着一个金色的大蜂巢！蜜蜂们嗡嗡地飞进飞出，忙着采蜜呢。",
         "the bear cub looking up at a golden beehive hanging from a big tree, bees buzzing around, dappled sunlight through leaves",
         "蜂蜜是勤劳的小蜜蜂做的。", "小蜜蜂每天采蜜辛苦吗？"),
        ("等一等", "Wait", "🙌", "小熊等蜜蜂忙完。", "小熊说：蜜蜂先吃，我等一等。",
         "小熊很想吃蜂蜜，可是它记得妈妈的话：\"蜂蜜是蜜蜂辛苦做的。\"小熊坐下来，轻轻说：\"小蜜蜂，你们先吃，我等一等。\"",
         "the brown bear cub sitting patiently under the tree, paws folded, watching bees work, gentle and polite, soft light",
         "小熊为什么不上去抢蜂蜜呀？", "好东西要等人家的允许，对不对？"),
        ("分蜂蜜", "Sharing", "🍯", "小熊分到了一点蜂蜜。", "蜜蜂送了小熊一小勺蜂蜜。",
         "小蜜蜂们嗡嗡商量了一下，飞下来送了小熊一小勺蜂蜜。小熊舔了一口——哇，甜甜的，一直甜到心里！它说：\"谢谢小蜜蜂！\"",
         "a tiny bee carrying a small spoonful of golden honey to the happy bear cub, the bear licking its lips, warm friendship feeling, sunset glow",
         "小熊有礼貌，蜜蜂才分给它蜂蜜。", "宝宝说\"谢谢\"的时候，开不开心？"),
    ]))

S.append(("firefly-friend", "萤火虫找朋友", "Firefly Finds Friends", "🪲", "var(--pa-pal-lilac)", "chime", 5004,
    "a little firefly with a warm glowing tail light",
    [
        ("小亮点", "Little Light", "✨", "一闪一闪的小灯。", "萤火虫提着小灯笼。",
         "夏天的晚上，草丛里飞着一只小萤火虫。它的尾巴上有一盏小灯，一闪一闪，像星星掉进了草丛里。可是它一个朋友也没有。",
         "a single little firefly glowing softly in dark green grass at night, its light reflecting on leaves, quiet summer night with stars above",
         "萤火虫的小灯亮不亮呀？", "宝宝晚上见过会发光的小虫子吗？"),
        ("找朋友", "Finding Friends", "👀", "萤火虫去找朋友。", "它飞呀飞，去找好朋友。",
         "小萤火虫提着小灯笼飞呀飞：\"有人和我玩吗？\"它飞过小河，河水哗啦哗啦；它飞过草丛，草叶沙沙沙。可是没有人回答它。",
         "the firefly flying over a small stream and tall grass at night, its little light searching left and right, moonlight on the water",
         "萤火虫找了好久，找到朋友了吗？", "宝宝的好朋友是谁呀？"),
        ("一起亮", "Glow Together", "🪲🪲", "好多小灯都亮了！", "草丛里亮起了好多小灯。",
         "忽然，草丛里亮起了一点光——又一点，又一点！哇，好多萤火虫都提着小灯笼飞出来了！\"你好呀！我们一起飞吧！\"",
         "many fireflies glowing and flying together over the grass like a galaxy of tiny lights, magical night scene, joyful",
         "原来草丛里有好多萤火虫呀！", "一个人玩开心，还是一起玩开心？"),
        ("星星河", "Star River", "🌌", "萤火虫像星星一样飞。", "萤火虫排队飞，像星星河。",
         "小萤火虫和朋友们排成一条亮亮的线，飞过池塘，飞过草丛，像一条会动的小星星河。这个夏天的晚上，它再也不孤单啦！",
         "a long line of fireflies flying over a moonlit pond like a river of stars, reflections in the water, dreamy and warm night",
         "小萤火虫找到朋友，晚上亮晶晶的。", "宝宝想和萤火虫一起飞吗？"),
    ]))

S.append(("snail-slow", "小蜗牛慢慢爬", "Little Snail Goes Slow", "🐌", "var(--pa-pal-mint)", "soft", 5005,
    "a small snail with a round spiral shell and soft slow body",
    [
        ("慢慢爬", "Slowly Slowly", "🐌", "小蜗牛慢慢爬。", "小蜗牛背着壳慢慢爬。",
         "下过雨的小路上，小蜗牛背着它圆圆的壳，慢慢地、慢慢地往前爬。别的小动物都跑远了，可是一点都不着急。",
         "a small snail with a round spiral shell slowly crawling on a wet stone path after rain, fresh green moss, water drops sparkling",
         "小蜗牛爬得快还是慢呀？", "宝宝学过小蜗牛走路吗？"),
        ("小雨点", "Raindrops", "💧", "雨点打在壳上。", "壳壳是它的小房子。",
         "忽然，滴滴答答，又下雨了！小兔子跑掉了，小蚂蚁钻进洞里。小蜗牛不慌不忙——它缩进壳里，壳就是它的小房子！",
         "the snail hiding inside its shell under gentle rain, its cozy spiral home visible, raindrops bouncing off the shell, safe and warm",
         "小蜗牛的壳是什么呀？", "下雨的时候，宝宝躲在哪里？"),
        ("雨停啦", "Sun Again", "🌈", "雨停了，太阳出来了。", "雨停了，小蜗牛又出来爬。",
         "雨停啦，太阳出来啦，天边还挂了一道彩虹。小蜗牛探出头，伸伸触角，又背着小房子，慢慢地上路啦。",
         "the snail peeking out of its shell on a sunny wet leaf after rain, a rainbow far away, sparkling water drops, fresh green world",
         "雨停了，小蜗牛又出发啦。", "彩虹有几种颜色呀？"),
        ("到啦", "Arrived", "🌸", "小蜗牛爬到了花底下。", "小蜗牛爬到了，闻闻花香。",
         "爬呀爬，爬呀爬——小蜗牛终于爬到了大花朵底下！花辨落下来，正好盖在它身上，像一床香香的小被子。慢慢地，也能到远方哦。",
         "the little snail resting happily under a big blooming pink flower, a soft petal falling onto its shell like a blanket, peaceful evening light",
         "小蜗牛慢慢爬，也爬到了想去的地方。", "宝宝做事情慢一点没关系，对不对？"),
    ]))

S.append(("moon-night", "月亮说晚安", "The Moon Says Goodnight", "🌙", "var(--pa-pal-lilac)", "chime", 5006,
    "a gentle smiling crescent moon in a soft night sky",
    [
        ("天黑啦", "Night Falls", "🌆", "天黑啦。", "天黑啦，月亮出来了。",
         "太阳公公回家了，天慢慢黑下来。弯弯的月亮爬上了天空，把柔柔的光洒下来。该说晚安啦。",
         "a gentle crescent moon rising over quiet houses and trees, soft blue night sky, stars beginning to appear, sleepy peaceful world",
         "天黑了，谁出来了呀？", "宝宝晚上几点睡觉呀？"),
        ("小星星", "Little Stars", "⭐", "星星眨眨眼。", "小星星陪着月亮。",
         "月亮轻轻叫醒小星星：\"小星星，出来眨眨眼吧。\"小星星一颗一颗亮起来，眨呀眨，像好多小眼睛，陪在月亮身边。",
         "the smiling moon surrounded by twinkling little stars, one little star winking extra bright, cozy night sky above sleeping town",
         "小星星在做什么呀？", "宝宝眨眨眼，和星星打个招呼吧。"),
        ("都睡了", "Everyone Sleeps", "😴", "小动物都睡了。", "小动物们都睡着了。",
         "小鸟在窝里睡了，小兔子在洞里睡了，小鸭子把头埋进翅膀里也睡了。月亮把银色的被子轻轻盖在大家身上。",
         "sleeping baby animals: a bird in its nest, a rabbit in its burrow, a duck tucking its head under its wing, all under gentle moonlight",
         "小动物们都在哪里睡觉呀？", "宝宝的小床是不是也很舒服？"),
        ("晚安", "Goodnight", "🛏️", "月亮说：晚安晚安。", "月亮轻轻说晚安。",
         "月亮把最后一片云也盖上，轻轻地说：\"晚安，小鸟。晚安，小兔子。晚安，小宝宝。\"睡吧睡吧，明天太阳公公又会来叫你起床啦。",
         "the gentle moon smiling over a small child's cozy bedroom window, soft curtains, teddy bear on the pillow, warm and safe feeling",
         "月亮也对宝宝说晚安啦。", "宝宝跟月亮说声晚安吧。"),
    ]))

S.append(("bird-fly", "小鸟学飞", "Little Bird Learns to Fly", "🐦", "var(--pa-pal-sky)", "chime", 5007,
    "a small fluffy blue baby bird with tiny wings",
    [
        ("鸟窝里", "In the Nest", "🪹", "小鸟住在窝里。", "小鸟住在高高的窝里。",
         "大树上有个圆圆的鸟窝，里面住着一只毛茸茸的小蓝鸟。它每天趴在窝边，看妈妈在天上飞来飞去。",
         "a fluffy blue baby bird peeking over the edge of a round nest high in a big tree, mama bird flying in the blue sky above",
         "小鸟住在哪里呀？", "宝宝看看窗外，有没有小鸟飞过？"),
        ("拍翅膀", "Flapping", "🪽", "小鸟拍拍小翅膀。", "小鸟学着拍翅膀。",
         "小鸟张开小翅膀，扑棱扑棱拍呀拍。哎呀，风把它的小绒毛都吹起来了！它拍得越来越用力，小窝都跟着晃啦。",
         "the baby bird flapping its tiny wings hard in the nest, little feathers fluttering in the breeze, determined expression",
         "小鸟在练习什么呀？", "宝宝拍拍手，学小鸟飞一飞。"),
        ("飞起来", "Up Up Up", "💨", "小鸟飞起来啦！", "小鸟飞到天上啦！",
         "扑棱——扑棱——哇！小鸟飞起来啦！它离开鸟窝，飞上了蓝天。风在耳边呼呼吹，白云在身边飘，真好玩呀！",
         "the little blue bird flying high in the sky for the first time, wings spread wide, fluffy clouds around, mama bird flying beside it proudly",
         "小鸟飞得高不高呀？", "小鸟勇敢地试了，就飞起来啦。"),
        ("回窝啦", "Back Home", "🏠", "飞累了，回窝休息。", "小鸟飞回家，妈妈抱抱它。",
         "飞了一会儿，小鸟有点累了。它转个弯，轻轻落回窝里。妈妈用翅膀抱住它：\"宝宝真棒，会飞啦！\"小鸟闭上眼睛，甜甜地睡了。",
         "the tired happy baby bird back in the nest snuggled under mama's warm wing, sunset sky, cozy nest, peaceful",
         "学本领累了要休息。", "宝宝学会新本领，也要抱抱妈妈哦。"),
    ]))

S.append(("goldfish-bubble", "小金鱼吐泡泡", "Goldfish Bubbles", "🐠", "var(--pa-pal-sky)", "water", 5008,
    "a small round orange goldfish with flowing tail fins",
    [
        ("圆泡泡", "Round Bubbles", "🫧", "小金鱼吐泡泡。", "小金鱼会吐泡泡。",
         "清清的鱼缸里，住着一条橙色的小金鱼。它嘴巴一张一合，吐出了一串圆圆的小泡泡。泡泡亮晶晶的，往上飘呀飘。",
         "a small round orange goldfish blowing round shiny bubbles in clear water, bubbles floating upward catching light, pebbles and waterweed",
         "小金鱼吐的泡泡是什么形状呀？", "宝宝用手指画一个圆圈圈。"),
        ("追泡泡", "Chasing", "🏊", "小金鱼追泡泡玩。", "小金鱼追着泡泡游。",
         "小金鱼追着泡泡游呀游，尾巴一摆一摆，像一把飘动的小扇子。可是泡泡飘到水面上——啵！破掉了。再吐一个！",
         "the goldfish chasing a bubble playfully, its flowing tail like a little fan, the bubble popping at the water surface with a tiny splash",
         "泡泡飘到水面上怎么样啦？", "泡泡破掉了，可以再吐一个新的。"),
        ("照镜子", "Mirror Mirror", "🪞", "泡泡里有小金鱼。", "泡泡像小镜子。",
         "咦？大泡泡里怎么有一只小金鱼？原来泡泡像一面小圆镜，把小金鱼照在里面啦！小金鱼对着泡泡镜子，做了个鬼脸。",
         "the goldfish looking at its own reflection inside a big glassy bubble, curious and surprised, magical water light",
         "泡泡镜子里是谁呀？", "宝宝照镜子的时候，看到谁啦？"),
        ("吐好多", "So Many Bubbles", "🎉", "好多泡泡飘呀飘。", "小金鱼吐了好多泡泡。",
         "小金鱼吐了一个又一个泡泡：咕噜，咕噜，咕噜。泡泡们排着队往上飘，像一串亮晶晶的小珍珠项链。小金鱼围着泡泡跳舞，开心极啦！",
         "the happy goldfish surrounded by a string of shiny bubbles rising like a pearl necklace, dancing with flowing fins, joyful underwater scene",
         "小金鱼吐了好多泡泡呀！", "宝宝开心的时候，会做什么动作？"),
    ]))

S.append(("ant-bean", "小蚂蚁搬豆豆", "Little Ant Moves the Bean", "🐜", "var(--pa-pal-cream)", "pop", 5009,
    "a small hardworking red-brown ant",
    [
        ("大豆豆", "Big Bean", "🫘", "小蚂蚁找到豆豆。", "小蚂蚁找到一颗大豆豆。",
         "小蚂蚁在草地上找到了一颗大大的豆豆。它围着豆豆转了一圈：哇，好大呀！够全家吃好几天呢！",
         "a small red-brown ant standing next to a big glossy bean on the grass, the ant circling the bean curiously, sunny morning",
         "豆豆大还是小蚂蚁大？", "宝宝看看，小蚂蚁力气大不大？"),
        ("推不动", "Pushing Hard", "😤", "推呀推，推不动。", "小蚂蚁自己推不动。",
         "小蚂蚁用头顶，用脚推，嗨哟嗨哟——豆豆一动也不动。豆豆太重啦，小蚂蚁累得满头汗。",
         "the tiny ant pushing the giant bean with all its might, tiny sweat drops, the bean not moving at all, funny determined effort",
         "豆豆太重了怎么办？", "一个人做不了的事，可以怎么办？"),
        ("好朋友", "Friends Help", "🐜🐜", "好朋友来帮忙啦。", "好多蚂蚁来帮忙。",
         "小蚂蚁想了想，跑回家叫来好朋友。一只，两只，三只……好多蚂蚁排着队来啦！大家有的推，有的抬，有的喊口号：一二，加油！",
         "a line of ants arriving to help push the big bean together, some pushing some lifting, teamwork, cheerful cartoon energy",
         "好多小蚂蚁一起搬，热闹不热闹？", "小朋友一起做事情叫什么呀？合作！"),
        ("到家啦", "Home Sweet Home", "🏚️", "豆豆搬回家啦！", "大家一起把豆豆搬回了家。",
         "嗨哟——嗨哟——豆豆动起来啦！滚呀滚，一直滚到蚂蚁家的门口。蚂蚁们欢呼起来：\"到家喽！\"晚上，全家一起吃了香香的豆豆饭。",
         "the ants celebrating as the big bean arrives at their cozy underground home entrance, tiny ant home with warm light, celebration scene",
         "大家一起努力，事情就做成啦。", "宝宝帮妈妈做过什么事呀？"),
    ]))

S.append(("raindrop-trip", "小雨点去旅行", "The Raindrop's Trip", "💧", "var(--pa-pal-sky)", "water", 5010,
    "a cheerful little blue raindrop with a smiling face",
    [
        ("小云朵", "Little Cloud", "☁️", "小雨点住在云朵里。", "小雨点住在云朵上。",
         "高高的天上，住着小雨点。它趴在软软的云朵上往下看：\"下面是什么样子呀？我想去看看！\"风婆婆说：\"去吧去吧！\"",
         "a cute little blue raindrop with a happy face sitting on a soft white cloud, looking down at the green earth far below, blue sky",
         "小雨点住在哪里呀？", "宝宝抬头看过云朵吗？"),
        ("跳下去", "Jump", "🤿", "小雨点跳下去。", "小雨点从云上跳下来。",
         "小雨点鼓起勇气，从云朵上轻轻一跳——哇！它飘呀飘，转呀转，天空从它身边滑过去，凉快极了！",
         "the little raindrop happily falling and tumbling through the sky, small parachute-like pose, wind lines, joyful free fall",
         "小雨点在做什么呀？", "小雨点勇敢吗？"),
        ("落荷叶", "Splash", "🪷", "小雨点落在荷叶上。", "小雨点落在荷叶上跳舞。",
         "咚！小雨点落在了池塘里的大荷叶上。它蹦呀蹦，跳呀跳，荷叶把它轻轻托着，像一张绿色的小蹦床！",
         "the little raindrop bouncing on a big green lotus leaf like a trampoline, water splashing lightly, pond scene with flowers",
         "小雨点落在哪里啦？", "荷叶像不像一张小床？"),
        ("回家", "Going Home", "🌈", "小雨点钻进土里啦。", "小雨点去帮小花长大。",
         "玩累了，小雨点钻进软软的泥土里。小花喝了水，一下子长高了一点，开出了粉粉的花。小花说：\"谢谢你，小雨点！\"",
         "the raindrop diving into soft brown soil near a blooming pink flower, the flower smiling and growing taller, rainbow appearing above",
         "小雨点帮小花做了什么呀？", "小花喝水就会长大，宝宝喝水也长高高。"),
    ]))

S.append(("snowflake-dance", "小雪花跳舞", "The Snowflake's Dance", "❄️", "var(--pa-pal-sky)", "soft", 5011,
    "a tiny white snowflake with six crystal points",
    [
        ("天上冷", "Cold Sky", "🌫️", "冬天到啦。", "冬天到，天上冷啦。",
         "冬天到了，天上的云朵冷得发白。云朵里的小雪花揉揉眼睛：\"到我们出去玩的时候啦！\"它穿上白纱裙，准备好啦。",
         "a tiny white snowflake with a cute face peeking from a cold grey-white winter cloud, ready to jump, pale winter sky",
         "冬天冷不冷呀？", "宝宝冬天穿什么衣服？"),
        ("飘下来", "Floating Down", "🌨️", "小雪花飘下来。", "小雪花转圈圈飘下来。",
         "小雪花从云上轻轻一跳——它张开六个小角，转着圈圈往下飘。左转转，右转转，像跳着最慢最慢的舞蹈。",
         "the little snowflake twirling and dancing down through the winter sky, its six crystal points spinning, gentle falling motion",
         "小雪花是怎么下来的呀？", "宝宝伸出手，接一接小雪花。"),
        ("落手心", "On Your Hand", "🤲", "雪花落在手心里。", "雪花落进手心，凉凉的。",
         "小雪花轻轻落在了一只小小的手心里。凉凉的，痒痒的。还没看清楚呢——咦？小雪花变成了一颗亮亮的小水珠！",
         "the little snowflake landing on a child's open palm, half melted into a tiny shiny water droplet, soft focus, magical moment",
         "小雪花化掉变成什么了呀？", "凉凉的雪花在手心里，什么感觉？"),
        ("盖雪被", "Snow Blanket", "🛌", "好多雪花盖雪被。", "雪花给大地盖被子。",
         "后面还有好多好多小雪花，轻轻地飘下来，落在屋顶上，落在大树上，落在草地上。大地盖上厚厚的白被子，暖暖地睡啦。明年春天，小草会醒来哦。",
         "a snowy village scene with thick soft snow on rooftops and trees like a white blanket, peaceful sleeping world, warm window lights",
         "雪花被子盖在谁身上呀？", "下雪天，宝宝可以堆雪人哦。"),
    ]))

S.append(("seed-sprout", "小种子发芽", "The Little Seed Sprouts", "🌱", "var(--pa-pal-mint)", "soft", 5012,
    "a small brown seed with a tiny green sprout tip",
    [
        ("小种子", "Little Seed", "🌰", "小种子睡在土里。", "小种子睡在泥土里。",
         "泥土里，住着一颗小小的种子。它盖着泥土被子，睡了好长好长的觉。冬天过去了，春天悄悄来了。",
         "a small brown seed sleeping snug under soft brown soil, underground cozy cross-section view, roots beginning, quiet and warm",
         "小种子住在哪里呀？", "宝宝睡觉盖什么被子？"),
        ("太阳叫", "Sun Calls", "☀️", "太阳公公叫它起床。", "太阳晒得泥土暖暖的。",
         "太阳公公把光洒下来，泥土变得暖暖的。春雨也滴答滴答来敲门：\"小种子，该起床啦！\"小种子伸了个懒腰。",
         "warm sunlight and gentle rain reaching down through soil to the little seed, the seed stirring and beginning to wake, spring feeling",
         "谁叫小种子起床呀？", "宝宝早上是谁叫起床的？"),
        ("钻出土", "Sprouting", "🌱", "小芽芽钻出土。", "小种子钻出小绿芽。",
         "咚咚咚——小种子从泥土里探出了一个小小的绿脑袋！它看见了太阳，看见了花，看见了好大的世界！\"哇，好亮呀！\"",
         "a tiny green sprout bursting up from dark soil into sunlight, first two little leaves opening wide, bright cheerful morning",
         "小芽芽看到了什么呀？", "小种子勇敢不勇敢？"),
        ("长大了", "Growing Up", "🌻", "小芽芽长成大花。", "小芽芽越长越高，开花啦！",
         "小芽芽喝了阳光，喝了雨水，一天天长高。它长出了叶子，长出了花苞——啵！开出了一朵大大的黄花！蝴蝶都飞来看它啦。",
         "the grown sprout now a tall sunflower in full bloom under blue sky, butterflies visiting, bees circling, bright and proud",
         "小芽芽长大变成什么啦？", "宝宝也在慢慢长大哦。"),
    ]))

S.append(("car-yield", "小汽车让路", "The Little Car Says Sorry", "🚗", "var(--pa-pal-cream)", "didi", 5013,
    "a small red toy car with friendly round headlights",
    [
        ("开呀开", "Driving Along", "🚗", "小汽车开呀开。", "小汽车在马路上开。",
         "红色的小汽车在马路上开呀开。它要去公园玩，轮子转得飞快：嘀嘀——嘀嘀——让一让，让一让！",
         "a small red toy car driving fast on a country road toward a park, happy face on the car, sunny day, dust puff behind wheels",
         "小汽车要去哪里呀？", "宝宝坐过小汽车吗？"),
        ("堵住啦", "Traffic Jam", "🐢", "前面有小鸭子。", "小鸭子挡住了路。",
         "开到小桥边——哎呀！鸭妈妈带着三只小鸭子，正在慢慢地过马路。小汽车赶紧刹了车：\"嘎——\"不能再开啦，会碰到小鸭子的！",
         "the red car stopped at a small bridge, mama duck and three ducklings waddling across the road slowly, the car waiting patiently",
         "小汽车为什么停下来呀？", "小鸭子走路快不快？"),
        ("等一等", "Waiting", "⏳", "小汽车等一等。", "小汽车耐心等鸭子过完。",
         "小汽车耐心地等着。小鸭子摇摇摆摆，一只，两只，三只，都过完啦。鸭妈妈回头嘎嘎叫了两声，好像在说：\"谢谢你呀！\"",
         "the three ducklings finishing crossing, the mama duck looking back at the car gratefully, the red car smiling and waving with its headlight",
         "鸭妈妈说什么啦？", "等一等，是对的吗？"),
        ("到公园", "The Park", "🎠", "小汽车到公园啦！", "小汽车到了公园，玩得开心。",
         "小汽车又嘀嘀开起来，一会儿就到了公园。它把车停得整整齐齐，然后去玩滑滑梯啦。今天真开心——还做了一件等一等的好事呢！",
         "the happy red car parked neatly at a sunny playground with slides and swings, cheerful park scene, birds and balloons around",
         "让一让、等一等，大家都开心。", "宝宝会等红灯吗？"),
    ]))

S.append(("balloon-fly", "小气球飞上天", "The Balloon Flies Away", "🎈", "var(--pa-pal-rose)", "pop", 5014,
    "a round red balloon with a long string",
    [
        ("红气球", "Red Balloon", "🎈", "红气球。", "小猫拿着一个红气球。",
         "小猫咪拿着一个红气球，是妈妈送给它的礼物。红气球圆圆的，飞得比小猫的耳朵还高，拉着长长的线。",
         "a cute little cat holding the string of a round red balloon in a sunny meadow, the balloon floating high above its head",
         "气球是什么颜色的呀？", "宝宝玩过气球吗？"),
        ("飞走啦", "Flying Away", "💨", "手一松，气球飞走了。", "气球飞到天上去啦！",
         "一阵大风吹过来，小猫咪的手一松——哎呀！红气球飘呀飘，越飘越高，飞到天上去了！小猫咪急得喵喵叫。",
         "the red balloon escaping high into the sky, the little cat reaching up with both paws, wind blowing grass, the balloon getting smaller",
         "气球飞到哪里去了？", "气球飞走了，小猫咪什么心情？"),
        ("别哭呀", "Don't Cry", "🥺", "小鸟来帮忙。", "小鸟帮不上，气球太高啦。",
         "小鸟飞过来帮忙：\"别哭别哭，我去追追看！\"小鸟飞呀飞，可是气球飞得太高太高，连小鸟都够不着了。",
         "a small bird flying up trying to reach the red balloon high in the sky, the cat watching hopefully below, the balloon just out of reach",
         "小鸟够得到气球吗？", "帮忙的小朋友心真好，对不对？"),
        ("变成太阳", "Little Sun", "🌞", "红气球像小太阳。", "气球远远的，像小太阳。",
         "小猫咪看着看着，忽然笑了：\"红气球飞到天上，多像一个小太阳呀！\"它挥挥手：\"红气球，再见啦！\"红气球在天上闪了闪，好像在说：\"再见，小猫咪！\"",
         "the little cat waving goodbye to the tiny red balloon high in the golden sunset sky, the balloon glowing like a little sun, warm feeling",
         "小猫咪不哭了，为什么呀？", "说再见的时候，也可以开开心心的。"),
    ]))

S.append(("star-wink", "小星星眨眼睛", "The Little Star Winks", "⭐", "var(--pa-pal-lilac)", "chime", 5015,
    "a small golden five-pointed star with a smiling face",
    [
        ("一颗星", "One Little Star", "⭐", "天上有一颗小星星。", "天上有一颗小星星。",
         "晚上，黑黑的天上，有一颗金色的小星星。它是天上最小的星星，可是它有一件很厉害的本领——会眨眼睛！",
         "one small golden star shining in the deep blue night sky above quiet hills, its light soft and friendly, crescent moon far away",
         "天上有什么呀？", "宝宝晚上看过星星吗？"),
        ("眨眼睛", "Wink Wink", "😉", "小星星眨眨眼。", "小星星一闪一闪的。",
         "小星星眨呀眨，一闪，一闪。地上的小朋友看见了，指着天上说：\"看！小星星在和我打招呼呢！\"",
         "the little star twinkling brightly, a child on a balcony below pointing up at it with delight, warm home lights around",
         "小星星在做什么呀？", "宝宝也眨眨眼睛，和小星星打个招呼。"),
        ("云来啦", "A Cloud Passes", "🌫️", "云朵遮住小星星。", "云朵把小星星盖住了。",
         "一片云飘过来，把小星星遮住了。地上的小朋友着急了：\"小星星去哪里了呀？\"小星星在云朵后面眨眨眼，等一等哦。",
         "a soft grey cloud covering the little star, the star peeking from behind the cloud edge, the child below looking up worried",
         "小星星被什么遮住了呀？", "小星星还会出来吗？"),
        ("又亮啦", "Shining Again", "✨", "小星星又出来啦！", "云飘走了，星星又亮了。",
         "风把云朵吹走了——小星星又亮起来啦！它眨眨眼睛，好像说：\"我一直在呢！\"小朋友笑了：\"小星星，晚安！\"",
         "the little star shining bright again in the clear night sky, the happy child waving goodnight from the window, cozy ending",
         "小星星一直都在，对不对？", "宝宝睡觉的时候，小星星在天上陪着你哦。"),
    ]))

S.append(("cat-tail", "小猫追尾巴", "The Cat Chases Its Tail", "🐱", "var(--pa-pal-rose)", "meow", 5016,
    "a playful orange kitten with a long striped tail",
    [
        ("毛尾巴", "Furry Tail", "🐈", "小猫有长尾巴。", "小猫的尾巴长长的。",
         "小橘猫有一条长长的花尾巴，毛茸茸的，翘在后面。小猫走路的时候，尾巴一摇一摇，像一根会跳舞的毛线。",
         "an orange kitten looking at its own long striped fluffy tail curiously, the tail curled up behind it, sunny windowsill",
         "小猫的尾巴长不长呀？", "宝宝见过小猫的尾巴吗？"),
        ("追尾巴", "Chasing", "🌀", "小猫追自己的尾巴。", "小猫转圈圈追尾巴。",
         "小猫忽然觉得尾巴好好玩：\"这是什么呀？我要抓住它！\"它转着圈圈追尾巴——尾巴跑到前面，它跟着转到前面，尾巴甩到后面，它又追到后面。",
         "the kitten spinning in circles chasing its own tail, funny blur of motion, tail always just out of reach, playful chaos",
         "小猫在追什么呀？", "小猫追得到自己的尾巴吗？"),
        ("晕啦", "So Dizzy", "😵", "小猫转晕啦。", "转呀转，小猫头晕啦。",
         "转呀转，转呀转——哎呀！小猫头晕啦，一屁股坐在地上，眼睛变成了圈圈。尾巴在旁边轻轻扫了它一下，好像在笑它呢。",
         "the dizzy kitten sitting on the floor with spiral eyes, the fluffy tail resting beside it looking innocent, funny scene",
         "小猫为什么头晕呀？", "转圈圈太多会头晕，宝宝要小心哦。"),
        ("原来是", "It's My Tail", "😄", "尾巴是小猫自己的呀！", "小猫笑了，不追啦。",
         "小猫眨眨眼，忽然明白了：\"哈哈，这是我自己的尾巴呀！\"它抱着尾巴舔了舔，然后把自己卷成一个小毛球，呼噜呼噜睡午觉啦。",
         "the kitten curled into a cozy orange ball hugging its own tail, eyes closed happily, napping in warm sunlight on a soft cushion",
         "尾巴是小猫自己的，追不到也没关系。", "小猫抱着尾巴睡觉，可爱不可爱？"),
    ]))


def main():
    data = json.loads(CARDS.read_text(encoding="utf-8"))
    existing = {c["id"] for c in data}
    added = []
    for (sid, title, title_en, emoji, palette, sound, seed, hero, pages) in S:
        for i, (zh, en, pemoji, l1, l2, l3, scene, g_explain, g_prompt) in enumerate(pages, 1):
            cid = f"{sid}-{i}"
            if cid in existing:
                continue
            # 首页用完整角色描述，后续页复用角色短语
            subject = hero if i == 1 else f"{hero}, {scene}"
            added.append({
                "id": cid, "lane": "read", "type": "story", "section": "stories",
                "storyId": sid, "page": i, "pageCount": 4, "title": title,
                "zh": zh, "en": en, "emoji": pemoji, "palette": palette, "sound": sound,
                "parentGuide": {"explain": g_explain, "prompt": g_prompt},
                "levels": {"L1": {"text": l1}, "L2": {"text": l2}, "L3": {"text": l3}},
                "art": {"subject": subject, "seed": seed, "scene_template": "{subject}, storybook page illustration"},
            })
    data.extend(added)
    CARDS.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    stories = {}
    for c in data:
        if c["type"] == "story":
            stories.setdefault(c.get("storyId", "?"), 0)
            stories[c.get("storyId", "?")] += 1
    print(f"新增故事卡 {len(added)} 页 → 共 {sum(stories.values())} 页 / {len(stories)} 篇: {sorted(stories.keys())}")

if __name__ == "__main__":
    main()
