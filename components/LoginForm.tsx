'use client';

/**
 * 登录已有账号：账号 + 密码 → 校验进入对应用户。
 * 账号信息保存在本机 localStorage（openear.accounts），密码明文仅用于本地演示环境。
 */
import { useState } from 'react';
import type { User } from '@/lib/types';
import { findAccount } from '@/lib/lib/accounts';
import { getUsers } from '@/lib/lib/store';

interface Props {
  onLogin: (user: User) => void;
}

export default function LoginForm({ onLogin }: Props) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    const n = name.trim();
    setError('');

    if (!n) {
      setError('请输入账号');
      return;
    }
    if (!password) {
      setError('请输入密码');
      return;
    }

    const acc = findAccount(n);
    if (!acc) {
      setError('这个账号还没注册，先去「注册新账号」吧');
      return;
    }
    if (acc.password !== password) {
      setError('密码不对，再试一次');
      return;
    }
    const u = getUsers().find((user) => user.userId === acc.userId);
    if (!u) {
      setError('这个账号还没完成建号，请先注册');
      return;
    }
    onLogin(u);
  };

  return (
    <section className="flex min-h-[calc(100vh-4.5rem)] flex-col items-center justify-center p-1 sm:p-3">
      <div className="w-full max-w-[420px]">
        <div className="mb-5 text-center">
          <h2 className="font-display text-xl text-ink">欢迎回来</h2>
          <p className="mt-1 text-[11px] text-ink/45">输入账号和密码，回到你的那片旷野</p>
        </div>

        <form
          className="glass-raised space-y-3 rounded-3xl p-5"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink/60">账号</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoFocus
              placeholder="你的账号名"
              className="w-full rounded-2xl border border-ink/10 bg-white/70 px-3.5 py-2.5 text-[13px] text-ink placeholder-ink/30 outline-none focus:border-violet-400/60"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-[11px] font-medium text-ink/60">密码</span>
            <span className="relative block">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPwd ? 'text' : 'password'}
                placeholder="你的密码"
                className="w-full rounded-2xl border border-ink/10 bg-white/70 px-3.5 py-2.5 pr-11 text-[13px] text-ink placeholder-ink/30 outline-none focus:border-violet-400/60"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? '隐藏密码' : '显示密码'}
                aria-pressed={showPwd}
                title={showPwd ? '隐藏密码' : '显示密码'}
                className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink/45 transition-colors hover:bg-ink/5 hover:text-ink/70"
              >
                {showPwd ? (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M3 3l18 18" />
                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                    <path d="M9.4 5.2A9.9 9.9 0 0 1 12 5c5 0 9 4.5 9 7 0 .9-.4 1.9-1.2 2.9" />
                    <path d="M6.3 6.5C4 8 3 10.2 3 12c0 2.5 4 7 9 7 1.5 0 2.9-.4 4.1-1" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                    <path d="M3 12s3.5-7 9-7 9 7 9 7-3.5 7-9 7-9-7-9-7Z" />
                    <circle cx="12" cy="12" r="2.6" />
                  </svg>
                )}
              </button>
            </span>
          </label>

          {error && <p className="text-[12px] font-medium text-rose-500">{error}</p>}

          <button
            type="submit"
            className="btn-lift w-full rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-glow"
          >
            登录 →
          </button>

          <p className="text-center text-[11px] text-ink/40">账号与密码仅保存在本机浏览器</p>
        </form>
      </div>
    </section>
  );
}