<script setup lang="ts">
/**
 * 舞台壳 —— 卡片流的核心。
 *
 * 职责：
 *   1. 渲染卡片（通过注册表，无 if-else）
 *   2. 手势（弧形低门槛滑动 + 掌压过滤 + 滑动后抑制 click）
 *   3. 五种播放模式的编排
 *   4. 强打断（翻页/返回/暂停/切模式/切后台）
 *   5. 收藏、亲子抽屉入口
 *
 * 横屏时自动变成左右分栏（左图右文）。
 */
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { Card, Lane } from '@/content/types';
import { CARD_RENDERERS, GESTURE_LOCKED_TYPES } from '@/cards';
import { state, toggleFavorite, markSeen, setLastId, isFavorite as isFav } from '@/state/store';
import { playSfx, stopAll, unlockAudio, newSession, alive, sleep } from '@/audio/engine';
import { reading, beginReading, endReading } from '@/state/runtime';
import { readCard, autoReadsOnFlip, TIMING, type HighlightTarget } from '@/audio/playback';
import { audioMode } from '@/content/media';
import { getSection } from '@/content';
import BottomBar from '@/ui/BottomBar.vue';
import PaIcon from '@/ui/PaIcon.vue';
import ParentDrawer from '@/ui/ParentDrawer.vue';

const props = defineProps<{
  cards: Card[];
  startIndex: number;
  lane: 'look' | 'read' | 'play' | 'favorites' | 'recent';
  /** 从哪个分区进来（用于返回） */
  sectionId?: string;
}>();

const emit = defineEmits<{ back: []; toast: [msg: string] }>();

const index = ref(props.startIndex);

const card = computed<Card | undefined>(() => props.cards[index.value]);
const section = computed(() => (props.sectionId ? getSection(props.sectionId) : undefined));
/** 收藏/最近看过 不属于任何 lane，进度记到 look */
const progressLane: Lane = props.lane === 'favorites' || props.lane === 'recent' ? 'look' : props.lane;
const renderer = computed(() => (card.value ? CARD_RENDERERS[card.value.type] : null));

const highlight = ref<HighlightTarget>(null);
const poemLineIndex = ref<number | null>(null);
const isPlaying = ref(false);
const drawerOpen = ref(false);

const canPrev = computed(() => index.value > 0);
const canNext = computed(() => index.value < props.cards.length - 1);
const favNow = computed(() => (card.value ? isFav(card.value.id) : false));
const gestureLocked = computed(
  () => !!card.value && (card.value.gestureLock === true || GESTURE_LOCKED_TYPES.has(card.value.type)),
);

/* ---------------- 朗读 ---------------- */

let cruiseTicket = 0;
let flipTimer: ReturnType<typeof setTimeout> | null = null;

const hooks = {
  onHighlight(target: HighlightTarget, lineIdx?: number): void {
    highlight.value = target;
    poemLineIndex.value = target === 'poemLine' ? (lineIdx ?? 0) : null;
  },
};

function clearHighlight(): void {
  highlight.value = null;
  poemLineIndex.value = null;
}

/** 翻页落定后的自动朗读（含 700ms 视觉认知窗口） */
function scheduleAutoRead(): void {
  if (flipTimer) clearTimeout(flipTimer);
  const mode = state.prefs.playMode;
  if (!autoReadsOnFlip(mode)) return;
  if (isPlaying.value) return;

  flipTimer = setTimeout(() => {
    if (!card.value) return;
    const ticket = newSession();
    if (mode === 'single_loop') {
      void runLoop(ticket);
    } else {
      beginReading('auto');
      void readCard(card.value!, ticket, hooks).then(() => {
        if (alive(ticket)) clearHighlight();
        // 故事读完后给翻页提示（否则孩子会卡在同一页反复听）
        if (alive(ticket) && card.value?.type === 'story' && canNext.value) {
          showNextHint.value = true;
        }
        endReading();
      });
    }
  }, TIMING.flipSettleMs);
}

