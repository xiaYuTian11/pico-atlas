<script setup lang="ts">
/**
 * 首页壳 —— 4 张大卡，一屏一事。
 *
 * 孩子不识字，所以每张卡都是「大图标 + 中文 + 一句话」，
 * 整块可点，高度 ≥110px。
 */
import { computed } from 'vue';
import { LANES } from '@/content/sections';
import { populatedSections, laneCounts } from '@/content';
import { state } from '@/state/store';
import { sectionImage } from '@/content/media';
import PaIcon from '@/ui/PaIcon.vue';
import { playSfx } from '@/audio/engine';

const emit = defineEmits<{ openLane: [lane: 'look' | 'read' | 'play']; openFavorites: []; openGate: [] }>();

const counts = computed(() => laneCounts());

const favCount = computed(() => state.favorites.length);

function go(lane: 'look' | 'read' | 'play'): void {
  playSfx('pop');
  emit('openLane', lane);
}

function goFav(): void {
  playSfx('pop');
  emit('openFavorites');
}

function openGate(): void {
  playSfx('soft');
  emit('openGate');
}

/** 分区图标图（有真图用真图） */
function laneImage(lane: string): string | undefined {
  return sectionImage(lane);
}

void populatedSections;
void PaIcon;
</script>

<template>
  <div class="pa-home pa-screen">
    <header class="pa-home__top">
      <div class="pa-home__brand">
        小<span>图鉴</span>
        <em>Pico Atlas</em>
      </div>
      <button type="button" class="pa-home__gate pa-hit" aria-label="家长设置" @click="openGate">
        <PaIcon name="lock" class="pa-home__gate-icon" />
        <span>{{ state.ageBand === 'L1' ? '3–4 岁' : state.ageBand === 'L2' ? '4–5 岁' : '5–6 岁' }}</span>
      </button>
    </header>

    <div class="pa-home__entries">
      <button
        v-for="lane in LANES"
        :key="lane.id"
        type="button"
        class="pa-home__entry"
        :style="{ background: lane.tint }"
        :aria-label="`${lane.zh}，共 ${counts[lane.id]} 张卡片`"
        @click="go(lane.id)"
      >
        <span class="pa-home__entry-icon">
          <img v-if="laneImage(lane.id)" :src="laneImage(lane.id)" :alt="lane.zh" />
          <span v-else>{{ lane.icon }}</span>
        </span>
        <span class="pa-home__entry-text">
          <span class="pa-home__entry-zh">{{ lane.zh }}</span>
          <span class="pa-home__entry-desc">{{ lane.desc }}</span>
        </span>
        <span class="pa-home__entry-count">{{ counts[lane.id] }}</span>
      </button>

      <button
        v-if="favCount > 0"
        type="button"
        class="pa-home__entry pa-home__entry--fav"
        :aria-label="`我的最爱，共 ${favCount} 张`"
        @click="goFav"
      >
        <span class="pa-home__entry-icon">
          <PaIcon name="heart-filled" class="pa-home__fav-icon" />
        </span>
        <span class="pa-home__entry-text">
          <span class="pa-home__entry-zh">我的最爱</span>
          <span class="pa-home__entry-desc">宝宝自己收藏的卡片</span>
        </span>
        <span class="pa-home__entry-count">{{ favCount }}</span>
      </button>
    </div>

    <footer class="pa-home__footer">
      <div class="pa-home__footer-text">一张图 · 一个词 · 一首诗 · 一个小故事</div>
    </footer>
  </div>
</template>

<style scoped>
.pa-home {
  padding: 10px var(--pa-gutter) 18px;
}

/* ---------- 顶栏 ---------- */
.pa-home__top {
  flex: 0 0 auto;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.pa-home__brand {
  font-size: 21px;
  font-weight: 900;
  letter-spacing: 0.5px;
  color: var(--pa-ink);
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.pa-home__brand span {
  color: var(--pa-accent);
}

.pa-home__brand em {
  font-size: 11px;
  font-weight: 600;
  font-style: normal;
  color: var(--pa-ink-faint);
  letter-spacing: 0.4px;
}

.pa-home__gate {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-weight: 800;
  color: var(--pa-ink-muted);
  background: #f0e8dd;
  padding: 8px 12px;
  border-radius: var(--pa-r-pill);
  min-height: 44px;
}

.pa-home__gate-icon {
  width: 14px;
  height: 14px;
}

/* ---------- 四张大卡 ---------- */
.pa-home__entries {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
  justify-content: center;
}

.pa-home__entry {
  flex: 1 1 0;
  min-height: 96px;
  max-height: 132px;
  border-radius: var(--pa-r-lg);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 18px;
  box-shadow: var(--pa-shadow-md);
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-out),
    box-shadow var(--pa-dur-base);
  text-align: left;
}
.pa-home__entry:active {
  transform: scale(0.975);
  box-shadow: var(--pa-shadow-sm);
}

.pa-home__entry-icon {
  flex: 0 0 auto;
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 38px;
  line-height: 1;
}

.pa-home__entry-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 10px rgba(120, 90, 60, 0.18));
}

.pa-home__fav-icon {
  width: 38px;
  height: 38px;
  color: var(--pa-red);
}

.pa-home__entry-text {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pa-home__entry-zh {
  font-size: clamp(20px, 5.6vw, 26px);
  font-weight: 900;
  letter-spacing: 1.5px;
  color: var(--pa-ink);
  line-height: 1.2;
}

.pa-home__entry-desc {
  font-size: 13px;
  font-weight: 600;
  color: var(--pa-ink-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pa-home__entry-count {
  flex: 0 0 auto;
  font-size: 13px;
  font-weight: 800;
  color: var(--pa-ink-faint);
  background: rgba(255, 255, 255, 0.75);
  padding: 5px 10px;
  border-radius: var(--pa-r-sm);
}

.pa-home__entry--fav {
  background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
  border: 2px dashed #ffa39e;
}

/* ---------- 底注 ---------- */
.pa-home__footer {
  flex: 0 0 auto;
  padding-top: 12px;
  text-align: center;
}

.pa-home__footer-text {
  font-size: 12px;
  font-weight: 600;
  color: var(--pa-ink-faint);
  letter-spacing: 0.5px;
}

/* 横屏：改为两列 */
@media (orientation: landscape) and (min-width: 640px) {
  .pa-home__entries {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    align-content: center;
  }
  .pa-home__entry {
    max-height: none;
  }
}
</style>
