<script setup lang="ts">
/**
 * 家长设置面板 —— 长按闸门后进入。
 *
 * 这是 B1（保留 4 态循环）方案的必要配套：
 * 孩子端只有"点一下换模式"，家长端才能精确设定，
 * 还能锁定模式防止孩子改掉。
 */
import { computed } from 'vue';
import type { AgeBand } from '@/content/types';
import { PLAY_MODES, PLAY_MODE_META, SPEECH_RATES, state, sessionMinutes, resetSession } from '@/state/store';
import { playSfx, speak, newSession } from '@/audio/engine';
import { audioZh } from '@/content/media';
import UpdatePanel from './UpdatePanel.vue';
import BackupPanel from './BackupPanel.vue';
import PaIcon from './PaIcon.vue';

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();
void props;

const AGE_OPTIONS: Array<{ id: AgeBand; zh: string; desc: string }> = [
  { id: 'L1', zh: '3–4 岁', desc: '纯大图 + 拟声 + 简短中英' },
  { id: 'L2', zh: '4–5 岁', desc: '加拼音 + 生活短句' },
  { id: 'L3', zh: '5–6 岁', desc: '加小知识 + 完整诗句' },
];

const usedMin = computed(() => sessionMinutes());
const limitMin = computed(() => state.prefs.limitMinutes);

function setAge(id: AgeBand): void {
  state.ageBand = id;
  playSfx('soft');
}

function setMode(m: (typeof PLAY_MODES)[number]): void {
  state.prefs.playMode = m;
  playSfx('soft');
}

function toggleLock(): void {
  state.prefs.modeLocked = !state.prefs.modeLocked;
  playSfx('soft');
}

function setLimit(v: number): void {
  state.prefs.limitMinutes = v;
  playSfx('soft');
}

function toggleSound(): void {
  state.prefs.soundFx = !state.prefs.soundFx;
  playSfx('soft');
}

function setRate(v: number): void {
  state.prefs.speechRate = v;
  playSfx('soft');
}

/** 试听：用真卡片音频，听到的就是孩子听到的 */
function previewRate(): void {
  const ticket = newSession();
  void speak({ url: audioZh('apple'), text: '苹果', lang: 'zh', ticket, timeoutMs: 4000 });
}

function clearFavorites(): void {
  state.favorites.splice(0, state.favorites.length);
  playSfx('pop');
}

function resetTimer(): void {
  resetSession();
  playSfx('chime');
}
</script>

<template>
  <div v-if="open" class="pa-settings" role="dialog" aria-modal="true" aria-label="家长设置">
    <div class="pa-settings__sheet">
      <div class="pa-settings__header">
        <div class="pa-settings__title">家长设置</div>
        <button type="button" class="pa-settings__close pa-hit" aria-label="关闭" @click="emit('close')">
          <PaIcon name="close" />
        </button>
      </div>

      <div class="pa-settings__body">
        <!-- 年龄档 -->
        <section class="pa-settings__group">
          <div class="pa-settings__label">年龄档</div>
          <div class="pa-settings__ages">
            <button
              v-for="a in AGE_OPTIONS"
              :key="a.id"
              type="button"
              class="pa-settings__age"
              :class="{ 'is-active': state.ageBand === a.id }"
              @click="setAge(a.id)"
            >
              <span class="pa-settings__age-zh">{{ a.zh }}</span>
              <span class="pa-settings__age-desc">{{ a.desc }}</span>
            </button>
          </div>
        </section>

        <!-- 播放模式 -->
        <section class="pa-settings__group">
          <div class="pa-settings__label">
            播放模式
            <span class="pa-settings__hint">（孩子端底栏点一下会按顺序切换）</span>
          </div>
          <div class="pa-settings__modes">
            <button
              v-for="m in PLAY_MODES"
              :key="m"
              type="button"
              class="pa-settings__mode"
              :class="{ 'is-active': state.prefs.playMode === m }"
              @click="setMode(m)"
            >
              {{ PLAY_MODE_META[m].zh }}
            </button>
          </div>
          <button
            type="button"
            class="pa-settings__switch"
            :class="{ 'is-on': state.prefs.modeLocked }"
            @click="toggleLock"
          >
            <span class="pa-settings__switch-dot" />
            锁定当前模式（孩子不能改）
          </button>
        </section>

        <!-- 时长 -->
        <section class="pa-settings__group">
          <div class="pa-settings__label">每次时长上限</div>
          <div class="pa-settings__limits">
            <button
              v-for="v in [10, 15, 20, 0]"
              :key="v"
              type="button"
              class="pa-settings__limit"
              :class="{ 'is-active': limitMin === v }"
              @click="setLimit(v)"
            >
              {{ v === 0 ? '不限' : `${v} 分钟` }}
            </button>
          </div>
          <div class="pa-settings__stat">
            本次已用 <b>{{ usedMin }}</b> 分钟 · 累计
            <b>{{ Math.floor(state.stats.totalSeconds / 60) }}</b> 分钟
            <button type="button" class="pa-settings__link" @click="resetTimer">重置本次</button>
          </div>
        </section>

        <!-- 语速 -->
        <section class="pa-settings__group">
          <div class="pa-settings__label">
            朗读语速
            <span class="pa-settings__hint">（预烘焙语音实时变速，不变调）</span>
          </div>
          <div class="pa-settings__limits">
            <button
              v-for="r in SPEECH_RATES"
              :key="r.v"
              type="button"
              class="pa-settings__limit"
              :class="{ 'is-active': state.prefs.speechRate === r.v }"
              @click="setRate(r.v)"
            >
              {{ r.zh }}
            </button>
            <button type="button" class="pa-settings__link" @click="previewRate">试听</button>
          </div>
        </section>

        <!-- 其他 -->
        <section class="pa-settings__group">
          <div class="pa-settings__label">其他</div>
          <button
            type="button"
            class="pa-settings__switch"
            :class="{ 'is-on': state.prefs.soundFx }"
            @click="toggleSound"
          >
            <span class="pa-settings__switch-dot" />
            点击音效
          </button>
          <button type="button" class="pa-settings__danger" @click="clearFavorites">
            清空「我的最爱」（当前 {{ state.favorites.length }} 张）
          </button>
        </section>

        <!-- 备份与恢复 -->
        <section class="pa-settings__group">
          <div class="pa-settings__label">
            存档备份
            <span class="pa-settings__hint">（换手机时用：收藏、进度、家长设置）</span>
          </div>
          <BackupPanel />
        </section>

        <!-- 关于与更新 -->
        <section class="pa-settings__group">
          <div class="pa-settings__label">关于与更新</div>
          <UpdatePanel />
        </section>

        <div class="pa-settings__footer">
          <div class="pa-settings__meta">
            卡片
            {{
              state.progress.look.seen.length +
              state.progress.read.seen.length +
              state.progress.play.seen.length
            }}
            张已看过
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.pa-settings {
  position: fixed;
  inset: 0;
  background: rgba(30, 26, 22, 0.5);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 1100;
}

