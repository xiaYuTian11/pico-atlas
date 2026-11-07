import type { Card, Lane, SectionDef } from './types';
import rawCards from './cards.json';
import { SECTIONS, SECTION_MAP, sectionsOfLane } from './sections';

/**
 * 内容索引 —— 应用运行时唯一的内容入口。
 * 卡片 JSON 一改，这里全部自动跟着变，不需要动任何组件代码。
 */

const ALL_CARDS = rawCards as unknown as Card[];

/** 按 id 建索引，O(1) 查找 */
const byId = new Map<string, Card>();
for (const c of ALL_CARDS) {
  if (byId.has(c.id)) {
    console.error(`[content] 卡片 id 重复: ${c.id} —— 后一条会覆盖前一条`);
  }
  byId.set(c.id, c);
}

/** 卡片总数 */
export const totalCards = ALL_CARDS.length;

/** 全部卡片（只读） */
export const allCards: readonly Card[] = ALL_CARDS;

/** 按 id 取卡 */
export function getCard(id: string): Card | undefined {
  return byId.get(id);
}

/** 某个入口下的所有卡片，按 section order → 卡片在 JSON 中的原始顺序 */
export function cardsOfLane(lane: Lane): Card[] {
  const secOrder = new Map(sectionsOfLane(lane).map((s, i) => [s.id, i]));
  return ALL_CARDS.filter((c) => c.lane === lane).sort((a, b) => {
    const ao = secOrder.get(a.section) ?? 999;
    const bo = secOrder.get(b.section) ?? 999;
    if (ao !== bo) return ao - bo;
    return ALL_CARDS.indexOf(a) - ALL_CARDS.indexOf(b);
  });
}

/** 某个分区下的所有卡片 */
export function cardsOfSection(sectionId: string): Card[] {
  return ALL_CARDS.filter((c) => c.section === sectionId);
}

/** 分区定义 */
export function getSection(sectionId: string): SectionDef | undefined {
  return SECTION_MAP[sectionId];
}

/**
 * 某个入口下的分区，**只返回真的有卡片的分区**。
 * 这样内容还没铺满时，网格页不会出现一堆空分区。
 */
export function populatedSections(lane: Lane): Array<SectionDef & { count: number }> {
  return sectionsOfLane(lane)
    .map((s) => ({ ...s, count: cardsOfSection(s.id).length }))
    .filter((s) => s.count > 0);
}

/** 各入口的卡片数，用于首页进度显示 */
export function laneCounts(): Record<Lane, number> {
  return {
    look: ALL_CARDS.filter((c) => c.lane === 'look').length,
    read: ALL_CARDS.filter((c) => c.lane === 'read').length,
    play: ALL_CARDS.filter((c) => c.lane === 'play').length,
  };
}

/**
 * 故事组：同一 storyId 的连续卡片，按 page 排序。
 * 用于 Stage 里判断"是否在故事中间"、"是否该显示终章画卷"。
 */
export function storyGroup(storyId: string): Card[] {
  return ALL_CARDS.filter((c) => c.type === 'story' && c.storyId === storyId).sort(
    (a, b) => (a.page ?? 0) - (b.page ?? 0),
  );
}

export { SECTIONS, sectionsOfLane };
