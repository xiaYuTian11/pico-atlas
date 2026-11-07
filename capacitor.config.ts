import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.snail.picoatlas',
  appName: '小图鉴',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    // 允许 WebView 里直接跑本地音频/图片，不走 http
    allowMixedContent: false,
  },
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 600,
      backgroundColor: '#FDF8F3',
      showSpinner: false,
    },
  },
};

export default config;
