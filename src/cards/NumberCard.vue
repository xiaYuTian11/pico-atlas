<script setup lang="ts">
/**
 * 数数卡 —— 阿拉伯数字当主角，中文数字做辅助。
 *
 * 3–5 岁先认"形"再认"数"：屏幕中央必须是 3 这个符号，
 * 而不是"三"。—— 所以数字在图区顶部，中文字退到第二行。
 *
 * 互动：点小物体会打勾并报数序，点满后给一个"数完啦"的反馈。
 */
import { computed, ref, watch } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';
import { playSfx } from '@/audio/engine';
import CardText from './parts/CardText.vue';

const props = defineProps<{ card: Card; highlight: string | null }>();

const band = computed(() => state.ageBand ?? 'L1');
const count = computed(() => props.card.count ?? 1);
const items = computed(() => Array.from({ length: count.value }, (_, i) => i));
const showPinyin = computed(() => band.value !== 'L1' && !!props.card.pinyin);

/** 已数过的序号（点一下打一个勾） */
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

      <div class="pa-number__items" :class="{ 'is-done': justFinished }">
        <button
          v-for="i in items"
          :key="i"
          type="button"
          class="pa-number__item"
          :class="{ 'is-counted': counted.includes(i) }"
          :aria-label="`第 ${i + 1} 个 ${card.zh}`"
          @click.stop="tapItem(i)"
        >
          <span class="pa-number__emoji">{{ card.emoji }}</span>
          <span v-if="counted.includes(i)" class="pa-number__ord">{{ counted.indexOf(i) + 1 }}</span>
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
  gap: clamp(10px, 3vh, 26px);
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
  font-size: clamp(96px, 30vw, 168px);
  font-weight: 900;
  line-height: 0.9;
  color: var(--pa-accent);
  letter-spacing: -2px;
  text-shadow: 0 8px 26px rgba(245, 144, 74, 0.28);
}

.pa-number__zh {
  font-size: clamp(22px, 6vw, 30px);
  font-weight: 900;
  color: var(--pa-ink-muted);
  letter-spacing: 4px;
  line-height: 1.1;
}

.pa-number__py {
  font-size: clamp(14px, 4vw, 18px);
  font-weight: 600;
  color: var(--pa-ink-faint);
}

.pa-number__items {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 2.4vw, 18px);
  transition: transform var(--pa-dur-base) var(--pa-ease-spring);
}
.pa-number__items.is-done {
  animation: paCountDone 0.7s var(--pa-ease-spring);
}

@keyframes paCountDone {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.12);
  }
}

.pa-number__item {
  position: relative;
  font-size: clamp(40px, 13vw, 82px);
  line-height: 1;
  filter: drop-shadow(0 6px 14px rgba(120, 90, 60, 0.18));
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-spring),
    opacity var(--pa-dur-base);
}
.pa-number__item:active {
  transform: scale(0.86);
}
.pa-number__item.is-counted {
  opacity: 0.95;
}
.pa-number__item.is-counted::after {
  content: '';
  position: absolute;
  inset: -6px;
  border: 3px solid var(--pa-green, #4fa88b);
  border-radius: 24px;
  opacity: 0.55;
}

.pa-number__emoji {
  display: block;
}

.pa-number__ord {
  position: absolute;
  right: -6px;
  top: -6px;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: 999px;
  background: var(--pa-green, #4fa88b);
  color: #fff;
  font-size: 13px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18);
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
