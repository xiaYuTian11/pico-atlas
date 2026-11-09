import type { Card } from '@/content/types';
import {
  audioEn,
  audioPoemFull,
  audioPoemLine,
  audioSentEn,
  audioSentZh,
  audioStory,
  audioZh,
  audioQuiz,
} from '@/content/media';
import { state, type PlayMode } from '@/state/store';
import { alive, newSession, playSfx, sleep, speak, stopAll } from './engine';

/**
 * 播放编排 —— 把"卡片 + 年龄档 + 播放模式"翻译成一条朗读时间轴。
 *
 * 所有时间常量集中在这里，与 docs/asset-pipeline-spec.md §1.3 对齐。
 * 改节奏只改这一个文件。
 */

export const TIMING = {
  /** 翻页落定 → 开始朗读的留白（视觉认知窗口） */
  flipSettleMs: 700,
  /** 中文播完 → 英文开始 */
  zhToEnMs: 1000,
  /** 自动巡航：一张读完 → 翻下一张 */
  cruiseGapMs: 1400,
  /** 单卡循环：一轮结束 → 下一轮 */
  loopGapMs: 1500,
  /** 静音巡航：纯看图停留 */
  muteCruiseHoldMs: 3000,
  /** 诗句之间 */
  poemLineGapMs: 450,
} as const;

export type HighlightTarget = 'zh' | 'en' | 'sentenceZh' | 'sentenceEn' | 'poemLine' | 'storyText' | null;

export interface ReadHooks {
  /** 高亮某段文本（null = 清除） */
  onHighlight(target: HighlightTarget, poemLineIndex?: number): void;
}

/** 取当前年龄档的文本深度 */
export function levelOf(card: Card, band: 'L1' | 'L2' | 'L3') {
  return card.levels?.[band] ?? {};
}

/**
 * 读一张卡片。返回 true = 完整读完；false = 被打断。
 * 调用方负责在打断时不再继续后续动作。
 */
export async function readCard(card: Card, ticket: number, hooks: ReadHooks): Promise<boolean> {
  if (!alive(ticket)) return false;

  const mode = state.prefs.playMode;
  if (mode === 'quiet_mute') {
    // 静音：完全不发声，但给一个视觉提示让用户知道"这一步发生了"
    hooks.onHighlight(null);
    return true;
  }

  switch (card.type) {
    case 'poem':
      return readPoem(card, ticket, hooks);
    case 'story':
      return readStory(card, ticket, hooks);
    case 'quiz_shadow':
    case 'quiz_sound':
    case 'quiz_sort':
    case 'tracing':
    case 'part_to_whole':
    case 'cause_habit':
      return readQuizPrompt(card, ticket, hooks);
    default:
      return readObject(card, ticket, hooks);
  }
}

/* ---------------- 识物 / 数数 / 图形 / 颜色 / 对比 / 画板 ---------------- */

async function readObject(card: Card, ticket: number, hooks: ReadHooks): Promise<boolean> {
  const band = state.ageBand ?? 'L1';

  // 1. 中文主词
  hooks.onHighlight('zh');
  await speak({
    url: audioZh(card.id),
    text: card.zh,
    lang: 'zh',
    ticket,
  });
  if (!alive(ticket)) return false;
  hooks.onHighlight(null);

  // 2. 中英之间的留白（语音码切换窗口）
  if (!(await sleep(TIMING.zhToEnMs, ticket))) return false;

  // 3. 英文主词
  if (card.en) {
    hooks.onHighlight('en');
    await speak({ url: audioEn(card.id), text: card.en, lang: 'en', ticket });
    if (!alive(ticket)) return false;
    hooks.onHighlight(null);
  }

  // 4. L2/L3 追加短句
  if (band !== 'L1') {
    const lv = levelOf(card, band);
    if (lv.sentence_zh) {
      if (!(await sleep(600, ticket))) return false;
      hooks.onHighlight('sentenceZh');
      await speak({ url: audioSentZh(card.id, band), text: lv.sentence_zh, lang: 'zh', ticket });
      if (!alive(ticket)) return false;
      hooks.onHighlight(null);
    }
    if (lv.sentence_en) {
      if (!(await sleep(800, ticket))) return false;
      hooks.onHighlight('sentenceEn');
      await speak({ url: audioSentEn(card.id, band), text: lv.sentence_en, lang: 'en', ticket });
      if (!alive(ticket)) return false;
      hooks.onHighlight(null);
    }
  }

  // 逐段朗读是否被打断由 alive(ticket) 判断；能走到这里就是完整读完
  return true;
}

/* ---------------- 古诗：整首优先，逐句兜底 ---------------- */

