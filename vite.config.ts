import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { mediaManifest } from './tools/vite-plugin-media-manifest';

// 注意：vite 会把配置打包到临时目录，不能用相对 import.meta.url 读 package.json
const pkg = JSON.parse(readFileSync(path.resolve(process.cwd(), 'package.json'), 'utf8')) as { version: string };

export default defineConfig({
  plugins: [vue(), mediaManifest()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  base: './',
  server: {
    port: 5273,
    host: '127.0.0.1',
  },
  build: {
    outDir: 'dist',
    assetsInlineLimit: 4096,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        // public/media 是原样拷贝，不参与打包
        manualChunks: {
          vue: ['vue'],
        },
      },
    },
  },
});
