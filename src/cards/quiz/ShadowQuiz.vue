<script setup lang="ts">
/**
 * 影子配对 —— 上方剪影，下方三选一。
 *
 * 答对：金色粒子 + 贴合成位 + 风铃音 + 允许重玩
 * 答错：果冻左右摇摆 + 柔和水泡音，绝不红叉、绝不打叉
 *
 * 3 岁喜欢重复，所以答对后**不自动翻页**，而是给"再玩一次"的机会。
 */
import { computed, ref } from 'vue';
import type { Card, QuizShadowPayload, QuizOption } from '@/content/types';
import { playSfx } from '@/audio/engine';
import { shadowImage } from '@/content/media';

const props = defineProps<{ card: Card; highlight: string | null }>();

const payload = computed(() => props.card.quizPayload as QuizShadowPayload);

const solved = ref(false);
const wrongId = ref<string | null>(null);
const correctId = ref<string | null>(null);
const shadowUrl = computed(() => shadowImage(props.card.id));

function choose(opt: QuizOption): void {
  if (solved.value) return;

  if (opt.isCorrect) {
    solved.value = true;
    correctId.value = opt.id;
    playSfx(opt.sound ?? 'chime');
    setTimeout(() => playSfx('sparkle'), 180);
  } else {
    wrongId.value = opt.id;
    playSfx(opt.sound ?? 'pop');
    setTimeout(() => (wrongId.value = null), 340);
  }
}

function replay(): void {
  solved.value = false;
  correctId.value = null;
  wrongId.value = null;
  playSfx('soft');
}
</script>

<template>
  <div class="pa-quiz-shadow">
    <div class="pa-quiz-shadow__visual">
      <div class="pa-quiz-shadow__target" :class="{ 'is-solved': solved }">
        <img
          v-if="shadowUrl"
          :src="shadowUrl"
          :alt="`${card.zh}的剪影`"
          class="pa-quiz-shadow__img"
        />
        <span v-else class="pa-quiz-shadow__glyph">{{ payload.targetEmoji }}</span>
      </div>

      <div class="pa-quiz-shadow__options">
        <button
          v-for="opt in payload.options"
          :key="opt.id"
          type="button"
          class="pa-quiz-shadow__opt"
          :class="{
            'is-correct': correctId === opt.id,
            'is-wrong': wrongId === opt.id,
          }"
          :aria-label="opt.zh"
          @click.stop="choose(opt)"
        >
          {{ opt.emoji }}
        </button>
      </div>
    </div>

    <div class="pa-quiz-shadow__content">
      <div class="pa-quiz-shadow__prompt">{{ card.zh }}</div>
      <button v-if="solved" type="button" class="pa-quiz-shadow__replay pa-hit" @click.stop="replay">
        再玩一次
      </button>
    </div>
  </div>
</template>

<style scoped>
.pa-quiz-shadow {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-quiz-shadow__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(12px, 3vh, 24px);
  padding: 10px var(--pa-gutter);
}

/* ---------- 剪影框 ---------- */
.pa-quiz-shadow__target {
  width: min(58vw, 240px);
  height: min(58vw, 240px);
  border-radius: var(--pa-r-lg);
  background: rgba(46, 42, 38, 0.08);
  border: 3px dashed var(--pa-ink-faint);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition:
    transform var(--pa-dur-slow) var(--pa-ease-spring),
    border-color var(--pa-dur-base),
    background var(--pa-dur-base);
}

.pa-quiz-shadow__target.is-solved {
  border-color: var(--pa-green);
  border-style: solid;
  background: var(--pa-green-soft);
  transform: scale(1.06);
}

.pa-quiz-shadow__img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: none;
}

/* 无剪影图时：用 emoji 压黑模拟 */
.pa-quiz-shadow__glyph {
  font-size: clamp(56px, 17vw, 96px);
  line-height: 1;
  filter: brightness(0);
  opacity: 0.24;
}

.pa-quiz-shadow__target.is-solved .pa-quiz-shadow__glyph {
  filter: none;
  opacity: 1;
}
.pa-quiz-shadow__target.is-solved .pa-quiz-shadow__img {
  filter: none;
}

/* ---------- 三选一 ---------- */
.pa-quiz-shadow__options {
  display: flex;
  gap: clamp(10px, 3vw, 20px);
  justify-content: center;
  flex-wrap: wrap;
}

.pa-quiz-shadow__opt {
  width: clamp(64px, 20vw, 96px);
  height: clamp(64px, 20vw, 96px);
  border-radius: var(--pa-r-md);
  background: #fff;
  box-shadow: var(--pa-shadow-md);
  font-size: clamp(30px, 9vw, 48px);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-spring),
    background var(--pa-dur-base),
    box-shadow var(--pa-dur-base);
}

.pa-quiz-shadow__opt.is-wrong {
  animation: paJelly 0.34s var(--pa-ease-in-out);
}

.pa-quiz-shadow__opt.is-correct {
  background: var(--pa-green-soft);
  box-shadow: 0 0 24px rgba(63, 155, 95, 0.45);
  transform: scale(1.1);
}

@keyframes paJelly {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-7px) rotate(-2deg);
  }
  75% {
    transform: translateX(7px) rotate(2deg);
  }
}

.pa-quiz-shadow__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pa-quiz-shadow__prompt {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-ink);
  text-align: center;
  line-height: 1.35;
}

.pa-quiz-shadow__replay {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-accent-deep);
  background: var(--pa-accent-soft);
  padding: 10px 24px;
  border-radius: var(--pa-r-pill);
  min-height: 52px;
}
</style>
