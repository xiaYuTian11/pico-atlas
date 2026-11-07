<script setup lang="ts">
import type { Card } from '@/content/types';
import CardImage from './parts/CardImage.vue';
import CardText from './parts/CardText.vue';

defineProps<{ card: Card; highlight: string | null }>();
</script>

<template>
  <div class="pa-object">
    <div class="pa-object__visual">
      <CardImage :card-id="card.id" :emoji="card.emoji" :alt="card.zh" />
    </div>
    <div class="pa-object__content">
      <CardText :card="card" :highlight="highlight" />
    </div>
  </div>
</template>

<style scoped>
.pa-object {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
}
.pa-object__visual {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px var(--pa-gutter);
}
.pa-object__content {
  flex: 0 0 auto;
  padding: 4px var(--pa-gutter) 18px;
}
</style>
