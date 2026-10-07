'use client';

/**
 * 账号注册：自定义账号 + 自定义密码（位数不限），本地持久化。
 * 注册成功后不直接建号，而是交给上层跳到「小精灵测试题」，由测试题收集口味与昵称
 * （账号、密码与展示用的用户名无关）。
 */
import { useState } from 'react';
import { findAccount, saveAccount } from '@/lib/lib/accounts';
import { genUserId, getUsers } from '@/lib/lib/store';

interface Props {
  /** 注册成功：回传该账号对应的 userId（昵称随后由测试题收集） */
  onRegistered: (userId: string) => void;
}

export default function AccountLogin({ onRegistered }: Props) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');

  const submit = () => {
    const n = name.trim();
    setError('');

    if (!n) {
      setError('账号不能为空');
      return;
    }
    if (!password) {
      setError('密码不能为空');
      return;
    }

    const existing = findAccount(n);
    // 已注册且已建过号才算重复；只填了账号没走完测试题的，允许重新注册
    const taken = existing && getUsers().some((u) => u.userId === existing.userId);
    if (taken) {
      setError('这个账号已经注册过啦');
      return;
    }

    const userId = existing?.userId ?? genUserId();
    saveAccount({ name: n, password, userId });
    onRegistered(userId);
  };

  return (
    <section className="flex min-h-[calc(100vh-4.5rem)] flex-col items-center justify-center p-1 sm:p-3">
      <div className="w-full max-w-[420px]">
        <div className="mb-5 text-center">
          <h2 className="font-display text-xl text-ink">注册新账号</h2>
          <p className="mt-1 text-[11px] text-ink/45">
            填好账号和密码，接下来小精灵会带你做几道题，顺便给自己起个名字
          </p>
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
              placeholder="自定义账号名"
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
                placeholder="自定义密码，位数不限"
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
            注册，开始测试 →
          </button>

          <p className="text-center text-[11px] text-ink/40">账号与密码仅保存在本机浏览器</p>
        </form>
      </div>
    </section>
  );
}