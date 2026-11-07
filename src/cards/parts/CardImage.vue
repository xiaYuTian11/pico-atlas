<script setup lang="ts">
/**
 * 卡片主图 —— 有真图就用真图，没有就回退 emoji。
 *
 * 水彩方案（D2）的关键处理：
 * 插画统一生成在 #FFFDF8 纸底上，不做透明抠图。
 * 这里给图包一层"画片"边框 + 内阴影 + 白边，
 * 让白底变成"纸"，与暖色卡片底形成两层纵深。
 */
import { computed, ref } from 'vue';
import { cardImage } from '@/content/media';

const props = withDefaults(
  defineProps<{
    cardId: string;
    emoji?: string;
    alt: string;
    /** 尺寸档位：hero=主视觉，small=网格/选项 */
    size?: 'hero' | 'small';
  }>(),
  { size: 'hero' },
);

const src = computed(() => cardImage(props.cardId));
const failed = ref(false);
const showImage = computed(() => !!src.value && !failed.value);

function onError(): void {
  failed.value = true;
}
</script>

<template>
  <div class="pa-hero" :class="`pa-hero--${size}`">
    <div v-if="showImage" class="pa-hero__paper">
      <img :src="src" :alt="alt" draggable="false" @error="onError" />
    </div>
    <span v-else class="pa-hero__emoji" aria-hidden="true">{{ emoji || '🖼️' }}</span>
  </div>
</template>

<style scoped>
.pa-hero {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  min-height: 0;
}

/* ---------- 画片：白底 + 内阴影 + 圆角 ---------- */
.pa-hero__paper {
  background: var(--pa-paper);
  border-radius: var(--pa-r-lg);
  padding: 10px;
  box-shadow:
    0 10px 30px rgba(120, 90, 60, 0.16),
    inset 0 0 0 4px rgba(255, 255, 255, 0.9),
    inset 0 -2px 8px rgba(160, 130, 100, 0.1);
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pa-hero__paper img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: min(74vw, 420px);
  max-height: 44vh;
  object-fit: contain;
  border-radius: calc(var(--pa-r-lg) - 6px);
  -webkit-user-drag: none;
}

/* ---------- emoji 兜底：大、居中、带投影 ---------- */
.pa-hero__emoji {
  font-size: clamp(72px, 22vw, 140px);
  line-height: 1;
  filter: drop-shadow(0 8px 20px rgba(120, 90, 60, 0.22));
  transition: transform var(--pa-dur-base) var(--pa-ease-spring);
}

/* ---------- 小尺寸（网格格子里用）----------
   网格格子已经是一张卡了，里面再套一层白纸就是"卡中卡"。
   这里去掉纸框与内阴影，只留圆角裁剪。 */
.pa-hero--small .pa-hero__paper {
  padding: 0;
  border-radius: var(--pa-r-md);
  background: transparent;
  box-shadow: none;
}
.pa-hero--small .pa-hero__paper img {
  max-width: 100%;
  max-height: 100%;
  border-radius: var(--pa-r-md);
}
.pa-hero--small .pa-hero__emoji {
  font-size: clamp(38px, 11vw, 64px);
  filter: drop-shadow(0 3px 8px rgba(120, 90, 60, 0.18));
}

/* 横屏时图可以更高 */
@media (orientation: landscape) and (min-width: 640px) {
  .pa-hero--hero .pa-hero__paper img {
    max-width: 100%;
    max-height: 58vh;
  }
}
</style>
