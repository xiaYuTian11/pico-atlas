import fs from 'node:fs';
import path from 'node:path';
import type { Plugin } from 'vite';

/**
 * Vite 插件：扫描 public/media/ 生成媒体清单虚拟模块。
 *
 * 为什么不用 import.meta.glob：
 *   glob 会把文件变成 ES 模块并强制打进 bundle，
 *   700 张图会让构建产物爆炸。这里只生成"文件名清单"，
 *   文件本身仍由浏览器按需请求（且可被 Service Worker 缓存）。
 *
 * 开发期监听 public/media/ 变化，自动热更新清单 —— 
 * 你丢一张图进去，刷新页面就能看到，不用重启 dev server。
 */
export function mediaManifest(): Plugin {
  const VIRTUAL_ID = 'virtual:media-manifest';
  const RESOLVED_ID = '\0' + VIRTUAL_ID;

  const mediaRoot = path.resolve(process.cwd(), 'public/media');
  const IMAGE_EXT = new Set(['.webp', '.png', '.jpg', '.jpeg', '.avif', '.svg']);
  const AUDIO_EXT = new Set(['.mp3', '.m4a', '.ogg', '.wav', '.opus']);

  let images: string[] = [];
  let audio: string[] = [];
  let builtAt = new Date().toISOString();

  function walk(dir: string, rel = ''): void {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, relPath);
        continue;
      }
      const ext = path.extname(entry.name).toLowerCase();
      const normalized = `media/${relPath.replace(/\\/g, '/')}`;
      if (IMAGE_EXT.has(ext)) images.push(normalized);
      else if (AUDIO_EXT.has(ext)) audio.push(normalized);
    }
  }

  function scan(): void {
    images = [];
    audio = [];
    walk(mediaRoot);
    // 排序保证清单稳定（避免无意义的热更新）
    images.sort();
    audio.sort();
    builtAt = new Date().toISOString();
  }

  function generate(): string {
    return `export default ${JSON.stringify({ images, audio, builtAt })};`;
  }

  return {
    name: 'pico-atlas-media-manifest',
    resolveId(id) {
      if (id === VIRTUAL_ID) return RESOLVED_ID;
      return null;
    },
    load(id) {
      if (id === RESOLVED_ID) {
        scan();
        return generate();
      }
      return null;
    },
    configureServer(server) {
      const invalidate = (): void => {
        const mod = server.moduleGraph.getModuleById(RESOLVED_ID);
        if (mod) server.moduleGraph.invalidateModule(mod);
        server.ws.send({ type: 'full-reload' });
      };
      // 监听 media 目录
      const watchDir = path.resolve(process.cwd(), 'public/media');
      if (fs.existsSync(watchDir)) {
        server.watcher.add(watchDir);
      }
      server.watcher.on('all', (_event, file) => {
        if (file.includes(`${path.sep}media${path.sep}`)) invalidate();
      });
    },
    buildStart() {
      scan();
      if (images.length === 0 && audio.length === 0) {
        this.warn(
          '[media] public/media/ 里没有任何图片或音频。' +
            '卡片会全部回退到 emoji 占位 —— 这是正常的，先把框架跑通。',
        );
      }
    },
  };
}
