/* ============================================================
   卡片数据契约 (Card Schema Types)
   —— 与 docs/content-spec.md 一一对应
   ============================================================ */

/** 三大入口 */
export type Lane = 'look' | 'read' | 'play';

/** 卡片类型全集（新增类型 = 加一项 + 建一个组件 + 注册一行） */
export type CardType =
  // 认东西
  | 'object'
  // 读一读
  | 'poem'
  | 'story'
  // 玩一玩 · 通识
  | 'number'
  | 'shape'
  | 'color'
  | 'opposite'
  // 玩一玩 · 益智
  | 'quiz_shadow'
  | 'quiz_sound'
  | 'quiz_sort'
  | 'tracing'
  | 'part_to_whole'
  | 'cause_habit'
  // 玩一玩 · 创作
  | 'drawing';

/** 年龄档 */
export type AgeBand = 'L1' | 'L2' | 'L3';

/** 年龄档的文本深度扩展 */
export interface CardLevelText {
  /** 中文短句（L2+） */
  sentence_zh?: string;
  /** 英文短句（L2+） */
  sentence_en?: string;
  /** 小知识（L3） */
  fact?: string;
  /** 故事正文（story 专用，L1/L2/L3 都必须有） */
  text?: string;
  /** 古诗重点句数（L1 只读前 2 句） */
  focusLines?: number;
}

/** 亲子共读锦囊 */
export interface ParentGuide {
  explain?: string;
  prompt?: string;
}

/* ---------------- 益智专用负载 ---------------- */

export interface QuizOption {
  id: string;
  zh: string;
  en?: string;
  emoji?: string;
  isCorrect?: boolean;
  sound?: string;
}

export interface QuizShadowPayload {
  targetEmoji: string;
  /** 可选：真实剪影图 id，缺省用 targetEmoji 加滤镜模拟 */
  targetImageId?: string;
  options: QuizOption[];
}

export interface QuizSoundPayload {
  /** 播放哪条音频作为题面（media/audio/sfx 或 quiz 目录） */
  soundCue: string;
  soundLabel?: string;
  options: QuizOption[];
}

export interface SortBucket {
  id: string;
  label: string;
  emoji?: string;
  /** 归位依据：按大小或按颜色 */
  size?: 'large' | 'small';
  colorKey?: string;
}

export interface SortItem {
  id: string;
  label: string;
  emoji?: string;
  size?: 'large' | 'small';
  colorKey?: string;
  targetBucketId: string;
}

export interface QuizSortPayload {
  buckets: SortBucket[];
  items: SortItem[];
}

export interface TracingPayload {
  /** 轨迹形状 */
  pathShape: 'vertical_line' | 'horizontal_line' | 'circle' | 'wave' | 'zigzag' | 'spiral';
  startPoint: { label: string; emoji?: string };
  endPoint: { label: string; emoji?: string };
}

export interface PartToWholePayload {
  coverType: 'grass' | 'tree' | 'fence' | 'curtain';
  partialClue: string;
  wholeItem: { id: string; zh: string; emoji?: string; sound?: string };
  /** 干扰项（不给也可，默认三选一） */
  options?: QuizOption[];
}

export interface CauseHabitPayload {
  tool: string;
  toolLabel: string;
  toolEmoji?: string;
  beforeState: { text: string; emoji?: string };
  afterState: { text: string; emoji?: string; sound?: string };
  /** 需要擦拭/涂抹的次数才完成（默认 1） */
  requiredPasses?: number;
}

export type QuizPayload =
  | QuizShadowPayload
  | QuizSoundPayload
  | QuizSortPayload
  | TracingPayload
  | PartToWholePayload
  | CauseHabitPayload;

/* ---------------- 卡片本体 ---------------- */

export interface Card {
  /** 全局唯一，小写英文 + 短横线 */
  id: string;
  lane: Lane;
  type: CardType;
  /** 分区，必须在 sections.ts 中已注册 */
  section: string;

  /** 主中文 */
  zh: string;
  /** 主英文 */
  en?: string;
  /** 带调拼音 */
  pinyin?: string;

  /** emoji 占位（缺图时兜底） */
  emoji?: string;
  /** 卡片低饱和底色，对应 tokens 中的 --pa-pal-*，或直接色值 */
  palette?: string;

  /** 锁定滑动手势（画板、轨迹类必须 true） */
  gestureLock?: boolean;

  /** 拟声标识（meow / bark / honk / train / water / pop / chime…） */
  sound?: string;

  /** 故事卡专用 */
  storyId?: string;
  page?: number;
  pageCount?: number;
  title?: string;

  /** 古诗专用 */
  dynasty?: string;
  author?: string;
  lines?: string[];
  pinyinLines?: string[];

  /** 数数卡 */
  count?: number;
  /** 图形卡 */
  shape?: 'round' | 'square' | 'triangle' | 'rectangle' | 'trapezoid' | 'diamond' | 'pentagon' | 'oval';
  /** 颜色卡 */
  colorHex?: string;
  /** 图形/颜色卡的举例 */
  examples?: Array<{ zh: string; emoji?: string }>;

  /** 对比卡 */
  pairA?: { zh: string; en?: string; emoji?: string };
  pairB?: { zh: string; en?: string; emoji?: string };

  /** 亲子锦囊 */
  parentGuide?: ParentGuide;

  /** 年龄深度扩展 */
  levels?: Partial<Record<AgeBand, CardLevelText>>;

  /** 益智负载 */
  quizPayload?: QuizPayload;

  /** 出图提示词（可选，缺省用 en 兜底） */
  art?: CardArt;
}

/** 出图提示词（写进内容里，加卡片不用改代码） */
export interface CardArt {
  /** 主体描述，英文，给 SD 看 */
  subject?: string;
  /** 覆盖默认模板，用 {subject} 占位 */
  scene_template?: string;
  /** 完全覆盖正向提示词 */
  prompt?: string;
  /** 追加风格词 */
  style_extra?: string;
  /** 固定随机种子（同角色多页要锁同一个） */
  seed?: number;
  /** 是否去背合成纸底（场景图必须 false） */
  cutout?: boolean;
}

/** 分区定义 */
export interface SectionDef {
  id: string;
  lane: Lane;
  zh: string;
  /** 分区图标（孩子不识字，靠图标辨认） */
  icon: string;
  order: number;
  /** 该分区主色，用于网格页顶部胶囊 */
  tint?: string;
}
