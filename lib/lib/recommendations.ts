/**
 * 闻野 OpenEar核心推荐引擎（纯规则，本地 JSON）
 * 对齐 PRD §6.3。LLM 仅用于理由润色，绝不参与本文件排序。
 */
import type {
  BlankZone,
  Intensity,
  IntensityParam,
  Recommendation,
  RecommendationBundle,
  Song,
  User,
} from '../types';
import { getSongs } from './store';
import {
  BLANK_ZONES,
  getFamiliarityScore,
  getGenreDistance,
  getGenreDistribution,
  vaDistance,
} from './metrics';

/**
 * 探索强度 → 参数（0-100 连续插值，PRD §3.2.1）
 * 三个锚点对应「贴身 / 平衡 / 野探」，中间线性过渡。
 * 强度越高：技术层流派跨界越远（styleDistanceMax↑）、
 *           情绪层离家百分位越高（emotionStepMax↑）、
 *           行为层越敢选陌生歌（familiarityWeight↓）。
 * emotionStepMax 现特指「离家百分位」：每个角度扇区内部，把候选按 VA 离用户平均
 * 口味的距离从近到远排序，取第 emotionStepMax 百分位。这样强度越大散点必然离家越远、
 * 跨象限越多，且不受 VA 平面 [0,1] 边界的绝对半径限制（每个方向量力而行）。
 */
const INTENSITY_ANCHORS: Array<{ i: number; p: IntensityParam }> = [
  { i: 0, p: { styleDistanceMax: 1, emotionStepMax: 0, familiarityWeight: 0.75 } },
  { i: 50, p: { styleDistanceMax: 2, emotionStepMax: 0.5, familiarityWeight: 0.4 } },
  { i: 100, p: { styleDistanceMax: 4, emotionStepMax: 1, familiarityWeight: 0.1 } },
];

export function getIntensityParams(intensity: Intensity): IntensityParam {
  const x = Math.max(0, Math.min(100, intensity));
  // 锚点升序：找到 x 落在哪个区间 [a, b]
  let k = INTENSITY_ANCHORS.findIndex((seg) => seg.i >= x);
  if (k < 0) k = INTENSITY_ANCHORS.length - 1; // x 超过所有锚点 → 取最右段
  const a = INTENSITY_ANCHORS[Math.max(0, k - 1)];
  const b = INTENSITY_ANCHORS[k];
  const t = a.i === b.i ? 0 : (x - a.i) / (b.i - a.i);
  const lerp = (ka: number, kb: number) => ka + (kb - ka) * t;
  return {
    styleDistanceMax: lerp(a.p.styleDistanceMax, b.p.styleDistanceMax),
    emotionStepMax: lerp(a.p.emotionStepMax, b.p.emotionStepMax),
    familiarityWeight: lerp(a.p.familiarityWeight, b.p.familiarityWeight),
  };
}

/** 语义化情绪词（按 VA 分桶） */
function moodLabel(valence: number, arousal: number): string {
  if (valence >= 0.62 && arousal >= 0.62) return '兴奋';
  if (valence >= 0.62 && arousal < 0.38) return '宁静愉悦';
  if (valence >= 0.62) return '轻松';
  if (valence <= 0.38 && arousal >= 0.62) return '躁动';
  if (valence <= 0.38 && arousal < 0.38) return '倦怠';
  if (valence <= 0.38) return '低落';
  if (arousal >= 0.62) return '饱满';
  return '平和';
}

/** 播放占比近似「上周循环N首」的行为文案 */
function behavioralReason(candidate: Song, user: User, historySongs: Song[]): string {
  const genre = candidate.genre !== historySongs[0]?.genre ? candidate.genre : '同流派';
  const loops = 2 + Math.round(Math.abs(candidate.bpm - 90) / 20);
  const topGenre = getGenreDistribution(historySongs)[0];
  if (genre !== '同流派') {
    const historyInGenre = historySongs.filter((s) => s.genre === candidate.genre).length;
    if (historyInGenre > 0) {
      return `你近期循环了 ${historyInGenre} 首 ${genre}，这次帮你换点新面孔`;
    }
    return `你还没有跨入 ${genre}，但最近的播放节奏正好适合`;
  }
  return `你上周循环了 ${loops} 首${topGenre}，口味已经足够熟悉`;
}

/** 技术层理由 */
function technicalReason(candidate: Song, historySongs: Song[]): string {
  const avgBpm =
    historySongs.reduce((a, s) => a + s.bpm, 0) / Math.max(historySongs.length, 1);
  const diff = Math.round(candidate.bpm - avgBpm);
  if (Math.abs(diff) <= 12) return `BPM ${candidate.bpm} 节奏与你常听的很接近`;
  return diff > 0
    ? `BPM ${candidate.bpm}，比你常听的快 ${diff}，适合提神`
    : `BPM ${candidate.bpm}，比你常听的慢 ${-diff}，帮助放缓`;
}

