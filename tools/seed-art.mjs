/**
 * 给 cards.json 里的卡片补 art 字段（一次性脚本，可重复执行，幂等）。
 *
 * art 字段是"出图提示词"，写在卡片里 → 以后加卡片只需要加 JSON，不动代码。
 *
 * 用法：node tools/seed-art.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const FILE = path.resolve('src/content/cards.json');

const BUNNY = 'a small white bunny with long floppy ears, pink inner ears, pink nose, big black eyes';

const ART = {
  /* ---------- 认东西 ---------- */
  apple: { subject: 'a single shiny red apple with one green leaf and a small brown stem' },
  banana: { subject: 'a bunch of three ripe yellow bananas' },
  strawberry: {
    subject: 'a single whole ripe red strawberry, plump and shiny, with tiny seeds and a green leafy crown',
  },
  carrot: { subject: 'a single long pointed orange carrot with a fluffy green leafy top, standing upright' },
  tomato: {
    subject: 'a single ripe round red tomato with a green star-shaped stem, fully red, shiny but flat',
  },
  corn: {
    subject:
      'a single bright yellow corn cob with rows of yellow kernels, small green husk leaves at the base',
  },
  cat: { subject: 'a cute ginger kitten sitting and looking at the viewer, whiskers and green eyes' },
  dog: { subject: 'a cute brown puppy sitting with floppy ears and a happy face' },
  rabbit: { subject: `${BUNNY}, sitting and looking at the viewer` },

  /* ---------- 古诗 ---------- */
  yonge: {
    subject:
      'a white goose with an orange beak and orange feet swimming on a green pond, curved neck singing up to the sky, soft willow branches, distant blue hills',
    scene_template: '{subject}',
  },
  minnong: {
    subject:
      'a kind farmer in a straw hat hoeing rice seedlings under the hot noon sun, sweat drops falling into the soil, golden green rice field, simple warm scene',
    scene_template: '{subject}',
  },
  jingyesi: {
    subject:
      'a quiet moonlit night, a big bright full moon outside a round window, moonlight shining like frost on the wooden floor, a small figure in a simple room looking up',
    scene_template: '{subject}',
  },

  /* ---------- 故事（同一角色，固定 seed 保证连页一致） ---------- */
  'rabbit-1': {
    subject: `${BUNNY} sleeping in a cozy burrow of soft hay and grass, waking up and rubbing its eyes, warm morning sunlight`,
    seed: 4101,
    scene_template: '{subject}, storybook page illustration',
  },
  'rabbit-2': {
    subject: `${BUNNY} standing in a sunny meadow looking up and talking to a tall friendly oak tree with a gentle smiling face, wild flowers around`,
    seed: 4101,
    scene_template: '{subject}',
  },
  'rabbit-3': {
    subject: `two white rabbits standing in a vegetable garden: a big adult rabbit and a small baby rabbit, the adult pulling a huge red carrot out of the soil, the baby hopping toward it, a basket of carrots on the grass, four-legged animal characters only, no people`,
    seed: 4102,
    scene_template: '{subject}',
  },
  'rabbit-4': {
    subject: `${BUNNY} hugging the mother bunny tightly in the vegetable garden, both smiling, warm afternoon light`,
    seed: 4101,
    scene_template: '{subject}',
  },

  /* ---------- 找影子 ---------- */
  'quiz-shadow-cat': {
    subject: 'a single cute cat sitting in profile, clear simple outline, plain background',
    cutout: true,
  },
  'quiz-shadow-car': {
    subject: 'a single cute small red car seen from the side, clear simple outline, plain background',
    cutout: true,
  },
  'quiz-shadow-apple': {
    subject: 'a single red apple, clear simple outline, plain background',
    cutout: true,
  },

  /* ---------- 猜一猜 ---------- */
  'peek-rabbit': {
    subject: `${BUNNY} hiding behind tall green grass, only its two long ears peeking out, playful`,
    scene_template: '{subject}',
  },
  'peek-elephant': {
    subject:
      'a cute grey baby elephant hiding behind a big tree trunk, only its long trunk peeking out, playful',
    scene_template: '{subject}',
  },
  'peek-panda': {
    subject:
      'a cute panda hiding in a bamboo forest, only its black eye patches and round ears peeking out, playful',
    scene_template: '{subject}',
  },
};

const cards = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let added = 0;
for (const card of cards) {
  const art = ART[card.id];
  if (!art) continue;
  const merged = { ...(card.art ?? {}), ...art };
  if (JSON.stringify(card.art ?? null) === JSON.stringify(merged)) continue;
  card.art = merged;
  added++;
}
fs.writeFileSync(FILE, JSON.stringify(cards, null, 2) + '\n', 'utf8');
console.log(`已为 ${added} 张卡片补上 art 字段（共 ${cards.length} 张）`);
