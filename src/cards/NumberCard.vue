<script setup lang="ts">
/**
 * 数数卡 —— 阿拉伯数字当主角，十格阵（ten-frame）当数量模型。
 *
 * 为什么是十格阵：
 *   5 和 10 是人类直觉的锚点。排成 2 行 × 5 格，
 *   孩子一眼就能看出"6 比 5 多一个"、"9 差一个就满十"。
 *   散乱的 emoji 阵列做不到这一点。
 *
 * 关键不是"会念 1-10"，而是「基数原则」(cardinality)：
 *   数到的最后一个数，就是这堆东西的总数。
 *   孩子会唱歌式数数（rote counting）但答不出"一共几个"，
 *   就是因为没人把这两件事在同一时刻绑定过。所以这里有三步：
 *     1. 点第 n 个 → 立刻报出 n（序数）
 *     2. 点满     → 报"一共有 N 个"（基数），数字放大
 *     3. 立刻提问 → 三选一确认，答错不惩罚，重新数
 */
import { computed, ref, watch } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';
import { audioCountNum, audioCountTotal, audioCountUi } from '@/content/media';
import { alive, newSession, playSfx, speak } from '@/audio/engine';
import CardText from './parts/CardText.vue';

const props = defineProps<{ card: Card; highlight: string | null }>();

const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];

const band = computed(() => state.ageBand ?? 'L1');
const count = computed(() => props.card.count ?? 1);
/** 十格阵固定 10 格，第二行永远存在，'满十' 是可感知的 */
const cells = computed(() => Array.from({ length: 10 }, (_, i) => i));
const showPinyin = computed(() => band.value !== 'L1' && !!props.card.pinyin);

const counted = ref<number[]>([]);
/**
 * total = 正在报“一共有N个”（此阶段不出选项，否则孩子一点就把基数语音截掉）
 * asking = 问完、选项已出；correct = 答对
 */
type Phase = 'counting' | 'total' | 'asking' | 'correct';
const phase = ref<Phase>('counting');

/** 三选一：正确值 + 相邻干扰项，位置按 count 轮转，答案不会总在中间 */
const options = computed(() => {
  const c = count.value;
  const raw = c <= 1 ? [1, 2, 3] : c >= 10 ? [8, 9, 10] : [c - 1, c, c + 1];
  const rot = c % 3;
  return [...raw.slice(rot), ...raw.slice(0, rot)];
});

watch(
  () => props.card.id,
  () => {
    counted.value = [];
    phase.value = 'counting';
  },
);

function speakCount(url: string | undefined, text: string): Promise<boolean> {
  // 报数/提示都走一次新会话：任何新点击或翻页都会作废上一条，避免"幽灵声音"
  const ticket = newSession();
  return speak({ url, text, lang: 'zh', ticket, rateKey: 'number', timeoutMs: 4000 });
}

async function tapItem(i: number): Promise<void> {
  if (i >= count.value) return;
  if (phase.value !== 'counting') return;
  if (counted.value.includes(i)) {
    playSfx('soft');
    return;
  }
  counted.value = [...counted.value, i];
  playSfx('pop');
  const nth = counted.value.length;
  // 序数：点到第 n 个，立刻说出 n
  const spoken = speakCount(audioCountNum(nth), CN[nth] ?? String(nth));

  if (nth === count.value) {
    // 必须等最后一个数说完再进基数确认。
    // 之前这里直接 finishCounting()，那个函数开头的 stopAll 会在 0ms 内
    // 把刚发起的"五"掐掉 —— 孩子永远听不到最后一个数，恰是基数原则的关键一环。
    await spoken;
    if (phase.value !== 'counting') return;
    void finishCounting();
  }
}

/** 数满了：先把"最后一个数 = 总数"说出来，说完才出选项 */
async function finishCounting(): Promise<void> {
  phase.value = 'total';
  const ticket = newSession();
  playSfx('chime');
  const totalText = `一共有${CN[count.value] ?? count.value}个`;
  await speak({
    url: audioCountTotal(count.value),
    text: totalText,
    lang: 'zh',
    ticket,
    rateKey: 'number',
    timeoutMs: 6000,
  });
  if (!alive(ticket)) return;
  await speak({
    url: audioCountUi('count_ask'),
    text: '一共几个呀？',
    lang: 'zh',
    ticket,
    rateKey: 'number',
    timeoutMs: 6000,
  });
  if (!alive(ticket)) return;
  phase.value = 'asking';
}

function answer(n: number): void {
  if (phase.value !== 'asking') return;
  if (n === count.value) {
    phase.value = 'correct';
    playSfx('chime');
    speakCount(audioCountUi('count_yes'), '对啦，你真棒！');
    return;
  }
  // 答错不惩罚：不红叉、不"错了"。格子立即清空 = "我们再来一次"的最直观信号。
  // （之前延迟 1.5s 才清，孩子在那 1.5s 里点格子全无反应，看起来像卡死）
  playSfx('soft');
  counted.value = [];
  phase.value = 'counting';
  speakCount(audioCountUi('count_retry'), '我们再数一次。');
}
</script>

