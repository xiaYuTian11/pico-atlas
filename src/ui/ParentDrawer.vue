<script setup lang="ts">
/**
 * 亲子共读抽屉 —— 家长看的白话讲解 + 启发提问。
 *
 * 入口：卡片顶栏的 💡 按钮，或卡片区双指上滑。
 * 孩子看不到（文字小、颜色淡、默认收起）。
 */
import type { Card } from '@/content/types';
import PaIcon from './PaIcon.vue';

defineProps<{ open: boolean; card: Card | null }>();
const emit = defineEmits<{ close: [] }>();
</script>

<template>
  <div v-if="open && card" class="pa-drawer" role="dialog" aria-label="亲子共读锦囊">
    <div class="pa-drawer__mask" @click="emit('close')" />

    <div class="pa-drawer__sheet">
      <button type="button" class="pa-drawer__handle pa-hit" aria-label="收起" @click="emit('close')" />

      <div class="pa-drawer__title">
        <PaIcon name="bulb" class="pa-drawer__icon" />
        <span>亲子共读 · {{ card.zh }}</span>
      </div>

      <div class="pa-drawer__body">
        <div v-if="card.parentGuide?.explain" class="pa-drawer__explain">
          {{ card.parentGuide.explain }}
        </div>
        <div v-else class="pa-drawer__explain">和孩子一起读一读、看一看。</div>

        <div v-if="card.parentGuide?.prompt" class="pa-drawer__prompt">
          <span class="pa-drawer__prompt-label">可以这样问</span>
          {{ card.parentGuide.prompt }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pa-drawer {
  position: fixed;
  inset: 0;
  z-index: 1200;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
}

.pa-drawer__mask {
  position: absolute;
  inset: 0;
  background: rgba(30, 26, 22, 0.32);
}

.pa-drawer__sheet {
  position: relative;
  background: var(--pa-bg-elevated);
  border-radius: var(--pa-r-xl) var(--pa-r-xl) 0 0;
  padding: 8px 22px calc(24px + env(safe-area-inset-bottom));
  max-height: 58vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -8px 32px rgba(0, 0, 0, 0.2);
  animation: paDrawerUp var(--pa-dur-slow) var(--pa-ease-out);
}

@keyframes paDrawerUp {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}

.pa-drawer__handle {
  width: 44px;
  height: 5px;
  border-radius: 999px;
  background: var(--pa-line-strong);
  margin: 4px auto 14px;
  display: block;
  flex: 0 0 auto;
}

.pa-drawer__title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: var(--pa-fs-parent-title);
  font-weight: 900;
  color: var(--pa-ink);
  margin-bottom: 12px;
}

.pa-drawer__icon {
  width: 22px;
  height: 22px;
  color: var(--pa-accent);
  flex: 0 0 22px;
}

.pa-drawer__body {
  flex: 1 1 auto;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 14px;
  -webkit-overflow-scrolling: touch;
}

.pa-drawer__explain {
  font-size: var(--pa-fs-parent);
  line-height: 1.75;
  color: var(--pa-ink-muted);
}

.pa-drawer__prompt {
  font-size: var(--pa-fs-parent);
  line-height: 1.7;
  color: var(--pa-accent-deep);
  background: var(--pa-accent-soft);
  border-radius: var(--pa-r-md);
  padding: 12px 16px;
}

.pa-drawer__prompt-label {
  display: block;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 1px;
  opacity: 0.7;
  margin-bottom: 4px;
}
</style>
