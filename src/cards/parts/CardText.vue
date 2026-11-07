<script setup lang="ts">
/**
 * 卡片文本槽 —— 中文 / 拼音 / 英文 / 短句 / 小知识。
 *
 * 年龄分层只影响"显示哪些字段"，不改组件结构：
 *   L1：中文 + 英文
 *   L2：+ 拼音 + 中文短句 + 英文短句
 *   L3：+ 拼音 + 短句 + 小知识
 *
 * 所有可点文本都带 data-part，点击时交给 Stage 处理朗读。
 */
import { computed } from 'vue';
import type { Card } from '@/content/types';
import { state } from '@/state/store';

const props = defineProps<{
  card: Card;
  highlight: string | null;
}>();

const band = computed(() => state.ageBand ?? 'L1');
const lv = computed(() => props.card.levels?.[band.value] ?? {});
const showPinyin = computed(() => band.value !== 'L1' && !!props.card.pinyin);
const showFact = computed(() => band.value === 'L3' && !!lv.value.fact);

function hl(part: string): string {
  return props.highlight === part ? 'is-speaking' : '';
}
</script>

<template>
  <div class="pa-text">
    <button
      type="button"
      class="pa-text__zh pa-hit"
      :class="hl('zh')"
      data-part="zh"
      :aria-label="`${card.zh}，点一下听中文`"
    >
      {{ card.zh }}
    </button>

    <div v-if="showPinyin" class="pa-text__py">{{ card.pinyin }}</div>

    <button
      v-if="card.en"
      type="button"
      class="pa-text__en pa-hit"
      :class="hl('en')"
      data-part="en"
      :aria-label="`${card.en}，点一下听英文`"
    >
      {{ card.en }}
    </button>

    <button
      v-if="lv.sentence_zh"
      type="button"
      class="pa-text__sent pa-hit"
      :class="hl('sentenceZh')"
      data-part="sentenceZh"
    >
      {{ lv.sentence_zh }}
    </button>

    <button
      v-if="lv.sentence_en"
      type="button"
      class="pa-text__sent pa-text__sent--en pa-hit"
      :class="hl('sentenceEn')"
      data-part="sentenceEn"
    >
      {{ lv.sentence_en }}
    </button>

    <div v-if="showFact" class="pa-text__fact">{{ lv.fact }}</div>
  </div>
</template>

<style scoped>
.pa-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 100%;
  text-align: center;
}

.pa-text__zh {
  font-size: var(--pa-fs-hero);
  font-weight: 900;
  letter-spacing: 2px;
  line-height: 1.12;
  color: var(--pa-ink);
}

.pa-text__py {
  font-size: var(--pa-fs-sent);
  font-weight: 600;
  color: var(--pa-ink-muted);
  letter-spacing: 0.5px;
  line-height: 1.3;
}

.pa-text__en {
  font-size: var(--pa-fs-en);
  font-weight: 800;
  letter-spacing: 0.4px;
  color: var(--pa-blue);
  line-height: 1.25;
}

.pa-text__sent {
  font-size: var(--pa-fs-sent);
  font-weight: 600;
  color: var(--pa-ink-muted);
  line-height: 1.4;
  margin-top: 4px;
  max-width: 92%;
}

.pa-text__sent--en {
  color: var(--pa-blue);
  margin-top: 0;
}

.pa-text__fact {
  font-size: var(--pa-fs-fact);
  font-weight: 500;
  color: var(--pa-ink-muted);
  line-height: 1.45;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--pa-line-strong);
  max-width: 92%;
}

/* 朗读高亮 */
.is-speaking {
  color: var(--pa-accent-deep) !important;
  text-shadow: 0 0 18px rgba(245, 144, 74, 0.5);
  transform: scale(1.05);
}
</style>
