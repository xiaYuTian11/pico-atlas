<script setup lang="ts">
/**
 * 视觉捉迷藏 —— 图里只露出一部分，猜整体是什么。
 *
 * 关键：**线索必须看得见**。
 * 旧版用一块不透明的色块盖住整张图，孩子只能读到一行字，等于没线索。
 * 现在直接用卡片插画当谜面（插画本身就是"躲在草后/树后"的构图）。
 */
import { computed, ref } from 'vue';
import type { Card, PartToWholePayload, QuizOption } from '@/content/types';
import { playSfx } from '@/audio/engine';
import CardImage from '../parts/CardImage.vue';

const props = defineProps<{ card: Card; highlight: string | null }>();

const payload = computed(() => props.card.quizPayload as PartToWholePayload);
const solved = ref(false);
const wrongId = ref<string | null>(null);

const options = computed<QuizOption[]>(() => {
  if (payload.value.options?.length) return payload.value.options;
  return [
    {
      id: payload.value.wholeItem.id,
      zh: payload.value.wholeItem.zh,
      emoji: payload.value.wholeItem.emoji,
      isCorrect: true,
      sound: payload.value.wholeItem.sound,
    },
  ];
});

function choose(opt: QuizOption): void {
  if (solved.value) return;
  if (!opt.isCorrect) {
    wrongId.value = opt.id;
    playSfx('pop');
    setTimeout(() => (wrongId.value = null), 340);
    return;
  }
  solved.value = true;
  playSfx(opt.sound ?? 'chime');
  setTimeout(() => playSfx('sparkle'), 180);
}

function reset(): void {
  solved.value = false;
  wrongId.value = null;
  playSfx('soft');
}
</script>

<template>
  <div class="pa-peek">
    <div class="pa-peek__visual">
      <div class="pa-peek__stage" :class="{ 'is-solved': solved }">
        <CardImage :card-id="card.id" :emoji="payload.wholeItem.emoji" :alt="card.zh" />
        <div v-if="!solved" class="pa-peek__clue">{{ payload.partialClue }}</div>
        <div v-else class="pa-peek__answer">是{{ payload.wholeItem.zh }}呀！</div>
      </div>

      <div v-if="options.length > 1 && !solved" class="pa-peek__options">
        <button
          v-for="opt in options"
          :key="opt.id"
          type="button"
          class="pa-peek__opt"
          :class="{ 'is-wrong': wrongId === opt.id }"
          :aria-label="opt.zh"
          @click.stop="choose(opt)"
        >
          <span class="pa-peek__opt-emoji">{{ opt.emoji }}</span>
          <span class="pa-peek__opt-zh">{{ opt.zh }}</span>
        </button>
      </div>
    </div>

    <div class="pa-peek__content">
      <div class="pa-peek__prompt">{{ card.zh }}</div>
      <button v-if="solved" type="button" class="pa-peek__reset pa-hit" @click.stop="reset">
        再猜一次
      </button>
    </div>
  </div>
</template>

<style scoped>
.pa-peek {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-peek__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(10px, 2.4vh, 20px);
  padding: 10px var(--pa-gutter) 6px;
}

/* ---------- 谜面图 ---------- */
.pa-peek__stage {
  position: relative;
  width: 100%;
  max-width: min(84vw, 360px);
  flex: 1 1 auto;
  min-height: 0;
  border-radius: var(--pa-r-lg);
  overflow: hidden;
  background: var(--pa-paper);
  box-shadow: var(--pa-shadow-md);
  transition: transform var(--pa-dur-slow) var(--pa-ease-spring);
}
.pa-peek__stage.is-solved {
  transform: scale(1.03);
  box-shadow:
    var(--pa-shadow-md),
    0 0 0 4px var(--pa-green-soft);
}

/* 提示：贴着图底部的一条小胶囊 */
.pa-peek__clue {
  position: absolute;
  left: 50%;
  bottom: 10px;
  transform: translateX(-50%);
  font-size: var(--pa-fs-fact);
  font-weight: 800;
  color: #fff;
  background: rgba(46, 42, 38, 0.55);
  padding: 6px 14px;
  border-radius: var(--pa-r-pill);
  backdrop-filter: blur(4px);
  white-space: nowrap;
  max-width: 92%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pa-peek__answer {
  position: absolute;
  left: 50%;
  bottom: 12px;
  transform: translateX(-50%);
  font-size: var(--pa-fs-quiz);
  font-weight: 900;
  color: #fff;
  background: rgba(63, 155, 95, 0.92);
  padding: 8px 20px;
  border-radius: var(--pa-r-pill);
  box-shadow: 0 6px 18px rgba(63, 155, 95, 0.4);
  white-space: nowrap;
}

/* ---------- 三选一 ---------- */
.pa-peek__options {
  display: flex;
  gap: clamp(8px, 2.4vw, 16px);
  justify-content: center;
  flex-wrap: wrap;
  flex: 0 0 auto;
}

.pa-peek__opt {
  width: clamp(76px, 22vw, 104px);
  min-height: clamp(76px, 22vw, 104px);
  border-radius: var(--pa-r-md);
  background: #fff;
  box-shadow: var(--pa-shadow-md);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 8px 4px;
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
}
.pa-peek__opt:active {
  transform: scale(0.94);
}
.pa-peek__opt.is-wrong {
  animation: paJelly4 0.34s var(--pa-ease-in-out);
}
.pa-peek__opt-emoji {
  font-size: clamp(34px, 10vw, 50px);
  line-height: 1;
}
.pa-peek__opt-zh {
  font-size: 12px;
  font-weight: 800;
  color: var(--pa-ink-muted);
}

@keyframes paJelly4 {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-7px);
  }
  75% {
    transform: translateX(7px);
  }
}

.pa-peek__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pa-peek__prompt {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-ink);
  text-align: center;
}

.pa-peek__reset {
  font-size: var(--pa-fs-fact);
  font-weight: 800;
  color: var(--pa-accent-deep);
  background: var(--pa-accent-soft);
  padding: 10px 22px;
  border-radius: var(--pa-r-pill);
  min-height: 52px;
}
</style>
