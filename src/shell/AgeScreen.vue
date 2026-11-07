<script setup lang="ts">
/**
 * 首次启动的年龄选择屏。
 *
 * 三个大按钮，孩子看不识字也没关系 —— 家长选。
 * 选完永久记住，之后从家长设置里改。
 */
import { playSfx, unlockAudio } from '@/audio/engine';
import type { AgeBand } from '@/content/types';

const emit = defineEmits<{ pick: [band: AgeBand] }>();

const OPTIONS: Array<{ id: AgeBand; zh: string; sub: string; emoji: string }> = [
  { id: 'L1', zh: '3 – 4 岁', sub: '大图 · 拟声 · 简短中英', emoji: '🐣' },
  { id: 'L2', zh: '4 – 5 岁', sub: '加拼音 · 生活短句', emoji: '🐥' },
  { id: 'L3', zh: '5 – 6 岁', sub: '加小知识 · 完整诗句', emoji: '🐤' },
];

function pick(band: AgeBand): void {
  unlockAudio();
  playSfx('pop');
  emit('pick', band);
}
</script>

<template>
  <div class="pa-age pa-screen">
    <div class="pa-age__head">
      <div class="pa-age__title">小朋友几岁啦？</div>
      <div class="pa-age__sub">只选一次，之后可在家长设置里修改</div>
    </div>

    <div class="pa-age__options">
      <button
        v-for="o in OPTIONS"
        :key="o.id"
        type="button"
        class="pa-age__btn"
        :aria-label="o.zh"
        @click="pick(o.id)"
      >
        <span class="pa-age__emoji" aria-hidden="true">{{ o.emoji }}</span>
        <span class="pa-age__zh">{{ o.zh }}</span>
        <span class="pa-age__sub2">{{ o.sub }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.pa-age {
  justify-content: center;
  gap: 20px;
  padding: 24px var(--pa-gutter);
}

.pa-age__head {
  flex: 0 0 auto;
  text-align: center;
}

.pa-age__title {
  font-size: clamp(24px, 6.4vw, 30px);
  font-weight: 900;
  color: var(--pa-ink);
  letter-spacing: 1px;
}

.pa-age__sub {
  font-size: var(--pa-fs-fact);
  color: var(--pa-ink-muted);
  margin-top: 8px;
}

.pa-age__options {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  max-width: 420px;
  width: 100%;
  margin: 0 auto;
}

.pa-age__btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 20px 18px;
  border-radius: var(--pa-r-lg);
  background: #fff;
  box-shadow: var(--pa-shadow-md);
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-out),
    background var(--pa-dur-base);
  min-height: 96px;
}
.pa-age__btn:active {
  transform: scale(0.97);
  background: var(--pa-accent-soft);
}

.pa-age__emoji {
  font-size: 34px;
  line-height: 1;
}

.pa-age__zh {
  font-size: clamp(20px, 5.4vw, 24px);
  font-weight: 900;
  color: var(--pa-ink);
  letter-spacing: 1px;
}

.pa-age__sub2 {
  font-size: 13px;
  font-weight: 600;
  color: var(--pa-ink-muted);
}

/* 横屏时三列 */
@media (orientation: landscape) and (min-width: 640px) {
  .pa-age__options {
    flex-direction: row;
    max-width: 100%;
  }
  .pa-age__btn {
    flex: 1 1 0;
  }
}
</style>
