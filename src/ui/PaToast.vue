<script setup lang="ts">
/**
 * 轻提示 —— 只给家长看的一句话反馈。
 * 孩子不识字，所以所有给孩子看的反馈都必须靠声音 + 动效，
 * toast 只是给家长的补充说明。
 */
import { ref, watch } from 'vue';

const props = defineProps<{ message: string; trigger: number }>();

const visible = ref(false);
let timer: ReturnType<typeof setTimeout> | null = null;

watch(
  () => props.trigger,
  () => {
    if (!props.message) return;
    visible.value = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => (visible.value = false), 1600);
  },
);
</script>

<template>
  <Transition name="pa-toast">
    <div v-if="visible" class="pa-toast" role="status" aria-live="polite">
      {{ message }}
    </div>
  </Transition>
</template>

<style scoped>
.pa-toast {
  position: fixed;
  bottom: calc(var(--pa-bottombar-h) + 14px + env(safe-area-inset-bottom));
  left: 50%;
  transform: translateX(-50%);
  background: rgba(46, 42, 38, 0.92);
  color: #fff;
  font-size: var(--pa-fs-parent);
  font-weight: 700;
  padding: 10px 20px;
  border-radius: var(--pa-r-pill);
  white-space: nowrap;
  z-index: 9000;
  pointer-events: none;
  max-width: 88vw;
  overflow: hidden;
  text-overflow: ellipsis;
  backdrop-filter: blur(8px);
}

.pa-toast-enter-active,
.pa-toast-leave-active {
  transition:
    opacity var(--pa-dur-base) var(--pa-ease-out),
    transform var(--pa-dur-base) var(--pa-ease-spring);
}

.pa-toast-enter-from,
.pa-toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>
