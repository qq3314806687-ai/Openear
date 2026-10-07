'use client';

/**
 * 登录界面：三种进入方式。
 * - 登录：已有账号 + 密码，直接回到对应用户
 * - 注册新账号：自定义账号 + 密码，注册成功后自动进入小精灵测试题（起名字 + 生成口味画像）
 * - 小精灵带我探索：不填账号，直接对话式 5 问建号
 */
import { useState } from 'react';
import type { Intensity, User } from '@/lib/types';
import AccountLogin from '@/components/AccountLogin';
import LoginForm from '@/components/LoginForm';
import SpriteWelcome from '@/components/SpriteWelcome';
import PetalRain from '@/components/PetalRain';

interface Props {
  onLogin: (user: User, opts?: { intensity?: Intensity }) => void;
}

type LoginMode = 'signin' | 'register' | 'sprite';

export default function LoginScreen({ onLogin }: Props) {
  const [mode, setMode] = useState<LoginMode>('signin');
  // 注册成功后带下来的 userId：测试题结束时用它建号，昵称则由测试题收集
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const switchMode = (next: LoginMode) => {
    setPendingUserId(null);
    setMode(next);
  };

  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-white/75 via-[#dbe6ee] to-[#c9d9e8]">
      {/* 全屏花瓣飘落 */}
      <PetalRain />

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col justify-center px-5 py-6 sm:py-10">
        {/* 顶部切换：登录 / 注册新账号 / 小精灵探索 */}
        <div className="mb-4 flex justify-center">
          <div className="grid w-fit grid-cols-3 gap-1 rounded-full border border-ink/10 bg-white/60 p-1 text-xs font-semibold backdrop-blur">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={
                mode === 'signin'
                  ? 'rounded-full bg-white/90 px-3 py-1.5 text-ink shadow-sm sm:px-4'
                  : 'px-3 py-1.5 text-ink/50 hover:text-ink sm:px-4'
              }
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={
                mode === 'register'
                  ? 'rounded-full bg-white/90 px-3 py-1.5 text-ink shadow-sm sm:px-4'
                  : 'px-3 py-1.5 text-ink/50 hover:text-ink sm:px-4'
              }
            >
              注册新账号
            </button>
            <button
              type="button"
              onClick={() => switchMode('sprite')}
              className={
                mode === 'sprite'
                  ? 'rounded-full bg-white/90 px-3 py-1.5 text-ink shadow-sm sm:px-4'
                  : 'px-3 py-1.5 text-ink/50 hover:text-ink sm:px-4'
              }
            >
              小精灵带我探索
            </button>
          </div>
        </div>

        {/* 主区：登录 / 注册 / 小精灵对话（注册成功后自动切到小精灵测试题） */}
        {mode === 'signin' ? (
          <LoginForm onLogin={(user) => onLogin(user)} />
        ) : mode === 'register' ? (
          <AccountLogin
            onRegistered={(userId) => {
              setPendingUserId(userId);
              setMode('sprite');
            }}
          />
        ) : (
          <SpriteWelcome presetUserId={pendingUserId ?? undefined} onLogin={onLogin} />
        )}

        <footer className="mt-6 text-center text-[11px] text-ink/35">
          闻野 OpenEar · 让每一种情绪，都有一处旷野可去
        </footer>
      </div>
    </main>
  );
}