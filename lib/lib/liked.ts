/**
 * 红心（喜欢）存储：每用户一个红心歌曲 id 集合，localStorage 持久化。
 * 情绪地图以红心歌单为主角——点得越多次，地图长出自己的地形。
 * 仅在浏览器端可用（SSR 安全）。
 */
const LS_PREFIX = 'openear.likes.';

const liked = new Map<string, Set<string>>();

function load(userId: string): Set<string> {
  if (typeof window === 'undefined') return new Set();
  if (!liked.has(userId)) {
    let arr: string[] = [];
    try {
      const raw = window.localStorage.getItem(LS_PREFIX + userId);
      arr = raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      arr = [];
    }
    liked.set(userId, new Set(arr));
  }
  return liked.get(userId)!;
}

function persist(userId: string) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_PREFIX + userId, JSON.stringify([...liked.get(userId)!]));
  } catch {
    /* 私隐模式等写入失败可忽略 */
  }
}

/** 某用户红心的歌曲 id 列表 */
export function getLikedIds(userId: string): string[] {
  return [...load(userId)];
}

export function isLiked(userId: string, songId: string): boolean {
  return load(userId).has(songId);
}

/** 切换红心，返回切换后的 id 列表与是否已红心 */
export function toggleLiked(userId: string, songId: string): { ids: string[]; nowLiked: boolean } {
  const set = load(userId);
  const nowLiked = set.has(songId);
  if (nowLiked) set.delete(songId);
  else set.add(songId);
  persist(userId);
  return { ids: [...set], nowLiked: !nowLiked };
}

/** 清空某人红心（回到初始味觉） */
export function clearLiked(userId: string) {
  load(userId).clear();
  persist(userId);
}