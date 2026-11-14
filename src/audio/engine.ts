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

    // 语速：家长可在设置里调慢。preservesPitch 保证变速不变调（否则会变成小黄人）。
    const rate = state.prefs.speechRate || 1;
    el.preservesPitch = true;
    (el as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true;
    el.playbackRate = rate;
    el.defaultPlaybackRate = rate;

    let settled = false;
    let guard: ReturnType<typeof setTimeout> | undefined;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      if (guard !== undefined) clearTimeout(guard);
      el.removeEventListener('loadedmetadata', onMeta);
      el.onended = null;
      el.onerror = null;
      resolve(ok);
    };

    /**
     * 卡死保护。默认用 8 秒兜底，但故事 L3 有的读到 10 秒——
     * 固定 8 秒会在朗读还没结束时就当“读完了”，自动巡航直接翻页，
     * 孩子听到一半被切掉。所以拿到真实时长后按「时长 / 语速 + 余量」重算。
     */
    const armGuard = (ms: number): void => {
      if (settled) return;
      if (guard !== undefined) clearTimeout(guard);
      guard = setTimeout(() => finish(alive(ticket)), ms);
    };
    const onMeta = (): void => {
      const dur = el.duration;
      if (Number.isFinite(dur) && dur > 0) armGuard((dur / rate) * 1000 + 1200);
    };

    el.addEventListener('loadedmetadata', onMeta);
    armGuard(timeoutMs);
    onMeta(); // 预加载过的话 metadata 已经在了，不会再有事件，这里直接按真实时长重算

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

