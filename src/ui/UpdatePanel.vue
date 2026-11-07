<script setup lang="ts">
/**
 * 家长层里的"关于与更新"。
 *
 * 孩子端看不到；更新失败也只提示文字，绝不打断使用。
 */
import { onMounted, ref } from 'vue';
import { checkUpdate, currentVersion, downloadAndInstall, isNative, type UpdateInfo } from '@/update/updater';

const version = ref('—');
const state = ref<'idle' | 'checking' | 'available' | 'latest' | 'error' | 'downloading'>('idle');
const info = ref<UpdateInfo | null>(null);
const progress = ref(0);
const message = ref('');

onMounted(async () => {
  version.value = await currentVersion();
});

async function check(): Promise<void> {
  if (state.value === 'checking' || state.value === 'downloading') return;
  state.value = 'checking';
  message.value = '';
  const r = await checkUpdate();
  if (!r) {
    state.value = 'error';
    message.value = '暂时连不上更新源（仓库可能是私有的，或网络不通）';
    return;
  }
  info.value = r;
  version.value = r.current;
  if (r.hasUpdate) {
    state.value = 'available';
  } else {
    state.value = 'latest';
  }
}

async function install(): Promise<void> {
  if (!info.value?.url) return;
  state.value = 'downloading';
  progress.value = 0;
  const r = await downloadAndInstall(info.value.url, info.value.latest, (p) => (progress.value = p));
  if (r.ok) {
    message.value = '已调起安装器，按提示完成安装即可';
  } else if (r.error === 'web') {
    message.value = '浏览器里已打开下载链接';
  } else if (r.error?.includes('need_permission')) {
    message.value = '请先允许"安装未知应用"，再点一次下载';
  } else {
    message.value = `更新失败：${r.error ?? '未知原因'}`;
  }
  state.value = 'available';
}
</script>

<template>
  <section class="pa-update">
    <div class="pa-update__row">
      <div class="pa-update__label">版本</div>
      <div class="pa-update__value">v{{ version }}</div>
      <button
        type="button"
        class="pa-update__btn"
        :disabled="state === 'checking' || state === 'downloading'"
        @click="check"
      >
        {{ state === 'checking' ? '检查中…' : '检查更新' }}
      </button>
    </div>

    <div v-if="state === 'latest'" class="pa-update__tip">已经是最新版本</div>

    <div v-if="info?.hasUpdate && (state === 'available' || state === 'downloading')" class="pa-update__card">
      <div class="pa-update__ver">发现新版本 v{{ info.latest }}</div>
      <div v-if="info.notes" class="pa-update__notes">{{ info.notes }}</div>
      <div v-if="info.size" class="pa-update__size">
        {{ (info.size / 1024 / 1024).toFixed(1) }} MB
        <span v-if="!isNative()">· 浏览器环境会打开下载链接</span>
      </div>
      <button
        v-if="state !== 'downloading'"
        type="button"
        class="pa-update__install"
        @click="install"
      >
        下载并安装
      </button>
      <div v-else class="pa-update__progress">
        <div class="pa-update__bar"><span :style="{ width: `${progress}%` }" /></div>
        <div class="pa-update__pct">{{ progress }}%</div>
      </div>
    </div>

    <div v-if="message" class="pa-update__tip pa-update__tip--warn">{{ message }}</div>
  </section>
</template>

<style scoped>
.pa-update {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pa-update__row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pa-update__label {
  font-size: 14px;
  font-weight: 800;
  color: var(--pa-ink-muted);
}

.pa-update__value {
  flex: 1 1 auto;
  font-size: 14px;
  font-weight: 700;
  color: var(--pa-ink);
}

.pa-update__btn {
  padding: 9px 14px;
  border-radius: var(--pa-r-pill);
  background: #f0e8dd;
  color: var(--pa-ink);
  font-size: 13px;
  font-weight: 800;
  min-height: 40px;
}
.pa-update__btn:disabled {
  opacity: 0.5;
}

.pa-update__tip {
  font-size: 13px;
  font-weight: 600;
  color: var(--pa-ink-muted);
}
.pa-update__tip--warn {
  color: var(--pa-red);
}

.pa-update__card {
  background: #fff;
  border-radius: var(--pa-r-md);
  padding: 12px 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  box-shadow: var(--pa-shadow-sm);
}

.pa-update__ver {
  font-size: 15px;
  font-weight: 900;
  color: var(--pa-accent-deep);
}

.pa-update__notes {
  font-size: 12px;
  line-height: 1.5;
  color: var(--pa-ink-muted);
  white-space: pre-wrap;
  max-height: 120px;
  overflow-y: auto;
}

.pa-update__size {
  font-size: 12px;
  color: var(--pa-ink-faint);
}

.pa-update__install {
  align-self: flex-start;
  padding: 10px 18px;
  border-radius: var(--pa-r-pill);
  background: var(--pa-accent);
  color: #fff;
  font-size: 14px;
  font-weight: 900;
  box-shadow: var(--pa-shadow-accent);
  min-height: 44px;
}

.pa-update__progress {
  display: flex;
  align-items: center;
  gap: 10px;
}

.pa-update__bar {
  flex: 1 1 auto;
  height: 8px;
  border-radius: 999px;
  background: #efe6dc;
  overflow: hidden;
}
.pa-update__bar span {
  display: block;
  height: 100%;
  background: var(--pa-accent);
  transition: width 0.2s linear;
}

.pa-update__pct {
  font-size: 12px;
  font-weight: 800;
  color: var(--pa-ink-muted);
  min-width: 36px;
  text-align: right;
}
</style>