<template>
  <div class="pa-number">
    <div class="pa-number__visual">
      <div class="pa-number__head">
        <span class="pa-number__digit" :class="{ 'is-zoom': phase !== 'counting' }">{{ count }}</span>
        <span class="pa-number__zh">{{ card.zh }}</span>
        <span v-if="showPinyin" class="pa-number__py">{{ card.pinyin }}</span>
      </div>

      <div class="pa-number__frame" :class="{ 'is-done': phase !== 'counting' }">
        <button
          v-for="i in cells"
          :key="i"
          type="button"
          class="pa-number__cell"
          :class="{
            'is-filled': i < count,
            'is-counted': counted.includes(i),
          }"
          :disabled="i >= count"
          :aria-label="i < count ? `第 ${i + 1} 个 ${card.zh}` : '空格子'"
          @click.stop="tapItem(i)"
        >
          <template v-if="i < count">
            <span class="pa-number__emoji">{{ card.emoji }}</span>
            <span v-if="counted.includes(i)" class="pa-number__ord">{{ counted.indexOf(i) + 1 }}</span>
          </template>
          <span v-else class="pa-number__empty" aria-hidden="true" />
        </button>
      </div>

      <!-- 基数确认：数完必须回答"一共几个"，这是本条交互的重点 -->
      <div v-if="phase !== 'counting'" class="pa-number__ask">
        <div v-if="phase !== 'correct'" class="pa-number__ask-label">一共几个？</div>
        <div v-else class="pa-number__ask-label pa-number__ask-label--win">
          {{ count }} 个！
        </div>
        <div v-if="phase === 'asking'" class="pa-number__opts">
          <button
            v-for="n in options"
            :key="n"
            type="button"
            class="pa-number__opt"
            @click.stop="answer(n)"
          >
            {{ n }}
          </button>
        </div>
      </div>
    </div>

    <div class="pa-number__content">
      <CardText :card="card" :highlight="highlight" hide-zh />
    </div>
  </div>
</template>

<style scoped>
.pa-number {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-number__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: clamp(8px, 2.2vh, 20px);
  padding: 8px var(--pa-gutter);
}

.pa-number__head {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
}

/* 阿拉伯数字是主角 */
.pa-number__digit {
  font-size: clamp(76px, 24vw, 132px);
  font-weight: 900;
  line-height: 0.9;
  color: var(--pa-accent);
  letter-spacing: -2px;
  text-shadow: 0 8px 26px rgba(245, 144, 74, 0.28);
  transition: transform var(--pa-dur-base) var(--pa-ease-spring);
}
/* 数满时数字"跳一下"：视觉上与"一共有 N 个"同步 */
.pa-number__digit.is-zoom {
  transform: scale(1.08);
}

.pa-number__zh {
  font-size: clamp(20px, 5.6vw, 28px);
  font-weight: 900;
  color: var(--pa-ink-muted);
  letter-spacing: 4px;
  line-height: 1.1;
}

.pa-number__py {
  font-size: clamp(13px, 3.6vw, 16px);
  font-weight: 600;
  color: var(--pa-ink-faint);
}

/* ---------- 十格阵 ---------- */
.pa-number__frame {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: clamp(4px, 1.4vw, 8px);
  width: min(86vw, 340px);
  padding: clamp(6px, 2vw, 10px);
  border-radius: var(--pa-r-lg);
  background: rgba(255, 255, 255, 0.72);
  box-shadow: var(--pa-shadow-sm);
  transition: transform var(--pa-dur-base) var(--pa-ease-spring);
}
.pa-number__frame.is-done {
  animation: paCountDone 0.7s var(--pa-ease-spring);
}

@keyframes paCountDone {
  0%,
  100% {
    transform: scale(1);
  }
  45% {
    transform: scale(1.08);
  }
}

.pa-number__cell {
  position: relative;
  aspect-ratio: 1;
  border-radius: clamp(8px, 2vw, 12px);
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-spring),
    background var(--pa-dur-base);
}
.pa-number__cell.is-filled {
  background: rgba(255, 255, 255, 0.9);
  box-shadow: inset 0 0 0 2px rgba(245, 144, 74, 0.28);
}
.pa-number__cell.is-filled:active {
  transform: scale(0.9);
}
.pa-number__cell.is-counted {
  box-shadow: inset 0 0 0 3px var(--pa-green, #4fa88b);
}

.pa-number__emoji {
  font-size: clamp(22px, 6.4vw, 34px);
  line-height: 1;
}

.pa-number__empty {
  width: 22%;
  height: 22%;
  border-radius: 50%;
  background: rgba(46, 42, 38, 0.08);
}

.pa-number__ord {
  position: absolute;
  right: -2px;
  top: -2px;
  min-width: 18px;
  height: 18px;
  padding: 0 3px;
  border-radius: 999px;
  background: var(--pa-green, #4fa88b);
  color: #fff;
  font-size: 11px;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* ---------- 基数确认 ---------- */
.pa-number__ask {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(6px, 1.6vh, 12px);
  animation: paAskIn 0.35s var(--pa-ease-spring);
}

@keyframes paAskIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.pa-number__ask-label {
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 900;
  color: var(--pa-ink);
  letter-spacing: 1px;
}
.pa-number__ask-label--win {
  color: var(--pa-accent-deep);
  font-size: clamp(28px, 9vw, 44px);
  animation: paWin 0.5s var(--pa-ease-spring);
}

@keyframes paWin {
  0% {
    transform: scale(0.7);
    opacity: 0;
  }
  60% {
    transform: scale(1.12);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}

.pa-number__opts {
  display: flex;
  gap: clamp(10px, 3vw, 18px);
}

/* 触控区 ≥ 64px：3-5 岁手指精度低 */
.pa-number__opt {
  min-width: 64px;
  min-height: 64px;
  padding: 0 16px;
  border-radius: var(--pa-r-md, 20px);
  background: #fff;
  box-shadow: var(--pa-shadow-sm);
  font-size: clamp(26px, 7vw, 34px);
  font-weight: 900;
  color: var(--pa-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
}
.pa-number__opt:active {
  transform: scale(0.92);
}

.pa-number__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
</style>