async function readPoem(card: Card, ticket: number, hooks: ReadHooks): Promise<boolean> {
  const lines = card.lines ?? [];
  // 不管哪个年龄档，整首都要读完。
  // （旧版 L1 只读前两句，孩子听到一半就停，是最容易被当成“坏了”的体验）
  const focusLines = lines.length;

  const full = audioPoemFull(card.id);
  const lineUrls = lines.map((_, i) => audioPoemLine(card.id, i + 1));
  const hasAllLines = lines.length > 0 && lineUrls.every((u) => !!u);

  // 优先逐句播：高亮与声音天然同步，句尾降调也更自然
  if (hasAllLines) {
    for (let i = 0; i < lines.length; i++) {
      if (!alive(ticket)) return false;
      hooks.onHighlight('poemLine', i);
      if (i < focusLines) {
        await speak({ url: lineUrls[i], text: lines[i], lang: 'zh', ticket });
        if (!alive(ticket)) return false;
        if (!(await sleep(TIMING.poemLineGapMs, ticket))) return false;
      } else {
        // 超出本档重点的句子：只亮不读，给孩子一个“还有”的预期
        if (!(await sleep(420, ticket))) return false;
      }
    }
    hooks.onHighlight(null);
    return true;
  }

  if (full) {
    // 只有整首音频时：按时长均分高亮（近似，会有一点点滑拍）
    const el = new Audio(full);
    const dur = await getDuration(el);
    const perLine = dur > 0 ? (dur / lines.length) * 1000 : 1500;
    let idx = 0;
    hooks.onHighlight('poemLine', 0);
    const ticker = setInterval(() => {
      idx++;
      if (idx < lines.length) hooks.onHighlight('poemLine', idx);
    }, perLine);
    const ok = await speak({ url: full, text: lines.join(''), lang: 'zh', ticket });
    clearInterval(ticker);
    hooks.onHighlight(null);
    return ok;
  }

  // 无整首音频：逐句播
  for (let i = 0; i < lines.length; i++) {
    if (!alive(ticket)) return false;
    hooks.onHighlight('poemLine', i);
    const lineAudio = audioPoemLine(card.id, i + 1);
    // L1 只读前 focusLines 句；其余只高亮不读
    if (i < focusLines) {
      await speak({ url: lineAudio, text: lines[i], lang: 'zh', ticket });
      if (!alive(ticket)) return false;
      if (!(await sleep(TIMING.poemLineGapMs, ticket))) return false;
    } else {
      if (!(await sleep(400, ticket))) return false;
    }
  }
  hooks.onHighlight(null);
  return true;
}

function getDuration(el: HTMLAudioElement): Promise<number> {
  return new Promise((resolve) => {
    if (Number.isFinite(el.duration) && el.duration > 0) {
      resolve(el.duration);
      return;
    }
    const done = (): void => resolve(el.duration || 0);
    el.addEventListener('loadedmetadata', done, { once: true });
    el.addEventListener('error', () => resolve(0), { once: true });
    el.load();
    setTimeout(() => resolve(el.duration || 0), 1200);
  });
}

/* ---------------- 故事：单页正文 ---------------- */

async function readStory(card: Card, ticket: number, hooks: ReadHooks): Promise<boolean> {
  const band = state.ageBand ?? 'L1';
  const lv = levelOf(card, band);
  // 校验保证三档都有 text，所以这里不会再回退成名词
  const text = lv.text ?? card.zh;

  hooks.onHighlight('storyText');
  const ok = await speak({ url: audioStory(card.id, band), text, lang: 'zh', ticket });
  hooks.onHighlight(null);
  return ok;
}

/* ---------------- 益智：读题面 ---------------- */

async function readQuizPrompt(card: Card, ticket: number, hooks: ReadHooks): Promise<boolean> {
  hooks.onHighlight('zh');
  const ok = await speak({
    url: audioQuiz(card.id) ?? audioZh(card.id),
    text: card.zh,
    lang: 'zh',
    ticket,
  });
  hooks.onHighlight(null);
  return ok;
}

/* ---------------- 单卡点击：点哪读哪 ---------------- */

export async function readPart(card: Card, part: HighlightTarget, poemLineIndex?: number): Promise<void> {
  const mode = state.prefs.playMode;

  // 任何点击都先作废进行中的播放（强打断）
  // 注意：newSession 已递增，所以 stopAll 只需清音频
  stopAll();
  const t = newSession();

  if (mode === 'quiet_mute') {
    // 静音态也要有声音反馈？不 —— 静音就是静音。
    // 但必须有视觉反馈，由调用方（组件）负责。
    return;
  }

  switch (part) {
    case 'zh': {
      // 先给即时反馈（拟声/气泡音），再读中文词。
      // CardText 的 aria-label 承诺「点一下听中文」，不能只响音效。
      // 点图区播拟声的路径在 StageShell.onCardTap 里，与此处不重叠。
      playSfx(card.sound ?? 'pop');
      await speak({ url: audioZh(card.id), text: card.zh, lang: 'zh', ticket: t });
      break;
    }
    case 'en':
      await speak({ url: audioEn(card.id), text: card.en ?? '', lang: 'en', ticket: t });
      break;
    case 'sentenceZh': {
      const band = state.ageBand ?? 'L1';
      const lv = levelOf(card, band);
      await speak({ url: audioSentZh(card.id, band), text: lv.sentence_zh ?? '', lang: 'zh', ticket: t });
      break;
    }
    case 'sentenceEn': {
      const band = state.ageBand ?? 'L1';
      const lv = levelOf(card, band);
      await speak({ url: audioSentEn(card.id, band), text: lv.sentence_en ?? '', lang: 'en', ticket: t });
      break;
    }
    case 'poemLine': {
      const lines = card.lines ?? [];
      const i = poemLineIndex ?? 0;
      await speak({
        url: audioPoemLine(card.id, i + 1),
        text: lines[i] ?? '',
        lang: 'zh',
        ticket: t,
      });
      break;
    }
    case 'storyText': {
      const band = state.ageBand ?? 'L1';
      const lv = levelOf(card, band);
      await speak({ url: audioStory(card.id, band), text: lv.text ?? card.zh, lang: 'zh', ticket: t });
      break;
    }
    default:
      break;
  }
}

/** 当前模式是否会自动朗读（翻页即读 / 单卡循环） */
export function autoReadsOnFlip(mode: PlayMode = state.prefs.playMode): boolean {
  return mode === 'flip_and_read' || mode === 'single_loop';
}
