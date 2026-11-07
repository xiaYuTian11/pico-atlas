<script setup lang="ts">
/**
 * 图形卡 —— 内联 SVG 几何图形（矢量，任意分辨率清晰）。
 * 图形本身可点击，点一下会放大回弹 + pop 音。
 */
import { computed } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';
import { playSfx } from '@/audio/engine';
import CardText from './parts/CardText.vue';

const props = defineProps<{ card: Card; highlight: string | null }>();

const band = computed(() => state.ageBand ?? 'L1');
const showExamples = computed(() => band.value !== 'L1' && (props.card.examples?.length ?? 0) > 0);

/** 形状 → SVG 路径参数 */
const SHAPES: Record<string, { d: string; fill: string }> = {
  round: { d: '', fill: '#F5904A' },
  square: { d: '', fill: '#4FA88B' },
  triangle: { d: '', fill: '#5B8FD6' },
  rectangle: { d: '', fill: '#8B7BC7' },
  trapezoid: { d: '', fill: '#E8A33D' },
  diamond: { d: '', fill: '#A87FD4' },
  pentagon: { d: '', fill: '#4FA88B' },
  oval: { d: '', fill: '#E87D7A' },
};

const shapeInfo = computed(() => SHAPES[props.card.shape ?? 'round'] ?? SHAPES.round);
const shape = computed(() => props.card.shape ?? 'round');

function tapShape(): void {
  playSfx('pop');
}
</script>

<template>
  <div class="pa-shape">
    <div class="pa-shape__visual">
      <button
        type="button"
        class="pa-shape__svg-wrap"
        :aria-label="`${card.zh}，点一下`"
        @click.stop="tapShape"
      >
        <svg viewBox="0 0 100 100" class="pa-shape__svg" aria-hidden="true">
          <circle v-if="shape === 'round'" cx="50" cy="50" r="42" :fill="shapeInfo.fill" />
          <rect
            v-else-if="shape === 'square'"
            x="10"
            y="10"
            width="80"
            height="80"
            rx="10"
            :fill="shapeInfo.fill"
          />
          <rect
            v-else-if="shape === 'rectangle'"
            x="6"
            y="24"
            width="88"
            height="52"
            rx="10"
            :fill="shapeInfo.fill"
          />
          <polygon v-else-if="shape === 'triangle'" points="50,10 90,88 10,88" :fill="shapeInfo.fill" />
          <polygon v-else-if="shape === 'trapezoid'" points="26,22 74,22 92,84 8,84" :fill="shapeInfo.fill" />
          <polygon v-else-if="shape === 'diamond'" points="50,8 90,50 50,92 10,50" :fill="shapeInfo.fill" />
          <polygon
            v-else-if="shape === 'pentagon'"
            points="50,8 90,36 74,88 26,88 10,36"
            :fill="shapeInfo.fill"
          />
          <ellipse v-else-if="shape === 'oval'" cx="50" cy="50" rx="46" ry="32" :fill="shapeInfo.fill" />
        </svg>
      </button>
    </div>

    <div class="pa-shape__content">
      <CardText :card="card" :highlight="highlight" />
      <div v-if="showExamples" class="pa-shape__examples">
        生活里像：{{ card.examples?.map((e) => e.zh).join(' · ') }}
      </div>
    </div>
  </div>
</template>

<style scoped>
.pa-shape {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-shape__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px var(--pa-gutter);
}

.pa-shape__svg-wrap {
  width: min(52vw, 220px);
  height: min(52vw, 220px);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--pa-r-lg);
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
  filter: drop-shadow(0 10px 24px rgba(120, 90, 60, 0.2));
}
.pa-shape__svg-wrap:active {
  transform: scale(0.92);
}

.pa-shape__svg {
  width: 100%;
  height: 100%;
}

.pa-shape__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.pa-shape__examples {
  font-size: var(--pa-fs-fact);
  font-weight: 600;
  color: var(--pa-ink-muted);
  text-align: center;
  line-height: 1.4;
  max-width: 92%;
}
</style>
