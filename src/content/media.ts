/**
 * 媒体资源自动匹配。
 *
 * 设计目标：**加内容不改代码**。
 *
 * 你把文件丢进 public/media/，代码按约定命名自动找到它：
 *
 *   public/media/images/<cardId>.webp        → 卡片主图
 *   public/media/images/<cardId>_shadow.webp → 影子剪影
 *   public/media/images/section/<sectionId>.webp → 分区图标
 *   public/media/audio/zh/<cardId>.mp3       → 中文发音
 *   public/media/audio/en/<cardId>.mp3       → 英文发音
 *   public/media/audio/poem/<cardId>.mp3     → 古诗整首
 *   public/media/audio/poem/<cardId>_1.mp3   → 古诗单句（1..4）
 *   public/media/audio/story/<cardId>.mp3    → 故事单页
 *   public/media/audio/sent/zh/<cardId>.mp3  → 中文短句
 *   public/media/audio/sent/en/<cardId>.mp3  → 英文短句
 *   public/media/audio/sfx/<name>.mp3        → 拟声/音效
 *
 * 清单由 vite 插件在编译期扫描生成（见 vite.config.ts），
 * 这里只是运行时查表。缺文件 → 返回 undefined → 组件回退 emoji / WebSpeech。
 */

import manifest from 'virtual:media-manifest';

export type MediaKind = 'image' | 'audio';

export interface MediaManifest {
  images: string[];
  audio: string[];
  builtAt: string;
}

const m = manifest as MediaManifest;

const imageSet = new Set(m.images);
const audioSet = new Set(m.audio);

/** base 前缀：Vite 的 base 为 './'，用 import.meta.env.BASE_URL 拼出正确相对路径 */
const BASE = import.meta.env.BASE_URL || '/';

function url(path: string): string {
  // BASE_URL 通常以 / 结尾
  return BASE + path.replace(/^\/+/, '');
}

function pickImage(candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (imageSet.has(c)) return url(c);
  }
  return undefined;
}

function pickAudio(candidates: string[]): string | undefined {
  for (const c of candidates) {
    if (audioSet.has(c)) return url(c);
  }
  return undefined;
}

/** 卡片主图：优先 webp，其次 png/jpg */
export function cardImage(cardId: string): string | undefined {
  return pickImage(['webp', 'png', 'jpg', 'jpeg'].map((ext) => `media/images/${cardId}.${ext}`));
}

/** 分区图标图（有真图则用真图，否则组件用 section.icon emoji） */
export function sectionImage(sectionId: string): string | undefined {
  return pickImage(['webp', 'png', 'jpg', 'jpeg'].map((ext) => `media/images/section/${sectionId}.${ext}`));
}

/** 影子剪影图 */
export function shadowImage(cardId: string): string | undefined {
  return pickImage(['webp', 'png'].map((ext) => `media/images/${cardId}_shadow.${ext}`));
}

/** 卡片的中文发音 */
export function audioZh(cardId: string): string | undefined {
  return pickAudio(['mp3', 'm4a', 'ogg'].map((ext) => `media/audio/zh/${cardId}.${ext}`));
}

/** 卡片的英文发音 */
export function audioEn(cardId: string): string | undefined {
  return pickAudio(['mp3', 'm4a', 'ogg'].map((ext) => `media/audio/en/${cardId}.${ext}`));
}

/** 古诗整首 */
export function audioPoemFull(cardId: string): string | undefined {
  return pickAudio(['mp3', 'm4a'].map((ext) => `media/audio/poem/${cardId}.${ext}`));
}

/** 古诗第 n 句（1..4） */
export function audioPoemLine(cardId: string, n: number): string | undefined {
  return pickAudio(['mp3', 'm4a'].map((ext) => `media/audio/poem/${cardId}_${n}.${ext}`));
}

/** 故事单页（优先按年龄档，其次无后缀） */
export function audioStory(cardId: string, band?: 'L1' | 'L2' | 'L3'): string | undefined {
  const cands: string[] = [];
  if (band) cands.push(...['mp3', 'm4a'].map((ext) => `media/audio/story/${cardId}_${band}.${ext}`));
  cands.push(...['mp3', 'm4a'].map((ext) => `media/audio/story/${cardId}.${ext}`));
  return pickAudio(cands);
}

/** 中文短句（优先按年龄档） */
export function audioSentZh(cardId: string, band?: 'L1' | 'L2' | 'L3'): string | undefined {
  const cands: string[] = [];
  if (band) cands.push(...['mp3', 'm4a'].map((ext) => `media/audio/sent/zh/${cardId}_${band}.${ext}`));
  cands.push(...['mp3', 'm4a'].map((ext) => `media/audio/sent/zh/${cardId}.${ext}`));
  return pickAudio(cands);
}

/** 英文短句（优先按年龄档） */
export function audioSentEn(cardId: string, band?: 'L1' | 'L2' | 'L3'): string | undefined {
  const cands: string[] = [];
  if (band) cands.push(...['mp3', 'm4a'].map((ext) => `media/audio/sent/en/${cardId}_${band}.${ext}`));
  cands.push(...['mp3', 'm4a'].map((ext) => `media/audio/sent/en/${cardId}.${ext}`));
  return pickAudio(cands);
}

/** 拟声 / 音效，按名字查（meow、bark、chime…） */
export function audioSfx(name: string): string | undefined {
  return pickAudio(['mp3', 'm4a', 'ogg'].map((ext) => `media/audio/sfx/${name}.${ext}`));
}

/** 益智题面音频（quiz 目录，按 cardId 或自定义 key） */
export function audioQuiz(key: string): string | undefined {
  return pickAudio(['mp3', 'm4a'].map((ext) => `media/audio/quiz/${key}.${ext}`));
}

/** 分区名报读（网格顶部胶囊切分区时） */
export function audioSection(sectionId: string): string | undefined {
  return pickAudio(['mp3', 'm4a'].map((ext) => `media/audio/section/${sectionId}.${ext}`));
}

/** 模式切换人声提示（4 句，B1 方案必需） */
export function audioMode(mode: 'flip' | 'loop' | 'tap' | 'mute'): string | undefined {
  return pickAudio(['mp3', 'm4a'].map((ext) => `media/audio/ui/mode_${mode}.${ext}`));
}

/** 是否有任何媒体资源（用于开发期提示） */
export function hasAnyMedia(): boolean {
  return imageSet.size > 0 || audioSet.size > 0;
}

export function mediaStats(): { images: number; audio: number; builtAt: string } {
  return { images: imageSet.size, audio: audioSet.size, builtAt: m.builtAt };
}

/** 供 validate 工具列出所有缺失文件用 */
export function _allImages(): string[] {
  return [...imageSet];
}
export function _allAudio(): string[] {
  return [...audioSet];
}
