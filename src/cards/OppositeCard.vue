<script setup lang="ts">
/**
 * 对比卡 —— 左右双格，直观感受相对概念。
 * 两侧都可点，点了会放大回弹。
 */
import type { Card } from '@/content/types';
import { computed } from 'vue';
import { playSfx } from '@/audio/engine';
import CardText from './parts/CardText.vue';

const props = defineProps<{ card: Card; highlight: string | null }>();

/**
 * 对比卡不能只是"左右两张图" —— 差异必须看得见。
 *   大/小  → 两个 emoji 直接不同尺寸
 *   长/短  → 横向拉伸 / 压缩
 *   上/下  → 竖直错位
 */
const sideStyle = computed<{ a: Record<string, string>; b: Record<string, string> }>(() => {
  const id = props.card.id;
  if (id.includes('big-small')) {
    return {
      a: { fontSize: 'clamp(84px, 26vw, 140px)' } as Record<string, string>,
      b: { fontSize: 'clamp(30px, 9vw, 46px)' } as Record<string, string>,
    };
  }
  if (id.includes('long-short')) {
    return {
      a: { transform: 'scaleX(1.45)' } as Record<string, string>,
      b: { transform: 'scaleX(0.72)' } as Record<string, string>,
    };
  }
  if (id.includes('up-down')) {
    return {
      a: { transform: 'translateY(-28px)' } as Record<string, string>,
      b: { transform: 'translateY(28px)' } as Record<string, string>,
    };
  }
  return { a: {}, b: {} };
});

function tapSide(): void {
  playSfx('pop');
}
</script>

<template>
  <div class="pa-opp">
    <div class="pa-opp__visual">
      <button type="button" class="pa-opp__side pa-hit" :aria-label="card.pairA?.zh" @click.stop="tapSide">
        <span class="pa-opp__emoji" :style="sideStyle.a">{{ card.pairA?.emoji }}</span>
        <span class="pa-opp__label">{{ card.pairA?.zh }}</span>
        <span class="pa-opp__tag">{{ card.zh.split(' ')[0] }}</span>
      </button>

      <div class="pa-opp__vs" aria-hidden="true">·</div>

      <button type="button" class="pa-opp__side pa-hit" :aria-label="card.pairB?.zh" @click.stop="tapSide">
        <span class="pa-opp__emoji" :style="sideStyle.b">{{ card.pairB?.emoji }}</span>
        <span class="pa-opp__label">{{ card.pairB?.zh }}</span>
        <span class="pa-opp__tag">{{ card.zh.split(' ').slice(-1)[0] }}</span>
      </button>
    </div>

    <div class="pa-opp__content">
      <CardText :card="card" :highlight="highlight" />
    </div>
  </div>
</template>

<style scoped>
.pa-opp {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}

.pa-opp__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: space-evenly;
  padding: 12px var(--pa-gutter);
}

.pa-opp__side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 8px;
  border-radius: var(--pa-r-lg);
  min-width: 40%;
  transition: transform var(--pa-dur-fast) var(--pa-ease-spring);
}
.pa-opp__side:active {
  transform: scale(0.93);
}

.pa-opp__emoji {
  font-size: clamp(48px, 15vw, 88px);
  line-height: 1;
  filter: drop-shadow(0 6px 16px rgba(120, 90, 60, 0.2));
  transition: transform var(--pa-dur-base) var(--pa-ease-spring);
}

.pa-opp__label {
  font-size: clamp(18px, 5vw, 24px);
  font-weight: 800;
  color: var(--pa-ink);
  letter-spacing: 1px;
}

.pa-opp__en {
  font-size: var(--pa-fs-fact);
  font-weight: 600;
  color: var(--pa-blue);
}

/* 大 / 小 这类单字对比标签 */
.pa-opp__tag {
  font-size: clamp(20px, 6vw, 28px);
  font-weight: 900;
  color: var(--pa-accent-deep);
  letter-spacing: 2px;
  line-height: 1.1;
}

.pa-opp__vs {
  font-size: 28px;
  font-weight: 900;
  color: var(--pa-ink-faint);
  flex-shrink: 0;
}

.pa-opp__content {
  flex: 0 0 auto;
  padding: 2px var(--pa-gutter) 16px;
}
</style>