.pa-settings__sheet {
  background: var(--pa-bg-elevated);
  width: 100%;
  max-width: var(--pa-content-max);
  max-height: 88vh;
  border-radius: var(--pa-r-xl) var(--pa-r-xl) 0 0;
  display: flex;
  flex-direction: column;
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.22);
  padding-bottom: env(safe-area-inset-bottom);
}

.pa-settings__header {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 10px;
  border-bottom: 1px solid var(--pa-line);
}

.pa-settings__title {
  font-size: var(--pa-fs-parent-title);
  font-weight: 900;
  color: var(--pa-ink);
}

.pa-settings__close {
  width: 44px;
  height: 44px;
  color: var(--pa-ink-muted);
  padding: 10px;
}

.pa-settings__body {
  flex: 1 1 auto;
  overflow-y: auto;
  padding: 16px 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 22px;
  -webkit-overflow-scrolling: touch;
}

.pa-settings__group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pa-settings__label {
  font-size: var(--pa-fs-parent);
  font-weight: 800;
  color: var(--pa-ink-muted);
  letter-spacing: 0.5px;
}

.pa-settings__hint {
  font-weight: 500;
  color: var(--pa-ink-faint);
}

/* ---------- 年龄 ---------- */
.pa-settings__ages {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.pa-settings__age {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
  padding: 12px 16px;
  border-radius: var(--pa-r-md);
  background: var(--pa-card);
  box-shadow: var(--pa-shadow-sm);
  border: 2px solid transparent;
  transition: border-color var(--pa-dur-base);
  text-align: left;
}
.pa-settings__age.is-active {
  border-color: var(--pa-accent);
  background: var(--pa-accent-soft);
}

.pa-settings__age-zh {
  font-size: var(--pa-fs-parent-title);
  font-weight: 900;
  color: var(--pa-ink);
}

.pa-settings__age-desc {
  font-size: 13px;
  color: var(--pa-ink-muted);
}

/* ---------- 模式 ---------- */
.pa-settings__modes {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.pa-settings__mode {
  padding: 12px 10px;
  border-radius: var(--pa-r-md);
  background: var(--pa-card);
  box-shadow: var(--pa-shadow-sm);
  font-size: var(--pa-fs-parent);
  font-weight: 700;
  color: var(--pa-ink);
  border: 2px solid transparent;
  min-height: 52px;
}
.pa-settings__mode.is-active {
  border-color: var(--pa-accent);
  background: var(--pa-accent-soft);
  color: var(--pa-accent-deep);
}

/* ---------- 开关 ---------- */
.pa-settings__switch {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-radius: var(--pa-r-md);
  background: var(--pa-card);
  box-shadow: var(--pa-shadow-sm);
  font-size: var(--pa-fs-parent);
  font-weight: 700;
  color: var(--pa-ink);
  min-height: 52px;
  text-align: left;
}

.pa-settings__switch-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--pa-line-strong);
  flex: 0 0 22px;
  transition: background var(--pa-dur-base);
}
.pa-settings__switch.is-on .pa-settings__switch-dot {
  background: var(--pa-green);
  box-shadow: 0 0 0 4px var(--pa-green-soft);
}

/* ---------- 时长 ---------- */
.pa-settings__limits {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pa-settings__limit {
  padding: 10px 16px;
  border-radius: var(--pa-r-pill);
  background: var(--pa-card);
  box-shadow: var(--pa-shadow-sm);
  font-size: var(--pa-fs-parent);
  font-weight: 700;
  color: var(--pa-ink);
  border: 2px solid transparent;
  min-height: 44px;
}
.pa-settings__limit.is-active {
  border-color: var(--pa-accent);
  background: var(--pa-accent-soft);
  color: var(--pa-accent-deep);
}

.pa-settings__stat {
  font-size: 13px;
  color: var(--pa-ink-muted);
  line-height: 1.6;
}

.pa-settings__link {
  font-size: 13px;
  font-weight: 700;
  color: var(--pa-accent-deep);
  text-decoration: underline;
  margin-left: 6px;
}

.pa-settings__danger {
  padding: 12px 16px;
  border-radius: var(--pa-r-md);
  background: #fff1f0;
  color: var(--pa-red);
  font-size: var(--pa-fs-parent);
  font-weight: 800;
  min-height: 52px;
}

.pa-settings__footer {
  padding-top: 4px;
  border-top: 1px solid var(--pa-line);
}

.pa-settings__meta {
  font-size: 13px;
  color: var(--pa-ink-faint);
}
</style>
