/**
 * 生成 / 更新数数卡 1–10（幂等）。
 *
 * 设计：十格阵里统一用同一种计数物（红苹果），
 * 这样"3 和 5 谁多"可以直接比出来；换不同水果反而干扰比较。
 *
 * 用法：node tools/add-count-cards.mjs
 */
import fs from 'node:fs';

const FILE = 'src/content/cards.json';
const cards = JSON.parse(fs.readFileSync(FILE, 'utf8'));

const ZH = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
const PY = ['', 'yī', 'èr', 'sān', 'sì', 'wǔ', 'liù', 'qī', 'bā', 'jiǔ', 'shí'];
const EN = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];
const EMOJI = '🍎';

function sentence(n) {
  return `${ZH[n]}个红苹果`;
}

const fresh = [];
for (let n = 1; n <= 10; n++) {
  fresh.push({
    id: `count-${n}`,
    lane: 'play',
    type: 'number',
    section: 'numbers',
    zh: ZH[n],
    en: EN[n],
    pinyin: PY[n],
    emoji: EMOJI,
    palette: n % 2 === 0 ? 'var(--pa-pal-cream)' : 'var(--pa-pal-warm)',
    sound: 'pop',
    count: n,
    parentGuide: {
      explain: `${ZH[n]}就是 ${n} 个。可以用手指一个一个点着数给孩子听。`,
      prompt: `问宝宝：桌上有 ${n} 个苹果，吃掉一个，还剩几个？`,
    },
    levels: {
      L1: {},
      L2: { sentence_zh: sentence(n), sentence_en: `There are ${EN[n]} apples.` },
      L3: {
        sentence_zh: sentence(n),
        sentence_en: `There are ${EN[n]} apples.`,
        fact: n >= 5 ? `${n} 比 ${n - 1} 多一个，比 ${n + 1} 少一个。` : `${n} 就是 ${n} 个，数一数就知道啦。`,
      },
    },
  });
}

const byId = new Map(cards.map((c) => [c.id, c]));
for (const c of fresh) byId.set(c.id, c);

// 保持"数数"分区在卡片流中的相对顺序
const next = [...byId.values()].sort((a, b) => {
  if (a.section === 'numbers' && b.section === 'numbers') {
    return (a.count ?? 0) - (b.count ?? 0);
  }
  return 0;
});

fs.writeFileSync(FILE, JSON.stringify(next, null, 2) + '\n', 'utf8');
console.log(`数数卡 1–10 已生成，总卡片 ${next.length} 张`);
