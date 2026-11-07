<script setup lang="ts">
/**
 * 存档备份 / 恢复。
 *
 * 自用场景换手机是必然会发生的 —— 收藏、看过的进度、家长设置都在这份 JSON 里。
 * 不做云同步（没服务器），就做最朴素的：复制出去、粘贴回来。
 */
import { ref } from 'vue';
import { exportSnapshot, importSnapshot } from '@/state/store';
import { playSfx } from '@/audio/engine';

const text = ref('');
const mode = ref<'idle' | 'exported' | 'imported' | 'failed'>('idle');

function doExport(): void {
  text.value = exportSnapshot();
  mode.value = 'exported';
  playSfx('soft');
  void copy();
}

async function copy(): Promise<void> {
  if (!text.value) return;
  try {
    await navigator.clipboard.writeText(text.value);
    mode.value = 'exported';
  } catch {
    /* 浏览器不给剪贴板权限时，让用户手动全选复制 */
  }
}

function doImport(): void {
  const ok = importSnapshot(text.value.trim());
  mode.value = ok ? 'imported' : 'failed';
  playSfx(ok ? 'chime' : 'soft');
}
</script>

<template>
  <section class="pa-backup">
    <div class="pa-backup__row">
      <button type="button" class="pa-backup__btn" @click="doExport">导出存档</button>
      <button type="button" class="pa-backup__btn" @click="copy" :disabled="!text">复制</button>
      <button
        type="button"
        class="pa-backup__btn pa-backup__btn--primary"
        @click="doImport"
        :disabled="!text"
      >
        从文本恢复
      </button>
    </div>

    <textarea
      v-model="text"
      class="pa-backup__ta"
      rows="4"
      spellcheck="false"
      placeholder="点「导出存档」把这段文字复制到备忘录；换手机时粘贴回来点「从文本恢复」。"
    />

    <div v-if="mode === 'exported'" class="pa-backup__tip">已生成，点「复制」保存到备忘录</div>
    <div v-if="mode === 'imported'" class="pa-backup__tip pa-backup__tip--ok">恢复成功</div>
    <div v-if="mode === 'failed'" class="pa-backup__tip pa-backup__tip--warn">这段内容不是有效的存档</div>
  </section>
</template>

<style scoped>
.pa-backup {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pa-backup__row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pa-backup__btn {
  padding: 9px 14px;
  border-radius: var(--pa-r-pill);
  background: #f0e8dd;
  color: var(--pa-ink);
  font-size: 13px;
  font-weight: 800;
  min-height: 40px;
}
.pa-backup__btn--primary {
  background: var(--pa-accent);
  color: #fff;
}
.pa-backup__btn:disabled {
  opacity: 0.45;
}

.pa-backup__ta {
  width: 100%;
  border-radius: var(--pa-r-md);
  border: 1px solid var(--pa-line-strong);
  background: #fff;
  padding: 10px;
  font-size: 11px;
  line-height: 1.45;
  font-family: ui-monospace, SFMono-Regular, Consolas, monospace;
  color: var(--pa-ink-muted);
  resize: vertical;
  user-select: text;
  -webkit-user-select: text;
}

.pa-backup__tip {
  font-size: 12px;
  font-weight: 700;
  color: var(--pa-ink-muted);
}
.pa-backup__tip--ok {
  color: var(--pa-green, #4fa88b);
}
.pa-backup__tip--warn {
  color: var(--pa-red, #e05b5b);
}
</style>
