<script setup lang="ts">
/**
 * 古诗卡 —— 全诗 4 句完整呈现，逐句点读 + 卡拉OK高亮。
 *
 * L1：只高亮前 2 句（focusLines），其余半透明但仍可点
 * L2/L3：全诗高亮
 */
import { computed } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';
import CardImage from './parts/CardImage.vue';

const props = defineProps<{
  card: Card;
  highlight: string | null;
  poemLineIndex?: number | null;
}>();

const band = computed(() => state.ageBand ?? 'L1');
const focusLines = computed(() => props.card.levels?.[band.value]?.focusLines ?? 4);
const lines = computed(() => props.card.lines ?? []);
const pinyinLines = computed(() => (band.value === 'L1' ? [] : props.card.pinyinLines ?? []));

function lineState(i: number): string {
  if (props.highlight === 'poemLine' && props.poemLineIndex === i) return 'is-speaking';
  if (props.highlight === 'poemLine') return 'is-dimmed';
  return '';
}
</script>

<template>
  <div class="pa-poem">
    <div class="pa-poem__visual">
      <CardImage :card-id="card.id" :emoji="card.emoji" :alt="card.zh" />
    </div>

    <div class="pa-poem__content">
      <div class="pa-poem__lines">
        <button
          v-for="(line, i) in lines"
          :key="i"
          type="button"
          class="pa-poem__line pa-hit"
          :class="[lineState(i), { 'is-outside-focus': i >= focusLines }]"
          :data-part="`poemLine:${i}`"
          :aria-label="`第 ${i + 1} 句：${line}`"
        >
          <span class="pa-poem__text">{{ line }}</span>
          <span v-if="pinyinLines[i]" class="pa-poem__py">{{ pinyinLines[i] }}</span>
        </button>
      </div>

      <div class="pa-poem__meta">
        {{ card.dynasty }} · {{ card.author }}《{{ card.zh }}》
      </div>
    </div>
  </div>
</template>

<style scoped>
.pa-poem {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-poem__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px var(--pa-gutter);
}

.pa-poem__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.pa-poem__lines {
  display: flex;
  flex-direction: column;
  gap: 4px;
  width: 100%;
  align-items: center;
}

.pa-poem__line {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  width: 100%;
  /* 每句 ≥44px 触控条；这里给足 52px */
  min-height: 52px;
  padding: 4px 10px;
  border-radius: var(--pa-r-sm);
  transition:
    color var(--pa-dur-base) var(--pa-ease-out),
    transform var(--pa-dur-base) var(--pa-ease-out),
    opacity var(--pa-dur-base) var(--pa-ease-out);
}

.pa-poem__text {
  font-size: var(--pa-fs-poem);
  font-weight: 800;
  letter-spacing: 3px;
  line-height: 1.3;
  color: var(--pa-ink);
  white-space: nowrap;
}

.pa-poem__py {
  font-size: 15px;
  font-weight: 500;
  letter-spacing: 0.4px;
  color: var(--pa-ink-muted);
  line-height: 1.2;
}

/* 朗读中的那一句 */
.pa-poem__line.is-speaking .pa-poem__text {
  color: var(--pa-accent-deep);
  text-shadow: 0 0 20px rgba(245, 144, 74, 0.55);
  transform: scale(1.06);
}

/* 其余句弱化 */
.pa-poem__line.is-dimmed {
  opacity: 0.42;
}

/* L1 超出重点的句子：淡但可点 */
.pa-poem__line.is-outside-focus {
  opacity: 0.55;
}
.pa-poem__line.is-outside-focus.is-speaking {
  opacity: 1;
}

.pa-poem__meta {
  font-size: var(--pa-fs-fact);
  font-weight: 600;
  color: var(--pa-ink-muted);
  letter-spacing: 1px;
  margin-top: 2px;
}

/* 横屏时诗句可以更大更宽 */
@media (orientation: landscape) and (min-width: 640px) {
  .pa-poem__text {
    font-size: clamp(26px, 3.4vw, 34px);
    letter-spacing: 5px;
  }
}
</style>
