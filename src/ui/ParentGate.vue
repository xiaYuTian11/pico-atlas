<script setup lang="ts">
/**
 * 家长闸门 —— 长按 3 秒解锁。
 *
 * 3 岁孩子做不出"持续按住 3 秒"，家长一学就会。
 * 环进度条给出明确视觉反馈。
 */
import { ref, onUnmounted } from 'vue';
import { playSfx } from '@/audio/engine';
import PaIcon from './PaIcon.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ unlock: []; close: [] }>();
void props;

const HOLD_MS = 3000;
const RING_LEN = 2 * Math.PI * 44;

const holding = ref(false);
const progress = ref(0);
let startAt = 0;
let raf = 0;

function tick(): void {
  const elapsed = Date.now() - startAt;
  progress.value = Math.min(1, elapsed / HOLD_MS);
  if (progress.value >= 1) {
    stop();
    playSfx('chime');
    emit('unlock');
    return;
  }
  raf = requestAnimationFrame(tick);
}

function start(e: PointerEvent): void {
  e.preventDefault();
  holding.value = true;
  startAt = Date.now();
  progress.value = 0;
  playSfx('soft');
  raf = requestAnimationFrame(tick);
}

function stop(): void {
  holding.value = false;
  cancelAnimationFrame(raf);
  if (progress.value < 1) progress.value = 0;
}

onUnmounted(() => cancelAnimationFrame(raf));
</script>

<template>
  <div v-if="open" class="pa-gate" role="dialog" aria-modal="true" aria-label="家长确认">
    <div class="pa-gate__box">
      <div class="pa-gate__title">家长确认</div>
      <div class="pa-gate__desc">请<b>长按下方小锁 3 秒</b>，进入家长设置</div>

      <button
        type="button"
        class="pa-gate__hold"
        :class="{ 'is-holding': holding }"
        aria-label="长按 3 秒解锁"
        @pointerdown="start"
        @pointerup="stop"
        @pointerleave="stop"
        @pointercancel="stop"
      >
        <PaIcon name="lock" />
        <svg class="pa-gate__ring" viewBox="0 0 96 96" aria-hidden="true">
          <circle cx="48" cy="48" r="44" class="pa-gate__ring-bg" />
          <circle
            cx="48"
            cy="48"
            r="44"
            class="pa-gate__ring-fill"
            :style="{ strokeDashoffset: String(RING_LEN * (1 - progress)) }"
          />
        </svg>
      </button>

      <button type="button" class="pa-gate__cancel pa-hit" @click="emit('close')">取消返回</button>
    </div>
  </div>
</template>

<style scoped>
.pa-gate {
  position: fixed;
  inset: 0;
  background: rgba(30, 26, 22, 0.62);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.pa-gate__box {
  background: var(--pa-card);
  width: 100%;
  max-width: 340px;
  border-radius: var(--pa-r-xl);
  padding: 28px 24px 20px;
  text-align: center;
  box-shadow: var(--pa-shadow-lg);
}

.pa-gate__title {
  font-size: var(--pa-fs-parent-title);
  font-weight: 900;
  color: var(--pa-ink);
  margin-bottom: 8px;
}

.pa-gate__desc {
  font-size: var(--pa-fs-parent);
  color: var(--pa-ink-muted);
  line-height: 1.5;
  margin-bottom: 24px;
}

.pa-gate__hold {
  position: relative;
  width: 96px;
  height: 96px;
  border-radius: 50%;
  border: 4px solid var(--pa-line);
  background: var(--pa-bg-elevated);
  color: var(--pa-ink-muted);
  margin: 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  touch-action: none;
  transition: transform var(--pa-dur-fast) var(--pa-ease-out);
}
.pa-gate__hold.is-holding {
  transform: scale(0.96);
  color: var(--pa-accent);
}

.pa-gate__ring {
  position: absolute;
  inset: -4px;
  width: 96px;
  height: 96px;
  transform: rotate(-90deg);
  pointer-events: none;
}

.pa-gate__ring-bg {
  fill: none;
  stroke: transparent;
  stroke-width: 5;
}

.pa-gate__ring-fill {
  fill: none;
  stroke: var(--pa-accent);
  stroke-width: 5;
  stroke-dasharray: 276.46;
  stroke-dashoffset: 276.46;
  stroke-linecap: round;
}

.pa-gate__cancel {
  margin-top: 16px;
  font-size: var(--pa-fs-parent);
  font-weight: 700;
  color: var(--pa-ink-muted);
  padding: 12px 20px;
  min-height: 48px;
}
</style>
