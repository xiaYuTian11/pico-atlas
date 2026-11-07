<script setup lang="ts">
/**
 * 应用根组件 —— 三壳路由 + 全局浮层。
 *
 * 路由状态很轻：就一个 screen 字符串 + 上下文。
 * 不用 vue-router（只有三个屏，没必要）。
 */
import { onMounted, onUnmounted, ref, onErrorCaptured } from 'vue';
import { App as CapApp } from '@capacitor/app';
import type { AgeBand, Card, Lane } from '@/content/types';
import { cardsOfSection, getCard, populatedSections } from '@/content';
import { initState, state, setAgeBand, startSessionTimer, stopSessionTimer } from '@/state/store';
import { stopAll, unlockAudio } from '@/audio/engine';
import AgeScreen from '@/shell/AgeScreen.vue';
import HomeShell from '@/shell/HomeShell.vue';
import AtlasGrid from '@/shell/AtlasGrid.vue';
import StageShell from '@/shell/StageShell.vue';
import ParentGate from '@/ui/ParentGate.vue';
import ParentSettings from '@/ui/ParentSettings.vue';
import SleepRitual from '@/ui/SleepRitual.vue';
import PaToast from '@/ui/PaToast.vue';

type Screen = 'age' | 'home' | 'grid' | 'stage';

const screen = ref<Screen>('home');
const ready = ref(false);

/* 网格上下文 */
const gridLane = ref<Lane>('look');
const gridSection = ref<string | undefined>(undefined);

/* 舞台上下文 */
const stageCards = ref<Card[]>([]);
const stageIndex = ref(0);
const stageLane = ref<Lane | 'favorites' | 'recent'>('look');
const stageSection = ref<string | undefined>(undefined);

/* 浮层 */
const gateOpen = ref(false);
const settingsOpen = ref(false);
const sleepOpen = ref(false);

/* Toast */
const toastMsg = ref('');
const toastTrigger = ref(0);
function toast(msg: string): void {
  toastMsg.value = msg;
  toastTrigger.value++;
}

let backListener: { remove: () => Promise<void> } | null = null;

/* ---------------- 导航 ---------------- */

function openLane(lane: Lane): void {
  gridLane.value = lane;
  const secs = populatedSections(lane);
  gridSection.value = secs[0]?.id;
  screen.value = 'grid';
}

function openCard(sectionId: string, cardId: string): void {
  const lane = gridLane.value;
  stageCards.value = cardsOfSection(sectionId);
  stageIndex.value = Math.max(
    0,
    stageCards.value.findIndex((c) => c.id === cardId),
  );
  stageLane.value = lane;
  stageSection.value = sectionId;
  screen.value = 'stage';
}

function openFavorites(): void {
  stageCards.value = state.favorites.map((id) => getCard(id)).filter((c): c is Card => !!c);
  if (stageCards.value.length === 0) {
    toast('还没有收藏的卡片');
    return;
  }
  stageIndex.value = 0;
  stageLane.value = 'favorites';
  stageSection.value = undefined;
  screen.value = 'stage';
}

/** 最近看过：按时间倒序复习 */
function openRecent(): void {
  stageCards.value = state.recent.map((id) => getCard(id)).filter((c): c is Card => !!c);
  if (stageCards.value.length === 0) {
    toast('还没有看过的卡片');
    return;
  }
  stageIndex.value = 0;
  stageLane.value = 'recent';
  stageSection.value = undefined;
  screen.value = 'stage';
}

function backFromGrid(): void {
  stopAll();
  screen.value = 'home';
}

function backFromStage(): void {
  stopAll();
  // 从最爱 / 最近看过进 → 回首页；从分区进 → 回网格
  if (stageLane.value === 'favorites' || stageLane.value === 'recent') {
    screen.value = 'home';
  } else {
    gridSection.value = stageSection.value;
    screen.value = 'grid';
  }
}

/* ---------------- 年龄 ---------------- */

function pickAge(band: AgeBand): void {
  setAgeBand(band);
  screen.value = 'home';
}

/* ---------------- 家长层 ---------------- */

function openGate(): void {
  stopAll();
  gateOpen.value = true;
}

function onGateUnlock(): void {
  gateOpen.value = false;
  settingsOpen.value = true;
}

/* ---------------- 晚安 ---------------- */

function onReachLimit(): void {
  stopAll();
  sleepOpen.value = true;
}

function onSleepClose(): void {
  sleepOpen.value = false;
  // 回到首页，家长可继续或交还手机
  screen.value = 'home';
}

/* ---------------- 生命周期 ---------------- */

function onFirstGesture(): void {
  unlockAudio();
  window.removeEventListener('pointerdown', onFirstGesture);
  window.removeEventListener('touchstart', onFirstGesture);
}

onMounted(async () => {
  await initState();
  ready.value = true;
  screen.value = state.ageBand ? 'home' : 'age';

  startSessionTimer(onReachLimit);

  window.addEventListener('pointerdown', onFirstGesture, { once: true });
  window.addEventListener('touchstart', onFirstGesture, { once: true });

  // 安卓物理返回键：优先关浮层，其次退一层壳，最后才最小化（不直接退出）
  try {
    backListener = await CapApp.addListener('backButton', () => {
      if (sleepOpen.value) return; // 晚安仪式必须长按，返回键不生效
      if (settingsOpen.value) {
        settingsOpen.value = false;
        return;
      }
      if (gateOpen.value) {
        gateOpen.value = false;
        return;
      }
      if (screen.value === 'stage') {
        backFromStage();
        return;
      }
      if (screen.value === 'grid') {
        backFromGrid();
        return;
      }
      if (screen.value === 'age') return;
      void CapApp.minimizeApp();
    });
  } catch {
    /* 浏览器里没有插件，忽略 */
  }
});

/* 任何组件抛错都不要白屏：退回首页 + 提示，孩子还能继续玩 */
onErrorCaptured((err) => {
  console.error('[pico-atlas] 组件异常', err);
  toast('这一页打不开，换一张试试');
  screen.value = 'home';
  return false;
});

onUnmounted(() => {
  stopSessionTimer();
  stopAll();
  void backListener?.remove();
});
</script>

<template>
  <div class="pa-app">
    <template v-if="ready">
      <AgeScreen v-if="screen === 'age'" @pick="pickAge" />

      <HomeShell
        v-else-if="screen === 'home'"
        @open-lane="openLane"
        @open-favorites="openFavorites"
        @open-recent="openRecent"
        @open-gate="openGate"
      />

      <AtlasGrid
        v-else-if="screen === 'grid'"
        :lane="gridLane"
        :initial-section="gridSection"
        @open-card="openCard"
        @back="backFromGrid"
      />

      <StageShell
        v-else-if="screen === 'stage'"
        :cards="stageCards"
        :start-index="stageIndex"
        :lane="stageLane"
        :section-id="stageSection"
        @back="backFromStage"
        @toast="toast"
      />

      <!-- 浮层 -->
      <ParentGate :open="gateOpen" @unlock="onGateUnlock" @close="gateOpen = false" />
      <ParentSettings :open="settingsOpen" @close="settingsOpen = false" />
      <SleepRitual :open="sleepOpen" @close="onSleepClose" />
      <PaToast :message="toastMsg" :trigger="toastTrigger" />
    </template>
  </div>
</template>

<style scoped>
.pa-app {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
