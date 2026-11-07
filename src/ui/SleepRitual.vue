<script setup lang="ts">
/**
 * 温柔晚安仪式 —— 达到时长上限时自动进入。
 *
 * 关闭必须长按 3 秒（文案与行为一致，防止孩子自行退出）。
 */
import { ref, onUnmounted } from 'vue';
import { playSfx } from '@/audio/engine';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const HOLD_MS = 3000;
const holding = ref(false);
const progress = ref(0);
let startAt = 0;
let raf = 0;

function tick(): void {
  progress.value = Math.min(1, (Date.now() - startAt) / HOLD_MS);
  if (progress.value >= 1) {
    stop();
    playSfx('chime');
    emit('close');
    return;
  }
  raf = requestAnimationFrame(tick);
}

function start(e: PointerEvent): void {
  e.preventDefault();
  holding.value = true;
  startAt = Date.now();
  progress.value = 0;
  raf = requestAnimationFrame(tick);
}

function stop(): void {
  holding.value = false;
  cancelAnimationFrame(raf);
  if (progress.value < 1) progress.value = 0;
}

onUnmounted(() => cancelAnimationFrame(raf));
void props;
</script>

<template>
  <div v-if="open" class="pa-sleep" role="dialog" aria-modal="true" aria-label="晚安仪式">
    <div class="pa-sleep__moon" aria-hidden="true">🌙</div>
    <div class="pa-sleep__title">小动物要睡觉啦</div>
    <div class="pa-sleep__desc">
      今天小朋友探索得非常棒！<br />
      眼睛也要休息啦，我们盖好小被子，明天再来一起玩吧~
    </div>

    <button
      type="button"
      class="pa-sleep__hold"
      :class="{ 'is-holding': holding }"
      aria-label="家长长按 3 秒结束"
      @pointerdown="start"
      @pointerup="stop"
      @pointerleave="stop"
      @pointercancel="stop"
    >
      <span class="pa-sleep__hold-fill" :style="{ width: `${progress * 100}%` }" />
      <span class="pa-sleep__hold-text">家长长按 3 秒结束</span>
    </button>
  </div>
</template>

<style scoped>
.pa-sleep {
  position: fixed;
  inset: 0;
  background: #14161d;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 32px 24px;
  text-align: center;
  color: #fff;
}

.pa-sleep__moon {
  font-size: 88px;
  line-height: 1;
  animation: paMoonFloat 3.4s var(--pa-ease-in-out) infinite;
}

@keyframes paMoonFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-12px);
  }
}

.pa-sleep__title {
  font-size: 26px;
  font-weight: 800;
  color: #fff2d6;
  margin: 20px 0 12px;
}

.pa-sleep__desc {
  font-size: 15px;
  line-height: 1.7;
  color: #b3b7c4;
  max-width: 340px;
  margin-bottom: 36px;
}

.pa-sleep__hold {
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  font-size: var(--pa-fs-parent);
  font-weight: 700;
  padding: 14px 30px;
  border-radius: var(--pa-r-pill);
  min-height: 56px;
  min-width: 220px;
  touch-action: none;
  transition: transform var(--pa-dur-fast) var(--pa-ease-out);
}
.pa-sleep__hold.is-holding {
  transform: scale(0.97);
}

.pa-sleep__hold-fill {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  background: rgba(245, 144, 74, 0.4);
  transition: width 0.06s linear;
}

.pa-sleep__hold-text {
  position: relative;
  z-index: 1;
}
</style>
