# 代码规范

> 目标：**任何人（包括三个月后的你）打开一个文件，都能猜到其余文件长什么样。**
> 规则由工具强制，不靠自觉：`npm run check` 一条命令跑完类型 + lint + 内容校验。

---

## 1. 三件套

```powershell
npm run lint          # ESLint（可自动修的加 --fix）
npm run lint:fix
npm run format        # Prettier 全量格式化
npm run check         # typecheck + lint + validate，提交前跑这个
```

| 工具 | 配置 | 管什么 |
| --- | --- | --- |
| TypeScript | `tsconfig.json` | 类型 |
| ESLint 9（flat config） | `eslint.config.js` | 正确性：未使用变量、ref 误用、可疑表达式 |
| Prettier 3 | `.prettierrc.json` | 纯格式：引号、分号、换行 |

> 只开**会影响正确性**的规则。风格类规则全部交给 Prettier，避免"两个工具互相打架，
> 最后靠一堆 `// eslint-disable` 收场"。

---

## 2. 文件与目录

```
src/
├── content/     内容层：类型、schema、索引、素材查找（不碰 DOM）
├── state/       状态层：持久化 + 运行时瞬时状态
├── audio/       音频层：播放引擎、朗读编排
├── cards/       卡片组件：14 种类型 + parts/ 共享件 + quiz/ 益智件
├── shell/       三个屏幕壳：Home / AtlasGrid / Stage
├── ui/          通用 UI：底栏、家长层、晚安仪式、提示
└── update/      应用内升级
```

**依赖方向只能是单向的**：`shell → cards → parts`、`cards → audio/state/content`。
不允许 `content` 反过来 import 组件，也不允许 `cards` 之间互相 import。

---

## 3. 命名

| 对象 | 规则 | 例子 |
| --- | --- | --- |
| 组件文件 | PascalCase | `HomeShell.vue`、`PeekQuiz.vue` |
| 组件内部类名 | `pa-` + BEM | `.pa-grid__cell.is-seen` |
| 变量 / 函数 | camelCase | `scheduleAutoRead` |
| 常量 | UPPER_SNAKE | `TIMING`、`SWIPE_MIN_DX` |
| 类型 / 接口 | PascalCase | `CardArt`、`PlayMode` |
| 卡片 id | 小写 + 短横线 | `quiz-shadow-cat` |
| 事件 | kebab-case | `@open-lane`、`@toggle-play` |

---

## 4. 组件写法

```vue
<script setup lang="ts">
// 1. 顶部一段注释：这个组件解决什么问题、为什么这么设计（不是复述代码）
import { computed, ref } from 'vue';
import type { Card } from '@/content/types';

// 2. props / emits
const props = defineProps<{ card: Card }>();
const emit = defineEmits<{ back: [] }>();

// 3. 派生状态（computed）→ 4. 方法 → 5. 生命周期
</script>

<template>
  <!-- 6. 模板 -->
</template>

<style scoped>
/* 7. 样式：布局 → 细节 → 动画 → 媒体查询 */
</style>
```

约定：

- **`<script setup lang="ts">` 一律加 `lang="ts"`**，props 用类型字面量，不用 runtime 对象。
- **禁止 `void x;` 这种糊弄未使用变量的写法**（ESLint 会报 `vue/no-ref-as-operand`）。
  真的不用就删掉；暂时保留的用 `_` 前缀。
- **注释写"为什么"，不写"是什么"**。`// 翻页后抑制 click，避免翻完又响一次` 有价值；
  `// 设置 index` 没有。
- 单文件超过 ~400 行就该考虑拆（`parts/`、`quiz/` 就是拆出来的）。

---

## 5. 类型

- 内容数据一律有类型：`src/content/types.ts` 是唯一事实来源。
- 运行时数据校验用 `zod`（`src/content/schema.ts`），校验失败在 CI/本地就报错，不进包。
- 不用 `any`。确实要兜底用 `unknown` + 收窄；万不得已写 `as unknown as X` 并加注释。

```ts
// ✅
const data = JSON.parse(text) as unknown as Card[];

// ❌
const data: any = JSON.parse(text);
```

---

## 6. 异步与打断（本项目最容易写错的地方）

所有"朗读流程"都必须遵守一条铁律：

```ts
const ticket = newSession();
const ok = await speak({ ..., ticket });
if (!alive(ticket)) return; // ← 每个 await 回来后第一件事
```

因为 3 岁孩子会在朗读过程中疯狂翻页。**任何 await 之后不检查票据，就会出现"幽灵播放"**：
上一页的声音在新一页冒出来。

- 延时一律用 `sleep(ms, ticket)`，不要裸 `setTimeout`。
- 组件卸载 / 页面隐藏时 `stopAll()`。

---

## 7. 提交前

```powershell
npm run check     # 类型 + lint + 内容校验
```

提交信息格式：`类型: 简短描述`（`feat` / `fix` / `docs` / `chore` / `refactor`）。

---

## 8. 编辑器

已带 `.vscode/settings.json`（保存即格式化 + ESLint 自动修复）和 `extensions.json` 推荐插件。
用别的编辑器也可以，只要 `npm run format` 过了就行。
