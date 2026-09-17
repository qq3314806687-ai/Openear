/**
 * OpenEar（解茧）核心推荐引擎（纯规则，本地 JSON）
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

/** 滑块档位 → 参数（PRD §3.2.1） */
export const INTENSITY_PARAMS: Record<Intensity, IntensityParam> = {
  conservative: { styleDistanceMax: 1, emotionStepMax: 0.15 },
  balanced: { styleDistanceMax: 2, emotionStepMax: 0.3 },
  aggressive: { styleDistanceMax: 4, emotionStepMax: 0.5 },
};

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
 * 贪心平滑排序：从上一步位置出发，选「更熟悉 + 过渡更近」的歌，避免突兀跳跃。
 */
function greedySmoothSort(
  candidates: Song[],
  user: User,
  historySongs: Song[],
  start: { valence: number; arousal: number },
): { song: Song; vaDistance: number }[] {
  const remaining = [...candidates];
  const sequence: { song: Song; vaDistance: number }[] = [];
  let cursor = start;
  while (remaining.length > 0) {
    let bestIdx = 0;
    let bestScore = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const c = remaining[i];
      const transition = vaDistance(c.valence, c.arousal, cursor.valence, cursor.arousal);
      const familiarity = getFamiliarityScore(c, user, historySongs);
      // 越小越优先：过渡近（0.7）+ 更熟悉（0.3 想低 = 1 - 熟悉）
      const score = transition * 0.7 + (1 - familiarity) * 0.3;
      if (score < bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    const [chosen] = remaining.splice(bestIdx, 1);
    sequence.push({
      song: chosen,
      vaDistance: vaDistance(chosen.valence, chosen.arousal, cursor.valence, cursor.arousal),
    });
    cursor = { valence: chosen.valence, arousal: chosen.arousal };
  }
  return sequence;
}

/** 主函数：以用户歌单为"已拥有"，按滑块档位输出 10 首推荐 */
export function generateRecommendations(
  owned: Song[],
  intensity: Intensity,
  options?: { focusZoneId?: string; songs?: Song[] },
): RecommendationBundle {
  const songs = options?.songs ?? getSongs();
  const { styleDistanceMax, emotionStepMax } = INTENSITY_PARAMS[intensity];

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

  // 2) focusZone：地图点击探索 → 该区域歌词无条件入选并置顶
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

  // 3) 资格判定：命中焦点区任何歌都入选；否则需满足流派距离 + 情绪步长
  const qualifies = (c: Song, styleMax: number, emoStep: number) => {
    if (inFocus(c)) return true;
    const minGenreDist = Math.min(...topGenres.map((g) => styleDistance(c.genre, g)));
    return (
      minGenreDist <= styleMax &&
      Math.abs(c.valence - userAvg.valence) <= emoStep &&
      Math.abs(c.arousal - userAvg.arousal) <= emoStep
    );
  };

  // 4) 保底召回：不足 10 首则按「流派×情绪」「流派↑」「全放开」阶梯放宽
  const relaxStages: Array<[number, number]> = [
    [1, 1.5],
    [2, 2.5],
    [3, 4],
  ];
  let candidates = base.filter((c) => qualifies(c, styleDistanceMax, emotionStepMax));
  for (const [sMul, eMul] of relaxStages) {
    if (candidates.length >= 10) break;
    candidates = base.filter((c) => qualifies(c, styleDistanceMax * sMul, emotionStepMax * eMul));
  }

  // 5) 排序
  let ordered;
  if (focusZone) {
    // 焦点区歌词置顶（按其到区域中心的距离排），其余再贪心平滑续接
    const focused = candidates
      .filter((c) => inFocus(c))
      .sort(
        (a, b) =>
          vaDistance(a.valence, a.arousal, zoneCenter!.valence, zoneCenter!.arousal) -
          vaDistance(b.valence, b.arousal, zoneCenter!.valence, zoneCenter!.arousal),
      )
      .map((song) => ({ song, vaDistance: 0 }));
    const restCandidates = candidates.filter((c) => !inFocus(c));
    const restOrdered = greedySmoothSort(restCandidates, user, historySongs, zoneCenter ?? userAvg);
    ordered = [...focused, ...restOrdered];
  } else {
    ordered = greedySmoothSort(candidates, user, historySongs, userAvg);
  }

  // 7) 生成理由
  const recommendations: Recommendation[] = ordered.slice(0, 10).map(({ song, vaDistance: vd }) => ({
    song,
    reasonTags: generateReasonTags(song, user, historySongs, userAvg),
    vaDistance: vd,
    vaDistanceFromUserAvg: vaDistance(
      song.valence,
      song.arousal,
      userAvg.valence,
      userAvg.arousal,
    ),
  }));

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