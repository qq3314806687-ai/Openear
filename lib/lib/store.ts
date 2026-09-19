/**
 * 闻野 OpenEar数据读取层
 * 从本地 JSON 读取歌曲库与用户历史（PRD §5，无外部 API）。
 */
import type { Song, User } from '../types';
import songsJson from '../data/songs.json';
import usersJson from '../data/users.json';

let songsCache: Song[] | null = null;

/** 会话期（运行时）新建的用户，登录流程把自定义口味写在这里 */
const runtimeUsers: User[] = [];

/** 读取歌曲库 */
export function getSongs(): Song[] {
  if (!songsCache) songsCache = songsJson as Song[];
  return songsCache;
}

/** 读取用户列表：内置三个演示身份 + 会话期新建用户（按置顶顺序，隐藏被删除的） */
export function getUsers(): User[] {
  const prefs = loadPrefs();
  const hidden = new Set(prefs.hidden);
  const base = [...(usersJson as User[]), ...runtimeUsers].filter((u) => !hidden.has(u.userId));
  const byId = new Map(base.map((u) => [u.userId, u]));
  const ordered: User[] = [];
  for (const id of prefs.order) {
    const u = byId.get(id);
    if (u) {
      ordered.push(u);
      byId.delete(id);
    }
  }
  ordered.push(...byId.values());
  return ordered;
}

/** 置顶某个身份：移到列表最前（持久化） */
export function pinUser(userId: string): void {
  const prefs = loadPrefs();
  prefs.order = [userId, ...prefs.order.filter((id) => id !== userId)];
  savePrefs(prefs);
}

/** 删除某个身份（内置与运行时都支持，持久化隐藏） */
export function removeUser(userId: string): void {
  const idx = runtimeUsers.findIndex((u) => u.userId === userId);
  if (idx >= 0) runtimeUsers.splice(idx, 1);
  const prefs = loadPrefs();
  if (!prefs.hidden.includes(userId)) prefs.hidden.push(userId);
  savePrefs(prefs);
}

/* —— 用户偏好（置顶/隐藏）持久化 —— */
const PREFS_KEY = 'openear.usersPrefs';
type Prefs = { order: string[]; hidden: string[] };
function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    const p = raw ? JSON.parse(raw) : null;
    return {
      order: Array.isArray(p?.order) ? (p.order as string[]) : [],
      hidden: Array.isArray(p?.hidden) ? (p.hidden as string[]) : [],
    };
  } catch {
    return { order: [], hidden: [] };
  }
}
function savePrefs(p: Prefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(p));
  } catch {
    /* 忽略 */
  }
}

/** 注册一个运行时新建的用户（登录/创建口味后调用） */
export function registerUser(user: User): User {
  runtimeUsers.push(user);
  return user;
}

/** 生成不冲突的新用户 id */
export function genUserId(prefix = 'user-'): string {
  const used = new Set(getUsers().map((u) => u.userId));
  let i = 1;
  while (used.has(`${prefix}${i}`)) i += 1;
  const id = `${prefix}${i}`;
  used.add(id);
  return id;
}