/** 单卡循环 */
async function runLoop(ticket: number): Promise<void> {
  beginReading('loop');
  while (alive(ticket) && state.prefs.playMode === 'single_loop' && !isPlaying.value) {
    if (!card.value) return;
    await readCard(card.value, ticket, hooks);
    clearHighlight();
    if (!alive(ticket)) return;
    await new Promise((r) => setTimeout(r, TIMING.loopGapMs));
  }
  endReading();
}

/** 自动巡航 */
async function toggleCruise(): Promise<void> {
  unlockAudio();
  stopLoop();
  // 正在朗读（含翻页自动读）时，这个键就是"停"
  if (isPlaying.value || reading.value) {
    stopCruise();
    return;
  }

  if (!card.value) return;
  isPlaying.value = true;
  cruiseTicket = newSession();
  const t = cruiseTicket;
  beginReading('cruise');

  const mode = state.prefs.playMode;
  while (alive(t) && isPlaying.value) {
    if (!card.value) break;

    if (mode === 'quiet_mute') {
      // 静音巡航：自动翻页但不发声（按钮永远有反馈，不是死键）
      await new Promise((r) => setTimeout(r, TIMING.muteCruiseHoldMs));
      if (!alive(t)) break;
    } else {
      await readCard(card.value, t, hooks);
      clearHighlight();
      if (!alive(t)) break;
      await new Promise((r) => setTimeout(r, state.prefs.cruiseHoldMs));
      if (!alive(t)) break;
    }

    if (index.value < props.cards.length - 1) {
      goTo(index.value + 1, { silent: true });
    } else {
      emit('toast', '播放完成啦 ⭐');
      break;
    }
  }

  if (alive(t)) stopCruise();
}

function stopCruise(): void {
  isPlaying.value = false;
  stopAll();
  clearHighlight();
  endReading();
}

/* ---------------- 导航 ---------------- */

interface GoOpts {
  silent?: boolean;
}

function goTo(next: number, opts: GoOpts = {}): void {
  if (next < 0 || next >= props.cards.length) return;
  stopLoop();
  endReading();
  showNextHint.value = false;
  if (!opts.silent) {
    stopCruise();
    stopAll();
  }
  clearHighlight();
  index.value = next;
  const c = props.cards[next];
  if (c) {
    markSeen(progressLane, c.id);
    setLastId(props.lane, c.id);
  }
  if (!opts.silent) scheduleAutoRead();
}

function step(delta: number): void {
  playSfx('pop');
  showNextHint.value = false;
  goTo(index.value + delta);
}

function back(): void {
  stopLoop();
  stopCruise();
  stopAll();
  emit('back');
}

/* ---------------- 点击卡片 ---------------- */

let lastTapAt = 0;

function onCardTap(e: MouseEvent): void {
  const target = e.target as HTMLElement | null;
  if (!target || !card.value) return;

  // 滑动刚结束时抑制 click（避免"翻完就乱响"）
  if (suppressClick) {
    suppressClick = false;
    return;
  }

  // 节流：狂点场景 260ms 最小间隔
  const now = Date.now();
  if (now - lastTapAt < 260) return;
  lastTapAt = now;

  unlockAudio();

  const partEl = target.closest('[data-part]') as HTMLElement | null;
  const part = partEl?.dataset.part;

  // 静音态：只给视觉反馈，绝不静默
  if (state.prefs.playMode === 'quiet_mute') {
    playSfx('soft');
    pulse(target);
    return;
  }

  if (part) {
    stopLoop();
    if (part.startsWith('poemLine:')) {
      const i = Number(part.split(':')[1]);
      poemLineIndex.value = i;
      highlight.value = 'poemLine';
      stopCruise();
      stopAll();
      void import('@/audio/playback').then(({ readPart }) => {
        beginReading('manual');
        void readPart(card.value!, 'poemLine', i).then(() => {
          clearHighlight();
          endReading();
        });
      });
      return;
    }
    highlight.value = part as HighlightTarget;
    stopCruise();
    stopAll();
    void import('@/audio/playback').then(({ readPart }) => {
      beginReading('manual');
      void readPart(card.value!, part as HighlightTarget).then(() => {
        clearHighlight();
        endReading();
      });
    });
    pulse(target);
    return;
  }

  // 点图：播拟声
  if (target.closest('.pa-card-visual') || target.closest('.pa-hero')) {
    playSfx(card.value.sound ?? 'pop');
    pulse(target);
    return;
  }

  // 点空白：轻反馈，不沉默
  playSfx('soft');
}

