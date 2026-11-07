/**
 * 运行期瞬时状态（不落盘）。
 *
 * 为什么要单独放一个文件：
 *   `store.ts` 里的东西会被持久化成存档，而"现在是不是正在朗读"
 *   是纯瞬时的 UI 状态，写进存档既没意义还会在重启后残留。
 *
 * 谁在用：
 *   - StageShell 在每次 readCard 前后置位
 *   - BottomBar 用它把播放键切成"正在朗读"的样子（播放中要有跳动的动效）
 */
import { ref } from 'vue';

/** 是否有朗读流程正在进行（含自动朗读、巡航、单曲循环） */
export const reading = ref(false);

/** 当前朗读的来源（调试用，也方便以后做埋点） */
export const readingSource = ref<'auto' | 'cruise' | 'loop' | 'manual' | null>(null);

export function beginReading(source: 'auto' | 'cruise' | 'loop' | 'manual'): void {
  reading.value = true;
  readingSource.value = source;
}

export function endReading(): void {
  reading.value = false;
  readingSource.value = null;
}