/** 情绪层理由 */
function emotionalReason(candidate: Song, userAvg: { valence: number; arousal: number }): string {
  const from = moodLabel(userAvg.valence, userAvg.arousal);
  const to = moodLabel(candidate.valence, candidate.arousal);
  const dist = vaDistance(
    candidate.valence,
    candidate.arousal,
    userAvg.valence,
    userAvg.arousal,
  ).toFixed(2);
  return `从${from}(${userAvg.valence.toFixed(2)}) → ${to}(${candidate.valence.toFixed(2)})，情绪距离 ${dist}`;
}

/** 生成三层理由标签 */
function generateReasonTags(
  candidate: Song,
  user: User,
  historySongs: Song[],
  userAvg: { valence: number; arousal: number },
): Recommendation['reasonTags'] {
  return {
    technical: technicalReason(candidate, historySongs),
    emotional: emotionalReason(candidate, userAvg),
    behavioral: behavioralReason(candidate, user, historySongs),
  };
}

/**
 * 角度辅助：把 atan2(-π..π) 归一化到 [0, 2π)，并计算两个极角的最小夹角。
 */
const TWO_PI = Math.PI * 2;

function normAngle(a: number): number {
  let x = a % TWO_PI;
  if (x < 0) x += TWO_PI;
  return x;
}

function angularGap(a: number, b: number): number {
  const d = Math.abs(normAngle(a) - normAngle(b));
  return d > Math.PI ? TWO_PI - d : d;
}

/**
 * 放射状选点（情绪层核心）：
 * 以「用户平均口味」为圆心，绕它一圈按角度切成 count 个扇区，每扇区选一首
 * 「离家距离落在该扇区第 pct 百分位」的歌，从而：
 * - 强度越大 pct 越大 → 每个方向都取更远的歌，离家越远、跨象限越多；
 * - 按角度分桶 → 各方向都有歌，视觉上环绕发散而非扎堆；
 * - 距离并列时按熟悉度打 tie-break：低强度选熟悉、高强度选陌生（行为层）。
 * pct 是相对百分位（每扇区量力而行），不受 VA 平面边界的绝对半径限制，
 * 因此 100% 一定比 75% 更远，不会出现饱和平台期。
 */
export function radialScatter(
  pool: Song[],
  userAvg: { valence: number; arousal: number },
  pct: number,
  familiarityWeight: number,
  user: User,
  historySongs: Song[],
  count: number,
): Song[] {
  if (pool.length === 0 || count <= 0) return [];
  const p = Math.max(0, Math.min(1, pct));
  const pts = pool.map((c) => {
    const dv = c.valence - userAvg.valence;
    const da = c.arousal - userAvg.arousal;
    return {
      c,
      dist: Math.hypot(dv, da),
      angle: normAngle(Math.atan2(da, dv)),
      fam: getFamiliarityScore(c, user, historySongs),
    };
  });

  const used = new Set<string>();
  const chosen: Array<{ c: Song; angle: number }> = [];
  const slot = TWO_PI / count;
  for (let k = 0; k < count; k++) {
    const center = slot * (k + 0.5);
    let bucket = pts.filter(
      (p) => !used.has(p.c.id) && angularGap(p.angle, center) <= slot / 2,
    );
    if (bucket.length === 0) bucket = pts.filter((p) => !used.has(p.c.id));
    if (bucket.length === 0) break;

    // 该扇区内离家距离的「第 p 百分位」目标：近(0)→远(1)
    const ds = bucket.map((b) => b.dist).sort((a, b) => a - b);
    const lo = ds[0];
    const hi = ds[ds.length - 1];
    const target = lo + (hi - lo) * p;

    bucket.sort((a, b) => {
      const ra = Math.abs(a.dist - target);
      const rb = Math.abs(b.dist - target);
      if (Math.abs(ra - rb) < 1e-6) {
        // 距离并列：低强度优先熟悉（fam 大），高强度优先陌生（fam 小）
        return familiarityWeight >= 0.5 ? b.fam - a.fam : a.fam - b.fam;
      }
      return ra - rb;
    });
    const best = bucket[0];
    chosen.push({ c: best.c, angle: best.angle });
    used.add(best.c.id);
  }
  // 按极角升序输出，保证是一条连续环绕路线（相邻点角度差最小化）
  chosen.sort((a, b) => a.angle - b.angle);
  return chosen.map((x) => x.c);
}

