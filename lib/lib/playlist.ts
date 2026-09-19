/**
 * 红心歌单存储：每个用户维护一份"我添加的歌曲"歌单（localStorage 持久化）。
 * - 可从内置曲库添加（source: builtin）
 * - 也可粘贴音频直链自建歌曲（source: custom，额外写入全局 extras 注册表）
 * 情绪边界地图与推荐都基于这份歌单生成。
 */
import type { Song } from '../types';
import { getSongs } from './metrics';
import { resolveAudioUrl } from './audio';
import { saveAudioBlob } from './idb';

const EXTRA_KEY = 'openear.extras';
const PLAYLIST_PREFIX = 'openear.pl.';

const extrasCache = new Map<string, Song[]>();
const idSeq: Record<string, number> = {};

/** 全局自定义歌曲注册表（粘贴直链创建的歌，跨用户共享可推荐/可加入） */
function getExtras(): Song[] {
  if (typeof window === 'undefined') return [];
  if (!extrasCache.has('all')) {
    let list: Song[] = [];
    try {
      const raw = window.localStorage.getItem(EXTRA_KEY);
      list = raw ? (JSON.parse(raw) as Song[]) : [];
    } catch {
      list = [];
    }
    extrasCache.set('all', list);
  }
  return extrasCache.get('all')!;
}

function persistExtras() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(EXTRA_KEY, JSON.stringify(getExtras()));
  } catch {
    /* 忽略 */
  }
}

/** 内置曲库 + 自定义注册表 = 可用的全量曲目池 */
export function getRuntimeSongs(): Song[] {
  return [...getSongs(), ...getExtras()];
}

function playlistIds(userId: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(PLAYLIST_PREFIX + userId);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
function persistPlaylist(userId: string, ids: string[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PLAYLIST_PREFIX + userId, JSON.stringify(ids));
  } catch {
    /* 忽略 */
  }
}

/** 用户歌单（解析为完整 Song，含自定义曲） */
export function getPlaylist(userId: string): Song[] {
  const ids = new Set(playlistIds(userId));
  return getRuntimeSongs().filter((s) => ids.has(s.id));
}

export function isInPlaylist(userId: string, songId: string): boolean {
  return playlistIds(userId).includes(songId);
}

/** 把一首已有歌曲加入/移出歌单，返回新歌单 */
export function togglePlaylist(userId: string, song: Song): Song[] {
  const ids = playlistIds(userId);
  const idx = ids.indexOf(song.id);
  if (idx >= 0) ids.splice(idx, 1);
  else ids.push(song.id);
  persistPlaylist(userId, ids);
  return getPlaylist(userId);
}

/** 从内置曲库直接加入 */
export function addBuiltIn(userId: string, songId: string): Song[] {
  const pool = getRuntimeSongs();
  const song = pool.find((s) => s.id === songId);
  if (!song) return getPlaylist(userId);
  const ids = playlistIds(userId);
  if (!ids.includes(songId)) {
    ids.push(songId);
    persistPlaylist(userId, ids);
  }
  return getPlaylist(userId);
}

/** 从歌单移除 */
export function removeFromPlaylist(userId: string, songId: string): Song[] {
  const ids = playlistIds(userId).filter((id) => id !== songId);
  persistPlaylist(userId, ids);
  return getPlaylist(userId);
}

export function clearPlaylist(userId: string) {
  persistPlaylist(userId, []);
}

/** 情绪标签 → VA/能量 基准（用户自建歌曲时选一个口味定位） */
export const MOOD_PRESETS: Record<string, { valence: number; arousal: number; energy: number; label: string }> = {
  calm: { valence: 0.68, arousal: 0.3, energy: 0.34, label: '宁静' },
  chill: { valence: 0.55, arousal: 0.24, energy: 0.3, label: '慵懒' },
  happy: { valence: 0.9, arousal: 0.62, energy: 0.78, label: '愉悦' },
  excited: { valence: 0.82, arousal: 0.86, energy: 0.92, label: '兴奋' },
  tense: { valence: 0.3, arousal: 0.84, energy: 0.82, label: '躁动' },
  down: { valence: 0.26, arousal: 0.36, energy: 0.42, label: '低落' },
};

