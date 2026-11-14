import { reactive, watch } from 'vue';
import type { AgeBand, Lane } from '@/content/types';

/**
 * 全局状态 + 本地持久化。
 *
 * 存储后端自动选择：
 *   - Capacitor Preferences（装了原生壳时）
 *   - localStorage（浏览器 / PWA）
 * 两者接口一致，上层无感。
 */

const STORAGE_KEY = 'pico-atlas:v2';

export type PlayMode = 'flip_and_read' | 'single_loop' | 'tap_to_read' | 'quiet_mute';

export const PLAY_MODES: PlayMode[] = ['flip_and_read', 'single_loop', 'tap_to_read', 'quiet_mute'];

export const PLAY_MODE_META: Record<
  PlayMode,
  { zh: string; short: string; desc: string; icon: string; voice: 'flip' | 'loop' | 'tap' | 'mute' }
> = {
  flip_and_read: {
    zh: '翻页即读',
    short: '翻页读',
    desc: '翻一页，读一页',
    icon: 'flip',
    voice: 'flip',
  },
  single_loop: {
    zh: '一直读这一页',
    short: '单页循环',
    desc: '读完一遍，再读一遍',
    icon: 'loop',
    voice: 'loop',
  },
  tap_to_read: {
    zh: '点哪里读哪里',
    short: '点读',
    desc: '点一下，才出声',
    icon: 'tap',
    voice: 'tap',
  },
  quiet_mute: {
    zh: '安静看书',
    short: '静音',
    desc: '只翻图，不出声',
    icon: 'mute',
    voice: 'mute',
  },
};

/** 可选语速档位（1 = 预烘焙音频原速） */
export const SPEECH_RATES: Array<{ v: number; zh: string }> = [
  { v: 0.8, zh: '慢' },
  { v: 0.9, zh: '稍慢' },
  { v: 1, zh: '正常' },
  { v: 1.15, zh: '快' },
];

export interface LaneProgress {
  lastId: string | null;
  seen: string[];
}

export interface AppState {
  v: 2;
  /** 年龄档，null = 还没选 */
  ageBand: AgeBand | null;
  progress: Record<Lane | 'favorites', LaneProgress>;
  favorites: string[];
  /** 最近看过（新的在前，最多 24 张）—— 复习用 */
  recent: string[];
  prefs: {
    playMode: PlayMode;
    /** 家长可锁定模式，防止孩子在舞台乱点 */
    modeLocked: boolean;
    /** 自动巡航每张停留 */
    cruiseHoldMs: number;
    /** 每日时长上限（分钟），0 = 不限 */
    limitMinutes: number;
    /** 音效开关 */
    soundFx: boolean;
    /** 朗读语速倍率：孩子们听不清就调慢 */
    speechRate: number;
  };
  session: {
    /** 本次已用秒数 */
    currentSessionSeconds: number;
    /** 是否已进入晚安态 */
    isSleeping: boolean;
  };
  stats: {
    totalSeconds: number;
    lastOpenAt: string | null;
  };
}

function defaultState(): AppState {
  return {
    v: 2,
    ageBand: null,
    progress: {
      look: { lastId: null, seen: [] },
      read: { lastId: null, seen: [] },
      play: { lastId: null, seen: [] },
      favorites: { lastId: null, seen: [] },
    },
    // 默认空！不给孩子"不是自己收的"假数据
    favorites: [],
    recent: [],
    prefs: {
      playMode: 'flip_and_read',
      modeLocked: false,
      cruiseHoldMs: 1400,
      limitMinutes: 15,
      soundFx: true,
      speechRate: 1,
    },
    session: { currentSessionSeconds: 0, isSleeping: false },
    stats: { totalSeconds: 0, lastOpenAt: null },
  };
}

/** 深合并，保证旧存档升级后不缺字段 */
function mergeState(base: AppState, loaded: Partial<AppState>): AppState {
  return {
    ...base,
    ...loaded,
    progress: { ...base.progress, ...(loaded.progress ?? {}) },
    prefs: { ...base.prefs, ...(loaded.prefs ?? {}) },
    session: { ...base.session, ...(loaded.session ?? {}) },
    stats: { ...base.stats, ...(loaded.stats ?? {}) },
    favorites: Array.isArray(loaded.favorites) ? loaded.favorites : [],
    recent: Array.isArray(loaded.recent) ? loaded.recent.slice(0, 24) : [],
  };
}

/* ---------------- 存储适配 ---------------- */

interface Storage {
  get(key: string): Promise<{ value: string | null } | null>;
  set(key: string, value: string): Promise<void>;
}

const capacitorPrefs = (
  globalThis as unknown as {
    Capacitor?: { Plugins?: { Preferences?: Storage } };
  }
).Capacitor?.Plugins?.Preferences;

const storage: Storage = capacitorPrefs
  ? {
      get: (k) => capacitorPrefs.get(k),
      set: (k, v) => capacitorPrefs.set(k, v).then(() => undefined),
    }
  : {
      get: async (k) => {
        try {
          return { value: localStorage.getItem(k) };
        } catch {
          return null;
        }
      },
      set: async (k, v) => {
        try {
          localStorage.setItem(k, v);
        } catch {
          /* 隐私模式 / 存储满，静默降级为内存态 */
        }
      },
    };