function pulse(el: HTMLElement): void {
  el.animate(
    [{ transform: 'scale(1)' }, { transform: 'scale(0.94)' }, { transform: 'scale(1)' }],
    { duration: 200, easing: 'cubic-bezier(.34,1.56,.64,1)' },
  );
}

/* ---------------- 手势引擎 ---------------- */

const stageEl = ref<HTMLElement | null>(null);
const dragX = ref(0);
let suppressClick = false;

let startX = 0;
let startY = 0;
let startT = 0;
let tracking = false;

const SWIPE_MIN_DX = 35;
const SWIPE_MAX_MS = 650;
const SWIPE_ANGLE_RATIO = 0.8;
const DRAG_DAMP = 0.65;
const PALM_RADIUS = 28;
const EDGE_MARGIN = 12;

function onTouchStart(e: TouchEvent): void {
  onTwoFingerStart(e);
  if (gestureLocked.value) return;
  if (e.touches.length > 1) {
    tracking = false;
    return;
  }
  const t = e.touches[0];
  // 掌压过滤：触点半径过大
  const anyT = t as Touch & { radiusX?: number; radiusY?: number };
  if ((anyT.radiusX && anyT.radiusX > PALM_RADIUS) || (anyT.radiusY && anyT.radiusY > PALM_RADIUS)) {
    tracking = false;
    return;
  }
  // 贴边握持过滤
  if (t.clientX < EDGE_MARGIN || t.clientX > window.innerWidth - EDGE_MARGIN) {
    tracking = false;
    return;
  }

  tracking = true;
  startX = t.clientX;
  startY = t.clientY;
  startT = Date.now();
  dragX.value = 0;
}

function onTouchMove(e: TouchEvent): void {
  onTwoFingerMove(e);
  if (!tracking || gestureLocked.value) return;
  const t = e.touches[0];
  const dx = t.clientX - startX;
  const dy = t.clientY - startY;
  if (Math.abs(dx) > 10 && Math.abs(dx) > Math.abs(dy) * 0.7) {
    dragX.value = dx * DRAG_DAMP;
  }
}

function onTouchEnd(e: TouchEvent): void {
  if (!tracking || gestureLocked.value) return;
  tracking = false;

  const t = e.changedTouches[0];
  const dx = t.clientX - startX;
  const dy = t.clientY - startY;
  const dt = Date.now() - startT;

  const isSwipe =
    Math.abs(dx) >= SWIPE_MIN_DX &&
    Math.abs(dx) > Math.abs(dy) * SWIPE_ANGLE_RATIO &&
    dt < SWIPE_MAX_MS;

  if (isSwipe) {
    suppressClick = true;
    stopCruise();
    stopAll();
    playSfx('pop');
    if (dx < 0 && canNext.value) goTo(index.value + 1);
    else if (dx > 0 && canPrev.value) goTo(index.value - 1);
    else dragX.value = 0;
  } else {
    dragX.value = 0;
  }
}

/* ---------------- 单卡循环（古诗词 / 故事） ---------------- */

const looping = ref(false);
/** 故事页读完后出现的"下一页"提示（孩子不知道要滑） */
const showNextHint = ref(false);
const canLoop = computed(() => card.value?.type === 'poem' || card.value?.type === 'story');

function stopLoop(): void {
  if (!looping.value) return;
  looping.value = false;
  stopAll();
  clearHighlight();
}

/** 单曲循环：这张卡片读一遍、停一下、再读一遍，直到手动关掉 */
async function toggleLoop(): Promise<void> {
  unlockAudio();
  if (looping.value) {
    stopLoop();
    playSfx('soft');
    return;
  }
  if (!card.value) return;
  playSfx('pop');
  stopCruise();
  const t = newSession();
  looping.value = true;
  beginReading('loop');
  while (looping.value && alive(t) && card.value) {
    await readCard(card.value, t, hooks);
    clearHighlight();
    if (!looping.value || !alive(t)) break;
    if (!(await sleep(TIMING.loopGapMs, t))) break;
  }
  looping.value = false;
  endReading();
}

