/**
 * 今日学习 —— 三个入口各挑 3 张，家长照着点就行。
 *
 * 为什么需要它：孩子不识字，打开 App 只会对着大图标乱点；
 * 家长又不可能每次都翻一遍网格挑卡片。给一个"今天就学这三张"的确定序列，
 * 比让孩子自己随机撞到 100 张里的任意一张更有安全感。
 *
 * 规则：
 *   - 同一天、同一入口 → 结果固定（不会刷新一下就变，家长能复述"我们就学这三张"）
 *   - 优先没看过的卡（progress[lane].seen），都看过了才从全部里挑
 *   - 不做"打卡/连续天数"：那属于诱导，与项目红线冲突
 */
import type { Card, Lane } from './types';
import { cardsOfLane } from './index';
import { state } from '@/state/store';

/** 日期种子：同一天同一序列 */
function daySeed(d = new Date()): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

/** 确定性洗牌（不用 Math.random，否则每次渲染都变） */
function shuffleStable<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) % 4294967296;
    const j = Math.floor((s / 4294967296) * (i + 1));
    const tmp = out[i] as T;
    out[i] = out[j] as T;
    out[j] = tmp;
  }
  return out;
}

export function dailyPicks(lane: Lane, n = 3): Card[] {
  const all = cardsOfLane(lane);
  if (all.length === 0) return [];
  const seen = new Set(state.progress[lane]?.seen ?? []);
  const fresh = all.filter((c) => !seen.has(c.id));
  const seed = daySeed() + laneSeed(lane);

  const picked = shuffleStable(fresh, seed).slice(0, n);
  if (picked.length >= n) return picked;

  // 没看过的不足 n 张：用已看过的补，但不要把刚挑中的再推一遍。
  // （不能直接回退到全量重洗 —— 那会把刚学的那张又推回来）
  const rest = shuffleStable(
    all.filter((c) => !picked.some((p) => p.id === c.id)),
    seed + 7919,
  );
  return [...picked, ...rest.slice(0, n - picked.length)];
}

/** 每个入口一个独立 seed，否则三个入口会挑出同一批位置的卡片 */
function laneSeed(lane: Lane): number {
  let hash = 0;
  for (const ch of lane) hash = (hash * 31 + ch.charCodeAt(0)) % 100000;
  return hash * 1000;
}

/** 家长端展示用的三个入口（与首页一致） */
export const DAILY_LANES: Array<{ id: Lane; zh: string }> = [
  { id: 'look', zh: '认东西' },
  { id: 'read', zh: '读一读' },
  { id: 'play', zh: '玩一玩' },
];
