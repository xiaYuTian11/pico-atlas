<script setup lang="ts">
/**
 * 视觉捉迷藏 —— 局部线索露出，猜整体是什么。
 *
 * 遮挡物（草/树/栅栏/帘）用 CSS 渐变模拟，
 * 点击遮挡物会掀开一条缝，逐步露出答案。
 */
import { computed, ref } from 'vue';
import type { Card, PartToWholePayload, QuizOption } from '@/content/types';
import { playSfx } from '@/audio/engine';

const props = defineProps<{ card: Card; highlight: string | null }>();

const payload = computed(() => props.card.quizPayload as PartToWholePayload);
const revealed = ref(false);
const wrongId = ref<string | null>(null);

/** 干扰项：未提供则自动从题库外造两个通用项 */
const options = computed<QuizOption[]>(() => {
  if (payload.value.options?.length) return payload.value.options;
  const correct: QuizOption = {
    id: payload.value.wholeItem.id,
    zh: payload.value.wholeItem.zh,
    emoji: payload.value.wholeItem.emoji,
    isCorrect: true,
    sound: payload.value.wholeItem.sound,
  };
  return [correct];
});

const coverStyle = computed(() => {
  switch (payload.value.coverType) {
    case 'grass':
      return 'linear-gradient(180deg, #c8e6a0 0%, #8fc45f 55%, #6ba344 100%)';
    case 'tree':
      return 'linear-gradient(180deg, #a98b6a 0%, #7d6248 60%, #5d4834 100%)';
    case 'fence':
      return 'repeating-linear-gradient(90deg, #d8b98c 0 14px, #c6a575 14px 28px)';
    case 'curtain':
      return 'linear-gradient(180deg, #e8d5ef 0%, #cba9dd 100%)';
    default:
      return 'linear-gradient(180deg, #c8e6a0 0%, #8fc45f 100%)';
  }
});

function tapCover(): void {
  playSfx('soft');
  revealed.value = true;
  setTimeout(() => playSfx('chime'), 220);
}

function choose(opt: QuizOption): void {
  if (!opt.isCorrect) {
    wrongId.value = opt.id;
    playSfx('pop');
    setTimeout(() => (wrongId.value = null), 340);
    return;
  }
  revealed.value = true;
  playSfx('chime');
  setTimeout(() => playSfx('sparkle'), 200);
}

function reset(): void {
  revealed.value = false;
  wrongId.value = null;
  playSfx('soft');
}
</script>

<template>
  <div class="pa-peek">
    <div class="pa-peek__visual">
      <div class="pa-peek__stage" :class="{ 'is-revealed': revealed }">
        <!-- 底下的答案 -->
        <div class="pa-peek__answer">
          <span class="pa-peek__answer-emoji">{{ payload.wholeItem.emoji }}</span>
        </div>

        <!-- 遮挡物 -->
        <button
          v-if="!revealed"
          type="button"
          class="pa-peek__cover"
          :style="{ background: coverStyle }"
          aria-label="点一下掀开"
          @click.stop="tapCover"
        >
          <span class="pa-peek__clue">{{ payload.partialClue }}</span>
        </button>
      </div>

      <div v-if="options.length > 1" class="pa-peek__options">
        <button
          v-for="opt in options"
          :key="opt.id"
          type="button"
          class="pa-peek__opt"
          :class="{ 'is-wrong': wrongId === opt.id }"
          :aria-label="opt.zh"
          @click.stop="choose(opt)"
        >
          {{ opt.emoji }}
        </button>
      </div>
    </div>

    <div class="pa-peek__content">
      <div class="pa-peek__prompt">
        {{ revealed ? `是${payload.wholeItem.zh}呀！` : card.zh }}
      </div>
      <button v-if="revealed" type="button" class="pa-peek__reset pa-hit" @click.stop="reset">
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
  gap: 16px;
  padding: 10px var(--pa-gutter);
}

.pa-peek__stage {
  position: relative;
  width: min(62vw, 280px);
  height: min(52vw, 240px);
  border-radius: var(--pa-r-lg);
  overflow: hidden;
  box-shadow: var(--pa-shadow-md);
  background: var(--pa-paper);
}

.pa-peek__answer {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--pa-dur-slow) var(--pa-ease-spring);
}
.pa-peek__stage.is-revealed .pa-peek__answer {
  transform: scale(1.12);
}

.pa-peek__answer-emoji {
  font-size: clamp(64px, 20vw, 110px);
  line-height: 1;
  filter: drop-shadow(0 8px 18px rgba(120, 90, 60, 0.2));
}

.pa-peek__cover {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 12px;
  transition: transform var(--pa-dur-slow) var(--pa-ease-out);
}

.pa-peek__cover:active {
  transform: scale(0.97);
}

.pa-peek__clue {
  font-size: var(--pa-fs-fact);
  font-weight: 800;
  color: #fff;
  background: rgba(46, 42, 38, 0.45);
  padding: 6px 14px;
  border-radius: var(--pa-r-pill);
  backdrop-filter: blur(4px);
  text-align: center;
}

.pa-peek__options {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.pa-peek__opt {
  width: clamp(60px, 18vw, 88px);
  height: clamp(60px, 18vw, 88px);
  border-radius: var(--pa-r-md);
  background: #fff;
  box-shadow: var(--pa-shadow-md);
  font-size: clamp(28px, 8.5vw, 44px);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
}

.pa-peek__opt.is-wrong {
  animation: paJelly4 0.34s var(--pa-ease-in-out);
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
