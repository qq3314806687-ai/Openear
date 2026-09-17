'use client';

/**
 * 页头用户菜单：当前身份 + 一键换身份 + 退出（返回登录）
 */
import type { User } from '@/lib/types';

interface Props {
  users: User[];
  current: User;
  onSwitch: (userId: string) => void;
  onLogout: () => void;
}

export default function UserMenu({ users, current, onSwitch, onLogout }: Props) {
  const isCustom = current.userId.startsWith('user-');
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-2 py-1.5">
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/70 to-cyan-500/70 text-[11px] font-bold text-white"
          title={current.name}
        >
          {current.name.slice(0, 1)}
        </span>
        <select
          value={current.userId}
          onChange={(e) => onSwitch(e.target.value)}
          aria-label="切换演示身份"
          className="max-w-[10rem] cursor-pointer bg-transparent text-sm text-white outline-none"
        >
          {users.map((u) => (
            <option key={u.userId} value={u.userId} className="bg-[#161623] text-white">
              {u.userId.startsWith('user-') ? `· ${u.name}` : u.name}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        onClick={onLogout}
        title={isCustom ? undefined : '退出回到登录'}
        className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70 transition-colors hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400"
      >
        {isCustom ? '退出' : '换一个'}
      </button>
    </div>
  );
}