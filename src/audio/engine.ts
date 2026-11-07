/**
 * 音频引擎 —— 会话作废机制（全项目最关键的一段）。
 *
 * 问题：3 岁孩子会在朗读过程中疯狂点击/翻页。如果只用 setTimeout + audio.play，
 * 会出现"幽灵播放"：上一张卡片的朗读在翻页后才冒出来。
 *
 * 解法：全局递增 playSessionId。每次朗读流程持有一个票据，
 * 任何打断动作（翻页/暂停/返回/切模式/切后台）都把票据作废。
 * 所有 await 点回来后第一件事就是检查票据是否还有效。
 *
 * 音频来源优先级：
 *   1. 预烘焙 mp3（public/media/audio/**）
 *   2. Web Speech（仅开发期兜底，上线禁止依赖，见 PRD 红线）
 *
 * 关键：Audio 实例池化复用。绝不每次 new Audio —— 狂点场景下会造成解码风暴。
 */

import { audioSfx } from '@/content/media';
import { state } from '@/state/store';

let sessionId = 0;
let currentTrack: HTMLAudioElement | null = null;
let speakSeq = 0;

/** 音频元素池：按 URL 复用，避免重复解码 */
const pool = new Map<string, HTMLAudioElement>();

function acquire(url: string): HTMLAudioElement {
  let el = pool.get(url);
  if (!el) {
    el = new Audio();
    el.preload = 'auto';
    el.src = url;
    pool.set(url, el);
  }
  return el;
}

/** 预加载一组 URL（进入某个分区时调用，减少首次播放延迟） */
export function preload(urls: Array<string | undefined>): void {
  for (const u of urls) {
    if (!u) continue;
    const el = acquire(u);
    if (el.readyState === 0) el.load();
  }
}

/** 当前会话票据 */
export function currentSession(): number {
  return sessionId;
}

/** 作废所有进行中的播放（原子打断） */
export function stopAll(): void {
  sessionId++;
  speakSeq++;
  if (currentTrack) {
    try {
      currentTrack.pause();
      currentTrack.currentTime = 0;
    } catch {
      /* 已销毁 */
    }
    currentTrack = null;
  }
  if ('speechSynthesis' in window) {
    try {
      speechSynthesis.cancel();
    } catch {
      /* 无 TTS 环境 */
    }
  }
}

/** 新开一个朗读会话，返回票据 */
export function newSession(): number {
  sessionId++;
  return sessionId;
}

/** 票据是否还有效 */
export function alive(ticket: number): boolean {
  return ticket === sessionId;
}

/**
 * 会话安全 sleep：期间若被作废，立即返回 false 终止流程。
 * 替代裸 setTimeout，是消灭幽灵播放的核心。
 */
export function sleep(ms: number, ticket: number): Promise<boolean> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve(alive(ticket)), ms);
    // 被打断时也要尽快释放，不等到超时
    const check = setInterval(() => {
      if (!alive(ticket)) {
        clearTimeout(t);
        clearInterval(check);
        resolve(false);
      }
    }, 60);
    setTimeout(() => clearInterval(check), ms + 10);
  });
}

interface SpeakOptions {
  /** 预烘焙音频 URL；没有则走 WebSpeech */
  url?: string;
  /** WebSpeech 兜底文本 */
  text: string;
  lang?: 'zh' | 'en';
  ticket: number;
  /** 超时保护（毫秒），防止卡死 */
  timeoutMs?: number;
}

/**
 * 播一段音频，等它播完（或被打断）。
 * 返回 true = 正常播完；false = 被打断 / 失败。
 */
export async function speak(opts: SpeakOptions): Promise<boolean> {
  const { url, text, lang = 'zh', ticket, timeoutMs = 8000 } = opts;

  if (!alive(ticket)) return false;
  if (state.prefs.playMode === 'quiet_mute') {
    // 静音模式下不发声，但仍走完节奏（由调用方决定是否 sleep）
    return true;
  }

  // 打断上一段（同一时刻只允许一段）
  if (currentTrack) {
    try {
      currentTrack.pause();
      currentTrack.currentTime = 0;
    } catch {
      /* noop */
    }
    currentTrack = null;
  }

  if (url) {
    return speakAudio(url, ticket, timeoutMs);
  }
  return speakWebSpeech(text, lang, ticket, timeoutMs);
}

function speakAudio(url: string, ticket: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const el = acquire(url);
    currentTrack = el;

    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      el.onended = null;
      el.onerror = null;
      resolve(ok);
    };

    const guard = setTimeout(() => finish(alive(ticket)), timeoutMs);

    el.onended = () => finish(alive(ticket));
    el.onerror = () => {
      // 音频文件坏了：回退 WebSpeech 是安全的，因为这里只是兜底
      currentTrack = null;
      finish(false);
    };

    el.currentTime = 0;
    const p = el.play();
    if (p && typeof p.catch === 'function') {
      p.catch(() => {
        // 自动播放被浏览器拦截，或用户还没交互过
        finish(false);
      });
    }
  });
}

