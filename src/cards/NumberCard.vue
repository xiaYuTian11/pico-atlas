<script setup lang="ts">
/**
 * 数数卡 —— 阿拉伯数字当主角，十格阵（ten-frame）当数量模型。
 *
 * 为什么是十格阵：
 *   5 和 10 是人类直觉的锚点。排成 2 行 × 5 格，
 *   孩子一眼就能看出"6 比 5 多一个"、"9 差一个就满十"。
 *   散乱的 emoji 阵列做不到这一点。
 *
 * 互动：点苹果打勾并标序号，点满给"数完啦"。
 */
import { computed, ref, watch } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';
import { playSfx } from '@/audio/engine';
import CardText from './parts/CardText.vue';

const props = defineProps<{ card: Card; highlight: string | null }>();

const band = computed(() => state.ageBand ?? 'L1');
const count = computed(() => props.card.count ?? 1);
/** 十格阵固定 10 格，第二行永远存在，'满十' 是可感知的 */
const cells = computed(() => Array.from({ length: 10 }, (_, i) => i));
const showPinyin = computed(() => band.value !== 'L1' && !!props.card.pinyin);

const counted = ref<number[]>([]);
const justFinished = ref(false);

watch(
  () => props.card.id,
  () => {
    counted.value = [];
    justFinished.value = false;
  },
);

function tapItem(i: number): void {
  if (i >= count.value) return;
  if (counted.value.includes(i)) {
    playSfx('soft');
    return;
  }
  counted.value = [...counted.value, i];
  playSfx('pop');
  if (counted.value.length === count.value) {
    justFinished.value = true;
    playSfx('chime');
    setTimeout(() => (justFinished.value = false), 1200);
  }
}
</script>

<template>
  <div class="pa-number">
    <div class="pa-number__visual">
      <div class="pa-number__head">
        <span class="pa-number__digit">{{ count }}</span>
        <span class="pa-number__zh">{{ card.zh }}</span>
        <span v-if="showPinyin" class="pa-number__py">{{ card.pinyin }}</span>
      </div>

      <div class="pa-number__frame" :class="{ 'is-done': justFinished }">
        <button
          v-for="i in cells"
          :key="i"
          type="button"
          class="pa-number__cell"
          :class="{
            'is-filled': i < count,
            'is-counted': counted.includes(i),
          }"
          :disabled="i >= count"
          :aria-label="i < count ? `第 ${i + 1} 个 ${card.zh}` : '空格子'"
          @click.stop="tapItem(i)"
        >
          <template v-if="i < count">
            <span class="pa-number__emoji">{{ card.emoji }}</span>
            <span v-if="counted.includes(i)" class="pa-number__ord">{{ counted.indexOf(i) + 1 }}</span>
          </template>
          <span v-else class="pa-number__empty" aria-hidden="true" />
        </button>
      </div>
    </div>

    <div class="pa-number__content">
      <CardText :card="card" :highlight="highlight" hide-zh />
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 2.6vh, 22px);
  padding: 8px var(--pa-gutter);
}

.pa-number__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

/* 阿拉伯数字是主角 */
.pa-number__digit {
  font-size: clamp(76px, 24vw, 132px);
  font-weight: 900;
  line-height: 0.9;
  color: var(--pa-accent);
  letter-spacing: -2px;
  text-shadow: 0 8px 26px rgba(245, 144, 74, 0.28);
}

.pa-number__zh {
  font-size: clamp(20px, 5.6vw, 28px);
  font-weight: 900;
  color: var(--pa-ink-muted);
  letter-spacing: 4px;
  line-height: 1.1;
}

.pa-number__py {
  font-size: clamp(13px, 3.6vw, 16px);
  font-weight: 600;
  color: var(--pa-ink-faint);
}

/* ---------- 十格阵 ---------- */
.pa-number__frame {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(4px, 1.4vw, 8px);
  width: min(86vw, 340px);
  padding: clamp(6px, 2vw, 10px);
  border-radius: var(--pa-r-lg);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--pa-shadow-sm);
  transition: transform var(--pa-dur-base) var(--pa-ease-spring);
}
.pa-number__frame.is-done {
  animation: paCountDone 0.7s var(--pa-ease-spring);
}

@keyframes paCountDone {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.08);
  }
}

.pa-number__cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: clamp(8px, 2vw, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-spring),
    background var(--pa-dur-base);
}
.pa-number__cell.is-filled {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 2px rgba(245, 144, 74, 0.28);
}
.pa-number__cell.is-filled:active {
  transform: scale(0.9);
}
.pa-number__cell.is-counted {
  box-shadow: inset 0 0 0 3px var(--pa-green, #4fa88b);
}

.pa-number__emoji {
  font-size: clamp(22px, 6.4vw, 34px);
  line-height: 1;
}

.pa-number__empty {
  width: 22%;
  height: 22%;
  border-radius: 50%;
  background: rgba(46, 42, 38, 0.08);
}

.pa-number__ord {
  position: absolute;
  right: -2px;
  top: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--pa-green, #4fa88b);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pa-number__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
</style>
