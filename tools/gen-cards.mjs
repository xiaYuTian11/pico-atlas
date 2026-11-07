/**
 * 批量生成识物卡（词库 → cards-auto.json）。
 *
 * 与手写的 cards.json 分开存：
 *   手写的是"精修版"（有短句、有亲子锦囊、有故事）；
 *   这里生成的是"词库版"（中英 + 拼音 + emoji + 出图提示词）。
 * 运行时两份合并，手写优先（同 id 时后写的覆盖，所以 auto 放前面）。
 *
 * 用法：node tools/gen-cards.mjs
 */
import fs from 'node:fs';
import { pinyin as toPinyin } from 'pinyin-pro';

const WL = JSON.parse(fs.readFileSync('tools/wordlist.json', 'utf8')).words;
const EXISTING = JSON.parse(fs.readFileSync('src/content/cards.json', 'utf8'));
const taken = new Set(EXISTING.map((c) => c.id));

const PALETTE = {
  fruits: 'var(--pa-pal-warm)',
  vegetables: 'var(--pa-pal-mint)',
  animals: 'var(--pa-pal-sand)',
  food: 'var(--pa-pal-cream)',
  vehicle: 'var(--pa-pal-sky)',
  daily: 'var(--pa-pal-stone)',
  appliance: 'var(--pa-pal-sky)',
  toys: 'var(--pa-pal-rose)',
  body: 'var(--pa-pal-rose)',
  nature: 'var(--pa-pal-mint)',
  clothing: 'var(--pa-pal-lilac)',
  roles: 'var(--pa-pal-cream)',
  plants: 'var(--pa-pal-mint)',
  places: 'var(--pa-pal-stone)',
};

function slug(en) {
  return en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function pinyin(zh) {
  // 词级拼音，带声调：píng guǒ
  return toPinyin(zh, { toneType: 'symbol', type: 'array' }).join(' ');
}

const out = [];
const seen = new Set();

for (const [section, list] of Object.entries(WL)) {
  for (const [zh, en, emoji] of list) {
    let id = slug(en);
    if (!id) continue;
    // 同一英文词出现在两个分区时，加分区后缀而不是丢掉
    if (taken.has(id) || seen.has(id)) {
      id = `${id}-${section}`;
    }
    if (taken.has(id) || seen.has(id)) continue;
    seen.add(id);

    out.push({
      id,
      lane: 'look',
      type: 'object',
      section,
      zh,
      en,
      pinyin: pinyin(zh),
      emoji,
      palette: PALETTE[section] ?? 'var(--pa-card)',
      sound: 'pop',
      art: { subject: `a single cute ${en}` },
      // 词库版先给一个能用的短句；想更生动就在 cards.json 里手写同 id 覆盖
      levels: {
        L1: {},
        L2: {
          sentence_zh: `这是${zh}。`,
          sentence_en: `This is a ${en}.`,
        },
        L3: {
          sentence_zh: `这是${zh}。`,
          sentence_en: `This is a ${en}.`,
        },
      },
    });
  }
}

fs.writeFileSync('src/content/cards-auto.json', JSON.stringify(out, null, 2) + '\n', 'utf8');
console.log(`生成 ${out.length} 张识物卡 → src/content/cards-auto.json`);
