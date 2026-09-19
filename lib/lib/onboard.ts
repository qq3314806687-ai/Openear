/**
 * 登录流程的「创建你的口味」建号逻辑（PRD 扩展：登录体验全过程）
 * 依据问卷偏好，从歌曲库采样一条模拟听歌历史，生成新用户。
 */
import type { Intensity, User } from '../types';
import { getSongs, genUserId, registerUser } from './store';
import type { ArousalPref, ValencePref } from './sprite';

export type MoodPref = 'positive' | 'dark' | 'mixed';
export type EnergyPref = 'low' | 'mid' | 'high';
export type OpennessPref = Intensity; // 0-100 探索强度（问答档：25/50/75）

export interface OnboardAnswers {
  mood: MoodPref;
  energy: EnergyPref;
  openness: OpennessPref;
  /** 可选昵称，留空则自动生成 */
  nickname?: string;
}

const MOOD_META: Record<MoodPref, { label: string; name: string }> = {
  positive: { label: '向阳 · 偏积极', name: '向阳' },
  dark: { label: '夜行 · 偏沉浸', name: '夜行' },
  mixed: { label: '随性 · 不留刻板印象', name: '调和' },
};
const ENERGY_META: Record<EnergyPref, { label: string; name: string }> = {
  low: { label: '慢节奏 · 疗愈', name: '冥想' },
  mid: { label: '中速 · 律动', name: '律动' },
  high: { label: '高能 · 跳动', name: '飙能' },
};
/** 探索强度问答选项（0-100 上的三个离散档） */
const OPENNESS_OPTIONS: Array<{ value: Intensity; label: string; name: string }> = [
  { value: 25, label: '稳守 · 水道熟路', name: '稳守' },
  { value: 50, label: '平衡 · 适度跨界', name: '平衡' },
  { value: 75, label: '野探 · 大步出发', name: '野探' },
];

export const PREF_OPTIONS = {
  mood: Object.entries(MOOD_META).map(([k, v]) => ({ value: k as MoodPref, ...v })),
  energy: Object.entries(ENERGY_META).map(([k, v]) => ({ value: k as EnergyPref, ...v })),
  openness: OPENNESS_OPTIONS,
};

/** 偏好 → 默认昵称 */
export function autoName(a: OnboardAnswers): string {
  return `${ENERGY_META[a.energy].name}·${MOOD_META[a.mood].name}探索家`;
}

/** 采样历史：u8 首去重的歌曲 id，偏好不满足时逐层放宽规则保证条数。
 *  genres（可选）：优先注入用户明示喜欢的流派。 */
export function buildHistory(
  mood: MoodPref,
  energy: EnergyPref,
  genres: string[] = [],
  target = 8,
): string[] {
  const songs = getSongs();
  const moodOK = (s: { valence: number }) =>
    mood === 'positive' ? s.valence >= 0.6 : mood === 'dark' ? s.valence <= 0.4 : true;
  const energyOK = (s: { arousal: number }) =>
    energy === 'low' ? s.arousal < 0.4 : energy === 'high' ? s.arousal > 0.6 : true;

  const combos: Array<(s: { valence: number; arousal: number }) => boolean> = [
    (s) => moodOK(s) && energyOK(s),
    (s) => moodOK(s),
    (s) => energyOK(s),
    () => true,
  ];

  const result: string[] = [];
  // 1) 先注入用户明示喜欢流派的歌（用户口味的地基）
  if (genres.length > 0) {
    const seedPool = songs.filter((s) => genres.includes(s.genre));
    const seed = pickSpread(seedPool, Math.min(target, genres.length * 2));
    result.push(...seed);
  }
  // 2) 再用情绪/能量偏好补齐到 target（复合条件逐层放宽）
  if (result.length < target) {
    const taken = new Set(result);
    for (const match of combos) {
      const pool = songs.filter((s) => !taken.has(s.id) && match(s));
      if (pool.length >= target - result.length) {
        result.push(...pickSpread(pool, target - result.length));
        break;
      }
      // 不足则先全部吃掉，继续下一层放宽
      result.push(...pickSpread(pool, pool.length));
    }
  }
  return result.slice(0, target);
}

/** 保证流派多样性：按流派分桶，循环取 1 首 */
function pickSpread(pool: { id: string; genre: string }[], target: number): string[] {
  const buckets = new Map<string, number[]>();
  pool.forEach((s, i) => {
    const arr = buckets.get(s.genre) ?? [];
    arr.push(i);
    buckets.set(s.genre, arr);
  });
  // 洗桶序与桶内序
  const entries = [...buckets.entries()].sort(() => Math.random() - 0.5);
  entries.forEach(([, idx]) => idx.sort(() => Math.random() - 0.5));
  const out: string[] = [];
  let guard = 0;
  while (out.length < target && guard++ < 100) {
    for (const [, idx] of entries) {
      const j = idx.shift();
      if (j !== undefined) {
        out.push(pool[j].id);
        if (out.length >= target) break;
      }
    }
  }
  return out;
}

/** 依据问卷答案创建一个新用户并注册返回 */
export function onboard(a: OnboardAnswers): User {
  const user: User = {
    userId: genUserId(),
    name: (a.nickname ?? '').trim() || autoName(a),
    history: buildHistory(a.mood, a.energy),
  };
  return registerUser(user);
}

/** 小精灵对话建号：把 5 题累积的画像转成听歌历史 + 默认探索强度 */
export function spriteOnboard(p: {
  valence: ValencePref;
  arousal: ArousalPref;
  genres: string[];
  nickname?: string;
  openness: OpennessPref;
}): { user: User; intensity: Intensity } {
  const mood: MoodPref = p.valence === 1 ? 'positive' : p.valence === -1 ? 'dark' : 'mixed';
  const energy: EnergyPref =
    p.arousal === 'low' ? 'low' : p.arousal === 'high' || p.arousal === 'wild' ? 'high' : 'mid';
  const user: User = {
    userId: genUserId(),
    name: (p.nickname ?? '').trim() || autoName({ mood, energy, openness: p.openness }),
    history: buildHistory(mood, energy, p.genres, 10),
  };
  return { user: registerUser(user), intensity: p.openness };
}