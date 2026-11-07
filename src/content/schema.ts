import { z } from 'zod';

/**
 * 内容校验 schema。
 * `npm run validate` 会跑一遍，任何一条不合规都报错并指出卡 id。
 * 目标是：内容永远不可能以"半成品"状态进仓库。
 */

const zhStr = z.string().min(1, '中文不能为空');
const hexOrToken = z
  .string()
  .regex(/^(#[\da-fA-F]{3,8}|var\(--pa-pal-[\w-]+\))$/, 'palette 必须是 #hex 或 var(--pa-pal-*)');

export const CardSchema = z
  .object({
    id: z
      .string()
      .regex(/^[a-z0-9-]+$/, 'id 只能是小写字母/数字/短横线'),
    lane: z.enum(['look', 'read', 'play']),
    type: z.enum([
      'object',
      'poem',
      'story',
      'number',
      'shape',
      'color',
      'opposite',
      'quiz_shadow',
      'quiz_sound',
      'quiz_sort',
      'tracing',
      'part_to_whole',
      'cause_habit',
      'drawing',
    ]),
    section: z.string().min(1),

    zh: zhStr,
    en: z.string().optional(),
    pinyin: z.string().optional(),
    emoji: z.string().optional(),
    palette: hexOrToken.optional(),
    gestureLock: z.boolean().optional(),
    sound: z.string().optional(),

    storyId: z.string().optional(),
    page: z.number().int().positive().optional(),
    pageCount: z.number().int().min(4).max(5).optional(),
    title: z.string().optional(),

    dynasty: z.string().optional(),
    author: z.string().optional(),
    lines: z.array(z.string().min(1)).optional(),
    pinyinLines: z.array(z.string()).optional(),

    count: z.number().int().positive().optional(),
    shape: z
      .enum(['round', 'square', 'triangle', 'rectangle', 'trapezoid', 'diamond', 'pentagon', 'oval'])
      .optional(),
    colorHex: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    examples: z.array(z.object({ zh: z.string(), emoji: z.string().optional() })).optional(),

    pairA: z.object({ zh: z.string(), en: z.string().optional(), emoji: z.string().optional() }).optional(),
    pairB: z.object({ zh: z.string(), en: z.string().optional(), emoji: z.string().optional() }).optional(),

    parentGuide: z
      .object({ explain: z.string().optional(), prompt: z.string().optional() })
      .optional(),

    levels: z
      .object({
        L1: z
          .object({
            sentence_zh: z.string().optional(),
            sentence_en: z.string().optional(),
            fact: z.string().optional(),
            text: z.string().optional(),
            focusLines: z.number().optional(),
          })
          .optional(),
        L2: z
          .object({
            sentence_zh: z.string().optional(),
            sentence_en: z.string().optional(),
            fact: z.string().optional(),
            text: z.string().optional(),
            focusLines: z.number().optional(),
          })
          .optional(),
        L3: z
          .object({
            sentence_zh: z.string().optional(),
            sentence_en: z.string().optional(),
            fact: z.string().optional(),
            text: z.string().optional(),
            focusLines: z.number().optional(),
          })
          .optional(),
      })
      .optional(),

    quizPayload: z.record(z.unknown()).optional(),
  })
  .passthrough()
  // ---- 按类型做专项断言 ----
  .superRefine((c, ctx) => {
    // 1. 古诗：4 句 + 拼音 4 行
    if (c.type === 'poem') {
      if (!c.lines || c.lines.length !== 4) {
        ctx.addIssue({ code: 'custom', message: '古诗必须有 4 句 lines', path: ['lines'] });
      }
      if (!c.pinyinLines || c.pinyinLines.length !== 4) {
        ctx.addIssue({ code: 'custom', message: '古诗必须有 4 行 pinyinLines', path: ['pinyinLines'] });
      }
      if (!c.dynasty || !c.author) {
        ctx.addIssue({ code: 'custom', message: '古诗必须有 dynasty + author', path: ['author'] });
      }
    }

    // 2. 故事：页码、页数、三档正文都必须有
    if (c.type === 'story') {
      if (!c.storyId) ctx.addIssue({ code: 'custom', message: '故事卡必须有 storyId', path: ['storyId'] });
      if (!c.page || !c.pageCount) {
        ctx.addIssue({ code: 'custom', message: '故事卡必须有 page + pageCount', path: ['page'] });
      }
      if (!c.title) ctx.addIssue({ code: 'custom', message: '故事卡必须有 title', path: ['title'] });
      for (const lv of ['L1', 'L2', 'L3'] as const) {
        if (!c.levels?.[lv]?.text) {
          ctx.addIssue({
            code: 'custom',
            message: `故事卡必须提供 levels.${lv}.text（否则该年龄档故事会断裂）`,
            path: ['levels', lv, 'text'],
          });
        }
      }
    }

    // 3. 图形 / 颜色 / 数数
    if (c.type === 'shape' && !c.shape) {
      ctx.addIssue({ code: 'custom', message: '图形卡必须有 shape', path: ['shape'] });
    }
    if (c.type === 'color' && !c.colorHex) {
      ctx.addIssue({ code: 'custom', message: '颜色卡必须有 colorHex', path: ['colorHex'] });
    }
    if (c.type === 'number' && !c.count) {
      ctx.addIssue({ code: 'custom', message: '数数卡必须有 count', path: ['count'] });
    }
    if (c.type === 'opposite' && (!c.pairA || !c.pairB)) {
      ctx.addIssue({ code: 'custom', message: '对比卡必须有 pairA + pairB', path: ['pairA'] });
    }

    // 4. 手势锁：画板与轨迹必须锁
    if ((c.type === 'drawing' || c.type === 'tracing') && c.gestureLock !== true) {
      ctx.addIssue({
        code: 'custom',
        message: 'drawing / tracing 卡必须显式 gestureLock: true',
        path: ['gestureLock'],
      });
    }

    // 5. 益智卡必须有 quizPayload
    const quizTypes = ['quiz_shadow', 'quiz_sound', 'quiz_sort', 'tracing', 'part_to_whole', 'cause_habit'];
    if (quizTypes.includes(c.type) && !c.quizPayload) {
      ctx.addIssue({ code: 'custom', message: `${c.type} 卡必须有 quizPayload`, path: ['quizPayload'] });
    }
  });

export const SectionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]+$/),
  lane: z.enum(['look', 'read', 'play']),
  zh: z.string().min(1),
  icon: z.string().min(1),
  order: z.number().int(),
  tint: z.string().optional(),
});
