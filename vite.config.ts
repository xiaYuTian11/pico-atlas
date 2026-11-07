import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath, URL } from 'node:url';
import { mediaManifest } from './tools/vite-plugin-media-manifest';

export default defineConfig({
  plugins: [vue(), mediaManifest()],
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
