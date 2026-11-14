<script setup lang="ts">
/**
 * 分类网格壳 —— 530 词规模下唯一能撑住的导航层。
 *
 * 顶部：分区胶囊条（横向滚动，带图标 + 语音报读）
 * 主体：网格，一格一卡
 * 底部：分区内分页圆点
 *
 * 点格子 → 进入 Stage，且 currentList = 该分区全部卡片，索引精确对位。
 */
import { computed, onUnmounted, ref, watch } from 'vue';
import type { Card, Lane, SectionDef } from '@/content/types';
import { populatedSections, cardsOfSection, getSection } from '@/content';
import { state } from '@/state/store';
import { playSfx, speak, newSession } from '@/audio/engine';
import { sectionImage, audioSection } from '@/content/media';
import CardImage from '@/cards/parts/CardImage.vue';
import PaIcon from '@/ui/PaIcon.vue';

const props = defineProps<{ lane: Lane; initialSection?: string }>();
const emit = defineEmits<{ openCard: [sectionId: string, cardId: string]; back: [] }>();

const sections = computed(() => populatedSections(props.lane));
const activeSectionId = ref<string>(props.initialSection ?? sections.value[0]?.id ?? '');
const page = ref(0);

const activeSection = computed<SectionDef | undefined>(() => getSection(activeSectionId.value));
const cards = computed<Card[]>(() => cardsOfSection(activeSectionId.value));

/** 每屏格子数：竖屏 6（2×3），横屏 9（3×3） */
const perPage = ref(6);
function recomputePerPage(): void {
  const landscape = window.matchMedia('(orientation: landscape) and (min-width: 640px)').matches;
  perPage.value = landscape ? 9 : 6;
  page.value = 0;
}
recomputePerPage();
window.addEventListener('resize', recomputePerPage);
onUnmounted(() => window.removeEventListener('resize', recomputePerPage));

const totalPages = computed(() => Math.max(1, Math.ceil(cards.value.length / perPage.value)));
const visibleCards = computed(() =>
  cards.value.slice(page.value * perPage.value, (page.value + 1) * perPage.value),
);

watch(activeSectionId, () => (page.value = 0));

function pickSection(id: string): void {
  if (id === activeSectionId.value) return;
  activeSectionId.value = id;
  page.value = 0;
  playSfx('pop');
  // 分区名语音报读（孩子不识字，靠听）
  const sec = getSection(id);
  if (sec) {
    const ticket = newSession();
    void speak({ url: audioSection(id), text: sec.zh, lang: 'zh', ticket, timeoutMs: 1600 });
  }
}

function openCard(card: Card): void {
  playSfx('pop');
  emit('openCard', activeSectionId.value, card.id);
}

function nextPage(d: number): void {
  const p = page.value + d;
  if (p < 0 || p >= totalPages.value) return;
  page.value = p;
  playSfx('soft');
}

function seenOf(id: string): boolean {
  const p = state.progress[props.lane];
  return p.seen.includes(id);
}

function sectionIcon(id: string, fallback: string): string | undefined {
  void fallback;
  return sectionImage(id);
}
</script>

<template>
  <div class="pa-grid pa-screen">
    <!-- 顶栏 -->
    <header class="pa-grid__top">
      <button type="button" class="pa-grid__back pa-hit" aria-label="返回首页" data-back @click="emit('back')">
        <PaIcon name="home" />
      </button>
      <div class="pa-grid__title">
        {{ activeSection?.zh ?? '' }}
      </div>
      <div class="pa-grid__count">{{ cards.length }} 张</div>
    </header>

    <!-- 分区胶囊条 -->
    <div class="pa-grid__tabs" role="tablist">
      <button
        v-for="s in sections"
        :key="s.id"
        type="button"
        role="tab"
        class="pa-grid__tab"
        :class="{ 'is-active': s.id === activeSectionId }"
        :aria-selected="s.id === activeSectionId"
        :aria-label="s.zh"
        :data-section="s.id"
        @click="pickSection(s.id)"
      >
        <span class="pa-grid__tab-icon">
          <img v-if="sectionIcon(s.id, s.icon)" :src="sectionIcon(s.id, s.icon)" :alt="s.zh" />
          <span v-else>{{ s.icon }}</span>
        </span>
        <span class="pa-grid__tab-zh">{{ s.zh }}</span>
      </button>
    </div>

    <!-- 卡片网格 -->
    <div class="pa-grid__cells" :style="{ '--cols': perPage === 9 ? 3 : 2 }">
      <button
        v-for="c in visibleCards"
        :key="c.id"
        type="button"
        class="pa-grid__cell"
        :class="{ 'is-seen': seenOf(c.id) }"
        :data-card="c.id"
        :style="{ background: c.palette ?? 'var(--pa-card)' }"
        :aria-label="c.zh"
        @click="openCard(c)"
      >
        <span class="pa-grid__cell-visual">
          <span v-if="c.type === 'number'" class="pa-grid__cell-num">{{ c.count }}</span>
          <CardImage v-else :card-id="c.id" :emoji="c.emoji" :alt="c.zh" size="small" />
        </span>
        <span class="pa-grid__cell-zh">{{ c.zh }}</span>
        <span v-if="c.en" class="pa-grid__cell-en">{{ c.en }}</span>
        <span v-if="seenOf(c.id)" class="pa-grid__cell-seen" aria-hidden="true">✓</span>
      </button>
    </div>

    <!-- 分页 -->
    <div v-if="totalPages > 1" class="pa-grid__pager">
      <button
        type="button"
        class="pa-grid__pager-btn pa-hit"
        :disabled="page === 0"
        aria-label="上一页"
        @click="nextPage(-1)"
      >
        <PaIcon name="chevron-left" />
      </button>

      <div class="pa-grid__dots">
        <button
          v-for="n in totalPages"
          :key="n"
          type="button"
          class="pa-grid__dot"
          :class="{ 'is-active': page === n - 1 }"
          :aria-label="`第 ${n} 页`"
          @click="page = n - 1"
        />
      </div>

      <button
        type="button"
        class="pa-grid__pager-btn pa-hit"
        :disabled="page >= totalPages - 1"
        aria-label="下一页"
        @click="nextPage(1)"
      >
        <PaIcon name="chevron-right" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.pa-grid {
  padding: 8px 0 12px;
}