/* ---------------- 收藏 ---------------- */

function onToggleFav(): void {
  if (!card.value) return;
  const added = toggleFavorite(card.value.id);
  if (added) {
    playSfx('chime');
    emit('toast', '加入我的最爱 ❤️');
  } else {
    // 取消收藏用"消解音"，不是 pop（语义要对）
    playSfx('soft');
    emit('toast', '已从最爱中移除');
  }
}

/* ---------------- 生命周期 ---------------- */

function onVisibility(): void {
  if (document.hidden) {
    stopLoop();
    stopCruise();
    stopAll();
    clearHighlight();
  }
}

function onKey(e: KeyboardEvent): void {
  if (drawerOpen.value) {
    if (e.key === 'Escape') drawerOpen.value = false;
    return;
  }
  if (e.key === 'ArrowRight') step(1);
  if (e.key === 'ArrowLeft') step(-1);
  if (e.key === ' ') {
    e.preventDefault();
    void toggleCruise();
  }
  if (e.key === 'Escape') back();
}

/** 双指上滑打开亲子抽屉（家长用） */
let twoFingerY = 0;
function onTwoFingerStart(e: TouchEvent): void {
  if (e.touches.length === 2) twoFingerY = e.touches[0].clientY;
}
function onTwoFingerMove(e: TouchEvent): void {
  if (e.touches.length !== 2) return;
  const dy = e.touches[0].clientY - twoFingerY;
  if (dy < -60 && card.value?.parentGuide) {
    drawerOpen.value = true;
    twoFingerY = 99999;
  }
}

onMounted(() => {
  unlockAudio();
  if (card.value) {
    markSeen(progressLane, card.value.id);
    setLastId(props.lane, card.value.id);
  }
  scheduleAutoRead();
  document.addEventListener('visibilitychange', onVisibility);
  document.addEventListener('keydown', onKey);
});

onUnmounted(() => {
  stopCruise();
  stopAll();
  if (flipTimer) clearTimeout(flipTimer);
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('keydown', onKey);
});

watch(index, () => {
  clearHighlight();
  scheduleAutoRead();
});

/* 模式切换后立即生效 */
watch(
  () => state.prefs.playMode,
  (m) => {
    if (isPlaying.value) stopCruise();
    if (m === 'quiet_mute') {
      stopAll();
      clearHighlight();
    }
    scheduleAutoRead();
  },
);

void audioMode;
void PaIcon;
</script>

