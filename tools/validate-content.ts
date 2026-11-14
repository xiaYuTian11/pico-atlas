import fs from 'node:fs';
import path from 'node:path';
import { CardSchema, SectionSchema } from '../src/content/schema';
import { SECTIONS } from '../src/content/sections';
import rawCards from '../src/content/cards.json';
import autoCards from '../src/content/cards-auto.json';

/**
 * 内容校验 + 媒体缺失报告。
 *
 *   npm run validate
 *
 * 任何一条不合规都会报错并退出非 0，可作为提交前钩子。
 * 同时列出「缺哪些图/音」，让你知道下一批该生成什么。
 */

const MEDIA_ROOT = path.resolve(process.cwd(), 'public/media');
const IMAGE_EXT = ['.webp', '.png', '.jpg', '.jpeg'];
const AUDIO_EXT = ['.mp3', '.m4a', '.ogg'];

function existsWithExt(base: string, exts: string[]): string | undefined {
  for (const ext of exts) {
    const p = path.join(MEDIA_ROOT, base + ext);
    if (fs.existsSync(p)) return base + ext;
  }
  return undefined;
}

const errors: string[] = [];
const warnings: string[] = [];

// ---------- 1. 校验分区定义 ----------
const sectionIds = new Set<string>();
for (const s of SECTIONS) {
  const r = SectionSchema.safeParse(s);
  if (!r.success) {
    errors.push(`[section] ${s.id}: ${r.error.issues.map((i) => i.message).join('; ')}`);
  }
  if (sectionIds.has(s.id)) errors.push(`[section] 重复 id: ${s.id}`);
  sectionIds.add(s.id);
}

// ---------- 2. 校验卡片 ----------
const cardIds = new Set<string>();
const cards = [
  ...(autoCards as Array<Record<string, unknown>>),
  ...(rawCards as Array<Record<string, unknown>>),
];

for (const c of cards) {
  const id = String(c.id ?? '<无 id>');
  const r = CardSchema.safeParse(c);
  if (!r.success) {
    for (const issue of r.error.issues) {
      errors.push(`[card ${id}] ${issue.path.join('.') || '(root)'}: ${issue.message}`);
    }
    continue;
  }
  if (cardIds.has(id)) errors.push(`[card] id 重复: ${id}`);
  cardIds.add(id);

  // 分区必须存在，且 lane 必须匹配
  const section = sectionIds.has(String(c.section));
  if (!section) {
    errors.push(`[card ${id}] section "${c.section}" 未在 sections.ts 注册`);
  } else {
    const sec = SECTIONS.find((s) => s.id === c.section);
    if (sec && sec.lane !== c.lane) {
      errors.push(`[card ${id}] section "${c.section}" 属于 ${sec.lane}，但卡片 lane 是 ${c.lane}`);
    }
  }
}

// ---------- 3. 故事完整性 ----------
const stories = new Map<string, number[]>();
for (const c of cards) {
  if (c.type !== 'story') continue;
  const sid = String(c.storyId);
  const arr = stories.get(sid) ?? [];
  arr.push(Number(c.page));
  stories.set(sid, arr);
}
for (const [sid, pages] of stories) {
  const sorted = [...pages].sort((a, b) => a - b);
  const expected = Array.from({ length: sorted.length }, (_, i) => i + 1);
  if (sorted.join(',') !== expected.join(',')) {
    errors.push(`[story ${sid}] 页码不连续: 实际 ${sorted.join(',')}，应为 ${expected.join(',')}`);
  }
  const first = cards.find((c) => c.type === 'story' && c.storyId === sid);
  if (first && Number(first.pageCount) !== sorted.length) {
    errors.push(`[story ${sid}] pageCount=${first.pageCount} 但实际有 ${sorted.length} 页`);
  }
}

// ---------- 4. 媒体缺失报告 ----------
interface Missing {
  id: string;
  need: string;
}
const missingImages: Missing[] = [];
const missingAudio: Missing[] = [];

function checkImage(id: string, base: string, label: string, required: boolean): void {
  if (!existsWithExt(base, IMAGE_EXT)) {
    if (required) missingImages.push({ id, need: `${label} → ${base}.webp` });
  }
}

function checkAudio(id: string, base: string, label: string, required: boolean): void {
  if (!existsWithExt(base, AUDIO_EXT)) {
    if (required) missingAudio.push({ id, need: `${label} → ${base}.mp3` });
  }
}

