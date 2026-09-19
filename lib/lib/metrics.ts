/**
 * 闻野 OpenEar基础工具函数
 * VA 距离、流派距离、熟悉度、空白区、平均 VA
 */
import type { Song, User, BlankZone } from '../types';
import songs from '../data/songs.json';

/**
 * 流派家族映射。
 * 用于计算流派距离：家族距离 3、同家族异流派 1、同流派 0。
 * 另设少量跨家族"桥梁"距离 2，实现温和的跨流派跳跃。
 */
const GENRE_FAMILIES: Record<string, string> = {
  // chill —— 舒缓低能量
  'Lo-fi': 'chill', Chillhop: 'chill', Ambient: 'chill', Lounge: 'chill',
  'New Age': 'chill', Classical: 'chill', Jazz: 'chill',
  // soulful —— 灵魂/律动/人声
  Soul: 'soulful', 'R&B': 'soulful', Funk: 'soulful', Gospel: 'soulful',
  // urban —— 城市流行/街头律动
  Pop: 'urban', 'City Pop': 'urban', 'K-pop': 'urban', 'Hip-Hop': 'urban',
  Reggae: 'urban', Afrobeats: 'urban', Latin: 'urban',
  // dance —— 电子舞曲
  Electronic: 'dance', House: 'dance', Techno: 'dance', Trance: 'dance',
  EDM: 'dance', Dubstep: 'dance', 'Drum & Bass': 'dance', Synthwave: 'dance',
  // rock —— 摇滚/硬质
  Rock: 'rock', Alternative: 'rock', Indie: 'rock', Punk: 'rock',
  Metal: 'rock', Grunge: 'rock',
  // atmospheric —— 氛围/气韵
  'Post-Rock': 'atmospheric', Shoegaze: 'atmospheric',
  // acoustic —— 民谣/乡野/蓝调
  Folk: 'acoustic', Country: 'acoustic', Blues: 'acoustic',
};

/** 语义上相邻、可"桥梁"跳转的跨家族对（距离 2） */
const BRIDGE_PAIRS: Array<[string, string]> = [
  // 电子 — 城市 / 摇滚
  ['Electronic', 'K-pop'], ['Electronic', 'Rock'], ['City Pop', 'Electronic'],
  // 爵士 — 灵魂 / 都市
  ['Jazz', 'R&B'], ['Jazz', 'City Pop'], ['Jazz', 'Soul'], ['Jazz', 'Funk'], ['Jazz', 'Blues'],
  ['Jazz', 'Lounge'],
  // 后摇 — 氛围 / 摇滚 / 电子
  ['Post-Rock', 'Rock'], ['Post-Rock', 'Ambient'], ['Classical', 'Ambient'],
  ['Post-Rock', 'Electronic'], ['Post-Rock', 'Folk'], ['Post-Rock', 'Shoegaze'],
  ['R&B', 'Hip-Hop'], ['R&B', 'Latin'], ['R&B', 'Afrobeats'],
  // 灵魂系
  ['Soul', 'Blues'], ['Soul', 'Gospel'], ['Soul', 'Pop'], ['Soul', 'City Pop'], ['Soul', 'Latin'],
  ['Funk', 'Hip-Hop'], ['Funk', 'Electronic'], ['Funk', 'Drum & Bass'],
  ['Gospel', 'Blues'],
  // 蓝调/民谣/乡野
  ['Blues', 'Rock'], ['Blues', 'Country'], ['Blues', 'Folk'],
  ['Country', 'Pop'], ['Country', 'Rock'], ['Folk', 'Indie'], ['Folk', 'Ambient'],
  ['Folk', 'Synthwave'],
  // 雷鬼/非洲/拉丁
  ['Reggae', 'Dubstep'], ['Reggae', 'Soul'], ['Reggae', 'Afrobeats'],
  ['Afrobeats', 'Drum & Bass'], ['Afrobeats', 'Funk'], ['Afrobeats', 'Latin'],
  ['Latin', 'Synthwave'], ['Latin', 'House'],
  // 舞曲
  ['House', 'Pop'], ['House', 'Hip-Hop'], ['House', 'Lounge'],
  ['Techno', 'Rock'], ['Techno', 'Metal'],
  ['Dubstep', 'Hip-Hop'], ['Dubstep', 'Rock'], ['Dubstep', 'Techno'],
  ['Drum & Bass', 'Hip-Hop'], ['Drum & Bass', 'Reggae'],
  ['Synthwave', 'City Pop'], ['Synthwave', 'Electronic'],
  ['Trance', 'New Age'], ['Trance', 'Ambient'],
  // 摇滚系
  ['Indie', 'Pop'], ['Indie', 'Electronic'], ['Indie', 'Folk'],
  ['Alternative', 'Electronic'], ['Alternative', 'Synthwave'],
  ['Punk', 'Hip-Hop'], ['Punk', 'Reggae'],
  ['Grunge', 'Shoegaze'], ['Grunge', 'Alternative'],
  ['Metal', 'Synthwave'], ['Metal', 'Electro'],
  // 氛围
  ['Shoegaze', 'Ambient'], ['Shoegaze', 'Dream Pop'],
  ['New Age', 'Post-Rock'], ['New Age', 'Shoegaze'],
  ['Lounge', 'City Pop'], ['Lounge', 'House'],
  ['Chillhop', 'Hip-Hop'], ['Chillhop', 'Lo-fi'], ['Chillhop', 'Jazz'],
];

