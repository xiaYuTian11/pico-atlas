<script setup lang="ts">
/**
 * 颜色卡 —— 大面积纯色块 + 两个具象代表物。
 * 色块本身可点击，点一下放大 + pop。
 */
import { computed } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';
import { playSfx } from '@/audio/engine';
import CardText from './parts/CardText.vue';

const props = defineProps<{ card: Card; highlight: string | null }>();

const band = computed(() => state.ageBand ?? 'L1');
const examples = computed(() => (band.value === 'L1' ? [] : props.card.examples ?? []));

function tapBlock(): void {
  playSfx('pop');
}
</script>

<template>
  <div class="pa-color">
    <div class="pa-color__visual">
      <button
        type="button"
        class="pa-color__block"
        :style="{ background: card.colorHex }"
        :aria-label="`${card.zh}色块，点一下`"
        @click.stop="tapBlock"
      />
      <div v-if="examples.length" class="pa-color__examples">
        <span v-for="ex in examples" :key="ex.zh" class="pa-color__example">
          <span class="pa-color__ex-emoji">{{ ex.emoji }}</span>
          <span class="pa-color__ex-zh">{{ ex.zh }}</span>
        </span>
      </div>
    </div>

    <div class="pa-color__content">
      <CardText :card="card" :highlight="highlight" />
    </div>
  </div>
</template>

<style scoped>
.pa-color {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-color__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 12px var(--pa-gutter);
}

.pa-color__block {
  width: min(56vw, 240px);
  height: min(56vw, 240px);
  border-radius: var(--pa-r-xl);
  box-shadow: 0 14px 34px rgba(120, 90, 60, 0.24);
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
  flex-shrink: 0;
}
.pa-color__block:active {
  transform: scale(0.93);
}

.pa-color__examples {
  display: flex;
  gap: 18px;
  flex-wrap: wrap;
  justify-content: center;
}

.pa-color__example {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: var(--pa-fs-fact);
  font-weight: 700;
  color: var(--pa-ink-muted);
}

.pa-color__ex-emoji {
  font-size: 26px;
  line-height: 1;
}

.pa-color__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
}
</style>