/* ---------------- 状态实例 ---------------- */

export const state = reactive<AppState>(defaultState());

let saveTimer: ReturnType<typeof setTimeout> | null = null;

/** 本地自然日。不能用 toISOString：那是 UTC，北京时间凌晨 0–8 点会被算成同一天。 */
function localDay(d: Date = new Date()): string {
  const p = (n: number): string => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function persist(): void {
  if (saveTimer) clearTimeout(saveTimer);
  // 防抖：狂点收藏时不疯狂写盘
  saveTimer = setTimeout(() => {
    void storage.set(STORAGE_KEY, JSON.stringify(state));
  }, 300);
}

export async function initState(): Promise<void> {
  const raw = await storage.get(STORAGE_KEY);
  const text = raw?.value ?? null;
  let loaded: Partial<AppState> | null = null;
  if (text) {
    try {
      const parsed = JSON.parse(text) as Partial<AppState>;
      if (parsed && typeof parsed === 'object') loaded = parsed;
    } catch {
      /* 存档损坏，用默认值，不阻塞启动 */
    }
  }
  if (loaded) Object.assign(state, mergeState(defaultState(), loaded));

  // 防沉迷按自然日重置：跨天开新局，不把昨天的时长算到今天
  const lastOpen = state.stats.lastOpenAt ? new Date(state.stats.lastOpenAt) : null;
  const lastDay = lastOpen && !Number.isNaN(lastOpen.getTime()) ? localDay(lastOpen) : '';
  if (lastDay !== localDay()) state.session.currentSessionSeconds = 0;

  state.stats.lastOpenAt = new Date().toISOString();
  state.session.isSleeping = false;
  persist();
}

/** 任何状态改动自动落盘 */
watch(state, persist, { deep: true });

/* ---------------- 便捷操作 ---------------- */

export function setAgeBand(band: AgeBand): void {
  state.ageBand = band;
}

export function toggleFavorite(id: string): boolean {
  const i = state.favorites.indexOf(id);
  if (i >= 0) {
    state.favorites.splice(i, 1);
    return false;
  }
  state.favorites.push(id);
  return true;
}

export function isFavorite(id: string): boolean {
  return state.favorites.includes(id);
}

export function markSeen(lane: Lane, id: string): void {
  const p = state.progress[lane];
  if (!p.seen.includes(id)) p.seen.push(id);
  p.lastId = id;
  pushRecent(id);
}

/** 维护"最近看过"：去重 + 新的在前 + 上限 24 */
export function pushRecent(id: string): void {
  const i = state.recent.indexOf(id);
  if (i >= 0) state.recent.splice(i, 1);
  state.recent.unshift(id);
  if (state.recent.length > 24) state.recent.length = 24;
}

export function setLastId(lane: Lane | 'favorites' | 'recent', id: string): void {
  const key = lane === 'recent' ? 'favorites' : lane;
  const p = state.progress[key];
  if (p) p.lastId = id;
}

export function cyclePlayMode(): PlayMode {
  const i = PLAY_MODES.indexOf(state.prefs.playMode);
  state.prefs.playMode = PLAY_MODES[(i + 1) % PLAY_MODES.length];
  return state.prefs.playMode;
}

/* ---------------- 会话计时（防沉迷） ---------------- */

let tickTimer: ReturnType<typeof setInterval> | null = null;

/** 每 30 秒累加一次，省电且够精确 */
export function startSessionTimer(onReachLimit: () => void): void {
  if (tickTimer) return;
  tickTimer = setInterval(() => {
    if (state.session.isSleeping) return;
    state.session.currentSessionSeconds += 30;
    state.stats.totalSeconds += 30;
    const limit = state.prefs.limitMinutes * 60;
    if (limit > 0 && state.session.currentSessionSeconds >= limit) {
      state.session.isSleeping = true;
      onReachLimit();
    }
  }, 30_000);
}

export function stopSessionTimer(): void {
  if (tickTimer) {
    clearInterval(tickTimer);
    tickTimer = null;
  }
}

/** 晚安仪式后家长重置 */
export function resetSession(): void {
  state.session.currentSessionSeconds = 0;
  state.session.isSleeping = false;
}

/** 导出存档（家长备份用） */
export function exportSnapshot(): string {
  return JSON.stringify(state, null, 2);
}

/** 导入存档：只接受合法对象，失败不破坏现有数据 */
export function importSnapshot(text: string): boolean {
  try {
    const parsed = JSON.parse(text) as Partial<AppState>;
    if (!parsed || typeof parsed !== 'object' || typeof parsed.v !== 'number') return false;
    Object.assign(state, mergeState(defaultState(), parsed));
    persist();
    return true;
  } catch {
    return false;
  }
}

/** 本次已用分钟（用于家长面板显示） */
export function sessionMinutes(): number {
  return Math.floor(state.session.currentSessionSeconds / 60);
}
