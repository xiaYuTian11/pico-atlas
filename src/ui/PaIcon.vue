<script setup lang="ts">
/**
 * 自绘 SVG 图标集 —— 统一尺寸、颜色可控、可加动效。
 * emoji 在跨端渲染差异大，主交互区一律不用 emoji。
 */
defineProps<{
  name:
    | 'chevron-left'
    | 'chevron-right'
    | 'play'
    | 'pause'
    | 'heart'
    | 'heart-filled'
    | 'flip'
    | 'loop'
    | 'tap'
    | 'mute'
    | 'home'
    | 'lock'
    | 'close'
    | 'bulb';
}>();
</script>

<template>
  <svg
    class="pa-icon"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2.4"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <!-- 翻页箭头 -->
    <polyline v-if="name === 'chevron-left'" points="14.5,5 7.5,12 14.5,19" />
    <polyline v-else-if="name === 'chevron-right'" points="9.5,5 16.5,12 9.5,19" />

    <!-- 播放 / 暂停 -->
    <polygon v-else-if="name === 'play'" points="8,5 19,12 8,19" fill="currentColor" stroke="none" />
    <g v-else-if="name === 'pause'" fill="currentColor" stroke="none">
      <rect x="7" y="5" width="3.6" height="14" rx="1.2" />
      <rect x="13.4" y="5" width="3.6" height="14" rx="1.2" />
    </g>

    <!-- 收藏 -->
    <path
      v-else-if="name === 'heart'"
      d="M12 20.4C12 20.4 3.6 15.6 3.6 9.6C3.6 6.6 5.8 4.8 8.2 4.8C9.8 4.8 11.2 5.8 12 7C12.8 5.8 14.2 4.8 15.8 4.8C18.2 4.8 20.4 6.6 20.4 9.6C20.4 15.6 12 20.4 12 20.4Z"
    />
    <path
      v-else-if="name === 'heart-filled'"
      d="M12 20.4C12 20.4 3.6 15.6 3.6 9.6C3.6 6.6 5.8 4.8 8.2 4.8C9.8 4.8 11.2 5.8 12 7C12.8 5.8 14.2 4.8 15.8 4.8C18.2 4.8 20.4 6.6 20.4 9.6C20.4 15.6 12 20.4 12 20.4Z"
      fill="currentColor"
      stroke="none"
    />

    <!-- 翻页即读：喇叭 + 书页 -->
    <g v-else-if="name === 'flip'" stroke-width="2">
      <path d="M4 8.5V15.5L8 14.5V9.5Z" fill="currentColor" stroke="none" />
      <path d="M10 9.2C11.2 10 11.2 14 10 14.8" />
      <path d="M13.4 7C15.6 9 15.6 15 13.4 17" />
      <path d="M17 9.5H20" />
      <path d="M17 12H20" />
      <path d="M17 14.5H20" />
    </g>

    <!-- 单卡循环：锁 + 循环箭头 -->
    <g v-else-if="name === 'loop'" stroke-width="2">
      <path d="M6.2 9.4A6.2 6.2 0 0 1 17.8 9.4" />
      <path d="M17.8 14.6A6.2 6.2 0 0 1 6.2 14.6" />
      <polyline points="17.8,5.6 17.8,9.4 14,9.4" />
      <polyline points="6.2,18.4 6.2,14.6 10,14.6" />
    </g>

    <!-- 自由点读：手指 + 声波 -->
    <g v-else-if="name === 'tap'" stroke-width="2">
      <path d="M9.4 11.6V6.4a1.6 1.6 0 0 1 3.2 0v4.4" />
      <path d="M12.6 10.8V9.4a1.5 1.5 0 0 1 3 0v4.6a4.4 4.4 0 0 1-4.4 4.4h-1a4 4 0 0 1-3.2-1.6l-2.2-3a1.5 1.5 0 0 1 2.4-1.8l1.2 1.2" />
    </g>

    <!-- 静音：喇叭 + 斜杠 -->
    <g v-else-if="name === 'mute'" stroke-width="2">
      <path d="M4 8.5V15.5L8 14.5V9.5Z" fill="currentColor" stroke="none" />
      <path d="M11 9.5L17 14.5" />
      <path d="M17 9.5L11 14.5" />
    </g>

    <!-- 首页 -->
    <g v-else-if="name === 'home'" stroke-width="2">
      <path d="M4 10.5L12 4.5L20 10.5" />
      <path d="M6.5 10V19H17.5V10" />
    </g>

    <!-- 锁 -->
    <g v-else-if="name === 'lock'" stroke-width="2">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.4" />
      <path d="M8.2 10.5V8a3.8 3.8 0 0 1 7.6 0v2.5" />
    </g>

    <!-- 关闭 -->
    <g v-else-if="name === 'close'" stroke-width="2.4">
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </g>

    <!-- 小灯泡 -->
    <g v-else-if="name === 'bulb'" stroke-width="2">
      <path d="M9 17.5h6" />
      <path d="M10 20h4" />
      <path d="M12 3.5a5.5 5.5 0 0 0-3 10.1V15h6v-1.4A5.5 5.5 0 0 0 12 3.5Z" />
    </g>
  </svg>
</template>

<style scoped>
.pa-icon {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
