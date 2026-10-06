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
  // 允许为空：用户可以把演示身份全部删除；页面层用「旅人」访客兜底当前用户
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

/** 注册一个运行时新建的用户（登录/创建口味后调用；防重复） */
export function registerUser(user: User): User {
  if (!runtimeUsers.some((u) => u.userId === user.userId)) runtimeUsers.push(user);
  return user;
}

/** 生成不冲突的新用户 id（已删除/隐藏的身份 id 也占位，避免复用被删 id 导致新账号隐形） */
export function genUserId(prefix = 'user-'): string {
  const prefs = loadPrefs();
  const used = new Set<string>();
  getUsers().forEach((u) => used.add(u.userId));
  prefs.hidden.forEach((id) => used.add(id));
  let i = 1;
  while (used.has(`${prefix}${i}`)) i += 1;
  const id = `${prefix}${i}`;
  used.add(id);
  return id;
}

/** 取消隐藏某个身份（登录/兜底访客时恢复可见） */
export function unhideUser(userId: string): void {
  const prefs = loadPrefs();
  const next = prefs.hidden.filter((id) => id !== userId);
  if (next.length !== prefs.hidden.length) savePrefs({ ...prefs, hidden: next });
}