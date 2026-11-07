import type { SectionDef } from './types';

/**
 * 分区定义 —— Atlas Grid 的顶部胶囊条就来自这里。
 * 新增分区：在这里加一条，然后把卡片 JSON 的 section 填成这个 id。
 *
 * 顺序 = 孩子认知的由易到难阶梯（见 docs/content-catalog.md §1）。
 */
export const SECTIONS: SectionDef[] = [
  // ---------- 认东西 ----------
  { id: 'fruits', lane: 'look', zh: '水果', icon: '🍎', order: 1, tint: 'var(--pa-pal-warm)' },
  { id: 'vegetables', lane: 'look', zh: '蔬菜', icon: '🥕', order: 2, tint: 'var(--pa-pal-mint)' },
  { id: 'animals', lane: 'look', zh: '动物', icon: '🐱', order: 3, tint: 'var(--pa-pal-sand)' },
  { id: 'food', lane: 'look', zh: '好吃的', icon: '🍰', order: 4, tint: 'var(--pa-pal-cream)' },
  { id: 'vehicle', lane: 'look', zh: '交通', icon: '🚗', order: 5, tint: 'var(--pa-pal-sky)' },
  { id: 'daily', lane: 'look', zh: '家里', icon: '🪑', order: 6, tint: 'var(--pa-pal-stone)' },
  { id: 'appliance', lane: 'look', zh: '电器', icon: '🔌', order: 7, tint: 'var(--pa-pal-sky)' },
  { id: 'toys', lane: 'look', zh: '玩具', icon: '🧸', order: 8, tint: 'var(--pa-pal-rose)' },
  { id: 'body', lane: 'look', zh: '身体', icon: '👀', order: 9, tint: 'var(--pa-pal-rose)' },
  { id: 'nature', lane: 'look', zh: '大自然', icon: '🌳', order: 10, tint: 'var(--pa-pal-mint)' },
  { id: 'clothing', lane: 'look', zh: '衣服', icon: '👕', order: 11, tint: 'var(--pa-pal-lilac)' },
  { id: 'roles', lane: 'look', zh: '人们', icon: '👩‍⚕️', order: 12, tint: 'var(--pa-pal-cream)' },
  { id: 'plants', lane: 'look', zh: '花草', icon: '🌻', order: 13, tint: 'var(--pa-pal-mint)' },
  { id: 'places', lane: 'look', zh: '地方', icon: '🏠', order: 14, tint: 'var(--pa-pal-stone)' },

  // ---------- 读一读 ----------
  { id: 'poems', lane: 'read', zh: '古诗', icon: '📜', order: 1, tint: 'var(--pa-pal-sky)' },
  { id: 'stories', lane: 'read', zh: '故事', icon: '📖', order: 2, tint: 'var(--pa-pal-rose)' },

  // ---------- 玩一玩 ----------
  { id: 'numbers', lane: 'play', zh: '数数', icon: '🔢', order: 1, tint: 'var(--pa-pal-cream)' },
  { id: 'shapes', lane: 'play', zh: '图形', icon: '🔺', order: 2, tint: 'var(--pa-pal-sand)' },
  { id: 'colors', lane: 'play', zh: '颜色', icon: '🎨', order: 3, tint: 'var(--pa-pal-rose)' },
  { id: 'opposites', lane: 'play', zh: '比一比', icon: '⚖️', order: 4, tint: 'var(--pa-pal-sky)' },
  { id: 'quiz_shadow', lane: 'play', zh: '找影子', icon: '👤', order: 5, tint: 'var(--pa-pal-stone)' },
  { id: 'quiz_sound', lane: 'play', zh: '听声音', icon: '👂', order: 6, tint: 'var(--pa-pal-sky)' },
  { id: 'quiz_sort', lane: 'play', zh: '分一分', icon: '🧺', order: 7, tint: 'var(--pa-pal-cream)' },
  { id: 'tracing', lane: 'play', zh: '描一描', icon: '✏️', order: 8, tint: 'var(--pa-pal-mint)' },
  { id: 'peek', lane: 'play', zh: '猜一猜', icon: '🫣', order: 9, tint: 'var(--pa-pal-mint)' },
  { id: 'habit', lane: 'play', zh: '帮帮忙', icon: '🪥', order: 10, tint: 'var(--pa-pal-mint)' },
  { id: 'drawing', lane: 'play', zh: '画一画', icon: '🖍️', order: 11, tint: 'var(--pa-pal-sand)' },
];

export const SECTION_MAP: Record<string, SectionDef> = Object.fromEntries(
  SECTIONS.map((s) => [s.id, s]),
);

/** 某个入口下的所有分区，按 order 排序 */
export function sectionsOfLane(lane: 'look' | 'read' | 'play'): SectionDef[] {
  return SECTIONS.filter((s) => s.lane === lane).sort((a, b) => a.order - b.order);
}

/** 三大入口的展示元信息 */
export const LANES = [
  {
    id: 'look' as const,
    zh: '认东西',
    icon: '🍎',
    desc: '水果 · 蔬菜 · 动物 · 交通',
    tint: 'var(--pa-pal-warm)',
  },
  {
    id: 'read' as const,
    zh: '读一读',
    icon: '📖',
    desc: '古诗诵读 · 温暖故事',
    tint: 'var(--pa-pal-sky)',
  },
  {
    id: 'play' as const,
    zh: '玩一玩',
    icon: '🎨',
    desc: '数数 · 图形 · 颜色 · 益智',
    tint: 'var(--pa-pal-mint)',
  },
] as const;
