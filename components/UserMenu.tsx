'use client';

/**
 * 页头用户菜单：当前身份 + 展开身份列表。
 * 左键切换身份；右键对应身份弹出管理菜单（置顶 / 删除）。
 */
import { useEffect, useRef, useState } from 'react';
import type { User } from '@/lib/types';

interface Props {
  users: User[];
  current: User;
  onSwitch: (userId: string) => void;
  onPin: (userId: string) => void;
  onDelete: (userId: string) => void;
}

const MENU_W = 168;
const MENU_H = 88;

export default function UserMenu({ users, current, onSwitch, onPin, onDelete }: Props) {
  const [open, setOpen] = useState(false);
  const [ctx, setCtx] = useState<{ id: string; x: number; y: number } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open && !ctx) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      // 右键菜单：点菜单内部保留，点外部关闭
      if (ctx && !menuRef.current?.contains(t)) setCtx(null);
      // 下拉列表：点组件外部关闭
      if (open && rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setCtx(null);
        setOpen(false);
      }
    };
    const onScroll = () => setCtx(null);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, ctx]);

  const ctxX = ctx ? Math.min(ctx.x, window.innerWidth - MENU_W - 8) : 0;
  const ctxY = ctx ? Math.min(ctx.y, window.innerHeight - MENU_H - 8) : 0;

  return (
    <div ref={rootRef} className="relative">
      {/* 触发按钮 */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-colors hover:bg-white/10"
      >
        <span
          className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/70 to-cyan-500/70 text-[11px] font-bold text-white"
          aria-hidden
        >
          {current.name.slice(0, 1)}
        </span>
        <span className="max-w-[8rem] truncate">
          {current.userId.startsWith('user-') ? `· ${current.name}` : current.name}
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* 身份列表 */}
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/15 bg-[#161c26]/95 p-1.5 shadow-glow backdrop-blur-xl"
        >
          <p className="px-2 pb-1 pt-1 text-[10px] uppercase tracking-widest text-white/35">
            身份 · 右键管理
          </p>
          {users.map((u) => (
            <button
              key={u.userId}
              type="button"
              role="option"
              aria-selected={u.userId === current.userId}
              onClick={() => {
                onSwitch(u.userId);
                setOpen(false);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setCtx({ id: u.userId, x: e.clientX, y: e.clientY });
              }}
              className={`flex w-full items-center gap-2 rounded-xl px-2 py-2 text-left text-sm transition-colors ${
                u.userId === current.userId ? 'bg-white/10' : 'hover:bg-white/5'
              }`}
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/70 to-cyan-500/70 text-[11px] font-bold text-white"
                aria-hidden
              >
                {u.name.slice(0, 1)}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-white">
                  {u.userId.startsWith('user-') ? `· ${u.name}` : u.name}
                </span>
                <span className="block text-[10px] text-white/35">右键 · 置顶/删除</span>
              </span>
              {u.userId === current.userId && (
                <span className="shrink-0 text-[11px] text-emerald-300">当前</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* 右键管理菜单 */}
      {ctx && (
        <div
          ref={menuRef}
          className="fixed z-[160] w-[168px] overflow-hidden rounded-xl border border-white/15 bg-[#1a222c]/95 p-1 shadow-glow backdrop-blur-xl"
          style={{ left: ctxX, top: ctxY }}
        >
          <button
            type="button"
            onClick={() => {
              onPin(ctx.id);
              setCtx(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-white/90 hover:bg-white/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 17v5M6 13l6-9 6 9H6Z" />
              <path d="M7 16h10" opacity="0.5" />
            </svg>
            置顶
          </button>
          <button
            type="button"
            onClick={() => {
              onDelete(ctx.id);
              setCtx(null);
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-rose-300 hover:bg-rose-500/15"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
            删除
          </button>
        </div>
      )}
    </div>
  );
}