/* ---------- 顶栏 ---------- */
.pa-grid__top {
  flex: 0 0 auto;
  height: 52px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 var(--pa-gutter);
}

.pa-grid__back {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  color: var(--pa-ink-muted);
  box-shadow: var(--pa-shadow-sm);
  padding: 11px;
  flex: 0 0 44px;
}

.pa-grid__title {
  flex: 1 1 auto;
  font-size: 18px;
  font-weight: 900;
  letter-spacing: 1px;
  color: var(--pa-ink);
  text-align: center;
}

.pa-grid__count {
  flex: 0 0 auto;
  font-size: 12px;
  font-weight: 800;
  color: var(--pa-ink-faint);
  background: #f0e8dd;
  padding: 5px 10px;
  border-radius: var(--pa-r-sm);
}

/* ---------- 分区胶囊条 ---------- */
.pa-grid__tabs {
  flex: 0 0 auto;
  display: flex;
  gap: 8px;
  overflow-x: auto;
  overflow-y: hidden;
  padding: 6px var(--pa-gutter) 10px;
  scrollbar-width: none;
  -webkit-overflow-scrolling: touch;
  scroll-snap-type: x proximity;
}
.pa-grid__tabs::-webkit-scrollbar {
  display: none;
}

.pa-grid__tab {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  border-radius: var(--pa-r-pill);
  background: rgba(255, 255, 255, 0.8);
  box-shadow: var(--pa-shadow-sm);
  min-height: 48px;
  scroll-snap-align: start;
  transition:
    background var(--pa-dur-base),
    transform var(--pa-dur-fast) var(--pa-ease-out);
}
.pa-grid__tab:active {
  transform: scale(0.95);
}

.pa-grid__tab.is-active {
  background: var(--pa-accent);
  box-shadow: var(--pa-shadow-accent);
}
.pa-grid__tab.is-active .pa-grid__tab-zh {
  color: #fff;
}

.pa-grid__tab-icon {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 19px;
  line-height: 1;
  flex: 0 0 24px;
}
.pa-grid__tab-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.pa-grid__tab-zh {
  font-size: 14px;
  font-weight: 800;
  color: var(--pa-ink);
  white-space: nowrap;
}

/* ---------- 卡片网格 ---------- */
.pa-grid__cells {
  flex: 1 1 auto;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(var(--cols, 2), 1fr);
  gap: clamp(8px, 2.4vw, 14px);
  padding: 0 var(--pa-gutter);
  align-content: start;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.pa-grid__cell {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  border-radius: var(--pa-r-lg);
  box-shadow: var(--pa-shadow-sm);
  padding: 10px 6px 8px;
  min-height: clamp(110px, 26vw, 170px);
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-out),
    box-shadow var(--pa-dur-base);
  overflow: hidden;
}
.pa-grid__cell:active {
  transform: scale(0.965);
  box-shadow: var(--pa-shadow-sm);
}

.pa-grid__cell-visual {
  flex: 1 1 auto;
  min-height: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 数数卡在网格里直接显示阿拉伯数字，比一个苹果图标好认 */
.pa-grid__cell-num {
  font-size: clamp(42px, 13vw, 64px);
  font-weight: 900;
  line-height: 1;
  color: var(--pa-accent);
  text-shadow: 0 6px 18px rgba(245, 144, 74, 0.25);
}

.pa-grid__cell-zh {
  font-size: clamp(15px, 4.2vw, 19px);
  font-weight: 900;
  color: var(--pa-ink);
  letter-spacing: 0.5px;
  line-height: 1.2;
  margin-top: 2px;
}

.pa-grid__cell-en {
  font-size: 12px;
  font-weight: 700;
  color: var(--pa-blue);
  line-height: 1.2;
}

.pa-grid__cell-seen {
  position: absolute;
  top: 6px;
  right: 8px;
  font-size: 12px;
  font-weight: 900;
  color: var(--pa-green);
  opacity: 0.7;
}

.pa-grid__cell.is-seen {
  opacity: 0.94;
}

/* ---------- 分页 ---------- */
.pa-grid__pager {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 10px var(--pa-gutter) 2px;
}

.pa-grid__pager-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fff;
  color: var(--pa-ink-muted);
  box-shadow: var(--pa-shadow-sm);
  padding: 11px;
}
.pa-grid__pager-btn:disabled {
  opacity: 0.24;
  pointer-events: none;
}

.pa-grid__dots {
  display: flex;
  gap: 7px;
}

.pa-grid__dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: var(--pa-line-strong);
  transition: background var(--pa-dur-base);
}
.pa-grid__dot.is-active {
  background: var(--pa-accent);
}
</style>
