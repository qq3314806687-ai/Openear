'use client';

/**
 * 登录 / 建号界面：与小精灵 Oreo 对话，一步步探索你的音乐世界。
 * - 主区：对话式向导（5 题 × 4 选项 +「其他」自填），生成专属口味画像
 * - 侧栏：三个内置演示身份，一键快速体验
 */
import { useMemo } from 'react';
import type { Intensity, User } from '@/lib/types';
import { getUsers, getSongs } from '@/lib/lib/store';
import SpriteWelcome from '@/components/SpriteWelcome';

interface Props {
  onLogin: (user: User, opts?: { intensity?: Intensity }) => void;
}

const PERSONA_INTRO: Record<string, string> = {
  userA: '窝在舒适区的慢节奏，口味很窄但很专一',
  userB: '快感与能量全都要，甜但不腻',
  userC: '安静里听尽弦与风，探索欲望强烈',
};

export default function LoginScreen({ onLogin }: Props) {
  const demoUsers = useMemo(() => getUsers().filter((u) => !u.userId.startsWith('user-')), []);
  const songCount = useMemo(() => getSongs().length, []);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col justify-center px-5 py-10">
      {/* 品牌 */}
      <header className="mb-8 flex items-center gap-3">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-2xl font-black text-white shadow-glow">
          O
        </span>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            OpenEar <span className="text-white/40">解茧</span>
          </h1>
          <p className="text-sm text-white/60">不是给你更多同款，而是带你走出同款。</p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* 主区：小精灵对话 */}
        <SpriteWelcome onLogin={onLogin} />

        {/* 侧栏：演示身份快速体验 */}
        <aside className="flex flex-col rounded-3xl border border-white/10 bg-panel p-5 backdrop-blur">
          <h2 className="text-sm font-semibold text-white">想跳过问答？</h2>
          <p className="mt-0.5 text-xs text-white/50">直接用一个演示身份，看引擎如何为他们各自开路。</p>

          <div className="mt-4 flex flex-col gap-3">
            {demoUsers.map((u) => (
              <button
                key={u.userId}
                type="button"
                onClick={() => onLogin(u)}
                className="group flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 text-left transition-all hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/10 hover:shadow-glow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/40 to-cyan-500/40 text-sm font-bold text-white">
                  {u.name.slice(0, 1)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{u.name}</span>
                  <span className="block truncate text-xs text-white/50">
                    {PERSONA_INTRO[u.userId] ?? '探索你的口味'}
                  </span>
                </span>
                <span className="ml-auto text-sm text-white/30 transition-colors group-hover:text-violet-300">
                  进入 →
                </span>
              </button>
            ))}
          </div>

          <p className="mt-5 border-t border-white/10 pt-4 text-[11px] leading-relaxed text-white/40">
            全本地 JSON 数据，无隐私收集 · {songCount} 首可探索歌曲，推荐引擎为纯规则计算。
          </p>
        </aside>
      </div>

      <footer className="mt-8 text-center text-[11px] text-white/30">
        OpenEar 解茧 · 腾讯音乐高校 AI Hackathon 赛道二 · 登录仅为本地演示，不做真实鉴权
      </footer>
    </main>
  );
}