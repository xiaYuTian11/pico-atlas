import js from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

/**
 * 只开"会影响正确性"的规则，不跟格式化打架（格式交给 Prettier）。
 * 目标：`npm run lint` 永远能绿，而不是养一堆 no-xxx 的注释。
 */
export default [
  {
    ignores: [
      'dist/**',
      'android/**',
      'node_modules/**',
      'assets/**',
      'public/media/**',
      'prototype/**',
      '.venv/**',
      'release/**',
    ],
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/essential'],

  {
    files: ['**/*.vue'],
    languageOptions: {
      parserOptions: { parser: tseslint.parser },
    },
  },

  {
    files: ['**/*.{ts,vue}'],
    rules: {
      // 组件名不需要多单词（PaIcon、HomeShell 已经够清楚了）
      'vue/multi-word-component-names': 'off',
      // 未使用变量一律报错，除非以下划线开头（约定：占位参数用 _）
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
      // any 只在确实需要兜底的地方用，且要显式标注
      '@typescript-eslint/no-explicit-any': 'warn',
      // 线上代码不许留 console.log
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Vue 模板里的事件名等不做过度约束
      'vue/attributes-order': 'off',
      'vue/no-v-html': 'off',
    },
  },

  // 脚本 / 工具允许日志与 Node 全局
  {
    files: ['tools/**/*.{js,mjs,ts}', '*.config.{ts,js,mjs}'],
    languageOptions: {
      globals: { process: 'readonly', console: 'readonly', Buffer: 'readonly', URL: 'readonly' },
    },
    rules: { 'no-console': 'off' },
  },

  prettier,
];