<template>
  <div class="pa-stage-screen pa-screen">
    <!-- 顶栏 -->
    <header class="pa-stage__top">
      <button type="button" class="pa-stage__home pa-hit" aria-label="返回" @click="back">
        <PaIcon name="home" />
      </button>

      <div class="pa-stage__progress">
        <div class="pa-stage__bar">
          <span class="pa-stage__bar-fill" :style="{ width: `${((index + 1) / cards.length) * 100}%` }" />
        </div>
        <div class="pa-stage__counter">{{ index + 1 }} / {{ cards.length }}</div>
      </div>

      <button
        v-if="card?.parentGuide"
        type="button"
        class="pa-stage__guide pa-hit"
        aria-label="亲子共读锦囊"
        @click.stop="drawerOpen = true"
      >
        <PaIcon name="bulb" />
      </button>
    </header>

    <!-- 卡片舞台 -->
    <div
      ref="stageEl"
      class="pa-stage__area"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @click="onCardTap"
    >
      <div
        v-if="card"
        class="pa-stage__card"
        :class="{ 'is-locked': gestureLocked, 'has-next': showNextHint }"
        :style="{
          background: card.palette ?? 'var(--pa-card)',
          transform: `translateX(${dragX}px)`,
          transition: dragX ? 'none' : 'transform 0.22s cubic-bezier(.34,1.56,.64,1)',
        }"
      >
        <!-- 卡片角标：故事卡自己带页码，这里不重复 -->
        <div v-if="card.type !== 'story'" class="pa-card-badge">
          <span v-if="card.type === 'poem'">{{ card.dynasty }} · {{ card.author }}</span>
          <span v-else-if="card.gestureLock" class="pa-card-badge-lock">✋ 手绘卡片</span>
          <span v-else-if="section?.zh">{{ section.zh }}</span>
        </div>

        <!-- 单曲循环键：古诗/故事专用 -->
        <button
          v-if="canLoop"
          type="button"
          class="pa-stage__loop pa-hit"
          :class="{ 'is-on': looping }"
          :aria-label="looping ? '停止循环朗读' : '循环朗读这一页'"
          :aria-pressed="looping"
          @click.stop="toggleLoop"
        >
          <PaIcon name="loop" />
          <span class="pa-stage__loop-text">{{ looping ? '循环中' : '再读' }}</span>
        </button>

        <!-- 卡片本体：注册表渲染 -->
        <component
          :is="renderer"
          v-if="renderer && card"
          :key="card.id"
          :card="card"
          :highlight="highlight"
          :poem-line-index="poemLineIndex"
          @jump-to-story-page="(p: number) => {
            const target = cards.findIndex((c) => c.storyId === card?.storyId && c.page === p);
            if (target >= 0) goTo(target);
          }"
        />
        <!-- 故事翻页提示 -->
        <Transition name="pa-next-hint">
          <button v-if="showNextHint" type="button" class="pa-stage__next pa-hit" @click.stop="step(1)">
            下一页 →
          </button>
        </Transition>
      </div>
    </div>


    <!-- 底栏 -->
    <BottomBar
      :can-prev="canPrev"
      :can-next="canNext"
      :is-playing="isPlaying || reading"
      :is-favorite="favNow"
      :index="index"
      :total="cards.length"
      @prev="step(-1)"
      @next="step(1)"
      @toggle-play="toggleCruise"
      @toggle-favorite="onToggleFav"
    />

    <!-- 亲子抽屉 -->
    <ParentDrawer :open="drawerOpen" :card="card ?? null" @close="drawerOpen = false" />
  </div>
</template>

<style scoped>
.pa-stage-screen {
  background: var(--pa-bg);
}

/* ---------- 顶栏 ---------- */
.pa-stage__top {
  flex: 0 0 auto;
  height: var(--pa-topbar-h);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 var(--pa-gutter);
  z-index: 10;
}

.pa-stage__home {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  color: var(--pa-ink-muted);
  box-shadow: var(--pa-shadow-sm);
  padding: 11px;
  flex: 0 0 44px;
}

.pa-stage__progress {
  flex: 1 1 auto;
  min-width: 0;
}

.pa-stage__bar {
  height: 6px;
  background: var(--pa-line);
  border-radius: 999px;
  overflow: hidden;
}

.pa-stage__bar-fill {
  display: block;
  height: 100%;
  background: var(--pa-accent);
  border-radius: 999px;
  transition: width var(--pa-dur-slow) var(--pa-ease-out);
}

.pa-stage__counter {
  font-size: 12px;
  font-weight: 800;
  color: var(--pa-ink-faint);
  text-align: right;
  margin-top: 3px;
}

.pa-stage__guide {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.92);
  color: var(--pa-accent);
  box-shadow: var(--pa-shadow-sm);
  padding: 11px;
  flex: 0 0 44px;
}

/* ---------- 舞台区 ---------- */
.pa-stage__area {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: stretch;
  justify-content: center;
  padding: 4px var(--pa-gutter) 6px;
  position: relative;
  overflow: hidden;
}

.pa-stage__card {
  width: 100%;
  border-radius: var(--pa-r-xl);
  overflow: hidden;
  box-shadow: var(--pa-shadow-lg);
  display: flex;
  flex-direction: column;
  position: relative;
  will-change: transform;
  /* 上下结构：视觉 + 文本 */
}

/* 手势锁定卡片：给个视觉暗示 */
.pa-stage__card.is-locked {
  box-shadow:
    0 0 0 3px var(--pa-accent-soft),
    var(--pa-shadow-lg);
}

/* ---------- 卡片角标 ---------- */
/* ---------- 故事翻页提示 ---------- */
.pa-stage__next {
  position: absolute;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  z-index: 5;
  padding: 12px 22px;
  border-radius: var(--pa-r-pill);
  background: var(--pa-accent);
  color: #fff;
  font-size: 15px;
  font-weight: 900;
  letter-spacing: 0.5px;
  box-shadow: var(--pa-shadow-accent);
  animation: paNextBob 1.6s var(--pa-ease-in-out) infinite;
}
.pa-stage__next:active {
  transform: translateX(-50%) scale(0.94);
}

