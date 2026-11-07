import type { Component } from 'vue';
import type { CardType } from '@/content/types';

import ObjectCard from './ObjectCard.vue';
import PoemCard from './PoemCard.vue';
import StoryCard from './StoryCard.vue';
import NumberCard from './NumberCard.vue';
import ShapeCard from './ShapeCard.vue';
import ColorCard from './ColorCard.vue';
import OppositeCard from './OppositeCard.vue';
import DrawingCard from './DrawingCard.vue';

import ShadowQuiz from './quiz/ShadowQuiz.vue';
import SoundQuiz from './quiz/SoundQuiz.vue';
import SortQuiz from './quiz/SortQuiz.vue';
import TracingQuiz from './quiz/TracingQuiz.vue';
import PeekQuiz from './quiz/PeekQuiz.vue';
import HabitQuiz from './quiz/HabitQuiz.vue';

/**
 * 卡片渲染注册表 —— 整个内容体系的核心。
 *
 * 新增一类卡片只需要两步：
 *   1. 建一个组件，props 是 { card, highlight, poemLineIndex? }
 *   2. 在这个表里加一行
 * 完全不用改 Stage、不用改 if-else。
 */
export const CARD_RENDERERS: Record<CardType, Component> = {
  object: ObjectCard,
  poem: PoemCard,
  story: StoryCard,
  number: NumberCard,
  shape: ShapeCard,
  color: ColorCard,
  opposite: OppositeCard,
  drawing: DrawingCard,
  quiz_shadow: ShadowQuiz,
  quiz_sound: SoundQuiz,
  quiz_sort: SortQuiz,
  tracing: TracingQuiz,
  part_to_whole: PeekQuiz,
  cause_habit: HabitQuiz,
};

/** 这些类型锁定滑动手势（画板、轨迹），翻页只能走底栏 */
export const GESTURE_LOCKED_TYPES: ReadonlySet<CardType> = new Set<CardType>(['drawing', 'tracing']);