/** 主函数：以用户歌单为"已拥有"，按滑块档位输出 10 首推荐 */
export function generateRecommendations(
  owned: Song[],
  intensity: Intensity,
  options?: { focusZoneId?: string; songs?: Song[] },
): RecommendationBundle {
  const songs = options?.songs ?? getSongs();
  const { styleDistanceMax, emotionStepMax, familiarityWeight } =
    getIntensityParams(intensity);
  const explorationPct = emotionStepMax; // 离家百分位：0=贴最近，1=取最远
  const COUNT = 10;

  // 歌单即用户的真实口味：排除库内已拥有 -> 从其余歌曲里推荐
  const idSet = new Set(owned.map((o) => o.id));
  const historySongs = owned;
  const user: User = { userId: 'playlist', name: '我的歌单', history: owned.map((o) => o.id) };

  const avg = (k: 'valence' | 'arousal') =>
    owned.reduce((a, s) => a + s[k], 0) / Math.max(owned.length, 1);
  const userAvg = { valence: avg('valence'), arousal: avg('arousal') };
  const topGenres = getGenreDistribution(owned);

  // 空歌单：无法引擎，返回空集（由前端引导添加）
  if (owned.length === 0) {
    return {
      intensity,
      user,
      userAvgVA: { valence: 0.5, arousal: 0.5 },
      userGenreTop: [],
      recommendations: [],
      focusZone: undefined,
    };
  }

  // focusZone：地图点击探索 → 该区域歌词无条件入选并置顶
  const focusZone = options?.focusZoneId
    ? findZoneByEmotionOnly(options.focusZoneId)
    : undefined;
  const zoneCenter = focusZone
    ? { valence: focusZone.centerValence, arousal: focusZone.centerArousal }
    : undefined;
  const inFocus = (s: Song) =>
    !!zoneCenter &&
    vaDistance(s.valence, s.arousal, zoneCenter.valence, zoneCenter.arousal) <= focusZone!.radius;

  const base = songs.filter((s) => !idSet.has(s.id));

  // 技术层：流派距离达标（随强度放宽）。保底只放宽流派、绝不放情绪半径，
  // 避免低强度因召回不足而让散点反而比高强度更远（保持远近单调）。
  const genreOk = (c: Song) =>
    Math.min(...topGenres.map((g) => styleDistance(c.genre, g))) <= styleDistanceMax;
  let pool = base.filter(genreOk);
  if (pool.length < COUNT) pool = base;

  // 选点（绕用户口味环形发散），扇区角度顺序输出即环绕路线
  let ordered: Song[];
  if (focusZone) {
    const focused = base
      .filter((c) => inFocus(c))
      .sort(
        (a, b) =>
          vaDistance(a.valence, a.arousal, zoneCenter!.valence, zoneCenter!.arousal) -
          vaDistance(b.valence, b.arousal, zoneCenter!.valence, zoneCenter!.arousal),
      )
      .slice(0, COUNT);
    const rest = radialScatter(
      pool.filter((c) => !inFocus(c)),
      userAvg,
      explorationPct,
      familiarityWeight,
      user,
      historySongs,
      COUNT - focused.length,
    );
    ordered = [...focused, ...rest];
  } else {
    ordered = radialScatter(
      pool,
      userAvg,
      explorationPct,
      familiarityWeight,
      user,
      historySongs,
      COUNT,
    );
  }

  // 生成理由；vaDistance 用相邻点欧氏距离（首点用与平均口的距离），便于展示平滑
  const recommendations: Recommendation[] = ordered.slice(0, COUNT).map((song, i) => {
    const prev = ordered[i - 1] ?? { valence: userAvg.valence, arousal: userAvg.arousal };
    return {
      song,
      reasonTags: generateReasonTags(song, user, historySongs, userAvg),
      vaDistance: vaDistance(song.valence, song.arousal, prev.valence, prev.arousal),
      vaDistanceFromUserAvg: vaDistance(
        song.valence,
        song.arousal,
        userAvg.valence,
        userAvg.arousal,
      ),
    };
  });

  return {
    intensity,
    user,
    userAvgVA: userAvg,
    userGenreTop: topGenres.slice(0, 3),
    recommendations,
    focusZone,
  };
}

/** 由空白区 id 取定义（仅情绪中心，不依赖歌曲） */
function findZoneByEmotionOnly(zoneId: string): BlankZone | undefined {
  return BLANK_ZONES.find((z) => z.id === zoneId);
}

/** 流派距离取值对齐 metrics */
function styleDistance(a: string, b: string): number {
  return getGenreDistance(a, b);
}