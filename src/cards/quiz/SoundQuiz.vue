<script setup lang="ts">
/**
 * 听声辨物 —— 中央大喇叭（带声波扩散），下方三选一。
 * 喇叭可反复点，每次都重播声音。
 */
import { computed, ref } from 'vue';
import type { Card, QuizSoundPayload, QuizOption } from '@/content/types';
import { playSfx } from '@/audio/engine';

const props = defineProps<{ card: Card; highlight: string | null }>();

const payload = computed(() => props.card.quizPayload as QuizSoundPayload);
const solved = ref(false);
const wrongId = ref<string | null>(null);
const correctId = ref<string | null>(null);
const pulsing = ref(false);

function playCue(): void {
  pulsing.value = true;
  setTimeout(() => (pulsing.value = false), 900);
  // 优先真实录音，缺则合成
  playSfx(payload.value.soundCue);
}

function choose(opt: QuizOption): void {
  if (solved.value) return;
  if (opt.isCorrect) {
    solved.value = true;
    correctId.value = opt.id;
    playSfx('chime');
    setTimeout(() => playSfx('sparkle'), 180);
  } else {
    wrongId.value = opt.id;
    playSfx('pop');
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
  <div class="pa-quiz-sound">
    <div class="pa-quiz-sound__visual">
      <button
        type="button"
        class="pa-quiz-sound__speaker"
        :class="{ 'is-pulsing': pulsing }"
        aria-label="点一下听声音"
        @click.stop="playCue"
      >
        <span class="pa-quiz-sound__icon">🔊</span>
        <span class="pa-quiz-sound__ring" aria-hidden="true" />
      </button>

      <div v-if="payload.soundLabel" class="pa-quiz-sound__label">
        {{ payload.soundLabel }}
      </div>
      <div class="pa-quiz-sound__hint">点上面的大啰叭，再听一次</div>

      <div class="pa-quiz-sound__options">
        <button
          v-for="opt in payload.options"
          :key="opt.id"
          type="button"
          class="pa-quiz-sound__opt"
          :class="{ 'is-correct': correctId === opt.id, 'is-wrong': wrongId === opt.id }"
          :aria-label="opt.zh"
          @click.stop="choose(opt)"
        >
          {{ opt.emoji }}
        </button>
      </div>
    </div>

    <div class="pa-quiz-sound__content">
      <div class="pa-quiz-sound__prompt">{{ card.zh }}</div>
      <button v-if="solved" type="button" class="pa-quiz-sound__replay pa-hit" @click.stop="replay">
        再玩一次
      </button>
    </div>
  </div>
</template>

<style scoped>
.pa-quiz-sound {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-quiz-sound__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 2vh, 18px);
  padding: 10px var(--pa-gutter);
}

/* ---------- 喇叭 ---------- */
.pa-quiz-sound__speaker {
  position: relative;
  width: clamp(84px, 24vw, 120px);
  height: clamp(84px, 24vw, 120px);
  border-radius: 50%;
  background: var(--pa-accent);
  box-shadow: var(--pa-shadow-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
}
.pa-quiz-sound__speaker:active {
  transform: scale(0.9);
}

.pa-quiz-sound__icon {
  font-size: clamp(38px, 11vw, 54px);
  line-height: 1;
}

.pa-quiz-sound__ring {
  position: absolute;
  inset: -6px;
  border-radius: 50%;
  border: 3px solid var(--pa-accent);
  opacity: 0;
  pointer-events: none;
}

.pa-quiz-sound__speaker.is-pulsing .pa-quiz-sound__ring {
  animation: paSoundRing 0.9s var(--pa-ease-out) forwards;
}

@keyframes paSoundRing {
  0% {
    opacity: 0.85;
    transform: scale(1);
  }
  100% {
    opacity: 0;
    transform: scale(1.55);
  }
}

.pa-quiz-sound__label {
  font-size: var(--pa-fs-quiz);
  font-weight: 700;
  color: var(--pa-ink-muted);
  letter-spacing: 1px;
}

.pa-quiz-sound__hint {
  font-size: 13px;
  color: var(--pa-ink-faint);
}

/* ---------- 三选一 ---------- */
.pa-quiz-sound__options {
  display: flex;
  gap: clamp(10px, 3vw, 20px);
  justify-content: center;
  flex-wrap: wrap;
}

.pa-quiz-sound__opt {
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
    background var(--pa-dur-base);
}

.pa-quiz-sound__opt.is-wrong {
  animation: paJelly2 0.34s var(--pa-ease-in-out);
}
.pa-quiz-sound__opt.is-correct {
  background: var(--pa-green-soft);
  box-shadow: 0 0 24px rgba(63, 155, 95, 0.45);
  transform: scale(1.1);
}

@keyframes paJelly2 {
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

.pa-quiz-sound__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.pa-quiz-sound__prompt {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-ink);
  text-align: center;
}

.pa-quiz-sound__replay {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-accent-deep);
  background: var(--pa-accent-soft);
  padding: 10px 24px;
  border-radius: var(--pa-r-pill);
  min-height: 52px;
}
</style>
