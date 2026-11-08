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

/**
 * 默认提示词是 `a single cute {en}`，对歧义词会画出别的东西
 * （cherry 画成齷包、kiwi 画成鸟、pea 画成苹果）。
 * 这里给需要说清楚的具体描述。
 */
const SUBJECT = {
  cherry: 'three shiny red cherries with green stems, connected by one stem',
  kiwi: 'a kiwi fruit cut in half, showing bright green flesh and tiny black seeds',
  cabbage: 'a round green cabbage with tightly layered leaves',
  potato: 'a single oval brown potato with a few eyes',
  chili: 'a single bright red chili pepper with a green stem',
  pea: 'a green pea pod opened to show round green peas inside',
  lettuce: 'a head of fresh green lettuce with ruffled leaves',
  melon: 'a striped green cantaloupe melon, whole',
  coconut: 'a whole brown coconut with a straw',
  // 衣服类：一定要写 no person，否则会画成穿着它的小孩
  hat: 'a straw sun hat with a pink ribbon, no person, isolated',
  coat: 'a small blue children winter coat on a hanger, no person',
  dress: 'a pink children dress on a hanger, no person',
  scarf: 'a knitted woollen scarf on a wooden hook, no person, isolated',
  glasses: 'a pair of round eyeglasses, no person',
  // 食物类：SD 很喜欢给它加脸，必须明确 no face / no character
  milk: 'a glass of milk with a straw, no face, no character',
  bun: 'two steamed buns on a bamboo steamer, no face, no character',
  dumpling: 'a plate of steamed dumplings, no face, no character',
  bread: 'a loaf of bread with a sliced end, no face, no character',
  candy: 'a colourful wrapped candy, no face, no character',
  chocolate: 'a chocolate bar with a bite taken, no face, no character',
  honey: 'a honey jar with a wooden dipper and a bee, no face, no character',
  // 职业：要用具体道具，不能只写角色名
  driver: 'a smiling bus driver in uniform sitting in a bus with a steering wheel, simple storybook',
  painter: 'a smiling painter holding a palette and a brush, standing at an easel, simple storybook',
  teacher: 'a smiling teacher standing in front of a blackboard with a book, simple storybook',
  farmer: 'a smiling farmer in a straw hat holding a basket of vegetables, simple storybook',
  // 场地方：要建筑，不是人
  school: 'a small primary school building with a flag and a playground, no people',
  library: 'a small library building with big windows and books visible inside, no people',
  station: 'a small train station platform with a roof and a bench, no people',
  zoo: 'a zoo entrance gate with a wooden sign and a fence, no people',
  seed: 'a few small brown seeds with one tiny green sprout, close up',
  beach: 'a sandy beach with gentle waves, a seashell and a starfish, simple illustration',
  mountain: 'a tall blue-grey mountain with snow on top and green foothills, simple illustration',
  forest: 'a group of tall green pine trees, simple illustration',
  sky: 'a clear blue sky with two small clouds, simple illustration',
  grass: 'a patch of green grass with a few small white flowers, simple illustration',
  // 抽象/自然现象：SD 会画成圆圈或小动物，必须给具体画面
  broom: 'a straw broom leaning against a wall, no person',
  phone: 'a smartphone standing upright with a bright blue screen, simple illustration',
  fire: 'a small campfire with orange flames and logs, on a paper background',
  rain: 'rain drops falling from a small grey cloud, simple illustration',
  snow: 'a snowflake pattern with small white snowflakes falling, simple illustration',
  wind: 'curved swirls of wind blowing autumn leaves, simple illustration, no person',
  lightning: 'a bright yellow lightning bolt in a dark cloud, simple illustration',
  rainbow: 'a seven colour rainbow arching over a small green hill, simple illustration',
  sea: 'blue ocean waves meeting a sandy beach with a small sailboat far away, simple illustration',
  stone: 'three smooth grey pebbles of different sizes on sand, simple illustration',
  cloud: 'two fluffy white clouds in a blue sky, simple illustration',
  star: 'five yellow five-pointed stars in the night sky, simple illustration',
  moon: 'a round yellow full moon in the night sky with a few stars, simple illustration',
  sun: 'a round warm yellow sun with soft rays in a pale blue sky, simple illustration',
};

/**
 * 自然现象 / 风景类不适合 rembg 抠图：抠完就变成"圆饼"（大海、沙滩、山都被裁成圆圈）。
 * 这类直接保留方形画布，当小场景看。
 */
const NO_CUTOUT = new Set([
  'mountain',
  'beach',
  'sea',
  'sun',
  'moon',
  'star',
  'cloud',
  'rain',
  'snow',
  'wind',
  'lightning',
  'rainbow',
  'stone',
  'fire',
]);

function slug(en) {
  return en
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * 这些词不适合让 SD 画"单个物体"（身体部位、抽象物品），
 * 出来的图会莫名其妙（一张小女孩当"眼睛"）。直接用 emoji 反而更清楚。
 */
const SKIP_IMAGE = new Set([
  // 身体部位：emoji 意即"部位"，画一个人像反而分散注意力
  'eye',
  'nose',
  'mouth',
  'ear',
  'hand',
  'foot',
  'hair',
  'tooth',
  'tongue',
  'cheek',
  // 抽象自然现象：SD 只会画个圈，emoji（☀️🌧️💨⚡）反而一眼就懂
  'sun',
  'rain',
  'wind',
  'lightning',
  'beach',
  // 单独一个词画不出来的
  'mirror',
  'towel',
  'fan',
  'vacuum',
  'blocks',
  'doll',
  'puzzle',
]);

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
      art: SKIP_IMAGE.has(id)
        ? { skip: true }
        : {
            subject: SUBJECT[id] ?? `a single cute ${en}`,
            ...(NO_CUTOUT.has(id) ? { cutout: false } : {}),
          },
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