const GENRE_TAG: Record<string, string> = {
  'Lo-fi': 'Lo-fi', Chillhop: 'Chillhop', Ambient: 'Ambient', Lounge: 'Lounge',
  'New Age': 'New Age', Classical: 'Classical', Jazz: 'Jazz',
  Soul: 'Soul', 'R&B': 'R&B', Funk: 'Funk', Gospel: 'Gospel',
  Pop: 'Pop', 'City Pop': 'City Pop', 'K-pop': 'K-pop', 'Hip-Hop': 'Hip-Hop',
  Reggae: 'Reggae', Afrobeats: 'Afrobeats', Latin: 'Latin',
  Electronic: 'Electronic', House: 'House', Techno: 'Techno', Trance: 'Trance',
  EDM: 'EDM', Dubstep: 'Dubstep', 'Drum & Bass': 'Drum & Bass', Synthwave: 'Synthwave',
  Rock: 'Rock', Alternative: 'Alternative', Indie: 'Indie', Punk: 'Punk',
  Metal: 'Metal', Grunge: 'Grunge',
  'Post-Rock': 'Post-Rock', Shoegaze: 'Shoegaze',
  Folk: 'Folk', Country: 'Country', Blues: 'Blues',
};

const PALETTE = [
  '#22d3ee', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#60a5fa', '#f87171', '#2dd4bf', '#c084fc', '#fb923c',
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

/** 用直链自建一首歌：根据口味定位 + 歌名哈希注入细节，写进自定义注册表并加入歌单 */
export function addCustomSong(
  userId: string,
  input: { title: string; artist?: string; audioUrl: string; mood: string; genre?: string },
): { song: Song; playlist: Song[]; notice?: string } {
  const preset = MOOD_PRESETS[input.mood] ?? MOOD_PRESETS.chill;
  const h = hashStr(input.title || input.audioUrl);
  const id = `cust-${Date.now().toString(36)}-${(idSeq[userId] = (idSeq[userId] ?? 0) + 1)}`;
  const resolved = resolveAudioUrl(input.audioUrl);
  const song: Song = {
    id,
    title: input.title.trim() || '未命名曲目',
    artist: input.artist?.trim() || '来自你的音源',
    genre: (input.genre && GENRE_TAG[input.genre]) || 'Electronic',
    bpm: 70 + (h % 90),
    energy: clamp(preset.energy + ((h % 11) - 5) / 60),
    valence: clamp(preset.valence + ((h >> 3) % 11 - 5) / 60),
    arousal: clamp(preset.arousal + ((h >> 5) % 11 - 5) / 60),
    mood: preset.label,
    coverColor: PALETTE[h % PALETTE.length],
    audioUrl: resolved.url,
    source: 'custom',
  };
  const extras = getExtras();
  extras.push(song);
  persistExtras();

  const ids = playlistIds(userId);
  ids.push(id);
  persistPlaylist(userId, ids);
  return { song, playlist: getPlaylist(userId), notice: resolved.note };
}

interface UploadInput {
  title: string;
  artist?: string;
  mood: string;
  genre?: string;
  file: Blob;
}

/** 用本地上传的音频文件自建一首歌：Blob 存 IndexedDB，播放端按 sound://<id> 取回 */
export async function addUploadedSong(
  userId: string,
  input: UploadInput,
): Promise<{ song: Song; playlist: Song[] }> {
  const preset = MOOD_PRESETS[input.mood] ?? MOOD_PRESETS.chill;
  const h = hashStr(input.title || 'upload');
  const id = `cust-${Date.now().toString(36)}-${(idSeq[userId] = (idSeq[userId] ?? 0) + 1)}`;
  await saveAudioBlob(id, input.file);
  const song: Song = {
    id,
    title: input.title.trim() || '未命名曲目',
    artist: input.artist?.trim() || '本地音源',
    genre: (input.genre && GENRE_TAG[input.genre]) || 'Electronic',
    bpm: 70 + (h % 90),
    energy: clamp(preset.energy + ((h % 11) - 5) / 60),
    valence: clamp(preset.valence + ((h >> 3) % 11 - 5) / 60),
    arousal: clamp(preset.arousal + ((h >> 5) % 11 - 5) / 60),
    mood: preset.label,
    coverColor: PALETTE[h % PALETTE.length],
    audioUrl: `sound://${id}`,
    source: 'custom',
  };
  const extras = getExtras();
  extras.push(song);
  persistExtras();

  const ids = playlistIds(userId);
  ids.push(id);
  persistPlaylist(userId, ids);
  return { song, playlist: getPlaylist(userId) };
}

function clamp(n: number) {
  return Math.max(0, Math.min(1, n));
}

export { GENRE_TAG };