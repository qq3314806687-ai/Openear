/**
 * 自定义账号（账号 + 密码）本地持久化。
 * 纯本地存储（PRD：无外部数据库）；密码明文存于 localStorage，仅用于本地演示环境。
 */
export interface Account {
  /** 账号名（唯一，匹配不区分大小写） */
  name: string;
  /** 自定义密码 */
  password: string;
  /** 关联的运行时用户 id */
  userId: string;
}

const ACCOUNTS_KEY = 'openear.accounts';

export function listAccounts(): Account[] {
  try {
    const raw = localStorage.getItem(ACCOUNTS_KEY);
    const list = raw ? (JSON.parse(raw) as unknown[]) : [];
    return Array.isArray(list)
      ? list.filter(
          (a): a is Account =>
            !!a &&
            typeof (a as Account).name === 'string' &&
            typeof (a as Account).password === 'string' &&
            typeof (a as Account).userId === 'string',
        )
      : [];
  } catch {
    return [];
  }
}

export function findAccount(name: string): Account | undefined {
  const n = name.trim().toLowerCase();
  return listAccounts().find((a) => a.name.trim().toLowerCase() === n);
}

export function saveAccount(acc: Account): void {
  try {
    const list = listAccounts().filter((a) => a.name.trim().toLowerCase() !== acc.name.trim().toLowerCase());
    list.push(acc);
    localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(list));
  } catch {
    /* 忽略 */
  }
}
