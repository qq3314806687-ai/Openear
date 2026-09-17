/**
 * OpenEar（解茧）数据读取层
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

/** 读取用户列表：内置三个演示身份 + 会话期新建用户 */
export function getUsers(): User[] {
  return [...(usersJson as User[]), ...runtimeUsers];
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