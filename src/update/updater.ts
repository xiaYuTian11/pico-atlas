/**
 * 应用内升级（Android APK）。
 *
 * 三条路，按顺序尝试，任何一步失败都不影响 App 正常用：
 *   1. GitHub Releases API（公开仓库最省事）
 *   2. 仓库里的 latest.json（GitHub Pages / raw 均可，私库也能用 CDN 中转）
 *   3. 都没有 → 提示"更新源不可用"
 *
 * 只有家长层能触发；孩子端永远看不到升级弹窗。
 */
import { registerPlugin } from '@capacitor/core';

export interface UpdaterPlugin {
  getVersion(): Promise<{ version: string; code: number }>;
  download(options: { url: string; fileName?: string }): Promise<{ path: string; size: number }>;
  install(options: { path: string }): Promise<void>;
  addListener(
    eventName: 'downloadProgress',
    listener: (data: { percent: number; received: number; total: number }) => void,
  ): Promise<{ remove: () => void }>;
}

const AppUpdater = registerPlugin<UpdaterPlugin>('AppUpdater');

/** 改成你自己的仓库 / 更新源 */
export const UPDATE_REPO = 'xiaYuTian11/pico-atlas';
export const UPDATE_FEED =
  'https://gist.githubusercontent.com/xiaYuTian11/9d35ae995de3782a380e948b1ab0dd9c/raw/latest.json';

export interface UpdateInfo {
  current: string;
  latest: string;
  hasUpdate: boolean;
  url?: string;
  notes?: string;
  size?: number;
  source: 'github' | 'feed';
}

export function isNative(): boolean {
  return !!(
    globalThis as { Capacitor?: { isNativePlatform?: () => boolean } }
  ).Capacitor?.isNativePlatform?.();
}

/** 运行时版本号；Web 环境用构建期注入 */
export async function currentVersion(): Promise<string> {
  if (isNative()) {
    try {
      const v = await AppUpdater.getVersion();
      return v.version;
    } catch {
      /* 插件没注册（旧包），退回构建期版本 */
    }
  }
  return typeof __APP_VERSION__ === 'string' ? __APP_VERSION__ : '0.0.0';
}

function parse(v: string): number[] {
  return v
    .replace(/^v/i, '')
    .split(/[.\-+]/)
    .map((s) => parseInt(s, 10) || 0);
}

/** 半版本比较：1.2.10 > 1.2.9 */
export function compareVersion(a: string, b: string): number {
  const x = parse(a);
  const y = parse(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d > 0 ? 1 : -1;
  }
  return 0;
}

interface GhRelease {
  tag_name: string;
  body?: string;
  assets?: Array<{ name: string; browser_download_url: string; size: number }>;
}

async function tryGithub(): Promise<UpdateInfo | null> {
  try {
    const r = await fetch(`https://api.github.com/repos/${UPDATE_REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store',
    });
    if (!r.ok) return null;
    const rel = (await r.json()) as GhRelease;
    const apk = rel.assets?.find((a) => a.name.endsWith('.apk'));
    if (!apk) return null;
    const current = await currentVersion();
    return {
      current,
      latest: rel.tag_name.replace(/^v/i, ''),
      hasUpdate: compareVersion(rel.tag_name, current) > 0,
      url: apk.browser_download_url,
      notes: rel.body?.slice(0, 400),
      size: apk.size,
      source: 'github',
    };
  } catch {
    return null;
  }
}

async function tryFeed(): Promise<UpdateInfo | null> {
  try {
    const r = await fetch(`${UPDATE_FEED}?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return null;
    const j = (await r.json()) as { version: string; url: string; notes?: string; size?: number };
    if (!j?.version || !j?.url) return null;
    const current = await currentVersion();
    return {
      current,
      latest: j.version,
      hasUpdate: compareVersion(j.version, current) > 0,
      url: j.url,
      notes: j.notes,
      size: j.size,
      source: 'feed',
    };
  } catch {
    return null;
  }
}

export async function checkUpdate(): Promise<UpdateInfo | null> {
  return (await tryGithub()) ?? (await tryFeed());
}

export interface DownloadResult {
  ok: boolean;
  path?: string;
  error?: string;
}

/** 下载并唤起系统安装器 */
export async function downloadAndInstall(
  url: string,
  version: string,
  onProgress?: (percent: number) => void,
): Promise<DownloadResult> {
  if (!isNative()) {
    // 浏览器里直接开新窗口，不做应用内安装
    window.open(url, '_blank');
    return { ok: false, error: 'web' };
  }
  let listener: { remove: () => void } | null = null;
  try {
    if (onProgress) {
      listener = await AppUpdater.addListener('downloadProgress', (d) => onProgress(d.percent));
    }
    const file = await AppUpdater.download({ url, fileName: `pico-atlas-${version}.apk` });
    await AppUpdater.install({ path: file.path });
    return { ok: true, path: file.path };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  } finally {
    listener?.remove();
  }
}