/** 从类型安全角度读取歌曲库（JSON 推断） */
export function getSongs(): Song[] {
  return songs as Song[];
}

/**
 * 流派距离（0 = 同流派，1 = 同家族，2 = 桥梁，3 = 无关家族）
 */
export function getGenreDistance(a: string, b: string): number {
  if (a === b) return 0;
  const fa = GENRE_FAMILIES[a];
  const fb = GENRE_FAMILIES[b];
  if (fa && fa === fb) return 1;
  const paired = BRIDGE_PAIRS.some(
    ([x, y]) => (x === a && y === b) || (x === b && y === a),
  );
  if (paired) return 2;
  return 3;
}

/** 两点 VA 的欧氏距离（Valence × Arousal 平面） */
export function vaDistance(
  v1: number,
  a1: number,
  v2: number,
  a2: number,
): number {
  return Math.hypot(v1 - v2, a1 - a2);
}

/** 用户历史平均 VA */
export function calculateAverageVA(
  historySongs: Song[],
): { valence: number; arousal: number } {
  if (historySongs.length === 0) return { valence: 0.5, arousal: 0.5 };
  const sum = historySongs.reduce(
    (acc, s) => ({ valence: acc.valence + s.valence, arousal: acc.arousal + s.arousal }),
    { valence: 0, arousal: 0 },
  );
  return {
    valence: sum.valence / historySongs.length,
    arousal: sum.arousal / historySongs.length,
  };
}

/** 用户历史流派分布（按出现频次降序） */
export function getGenreDistribution(historySongs: Song[]): string[] {
  const counts = new Map<string, number>();
  historySongs.forEach((s) => counts.set(s.genre, (counts.get(s.genre) ?? 0) + 1));
  return [...counts.entries()].sort((x, y) => y[1] - x[1]).map(([g]) => g);
}

/**
 * 熟悉度：候选歌相对用户品味有多"贴近"（0~1，越大越熟悉）。
 * 考量：用户平均流派距离、BPM 是否在用户习惯区间、能量是否接近。
 */
export function getFamiliarityScore(
  candidate: Song,
  user: User,
  historySongs: Song[],
): number {
  const userGenres = getGenreDistribution(historySongs);
  const topGenre = userGenres[0];
  // 流派贴合分
  const genreScore = topGenre ? 1 - getGenreDistance(candidate.genre, topGenre) / 3 : 0.5;

  // BPM 贴近分（用户平均 BPM ± 20 视为贴合）
  const avgBpm =
    historySongs.reduce((acc, s) => acc + s.bpm, 0) / Math.max(historySongs.length, 1);
  const bpmScore = Math.max(0, 1 - Math.abs(candidate.bpm - avgBpm) / 60);

  const avgEnergy =
    historySongs.reduce((acc, s) => acc + s.energy, 0) / Math.max(historySongs.length, 1);
  const energyScore = Math.max(0, 1 - Math.abs(candidate.energy - avgEnergy));

  return (genreScore + bpmScore + energyScore) / 3;
}

/**
 * 空白区定义（PRD §3.2.2 点击探索）。
 * 坐标来自歌曲库 VA 分布的稀疏角落。
 */
export const BLANK_ZONES: BlankZone[] = [
  {
    id: 'zone-angry',
    label: '躁怒高压区（高能量 · 负情绪）',
    centerValence: 0.25,
    centerArousal: 0.87,
    radius: 0.16,
  },
  {
    id: 'zone-dread',
    label: '焦虑紧绷区（中高能量 · 负情绪）',
    centerValence: 0.32,
    centerArousal: 0.72,
    radius: 0.13,
  },
  {
    id: 'zone-euphoria',
    label: '极度兴奋区（高能量 · 强正情绪）',
    centerValence: 0.9,
    centerArousal: 0.9,
    radius: 0.12,
  },
];

/** 命中空白区：VA 中心距离在半径内 */
export function findZone(song: Song): BlankZone | undefined {
  return BLANK_ZONES.find(
    (z) => vaDistance(song.valence, song.arousal, z.centerValence, z.centerArousal) <= z.radius,
  );
}