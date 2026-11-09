/**
 * 息屏听书桥（Android KeepAwakePlugin 对应）。
 *
 * 行为约定（与 ListenService.kt 对齐）：
 *   - engage：启动前台服务 → 持唤醒锁 + 通知栏可停止
 *   - release：停服务放锁
 *   - 通知栏「停止」由原生 stopService 直接生效；web 侧在 visibilitychange
 *     恢复可见时统一 release，保证幂等（服务停两次无害）
 *   - 浏览器环境：无插件，全部静默 no-op
 */
import { registerPlugin } from '@capacitor/core';

interface KeepAwakePlugin {
  start(options: { title?: string }): Promise<void>;
  stop(): Promise<void>;
  isRunning(): Promise<{ running: boolean }>;
}

const KeepAwakeAudio = registerPlugin<KeepAwakePlugin>('KeepAwakeAudio');

let engaged = false;

export function isListenEngaged(): boolean {
  return engaged;
}

/** 息屏时进入听书：持有唤醒锁，朗读时间轴继续跑 */
export async function engageListen(title = '小图鉴 · 息屏听书中'): Promise<void> {
  if (engaged) return;
  engaged = true;
  try {
    await KeepAwakeAudio.start({ title });
  } catch {
    // 无插件（浏览器）或 ROM 限制：静默降级，播放退化为自然行为
  }
}

/** 回到前台 / 朗读结束 / 用户停止：释放 */
export async function releaseListen(): Promise<void> {
  if (!engaged) return;
  engaged = false;
  try {
    await KeepAwakeAudio.stop();
  } catch {
    // 同上
  }
}
