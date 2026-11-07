<script setup lang="ts">
/**
 * 数数卡 —— 大数字 + 具象阵列。
 * 点任一颗物品会弹一下并发 pop 音（计数感）。
 */
import { computed } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';
import { playSfx } from '@/audio/engine';
import CardText from './parts/CardText.vue';

const props = defineProps<{ card: Card; highlight: string | null }>();

const band = computed(() => state.ageBand ?? 'L1');
const items = computed(() => Array.from({ length: props.card.count ?? 0 }, (_, i) => i));
const showNumber = computed(() => band.value !== 'L1');

function tapItem(): void {
  playSfx('pop');
}
</script>

<template>
  <div class="pa-number">
    <div class="pa-number__visual">
      <button
        v-for="i in items"
        :key="i"
        type="button"
        class="pa-number__dot"
        :aria-label="`第 ${i + 1} 个 ${card.zh}`"
        @click.stop="tapItem"
      >
        {{ card.emoji }}
      </button>
    </div>

    <div class="pa-number__content">
      <div v-if="showNumber" class="pa-number__big">{{ card.count }}</div>
      <CardText :card="card" :highlight="highlight" />
    </div>
  </div>
</template>

<style scoped>
.pa-number {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-number__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: clamp(8px, 2vw, 16px);
  padding: 12px var(--pa-gutter);
}

.pa-number__dot {
  font-size: clamp(40px, 12vw, 76px);
  line-height: 1;
  filter: drop-shadow(0 6px 14px rgba(120, 90, 60, 0.18));
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
}
.pa-number__dot:active {
  transform: scale(0.86);
}

.pa-number__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.pa-number__big {
  font-size: clamp(64px, 18vw, 104px);
  font-weight: 900;
  line-height: 1;
  color: var(--pa-accent);
  letter-spacing: 2px;
}
</style>
