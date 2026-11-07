<script setup lang="ts">
/**
 * 生活因果 —— 用工具在目标上反复"擦/刷"，脏的变干净。
 *
 * 不做"一次成功"，而是让孩子来回擦几遍，
 * 看着状态一点点变化，最后亮起来。
 */
import { computed, ref } from 'vue';
import type { Card, CauseHabitPayload } from '@/content/types';
import { playSfx } from '@/audio/engine';

const props = defineProps<{ card: Card; highlight: string | null }>();

const payload = computed(() => props.card.quizPayload as CauseHabitPayload);
const passes = ref(0);
const required = computed(() => payload.value.requiredPasses ?? 1);
const progress = computed(() => Math.min(1, passes.value / required.value));
const done = computed(() => passes.value >= required.value);
const dirty = computed(() => !done.value);

/** 一次真正"抹"掉一格：需要拖过一段距离，而不是点一下就完成 */
let dragDist = 0;
let lastX = 0;
let lastY = 0;
const STROKE_UNIT = 64;

function down(e: PointerEvent): void {
  if (done.value) return;
  lastX = e.clientX;
  lastY = e.clientY;
  dragDist = 0;
  playSfx('soft');
}

function scrub(e: PointerEvent): void {
  if (done.value) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  dragDist += Math.hypot(dx, dy);
  if (dragDist < STROKE_UNIT) return;
  dragDist = 0;
  passes.value++;
  playSfx(payload.value.toolEmoji === '💧' ? 'water' : 'soft');
  if (passes.value >= required.value) {
    setTimeout(() => playSfx(payload.value.afterState.sound ?? 'chime'), 60);
    setTimeout(() => playSfx('sparkle'), 260);
  }
}

function reset(): void {
  passes.value = 0;
  playSfx('soft');
}
</script>

<template>
  <div class="pa-habit">
    <div class="pa-habit__visual">
      <div class="pa-habit__target" :class="{ 'is-clean': done }">
        <span class="pa-habit__face">{{ done ? payload.afterState.emoji : payload.beforeState.emoji }}</span>

        <!-- 脏污层：透明度随进度下降 -->
        <div
          v-if="dirty"
          class="pa-habit__dirt"
          :style="{ opacity: String(0.85 * (1 - progress)) }"
          aria-hidden="true"
        />

        <!-- 工具光标提示 -->
        <span class="pa-habit__tool" aria-hidden="true">{{ payload.toolEmoji }}</span>

        <!-- 触摸层 -->
        <div
          class="pa-habit__touch"
          @pointerdown.stop.prevent="down"
          @pointermove.stop.prevent="scrub"
        />
      </div>

      <div class="pa-habit__progress">
        <div class="pa-habit__progress-fill" :style="{ width: `${progress * 100}%` }" />
      </div>
    </div>

    <div class="pa-habit__content">
      <div class="pa-habit__prompt">
        {{ done ? payload.afterState.text : payload.beforeState.text }}
      </div>
      <div v-if="!done" class="pa-habit__hint">用{{ payload.toolLabel }}擦一擦</div>
      <button v-if="done" type="button" class="pa-habit__reset pa-hit" @click.stop="reset">
        再玩一次
      </button>
    </div>
  </div>
</template>

<style scoped>
.pa-habit {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-habit__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 18px;
  padding: 10px var(--pa-gutter);
}

.pa-habit__target {
  position: relative;
  width: min(58vw, 240px);
  height: min(58vw, 240px);
  border-radius: 50%;
  background: var(--pa-paper);
  box-shadow: var(--pa-shadow-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition:
    transform var(--pa-dur-slow) var(--pa-ease-spring),
    box-shadow var(--pa-dur-slow);
  touch-action: none;
}

.pa-habit__target.is-clean {
  transform: scale(1.04);
  box-shadow:
    0 0 0 6px var(--pa-green-soft),
    0 0 32px rgba(63, 155, 95, 0.35),
    var(--pa-shadow-lg);
}

.pa-habit__face {
  font-size: clamp(64px, 20vw, 120px);
  line-height: 1;
  filter: drop-shadow(0 8px 18px rgba(120, 90, 60, 0.18));
  transition: transform var(--pa-dur-slow) var(--pa-ease-spring);
}

.pa-habit__dirt {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 30% 35%, rgba(120, 90, 60, 0.55) 0 12px, transparent 13px),
    radial-gradient(circle at 68% 55%, rgba(120, 90, 60, 0.5) 0 16px, transparent 17px),
    radial-gradient(circle at 45% 72%, rgba(120, 90, 60, 0.45) 0 10px, transparent 11px),
    radial-gradient(circle at 60% 25%, rgba(120, 90, 60, 0.4) 0 8px, transparent 9px);
  transition: opacity 0.25s linear;
  pointer-events: none;
}

.pa-habit__tool {
  position: absolute;
  right: 12%;
  bottom: 12%;
  font-size: 34px;
  line-height: 1;
  animation: paToolBob 1.6s var(--pa-ease-in-out) infinite;
  pointer-events: none;
  opacity: 0.85;
}

@keyframes paToolBob {
  0%,
  100% {
    transform: translateY(0) rotate(-8deg);
  }
  50% {
    transform: translateY(-8px) rotate(8deg);
  }
}

.pa-habit__touch {
  position: absolute;
  inset: 0;
  cursor: grab;
  touch-action: none;
}

.pa-habit__progress {
  width: min(58vw, 240px);
  height: 10px;
  border-radius: 999px;
  background: var(--pa-line);
  overflow: hidden;
}

.pa-habit__progress-fill {
  height: 100%;
  background: var(--pa-green);
  border-radius: 999px;
  transition: width 0.2s linear;
}

.pa-habit__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.pa-habit__prompt {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-ink);
  text-align: center;
}

.pa-habit__hint {
  font-size: var(--pa-fs-fact);
  font-weight: 600;
  color: var(--pa-ink-muted);
}

.pa-habit__reset {
  font-size: var(--pa-fs-fact);
  font-weight: 800;
  color: var(--pa-accent-deep);
  background: var(--pa-accent-soft);
  padding: 10px 22px;
  border-radius: var(--pa-r-pill);
  min-height: 52px;
}
</style>