function speakWebSpeech(text: string, lang: 'zh' | 'en', ticket: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !text) {
      resolve(false);
      return;
    }
    const seq = ++speakSeq;
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve(ok);
    };
    const guard = setTimeout(() => finish(alive(ticket)), timeoutMs);

    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'en' ? 'en-US' : 'zh-CN';
      u.rate = lang === 'en' ? 0.78 : 0.72;
      u.pitch = 1.05;
      u.onend = () => {
        if (seq === speakSeq) finish(alive(ticket));
      };
      u.onerror = () => finish(false);
      speechSynthesis.speak(u);
    } catch {
      finish(false);
    }
  });
}

/* ---------------- 合成音效（Web Audio，零素材） ---------------- */

let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (audioCtx) {
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  }
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  audioCtx = new AC();
  return audioCtx;
}

/** 首次用户手势时调用，解锁 iOS 音频 */
export function unlockAudio(): void {
  const c = ctx();
  if (c && c.state === 'suspended') void c.resume();
}

type SfxName =
  | 'pop'
  | 'chime'
  | 'meow'
  | 'bark'
  | 'didi'
  | 'train'
  | 'water'
  | 'yawn'
  | 'sparkle'
  | 'soft';

/**
 * 播一个音效。
 * 优先用 public/media/audio/sfx/<name>.mp3（真实录音）；
 * 没有则用 Web Audio 合成，保证"任何点击都有声音反馈"。
 */
export function playSfx(name: string): void {
  if (!state.prefs.soundFx) return;
  const real = audioSfx(name);
  if (real) {
    const el = acquire(real);
    el.currentTime = 0;
    void el.play().catch(() => synth(name as SfxName));
    return;
  }
  synth(name as SfxName);
}

function synth(name: SfxName): void {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime;
  const master = c.createGain();
  master.gain.value = 1;
  master.connect(c.destination);

  const tone = (
    freq: number,
    type: OscillatorType,
    dur: number,
    peak: number,
    ramp: 'exp' | 'lin' = 'exp',
    delay = 0,
  ): void => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t + delay);
    gain.gain.setValueAtTime(peak, t + delay);
    if (ramp === 'exp') gain.gain.exponentialRampToValueAtTime(0.008, t + delay + dur);
    else gain.gain.linearRampToValueAtTime(0.008, t + delay + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t + delay);
    osc.stop(t + delay + dur + 0.01);
  };

  switch (name) {
    case 'chime':
      tone(523.25, 'sine', 0.4, 0.22, 'exp', 0);
      tone(659.25, 'sine', 0.4, 0.2, 'exp', 0.06);
      tone(783.99, 'sine', 0.42, 0.18, 'exp', 0.12);
      break;
    case 'sparkle':
      [880, 1100, 1320, 1540].forEach((f, i) => tone(f, 'sine', 0.22, 0.14, 'exp', i * 0.05));
      break;
    case 'meow': {
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(430, t);
      osc.frequency.linearRampToValueAtTime(820, t + 0.16);
      osc.frequency.linearRampToValueAtTime(520, t + 0.4);
      gain.gain.setValueAtTime(0.02, t);
      gain.gain.linearRampToValueAtTime(0.3, t + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.44);
      osc.connect(gain);
      gain.connect(master);
      osc.start(t);
      osc.stop(t + 0.46);
      break;
    }
    case 'bark':
      tone(260, 'sawtooth', 0.1, 0.24, 'exp', 0);
      tone(260, 'sawtooth', 0.1, 0.22, 'exp', 0.14);
      break;
    case 'didi':
      tone(330, 'sawtooth', 0.26, 0.18, 'lin', 0);
      tone(395, 'sawtooth', 0.26, 0.16, 'lin', 0);
      break;
    case 'train':
      tone(350, 'triangle', 0.7, 0.22, 'exp', 0);
      tone(440, 'triangle', 0.7, 0.2, 'exp', 0);
      break;
    case 'water':
      [0, 0.07, 0.14].forEach((d, i) => tone(520 + i * 130, 'sine', 0.1, 0.18, 'exp', d));
      break;
    case 'yawn':
      tone(320, 'sine', 0.9, 0.18, 'lin', 0);
      break;
    case 'soft':
      tone(300, 'sine', 0.14, 0.1);
      break;
    case 'pop':
    default:
      tone(420, 'sine', 0.09, 0.26);
      break;
  }
}
