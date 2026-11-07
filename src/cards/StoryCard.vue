<script setup lang="ts">
/**
 * 故事卡 —— 连续叙事，单页一图一句。
 *
 * 终章页（page === pageCount）额外展开「四格缩略连环画」胶囊，
 * 点击任意格可跳回该页重看。
 *
 * 正文按年龄档取 text（L1 短、L2 中、L3 长），
 * 校验已保证三档都有 text，不会再回退成名词。
 */
import { computed } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';
import { storyGroup } from '@/content';
import CardImage from './parts/CardImage.vue';

const props = defineProps<{
  card: Card;
  highlight: string | null;
}>();

const emit = defineEmits<{ jumpToStoryPage: [page: number] }>();

const band = computed(() => state.ageBand ?? 'L1');
const text = computed(() => props.card.levels?.[band.value]?.text ?? props.card.zh);
const isFinal = computed(() => props.card.page === props.card.pageCount);
const group = computed(() =>
  props.card.storyId ? storyGroup(props.card.storyId) : [],
);
</script>

<template>
  <div class="pa-story">
    <div class="pa-story__badge">
      {{ card.title }} · {{ card.page }} / {{ card.pageCount }}
    </div>

    <div class="pa-story__visual">
      <CardImage :card-id="card.id" :emoji="card.emoji" :alt="card.zh" />
    </div>

    <div class="pa-story__content">
      <button
        type="button"
        class="pa-story__text pa-hit"
        :class="{ 'is-speaking': highlight === 'storyText' }"
        data-part="storyText"
      >
        {{ text }}
      </button>

      <!-- 终章：四格缩略连环画 -->
      <div v-if="isFinal && group.length" class="pa-story__recap">
        <button
          v-for="p in group"
          :key="p.id"
          type="button"
          class="pa-story__recap-item pa-hit"
          :aria-label="`回到第 ${p.page} 页`"
          @click.stop="emit('jumpToStoryPage', p.page ?? 1)"
        >
          <CardImage :card-id="p.id" :emoji="p.emoji" :alt="p.zh" size="small" />
          <span class="pa-story__recap-num">{{ p.page }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pa-story {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  position: relative;
}

.pa-story__badge {
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  font-size: var(--pa-fs-badge);
  font-weight: 700;
  color: var(--pa-ink-muted);
  background: rgba(255, 255, 255, 0.92);
  padding: 4px 12px;
  border-radius: var(--pa-r-pill);
  white-space: nowrap;
  z-index: 2;
}

.pa-story__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px var(--pa-gutter) 6px;
}

.pa-story__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pa-story__text {
  font-size: var(--pa-fs-story);
  font-weight: 800;
  line-height: 1.45;
  letter-spacing: 0.6px;
  text-align: center;
  color: var(--pa-ink);
  max-width: 94%;
  min-height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    color var(--pa-dur-base) var(--pa-ease-out),
    transform var(--pa-dur-base) var(--pa-ease-out);
}

.pa-story__text.is-speaking {
  color: var(--pa-accent-deep);
  text-shadow: 0 0 18px rgba(245, 144, 74, 0.45);
  transform: scale(1.03);
}

/* ---------- 终章四格画卷 ---------- */
.pa-story__recap {
  display: flex;
  gap: 8px;
  justify-content: center;
  width: 100%;
}

.pa-story__recap-item {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--pa-r-md);
  background: rgba(255, 255, 255, 0.86);
  box-shadow: var(--pa-shadow-sm);
  overflow: hidden;
  flex: 0 0 64px;
}

.pa-story__recap-num {
  position: absolute;
  right: 3px;
  bottom: 2px;
  font-size: 12px;
  font-weight: 800;
  color: var(--pa-ink-muted);
  background: rgba(255, 255, 255, 0.9);
  border-radius: 4px;
  padding: 0 3px;
  line-height: 1.4;
}
</style>
