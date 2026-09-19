/**
 * 闻野 OpenEar全局数据类型定义
 * 对齐 PRD §5 数据模型
 */

/** 单首歌曲（songs.json） */
export interface Song {
  id: string; // "s001"
  title: string;
  artist: string;
  genre: string; // 流派，见 GENRE_FAMILIES
  bpm: number;
  energy: number; // 0-1
  valence: number; // 0-1 情绪色彩
  arousal: number; // 0-1 能量强度
  mood: string; // 语义化情绪标签
  coverColor: string; // UI 色块
  /** 可试听音源（用户粘贴直链的歌曲才有；内置曲库可能为空） */
  audioUrl?: string;
  /** 来源：内置曲库 / 用户自定义加入 */
  source?: 'builtin' | 'custom';
}

/** 用户（users.json） */
export interface User {
  userId: string; // "userA"
  name: string; // "Lo-fi 窄口味党"
  history: string[]; // 已听歌曲 ID 列表
}

/** 探索强度：0-100 数值（0=最保守贴身，100=最激进野探） */
export type Intensity = number;

/** 探索强度参数（由 0-100 连续插值得到） */
export interface IntensityParam {
  styleDistanceMax: number; // 流派距离上限（技术层），越大跨界越远
  emotionStepMax: number; // 离家百分位（情绪层），0=每扇区贴最近，1=每扇区取最远
  familiarityWeight: number; // 熟悉度权重（行为层），越高越保守
}

/** 单首推荐结果（运行时生成） */
export interface Recommendation {
  song: Song;
  /** 理由标签（规则生成） */
  reasonTags: {
    technical: string;
    emotional: string;
    behavioral: string;
  };
  /** LLM 润色后文本（仅文本，不参与排序；失败/未启用时为空） */
  polishedReason?: string;
  /** 与「上一步 VA」的距离，用于排序展示 */
  vaDistance: number;
  /** 与「用户平均 VA」的距离 */
  vaDistanceFromUserAvg: number;
}

/** 情绪地图空白区 */
export interface BlankZone {
  id: string;
  label: string;
  /** 区域中心 Valence */
  centerValence: number;
  /** 区域中心 Arousal */
  centerArousal: number;
  radius: number; // 欧氏半径
}

/** 推荐引擎输出 */
export interface RecommendationBundle {
  intensity: Intensity;
  user: User;
  userAvgVA: { valence: number; arousal: number };
  userGenreTop: string[];
  recommendations: Recommendation[];
  /** 该次生成命中的空白区（地图点击探索用） */
  focusZone?: BlankZone;
}