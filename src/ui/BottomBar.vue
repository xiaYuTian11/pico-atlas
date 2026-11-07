<script setup lang="ts">
/**
 * 标准 5 槽底栏。
 *
 * 触控热区规范：视觉尺寸可以小，但热区必须 ≥64px（.pa-hit 自动扩展）。
 *
 * 模式键保留 4 态循环（决策 D3），配套三重确认：
 *   1. 图标弹一下
 *   2. 人声报读模式名（有音频则播，缺则合成音 + toast）
 *   3. 外圈转一圈
 * 家长锁定后模式键不可点。
 */
import { computed, ref } from 'vue';
import { PLAY_MODE_META, state, cyclePlayMode } from '@/state/store';
import { playSfx, speak, newSession, alive } from '@/audio/engine';
import { audioMode } from '@/content/media';
import PaIcon from './PaIcon.vue';

const props = defineProps<{
  canPrev: boolean;
  canNext: boolean;
  isPlaying: boolean;
  isFavorite: boolean;
  index: number;
  total: number;
}>();
void props;

const emit = defineEmits<{
  prev: [];
  next: [];
  togglePlay: [];
  toggleFavorite: [];
}>();

const modeSpinning = ref(false);
const modeBounce = ref(false);
/** 切模式时浮在底栏上方的一句提示（图标 + 名字 + 一句说明） */
const modeToast = ref<{ zh: string; desc: string } | null>(null);
let modeToastTimer: ReturnType<typeof setTimeout> | null = null;

const modeMeta = computed(() => PLAY_MODE_META[state.prefs.playMode]);
const modeLocked = computed(() => state.prefs.modeLocked);

/** 模式键图标名，与 PaIcon 的 union 对齐 */
const modeIcon = computed(() => modeMeta.value.icon as 'flip' | 'loop' | 'tap' | 'mute');

function onMode(): void {
  if (modeLocked.value) {
    playSfx('soft');
    return;
  }
  playSfx('pop');
  const next = cyclePlayMode();
  modeSpinning.value = true;
  modeBounce.value = true;
  setTimeout(() => {
    modeSpinning.value = false;
    modeBounce.value = false;
  }, 520);

  // 可见提示：孩子不识字，也要能"看出"现在是什么模式
  modeToast.value = { zh: PLAY_MODE_META[next].zh, desc: PLAY_MODE_META[next].desc };
  if (modeToastTimer) clearTimeout(modeToastTimer);
  modeToastTimer = setTimeout(() => (modeToast.value = null), 1900);

  // 三重确认之一：人声报读当前模式
  const url = audioMode(PLAY_MODE_META[next].voice);
  const ticket = newSession();
  void speak({
    url,
    text: PLAY_MODE_META[next].zh,
    lang: 'zh',
    ticket,
    timeoutMs: 2600,
  }).then(() => {
    if (alive(ticket)) {
      /* 播完就静默，不再叠加 toast —— 孩子看图标 + 听人声就够了 */
    }
  });
}

function onPlay(): void {
  playSfx('pop');
  emit('togglePlay');
}

function onFav(): void {
  emit('toggleFavorite');
}
</script>

<template>
  <div class="pa-bottombar">
    <button
      type="button"
      class="pa-bb-btn pa-bb-nav pa-hit"
      :disabled="!canPrev"
      aria-label="上一张"
      @click="emit('prev')"
    >
      <PaIcon name="chevron-left" />
    </button>

    <div class="pa-bb-mode-wrap">
      <button
        type="button"
        class="pa-bb-btn pa-bb-mode pa-hit"
        :class="{ 'is-spinning': modeSpinning, 'is-bouncing': modeBounce, 'is-locked': modeLocked }"
        :aria-label="`当前模式：${modeMeta.zh}，点一下切换`"
        @click="onMode"
      >
        <PaIcon :name="modeIcon" />
        <span v-if="modeLocked" class="pa-bb-lock" aria-hidden="true">🔒</span>
      </button>
      <span class="pa-bb-mode-label" aria-hidden="true">{{ modeMeta.short }}</span>
    </div>

    <button
      type="button"
      class="pa-bb-play pa-hit"
      :class="{ 'is-playing': isPlaying }"
      :aria-label="isPlaying ? '暂停' : '自动巡航'"
      @click="onPlay"
    >
      <PaIcon :name="isPlaying ? 'pause' : 'play'" />
    </button>

    <button
      type="button"
      class="pa-bb-btn pa-bb-fav pa-hit"
      :class="{ 'is-fav': isFavorite }"
      :aria-label="isFavorite ? '取消收藏' : '加入最爱'"
      @click="onFav"
    >
      <PaIcon :name="isFavorite ? 'heart-filled' : 'heart'" />
    </button>

    <button
      type="button"
      class="pa-bb-btn pa-bb-nav pa-hit"
      :disabled="!canNext"
      aria-label="下一张"
      @click="emit('next')"
    >
      <PaIcon name="chevron-right" />
    </button>

    <!-- 切模式提示：飘在底栏上方，1.9s 后自动消失 -->
    <Transition name="pa-mode-pill">
      <div v-if="modeToast" class="pa-mode-pill" role="status" aria-live="polite">
        <span class="pa-mode-pill-icon"><PaIcon :name="modeIcon" /></span>
        <span class="pa-mode-pill-text">
          <b>{{ modeToast.zh }}</b>
          <i>{{ modeToast.desc }}</i>
        </span>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.pa-bottombar {
  flex: 0 0 auto;
  height: var(--pa-bottombar-h);
  display: flex;
  align-items: center;
  justify-content: center;
  /* 窄屏也放得下：视觉 48+48+76+48+48 = 268 + 4*10 gap = 308 < 343 */
  gap: clamp(6px, 2.4vw, 14px);
  padding: 4px 12px calc(8px + env(safe-area-inset-bottom));
  z-index: 10;
}