/* 提示出现时给正文腾位置，避免盖住文字 */
.pa-stage__card.has-next :deep(.pa-story__content) {
  padding-bottom: 74px;
}

@keyframes paNextBob {
  0%,
  100% {
    transform: translateX(-50%) translateX(0);
  }
  50% {
    transform: translateX(-50%) translateX(6px);
  }
}

.pa-next-hint-enter-active,
.pa-next-hint-leave-active {
  transition:
    opacity 0.2s var(--pa-ease-out),
    transform 0.2s var(--pa-ease-spring);
}
.pa-next-hint-enter-from,
.pa-next-hint-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}

.pa-stage__loop {
  position: absolute;
  top: 10px;
  right: 12px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 44px;
  padding: 8px 14px;
  border-radius: var(--pa-r-pill);
  background: rgba(255, 255, 255, 0.92);
  color: var(--pa-ink-muted);
  font-size: 13px;
  font-weight: 800;
  box-shadow: var(--pa-shadow-sm);
  transition:
    background var(--pa-dur-base),
    color var(--pa-dur-base),
    transform var(--pa-dur-fast) var(--pa-ease-out);
}
.pa-stage__loop:active {
  transform: scale(0.94);
}
.pa-stage__loop svg {
  width: 18px;
  height: 18px;
}
.pa-stage__loop.is-on {
  background: var(--pa-accent);
  color: #fff;
  box-shadow: var(--pa-shadow-accent);
  animation: paLoopPulse 1.6s var(--pa-ease-in-out) infinite;
}

@keyframes paLoopPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.pa-card-badge {
  position: absolute;
  top: 10px;
  left: 12px;
  font-size: 12px;
  font-weight: 700;
  color: var(--pa-ink-muted);
  background: rgba(255, 255, 255, 0.92);
  padding: 4px 10px;
  border-radius: var(--pa-r-pill);
  white-space: nowrap;
  z-index: 3;
  pointer-events: none;
  max-width: 60%;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pa-card-badge-lock {
  color: var(--pa-accent-deep);
}

/* ---------- 横屏左右分栏 ---------- */
@media (orientation: landscape) and (min-width: 640px) {
  .pa-stage__area {
    padding: 4px var(--pa-gutter) 4px;
  }

  .pa-stage__card {
    flex-direction: row;
  }

  /* 横屏时卡片内部由子组件各自处理，这里给统一的两列布局 */
  .pa-stage__card > :deep(.pa-object),
  .pa-stage__card > :deep(.pa-poem),
  .pa-stage__card > :deep(.pa-story),
  .pa-stage__card > :deep(.pa-shape),
  .pa-stage__card > :deep(.pa-color),
  .pa-stage__card > :deep(.pa-opp),
  .pa-stage__card > :deep(.pa-number) {
    flex-direction: row;
    align-items: center;
  }

  .pa-stage__card > :deep(.pa-object__visual),
  .pa-stage__card > :deep(.pa-poem__visual),
  .pa-stage__card > :deep(.pa-story__visual),
  .pa-stage__card > :deep(.pa-shape__visual),
  .pa-stage__card > :deep(.pa-color__visual),
  .pa-stage__card > :deep(.pa-opp__visual),
  .pa-stage__card > :deep(.pa-number__visual) {
    flex: 0 0 52%;
    height: 100%;
    padding: 16px 8px;
  }

  .pa-stage__card > :deep(.pa-object__content),
  .pa-stage__card > :deep(.pa-poem__content),
  .pa-stage__card > :deep(.pa-story__content),
  .pa-stage__card > :deep(.pa-shape__content),
  .pa-stage__card > :deep(.pa-color__content),
  .pa-stage__card > :deep(.pa-opp__content),
  .pa-stage__card > :deep(.pa-number__content) {
    flex: 1 1 48%;
    justify-content: center;
    padding: 16px 20px;
  }

  .pa-stage__card > :deep(.pa-story__badge) {
    left: 26%;
  }
}
</style>
