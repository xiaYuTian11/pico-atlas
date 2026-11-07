<script setup lang="ts">
/**
 * 轨迹描绘 —— 沿虚线描出路径。
 * gestureLock: true，全屏滑动翻页被禁用，触摸由画布独占。
 *
 * 完成判定：手指走过的路径覆盖率达到阈值即算完成，
 * 不做"必须精确描边"的苛刻判定（3 岁做不到）。
 */
import { computed, onMounted, ref, watch } from 'vue';
import type { Card, TracingPayload } from '@/content/types';
import { playSfx } from '@/audio/engine';

const props = defineProps<{ card: Card; highlight: string | null }>();

const payload = computed(() => props.card.quizPayload as TracingPayload);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const done = ref(false);
const progress = ref(0);

/** 路径点（0~1 归一化坐标），按形状生成 */
function pathPoints(shape: string): Array<{ x: number; y: number }> {
  const pts: Array<{ x: number; y: number }> = [];
  const N = 120;
  switch (shape) {
    case 'vertical_line':
      for (let i = 0; i <= N; i++) pts.push({ x: 0.5, y: 0.1 + (i / N) * 0.8 });
      break;
    case 'horizontal_line':
      for (let i = 0; i <= N; i++) pts.push({ x: 0.1 + (i / N) * 0.8, y: 0.5 });
      break;
    case 'circle':
      for (let i = 0; i <= N; i++) {
        const a = (i / N) * Math.PI * 2;
        pts.push({ x: 0.5 + Math.cos(a) * 0.34, y: 0.5 + Math.sin(a) * 0.34 });
      }
      break;
    case 'wave':
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        pts.push({ x: 0.08 + t * 0.84, y: 0.5 + Math.sin(t * Math.PI * 4) * 0.18 });
      }
      break;
    case 'zigzag':
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const seg = Math.floor(t * 4);
        const inSeg = t * 4 - seg;
        pts.push({ x: 0.1 + t * 0.8, y: seg % 2 === 0 ? 0.32 + inSeg * 0.36 : 0.68 - inSeg * 0.36 });
      }
      break;
    case 'spiral':
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const a = t * Math.PI * 6;
        const r = 0.06 + t * 0.32;
        pts.push({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r });
      }
      break;
    default:
      for (let i = 0; i <= N; i++) pts.push({ x: 0.5, y: 0.1 + (i / N) * 0.8 });
  }
  return pts;
}

const POINTS = computed(() => pathPoints(payload.value.pathShape));

/** 已覆盖的路径点索引（用于进度判定） */
const covered = new Set<number>();

function draw(): void {
  const cvs = canvasRef.value;
  if (!cvs) return;
  const rect = cvs.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  cvs.width = rect.width * dpr;
  cvs.height = rect.height * dpr;
  const ctx = cvs.getContext('2d');
  if (!ctx) return;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, rect.width, rect.height);

  // 虚线轨迹
  ctx.strokeStyle = 'rgba(245, 144, 74, 0.45)';
  ctx.lineWidth = 14;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  POINTS.value.forEach((p, i) => {
    const x = p.x * rect.width;
    const y = p.y * rect.height;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  // 已完成部分：实线覆盖
  if (covered.size > 0) {
    ctx.strokeStyle = '#F5904A';
    ctx.lineWidth = 12;
    ctx.beginPath();
    let started = false;
    POINTS.value.forEach((p, i) => {
      if (!covered.has(i)) {
        started = false;
        return;
      }
      const x = p.x * rect.width;
      const y = p.y * rect.height;
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }
}

let drawing = false;

function pos(e: PointerEvent): { x: number; y: number } {
  const cvs = canvasRef.value!;
  const rect = cvs.getBoundingClientRect();
  return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height };
}

function markNear(p: { x: number; y: number }): void {
  const TOL = 0.09;
  POINTS.value.forEach((pt, i) => {
    if (covered.has(i)) return;
    const d = Math.hypot(pt.x - p.x, pt.y - p.y);
    if (d < TOL) covered.add(i);
  });
  progress.value = covered.size / POINTS.value.length;
  if (progress.value >= 0.82 && !done.value) {
    done.value = true;
    playSfx('chime');
    setTimeout(() => playSfx('sparkle'), 200);
  }
  draw();
}

function onDown(e: PointerEvent): void {
  if (done.value) return;
  drawing = true;
  (e.target as HTMLElement).setPointerCapture(e.pointerId);
  markNear(pos(e));
}

function onMove(e: PointerEvent): void {
  if (!drawing || done.value) return;
  markNear(pos(e));
}

function onUp(): void {
  drawing = false;
}

function reset(): void {
  covered.clear();
  progress.value = 0;
  done.value = false;
  draw();
  playSfx('soft');
}

onMounted(draw);
watch(
  () => props.card.id,
  () => {
    covered.clear();
    progress.value = 0;
    done.value = false;
    setTimeout(draw, 60);
  },
);
window.addEventListener('resize', draw);
</script>

<template>
  <div class="pa-tracing">
    <div class="pa-tracing__visual">
      <div class="pa-tracing__endpoints">
        <span class="pa-tracing__ep">{{ payload.startPoint.emoji }}</span>
        <span class="pa-tracing__ep-label">{{ payload.startPoint.label }}</span>
      </div>

      <canvas
        ref="canvasRef"
        class="pa-tracing__canvas"
        @pointerdown.stop="onDown"
        @pointermove.stop="onMove"
        @pointerup.stop="onUp"
        @pointercancel.stop="onUp"
      />

      <div class="pa-tracing__endpoints">
        <span class="pa-tracing__ep">{{ payload.endPoint.emoji }}</span>
        <span class="pa-tracing__ep-label">{{ payload.endPoint.label }}</span>
      </div>
    </div>

    <div class="pa-tracing__content">
      <div class="pa-tracing__prompt">
        {{ done ? '描好啦！真棒 ⭐' : card.zh }}
      </div>
      <button type="button" class="pa-tracing__reset pa-hit" @click.stop="reset">重新描</button>
    </div>
  </div>
</template>

<style scoped>
.pa-tracing {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-tracing__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px var(--pa-gutter);
  position: relative;
}

.pa-tracing__endpoints {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}

.pa-tracing__ep {
  font-size: 30px;
  line-height: 1;
}

.pa-tracing__ep-label {
  font-size: var(--pa-fs-fact);
  font-weight: 700;
  color: var(--pa-ink-muted);
}

.pa-tracing__canvas {
  width: 100%;
  flex: 1 1 auto;
  min-height: 0;
  max-width: 460px;
  background: #fff;
  border-radius: var(--pa-r-lg);
  box-shadow: inset 0 2px 12px rgba(120, 90, 60, 0.08);
  touch-action: none;
  cursor: crosshair;
}

.pa-tracing__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pa-tracing__prompt {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-ink);
  text-align: center;
}

.pa-tracing__reset {
  font-size: var(--pa-fs-fact);
  font-weight: 800;
  color: var(--pa-accent-deep);
  background: var(--pa-accent-soft);
  padding: 10px 22px;
  border-radius: var(--pa-r-pill);
  min-height: 52px;
}
</style>