/* ---------- 通用圆钮 ---------- */
.pa-bb-btn {
  flex: 0 0 auto;
  border-radius: 50%;
  background: #fff;
  color: var(--pa-ink);
  box-shadow: var(--pa-shadow-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-out),
    background var(--pa-dur-base);
}
.pa-bb-btn:active {
  transform: scale(0.9);
}

/* 翻页钮：视觉 48px */
.pa-bb-nav {
  width: var(--pa-touch-visual-sm);
  height: var(--pa-touch-visual-sm);
  color: var(--pa-ink-muted);
}
.pa-bb-nav:disabled {
  opacity: 0.24;
  pointer-events: none;
}

/* 模式钮：视觉 48px，暖米底 */
.pa-bb-mode-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1px;
  flex: 0 0 auto;
}

.pa-bb-mode-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.2px;
  color: var(--pa-ink-muted);
  white-space: nowrap;
  line-height: 1.1;
}

.pa-bb-mode {
  width: var(--pa-touch-visual-sm);
  height: var(--pa-touch-visual-sm);
  background: #f4ece4;
  position: relative;
}
.pa-bb-mode.is-bouncing {
  animation: paModeBounce 0.42s var(--pa-ease-spring);
}
.pa-bb-mode.is-spinning :deep(svg) {
  animation: paModeSpin 0.5s var(--pa-ease-in-out);
}
.pa-bb-mode.is-locked {
  opacity: 0.7;
}
.pa-bb-lock {
  position: absolute;
  right: -2px;
  bottom: -2px;
  font-size: 12px;
  line-height: 1;
}

@keyframes paModeBounce {
  0%,
  100% {
    transform: scale(1);
  }
  40% {
    transform: scale(1.18);
  }
  70% {
    transform: scale(0.96);
  }
}

@keyframes paModeSpin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* 主键：视觉 76px，阳光橙 */
.pa-bb-play {
  width: var(--pa-touch-visual-lg);
  height: var(--pa-touch-visual-lg);
  border-radius: 50%;
  background: var(--pa-accent);
  color: #fff;
  box-shadow: var(--pa-shadow-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-out),
    box-shadow var(--pa-dur-base);
  flex: 0 0 auto;
}
.pa-bb-play:active {
  transform: scale(0.92);
}
.pa-bb-play.is-playing {
  animation: paPlayPulse 1.4s var(--pa-ease-in-out) infinite;
}

/* 朗读中：外圈转一圈的进度环，让"正在读"这件事一眼可见 */
.pa-bb-play.is-playing::after {
  content: '';
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 3px solid rgba(245, 144, 74, 0.42);
  border-top-color: rgba(245, 144, 74, 0.95);
  animation: paPlayRing 1.1s linear infinite;
  pointer-events: none;
}
.pa-bb-play {
  position: relative;
}
@keyframes paPlayRing {
  to {
    transform: rotate(360deg);
  }
}

/* 切模式提示胶囊 */
.pa-mode-pill {
  position: fixed;
  left: 50%;
  bottom: calc(var(--pa-bottombar-h) + 18px + env(safe-area-inset-bottom));
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px 10px 12px;
  border-radius: var(--pa-r-pill);
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 10px 34px rgba(120, 90, 60, 0.24);
  z-index: 8000;
  pointer-events: none;
  max-width: 88vw;
}
.pa-mode-pill-icon {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--pa-accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 34px;
  padding: 7px;
}
.pa-mode-pill-text {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}
.pa-mode-pill-text b {
  font-size: 15px;
  font-weight: 900;
  color: var(--pa-ink);
  letter-spacing: 0.5px;
}
.pa-mode-pill-text i {
  font-size: 12px;
  font-style: normal;
  font-weight: 600;
  color: var(--pa-ink-muted);
}

.pa-mode-pill-enter-active,
.pa-mode-pill-leave-active {
  transition:
    opacity 0.22s var(--pa-ease-out),
    transform 0.22s var(--pa-ease-spring);
}
.pa-mode-pill-enter-from,
.pa-mode-pill-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(12px) scale(0.94);
}

@keyframes paPlayPulse {
  0%,
  100% {
    box-shadow: 0 6px 22px rgba(245, 144, 74, 0.42);
  }
  50% {
    box-shadow: 0 6px 38px rgba(245, 144, 74, 0.85);
  }
}

/* 收藏钮 */
.pa-bb-fav {
  width: var(--pa-touch-visual-sm);
  height: var(--pa-touch-visual-sm);
  background: #f4ece4;
}
.pa-bb-fav.is-fav {
  background: #fff1f0;
  color: var(--pa-red);
}

/* ---------- 极窄屏（<340px）压缩视觉尺寸 ---------- */
@media (max-width: 340px) {
  .pa-bb-nav,
  .pa-bb-mode,
  .pa-bb-fav {
    width: 44px;
    height: 44px;
  }
  .pa-bb-play {
    width: 66px;
    height: 66px;
  }
}
</style>