for (const c of cards) {
  const id = String(c.id);
  const type = String(c.type);

  // 主图：只有"真的会渲染插图"的类型才要求有图
  // （数数/图形/颜色/对比/描红/画板/分类是矢量与交互，不靠插画；
  //   影子题渲染的是剪影 _shadow，主图不参与，所以它不在这个名单里）
  const IMAGE_TYPES = ['object', 'poem', 'story', 'part_to_whole'];
  const artSkip = !!(c.art as { skip?: boolean } | undefined)?.skip;
  if (IMAGE_TYPES.includes(type) && !artSkip) {
    checkImage(id, `images/${id}`, '主图', true);
  }

  // 语音：按 cards.json 的读法分别校验
  const QUIZ_TYPES = ['quiz_shadow', 'quiz_sound', 'quiz_sort', 'tracing', 'part_to_whole', 'cause_habit'];
  if (type === 'poem') {
    checkAudio(id, `audio/poem/${id}`, '古诗整首', true);
    for (let i = 1; i <= 4; i++) checkAudio(id, `audio/poem/${id}_${i}`, `古诗第${i}句`, false);
  } else if (type === 'story') {
    for (const band of ['L1', 'L2', 'L3']) {
      checkAudio(id, `audio/story/${id}_${band}`, `故事正文 ${band}`, true);
    }
  } else if (QUIZ_TYPES.includes(type)) {
    checkAudio(id, `audio/quiz/${id}`, '题面朗读', true);
  } else {
    checkAudio(id, `audio/zh/${id}`, '中文发音', true);
    if (c.en) checkAudio(id, `audio/en/${id}`, '英文发音', true);
  }

  // 短句音频（按年龄档，文件名带 _L2/_L3）
  const levels = c.levels as Record<string, { sentence_zh?: string; sentence_en?: string }> | undefined;
  for (const band of ['L1', 'L2', 'L3'] as const) {
    if (levels?.[band]?.sentence_zh) {
      checkAudio(id, `audio/sent/zh/${id}_${band}`, `中文短句 ${band}`, false);
    }
    if (levels?.[band]?.sentence_en) {
      checkAudio(id, `audio/sent/en/${id}_${band}`, `英文短句 ${band}`, false);
    }
  }

  // 影子卡要剪影图（ShadowQuiz 唯一渲染的图，必需）
  if (type === 'quiz_shadow') checkImage(id, `images/${id}_shadow`, '剪影图', true);
}

// 分区图标图（可选，缺了用 emoji）
for (const s of SECTIONS) {
  if (!existsWithExt(`images/section/${s.id}`, IMAGE_EXT)) {
    warnings.push(`[section ${s.id}] 分区图标图缺失，将用 emoji ${s.icon}`);
  }
}

// ---------- 5. 输出 ----------
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const DIM = '\x1b[2m';
const RESET = '\x1b[0m';

console.log(`\n卡片总数: ${cards.length}   分区数: ${SECTIONS.length}\n`);

const byLane: Record<string, number> = {};
for (const c of cards) byLane[String(c.lane)] = (byLane[String(c.lane)] ?? 0) + 1;
console.log(`按入口: look=${byLane.look ?? 0}  read=${byLane.read ?? 0}  play=${byLane.play ?? 0}`);

const byType: Record<string, number> = {};
for (const c of cards) byType[String(c.type)] = (byType[String(c.type)] ?? 0) + 1;
console.log(
  `按类型: ${Object.entries(byType)
    .map(([k, v]) => `${k}=${v}`)
    .join('  ')}\n`,
);

if (errors.length) {
  console.log(`${RED}✗ 内容校验失败 (${errors.length} 条)${RESET}`);
  for (const e of errors) console.log(`  ${RED}•${RESET} ${e}`);
  console.log('');
} else {
  console.log(`${GREEN}✓ 内容校验通过${RESET}\n`);
}

if (missingImages.length) {
  console.log(`${YELLOW}缺图片 ${missingImages.length} 张${RESET}（缺的会回退 emoji）`);
  for (const m of missingImages) console.log(`  ${DIM}${m.id}${RESET}  ${m.need}`);
  console.log('');
}

if (missingAudio.length) {
  console.log(`${YELLOW}缺音频 ${missingAudio.length} 条${RESET}（缺的会回退 WebSpeech）`);
  for (const m of missingAudio) console.log(`  ${DIM}${m.id}${RESET}  ${m.need}`);
  console.log('');
}

if (!missingImages.length && !missingAudio.length) {
  console.log(`${GREEN}✓ 所有媒体资源齐备${RESET}\n`);
}

if (warnings.length) {
  console.log(`${DIM}提示 ${warnings.length} 条${RESET}`);
  for (const w of warnings) console.log(`  ${DIM}• ${w}${RESET}`);
  console.log('');
}

// 写一份待生成清单，给生图/生音脚本用
const outDir = path.resolve(process.cwd(), 'assets/queue');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, 'missing-images.json'),
  JSON.stringify(
    missingImages.map((m) => m.id).filter((v, i, a) => a.indexOf(v) === i),
    null,
    2,
  ),
);
fs.writeFileSync(
  path.join(outDir, 'missing-audio.json'),
  JSON.stringify(
    missingAudio.map((m) => m.id).filter((v, i, a) => a.indexOf(v) === i),
    null,
    2,
  ),
);
console.log(`${DIM}待生成清单已写入 assets/queue/${RESET}\n`);

if (errors.length) process.exit(1);
