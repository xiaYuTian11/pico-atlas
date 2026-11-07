<script setup lang="ts">
/**
 * 分类归位 —— 上方收纳篮，下方待分类物品。
 *
 * 交互：先点物品（选中）→ 再点篮子（投放）。
 * 3 岁做不出拖拽，所以用"两次点击"替代 drag & drop。
 *
 * 放对：物品飞入篮子 + 风铃音
 * 放错：物品果冻摇摆 + 水泡音，绝不惩罚
 */
import { computed, ref } from 'vue';
import type { Card, QuizSortPayload, SortItem, SortBucket } from '@/content/types';
import { playSfx } from '@/audio/engine';

const props = defineProps<{ card: Card; highlight: string | null }>();

const payload = computed(() => props.card.quizPayload as QuizSortPayload);

const selected = ref<SortItem | null>(null);
const placed = ref<Record<string, string>>({}); // itemId → bucketId
const shaking = ref<string | null>(null);

const remaining = computed(() => payload.value.items.filter((it) => !placed.value[it.id]));
const allDone = computed(() => remaining.value.length === 0);

function selectItem(it: SortItem): void {
  if (placed.value[it.id]) return;
  selected.value = it;
  playSfx('soft');
}

function dropTo(bucket: SortBucket): void {
  const it = selected.value;
  if (!it) {
    playSfx('soft');
    return;
  }

  if (it.targetBucketId === bucket.id) {
    placed.value[it.id] = bucket.id;
    selected.value = null;
    playSfx('chime');
    if (remaining.value.length === 0) setTimeout(() => playSfx('sparkle'), 260);
  } else {
    shaking.value = it.id;
    playSfx('pop');
    setTimeout(() => (shaking.value = null), 340);
  }
}

function replay(): void {
  placed.value = {};
  selected.value = null;
  playSfx('soft');
}

function itemsInBucket(bucketId: string): SortItem[] {
  return payload.value.items.filter((it) => placed.value[it.id] === bucketId);
}
</script>

<template>
  <div class="pa-quiz-sort">
    <div class="pa-quiz-sort__buckets">
      <button
        v-for="b in payload.buckets"
        :key="b.id"
        type="button"
        class="pa-quiz-sort__bucket"
        :class="{ 'is-target': selected }"
        :aria-label="`放进${b.label}`"
        @click.stop="dropTo(b)"
      >
        <span class="pa-quiz-sort__bucket-icon">{{ b.emoji }}</span>
        <span class="pa-quiz-sort__bucket-label">{{ b.label }}</span>
        <div class="pa-quiz-sort__bucket-items">
          <span v-for="it in itemsInBucket(b.id)" :key="it.id" class="pa-quiz-sort__placed">
            {{ it.emoji }}
          </span>
        </div>
      </button>
    </div>

    <div class="pa-quiz-sort__pool">
      <button
        v-for="it in remaining"
        :key="it.id"
        type="button"
        class="pa-quiz-sort__item"
        :class="{
          'is-selected': selected?.id === it.id,
          'is-shaking': shaking === it.id,
        }"
        :aria-label="it.label"
        @click.stop="selectItem(it)"
      >
        {{ it.emoji }}
      </button>

      <div v-if="allDone" class="pa-quiz-sort__done">全部分好啦！⭐</div>
    </div>

    <div class="pa-quiz-sort__content">
      <div class="pa-quiz-sort__prompt">{{ card.zh }}</div>
      <button v-if="allDone" type="button" class="pa-quiz-sort__replay pa-hit" @click.stop="replay">
        再玩一次
      </button>
    </div>
  </div>
</template>

<style scoped>
.pa-quiz-sort {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  gap: 8px;
  padding: 8px 0 0;
}

/* ---------- 收纳篮 ---------- */
.pa-quiz-sort__buckets {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 0 var(--pa-gutter);
  flex: 0 0 auto;
}

.pa-quiz-sort__bucket {
  flex: 1 1 0;
  max-width: 200px;
  min-height: 108px;
  border-radius: var(--pa-r-lg);
  background: rgba(255, 255, 255, 0.9);
  box-shadow: var(--pa-shadow-sm);
  border: 3px dashed var(--pa-line-strong);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 8px 6px;
  transition:
    border-color var(--pa-dur-base),
    background var(--pa-dur-base),
    transform var(--pa-dur-fast) var(--pa-ease-spring);
}

.pa-quiz-sort__bucket.is-target {
  border-color: var(--pa-accent);
  background: var(--pa-accent-soft);
}
.pa-quiz-sort__bucket:active {
  transform: scale(0.97);
}

.pa-quiz-sort__bucket-icon {
  font-size: 30px;
  line-height: 1;
}

.pa-quiz-sort__bucket-label {
  font-size: var(--pa-fs-fact);
  font-weight: 800;
  color: var(--pa-ink-muted);
}

.pa-quiz-sort__bucket-items {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
  justify-content: center;
  margin-top: 2px;
}

.pa-quiz-sort__placed {
  font-size: 20px;
  line-height: 1;
  animation: paDropIn 0.3s var(--pa-ease-spring);
}

@keyframes paDropIn {
  0% {
    transform: scale(0.4) translateY(-14px);
    opacity: 0;
  }
  100% {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

/* ---------- 待分类池 ---------- */
.pa-quiz-sort__pool {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-wrap: wrap;
  align-content: center;
  justify-content: center;
  gap: clamp(8px, 2.5vw, 16px);
  padding: 6px var(--pa-gutter);
}

.pa-quiz-sort__item {
  width: clamp(58px, 17vw, 84px);
  height: clamp(58px, 17vw, 84px);
  border-radius: var(--pa-r-md);
  background: #fff;
  box-shadow: var(--pa-shadow-md);
  font-size: clamp(28px, 8.5vw, 44px);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition:
    transform var(--pa-dur-fast) var(--pa-ease-spring),
    box-shadow var(--pa-dur-base);
}

.pa-quiz-sort__item.is-selected {
  transform: scale(1.12);
  box-shadow:
    0 0 0 4px var(--pa-accent),
    var(--pa-shadow-lg);
}

.pa-quiz-sort__item.is-shaking {
  animation: paJelly3 0.34s var(--pa-ease-in-out);
}

@keyframes paJelly3 {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-7px) rotate(-2deg);
  }
  75% {
    transform: translateX(7px) rotate(2deg);
  }
}

.pa-quiz-sort__done {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-green);
  width: 100%;
  text-align: center;
}

/* ---------- 底部提示 ---------- */
.pa-quiz-sort__content {
  flex: 0 0 auto;
  padding: 0 var(--pa-gutter) 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pa-quiz-sort__prompt {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-ink);
  text-align: center;
}

.pa-quiz-sort__replay {
  font-size: var(--pa-fs-quiz);
  font-weight: 800;
  color: var(--pa-accent-deep);
  background: var(--pa-accent-soft);
  padding: 10px 24px;
  border-radius: var(--pa-r-pill);
  min-height: 52px;
}
</style>
