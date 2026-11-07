<script setup lang="ts">
/**
 * 手指画板 —— gestureLock: true，全屏滑动翻页禁用。
 *
 * 支持多色、粗细两档，清空按钮。
 * 触摸由画布独占，翻页只能走底栏 ‹ ›。
 */
import { onMounted, ref, watch } from 'vue';
import type { Card } from '@/content/types';
import { playSfx } from '@/audio/engine';

const props = defineProps<{ card: Card; highlight: string | null }>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const colors = ['#F5904A', '#E0433F', '#4096FF', '#3F9B5F', '#A87FD4', '#2E2A26'];
const activeColor = ref(colors[0]);
const sizes = [8, 18];
const activeSize = ref(sizes[0]);
const hasInk = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let drawing = false;

function setup(): void {
  const cvs = canvasRef.value;
  if (!cvs) return;
  const rect = cvs.getBoundingClientRect();
  if (rect.width === 0) return;
  const dpr = window.devicePixelRatio || 1;
  cvs.width = rect.width * dpr;
  cvs.height = rect.height * dpr;
  const c = cvs.getContext('2d');
  if (!c) return;
  c.scale(dpr, dpr);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  ctx = c;
}

function pos(e: PointerEvent): { x: number; y: number } {
  const cvs = canvasRef.value!;
  const rect = cvs.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onDown(e: PointerEvent): void {
  if (!ctx) return;
  drawing = true;
  hasInk.value = true;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  const p = pos(e);
  ctx.strokeStyle = activeColor.value;
  ctx.lineWidth = activeSize.value;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + 0.1, p.y + 0.1);
  ctx.stroke();
  playSfx('soft');
}

function onMove(e: PointerEvent): void {
  if (!drawing || !ctx) return;
  const p = pos(e);
  ctx.lineTo(p.x, p.y);
  ctx.stroke();
}

function onUp(): void {
  drawing = false;
  if (ctx) ctx.beginPath();
}

function clear(): void {
  const cvs = canvasRef.value;
  if (!cvs || !ctx) return;
  const rect = cvs.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);
  hasInk.value = false;
  playSfx('soft');
}

function pickColor(c: string): void {
  activeColor.value = c;
  playSfx('soft');
}

function pickSize(s: number): void {
  activeSize.value = s;
  playSfx('soft');
}

onMounted(() => {
  setup();
  window.addEventListener('resize', setup);
});

watch(
  () => props.card.id,
  () => {
    hasInk.value = false;
    setTimeout(setup, 60);
  },
);
</script>

<template>
  <div class="pa-draw">
    <div class="pa-draw__visual">
      <canvas
        ref="canvasRef"
        class="pa-draw__canvas"
        @pointerdown.stop="onDown"
        @pointermove.stop="onMove"
        @pointerup.stop="onUp"
        @pointercancel.stop="onUp"
      />
      <div v-if="!hasInk" class="pa-draw__hint" aria-hidden="true">用手指画一画</div>
    </div>

    <div class="pa-draw__toolbar">
      <div class="pa-draw__colors">
        <button
          v-for="c in colors"
          :key="c"
          type="button"
          class="pa-draw__color pa-hit"
          :class="{ 'is-active': activeColor === c }"
          :style="{ background: c }"
          :aria-label="`选择颜色 ${c}`"
          @click.stop="pickColor(c)"
        />
      </div>

      <div class="pa-draw__sizes">
        <button
          v-for="s in sizes"
          :key="s"
          type="button"
          class="pa-draw__size pa-hit"
          :class="{ 'is-active': activeSize === s }"
          :aria-label="s === sizes[0] ? '细笔' : '粗笔'"
          @click.stop="pickSize(s)"
        >
          <span :style="{ width: `${s}px`, height: `${s}px` }" />
        </button>
      </div>

      <button type="button" class="pa-draw__clear pa-hit" @click.stop="clear">清空</button>
    </div>

    <div class="pa-draw__content">
      <div class="pa-draw__prompt">{{ card.zh }}</div>
    </div>
  </div>
</template>

<style scoped>
.pa-draw {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-draw__visual {
  flex: 1 1 auto;
  min-height: 0;
  position: relative;
  padding: 8px var(--pa-gutter) 0;
  display: flex;
}

.pa-draw__canvas {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  background: #fff;
  border-radius: var(--pa-r-lg);
  box-shadow: inset 0 2px 12px rgba(120, 90, 60, 0.08);
  touch-action: none;
  cursor: crosshair;
}

.pa-draw__hint {
  position: absolute;
  inset: 8px var(--pa-gutter) 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--pa-fs-quiz);
  font-weight: 700;
  color: var(--pa-ink-faint);
  pointer-events: none;
}

/* ---------- 工具条 ---------- */
.pa-draw__toolbar {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px var(--pa-gutter) 4px;
  flex-wrap: wrap;
}

.pa-draw__colors {
  display: flex;
  gap: 6px;
}

.pa-draw__color {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  box-shadow: var(--pa-shadow-sm);
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
}
.pa-draw__color.is-active {
  transform: scale(1.18);
  box-shadow:
    0 0 0 3px #fff,
    0 0 0 6px var(--pa-ink);
}

.pa-draw__sizes {
  display: flex;
  gap: 6px;
}

.pa-draw__size {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: var(--pa-shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}
.pa-draw__size span {
  display: block;
  border-radius: 50%;
  background: var(--pa-ink);
}
.pa-draw__size.is-active {
  box-shadow:
    0 0 0 3px var(--pa-accent),
    var(--pa-shadow-sm);
}

.pa-draw__clear {
  font-size: var(--pa-fs-fact);
  font-weight: 800;
  color: var(--pa-ink-muted);
  background: rgba(255, 255, 255, 0.9);
  padding: 8px 18px;
  border-radius: var(--pa-r-pill);
  box-shadow: var(--pa-shadow-sm);
  min-height: 44px;
}

.pa-draw__content {
  flex: 0 0 auto;
  padding: 0 var(--pa-gutter) 12px;
  text-align: center;
}

.pa-draw__prompt {
  font-size: var(--pa-fs-fact);
  font-weight: 700;
  color: var(--pa-ink-muted);
}
</style>
