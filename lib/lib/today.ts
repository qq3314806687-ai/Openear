/**
 * 「今日心情」：作为每次登录探索的当日起点。
 * 用户从 4 个今日感情类型中选一个，按 V/A 距离从曲库挑一首「今日主打」。
 * 它不进入永久口味画像（qualifiers 已由 5 题问答完成），而是独立于当天。
 */
import type { Song } from '../types';
import { getSongs } from './store';

export interface TodayMood {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  /** 目标情绪点（valence, arousal∈0..1） */
  vBase: number;
  aBase: number;
  reply: string;
}

export const TODAY_MOODS: TodayMood[] = [
  {
    id: 'boost',
    label: '电量满格 · 想嗨一场',
    emoji: '⚡',
    desc: '高能 · 高愉悦',
    vBase: 0.85,
    aBase: 0.8,
    reply: '今天这电量，值得一整个躁动的白昼。',
  },
  {
    id: 'calm',
    label: '微暖 · 想被治愈',
    emoji: '☀️',
    desc: '低能 · 中高愉悦',
    vBase: 0.72,
    aBase: 0.26,
    reply: '正好，我有一张很暖的沙发，先把疲惫放下来。',
  },
  {
    id: 'down',
    label: '低电量 · 有点低落',
    emoji: '🌧️',
    desc: '低愉悦 · 低能量',
    vBase: 0.18,
    aBase: 0.28,
    reply: '不急着赶路，我慢慢陪你把乌云拧干。',
  },
  {
    id: 'crush',
    label: '心动 · 挂念着谁',
    emoji: '✨',
    desc: '中高能 · 好奇',
    vBase: 0.6,
    aBase: 0.68,
    reply: '这种悸动，交给一段探向未知的旋律刚刚好。',
  },
];

export function getTodayMoodById(id: string): TodayMood | undefined {
  return TODAY_MOODS.find((m) => m.id === id);
}

/** 从内置曲库挑一首与今日心情 V/A 最贴近的歌充作「今日主打」 */
export function pickTodaySong(mood: TodayMood): Song | null {
  const songs = getSongs();
  let best: Song | null = null;
  let bd = Infinity;
  for (const s of songs) {
    const d = Math.hypot(s.valence - mood.vBase, s.arousal - mood.aBase);
    if (d < bd) {
      bd = d;
      best = s;
    }
  }
  return best;
}