function speakWebSpeech(
  text: string,
  lang: 'zh' | 'en',
  ticket: number,
  timeoutMs: number,
): Promise<boolean> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window) || !text) {
      resolve(false);
      return;
    }
    const seq = ++speakSeq;
    const rate = state.prefs.speechRate || 1;
    let settled = false;
    const finish = (ok: boolean): void => {
      if (settled) return;
      settled = true;
      clearTimeout(guard);
      resolve(ok);
    };
    // 按字数估个说话时长来定超时：短句 8 秒够，故事整段就不够了。
    const estimatedMs = ((lang === 'en' ? 80 : 240) * text.length) / Math.min(2, 0.75 * rate);
    const guard = setTimeout(() => finish(alive(ticket)), Math.max(timeoutMs, estimatedMs + 1500));

    try {
      const u = new SpeechSynthesisUtterance(text);
      u.lang = lang === 'en' ? 'en-US' : 'zh-CN';
      u.rate = Math.min(2, (lang === 'en' ? 0.78 : 0.72) * rate);
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
  const AC =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
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
  | 'soft'
  | 'duck'
  | 'rooster'
  | 'rain'
  | 'sheep'
  | 'bird';

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

/**
 * 合成音效（无素材时的兜底）。
 *
 * 原则：**宁可"像"，不可"响"**。
 * 3 岁对声音的辨识比成人敏感 —— 一声假猫叫会立刻被识破，
 * 所以这里用"基频滑移 + 共振峰滤波 + 噪声气息"三层叠加，
 * 而不是一个正弦音敷衍过去。
 *
 * 想更真实：把真实录音放进 public/media/audio/sfx/<name>.mp3，
 * playSfx 会优先用它，这里就自动退居兜底。
 */
function synth(name: SfxName): void {
  const c = ctx();
  if (!c) return;
  const t = c.currentTime;
  const master = c.createGain();
  master.gain.value = 1;
  master.connect(c.destination);

  /** 单音：可给起点/终点频率做滑音 */
  const tone = (
    freq: number,
    type: OscillatorType,
    dur: number,
    peak: number,
    delay = 0,
    endFreq?: number,
  ): void => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t + delay);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(30, endFreq), t + delay + dur);
    gain.gain.setValueAtTime(peak, t + delay);
    gain.gain.exponentialRampToValueAtTime(0.004, t + delay + dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t + delay);
    osc.stop(t + delay + dur + 0.02);
  };

  /** 噪声：气息、水、脚步、火车都靠它 */
  const noise = (
    dur: number,
    type: BiquadFilterType,
    freq: number,
    q: number,
    peak: number,
    delay = 0,
    endFreq?: number,
  ): void => {
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const filt = c.createBiquadFilter();
    filt.type = type;
    filt.Q.value = q;
    filt.frequency.setValueAtTime(freq, t + delay);
    if (endFreq) filt.frequency.exponentialRampToValueAtTime(Math.max(60, endFreq), t + delay + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(peak, t + delay);
    g.gain.exponentialRampToValueAtTime(0.002, t + delay + dur);
    src.connect(filt);
    filt.connect(g);
    g.connect(master);
    src.start(t + delay);
    src.stop(t + delay + dur + 0.02);
  };

  /** 滑音 + 颤音：猫叫、羊叫这类"活物"的声音（delay 可选，支持多声连叫） */
  const voice = (
    startFreq: number,
    midFreq: number,
    endFreq: number,
    dur: number,
    peak: number,
    vibratoHz = 6,
    delay = 0,
  ): void => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, t + delay);
    osc.frequency.linearRampToValueAtTime(midFreq, t + delay + dur * 0.45);
    osc.frequency.linearRampToValueAtTime(endFreq, t + delay + dur);

    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = vibratoHz;
    lfoGain.gain.value = midFreq * 0.03;
    lfo.connect(lfoGain);
    lfoGain.connect(osc.frequency);

    const formant = c.createBiquadFilter();
    formant.type = 'bandpass';
    formant.frequency.setValueAtTime(midFreq * 2.4, t + delay);
    formant.Q.value = 1.6;

    gain.gain.setValueAtTime(0.001, t + delay);
    gain.gain.linearRampToValueAtTime(peak, t + delay + 0.06);
    gain.gain.setValueAtTime(peak, t + delay + dur * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.002, t + delay + dur);

    osc.connect(formant);
    formant.connect(gain);
    gain.connect(master);
    osc.start(t + delay);
    osc.stop(t + delay + dur + 0.02);
    lfo.start(t + delay);
    lfo.stop(t + delay + dur + 0.02);
  };

  switch (name) {
    case 'chime':
      tone(523.25, 'sine', 0.42, 0.2, 0);
      tone(659.25, 'sine', 0.42, 0.18, 0.06);
      tone(783.99, 'sine', 0.45, 0.16, 0.12);
      break;

    case 'sparkle':
      [880, 1100, 1320, 1540].forEach((f, i) => tone(f, 'sine', 0.22, 0.13, i * 0.05));
      noise(0.3, 'highpass', 6000, 0.7, 0.05, 0);
      break;

    case 'meow':
      voice(430, 780, 520, 0.46, 0.16, 7);
      noise(0.18, 'bandpass', 1400, 1.4, 0.05, 0.04);
      break;

    case 'bark':
      noise(0.12, 'bandpass', 900, 1.1, 0.34, 0, 420);
      tone(190, 'square', 0.1, 0.12, 0, 120);
      noise(0.12, 'bandpass', 900, 1.1, 0.3, 0.16, 420);
      tone(190, 'square', 0.1, 0.11, 0.16, 120);
      break;

    case 'didi':
      tone(330, 'square', 0.22, 0.14, 0);
      tone(392, 'square', 0.22, 0.12, 0.26);
      break;

    case 'train':
      tone(220, 'sawtooth', 1.15, 0.14, 0);
      tone(277, 'sawtooth', 1.15, 0.12, 0);
      noise(1.0, 'lowpass', 700, 0.8, 0.06, 0);
      [0, 0.18, 0.36, 0.54, 0.72].forEach((d) => tone(90, 'sine', 0.1, 0.1, d, 70));
      break;

    case 'water':
      noise(0.55, 'bandpass', 1500, 0.7, 0.1, 0, 900);
      [0, 0.09, 0.17, 0.26].forEach((d, i) => tone(600 + i * 160, 'sine', 0.11, 0.1, d, 900 + i * 180));
      break;

    case 'yawn':
      tone(320, 'sine', 0.95, 0.14, 0, 190);
      noise(0.5, 'bandpass', 800, 0.9, 0.04, 0.15);
      break;

    case 'soft':
      tone(300, 'sine', 0.13, 0.09);
      break;

    case 'duck':
      // 嘎嘎：两声短促的哑嗓音，频带比猫低
      voice(320, 560, 380, 0.14, 0.2, 9);
      voice(300, 540, 360, 0.14, 0.18, 9, 0.18);
      break;

    case 'rooster':
      // 喔喔喔：三段上行滑音，嗓音明亮
      voice(400, 620, 520, 0.22, 0.16, 5);
      voice(520, 880, 760, 0.3, 0.15, 5, 0.24);
      voice(480, 700, 420, 0.34, 0.13, 5, 0.56);
      break;

    case 'rain':
      // 哗哗：宽频噪声从高空洒下，高频渐软
      noise(1.3, 'highpass', 1800, 0.4, 0.16, 0, 900);
      noise(1.3, 'bandpass', 700, 0.5, 0.12);
      break;

    case 'sheep':
      // 咩：颤音明显的鼻音嗓，两头滑落
      voice(520, 430, 330, 0.55, 0.17, 7);
      noise(0.5, 'bandpass', 900, 1.2, 0.03, 0.05);
      break;

    case 'bird':
      // 叽叽喳喳：高频短音三连，像雀鸟枝头蹦跳
      tone(2600, 'sine', 0.07, 0.1, 0, 3200);
      tone(2900, 'sine', 0.06, 0.09, 0.1, 2400);
      tone(2500, 'sine', 0.07, 0.08, 0.19, 3300);
      tone(3100, 'sine', 0.05, 0.07, 0.28, 2600);
      break;

    case 'pop':
    default:
      tone(520, 'sine', 0.1, 0.22, 0, 260);
      noise(0.05, 'bandpass', 1200, 0.9, 0.04);
      break;
  }
}
