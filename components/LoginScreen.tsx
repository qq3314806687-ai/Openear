'use client';

/**
 * 登录 / 建号界面：与小精灵 Oreo 对话，一步步探索你的音乐世界。
 * - 主区：对话式向导（5 题 × 4 选项 +「其他」自填），生成专属口味画像
 * - 顶部：晨雾原野 hero 横幅 + 品牌「闻野」
 * - 侧栏：三个内置演示身份，一键快速体验
 */
import { useMemo } from 'react';
import type { Intensity, User } from '@/lib/types';
import { getUsers, getSongs } from '@/lib/lib/store';
import SpriteWelcome from '@/components/SpriteWelcome';
import BrandMark from '@/components/BrandMark';

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
      {/* 顶部晨雾原野横幅 + 品牌 */}
      <header className="lift relative mb-8 overflow-hidden rounded-3xl border border-panelEdge shadow-glow">
        <img
          src="/hero-mist.jpg"
          alt="晨雾中的远山与草地"
          className="h-48 w-full object-cover sm:h-56"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#202a24] via-[#202a24]/35 to-[#202a24]/5" />
        <div className="absolute bottom-4 left-5 right-5 flex flex-wrap items-end justify-between gap-3">
          <BrandMark />
          <span className="hidden text-sm italic text-[#eef0ea]/85 sm:block">
            让耳朵替你，去远方吹吹风。
          </span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* 主区：小精灵对话 */}
        <SpriteWelcome onLogin={onLogin} />

        {/* 侧栏：演示身份快速体验 */}
        <aside className="lift flex flex-col rounded-3xl glass p-5">
          <h2 className="text-sm font-semibold text-white">想跳过问答？</h2>
          <p className="mt-0.5 text-xs text-white/50">直接用一个演示身份，看野路子怎么替他们各自开路。</p>

          <div className="mt-4 flex flex-col gap-3">
            {demoUsers.map((u) => (
              <button
                key={u.userId}
                type="button"
                onClick={() => onLogin(u)}
                className="group lift flex items-center gap-3 rounded-2xl border border-panelEdge bg-white/5 p-3 text-left hover:border-violet-400/50 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
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

          <p className="mt-5 border-t border-panelEdge pt-4 text-[11px] leading-relaxed text-white/40">
            所有数据都留在你的浏览器里 · 共 {songCount} 首野路子可探索。
          </p>
        </aside>
      </div>

      <footer className="mt-8 text-center text-[11px] text-white/30">
        闻野 OpenEar · 让每一种情绪，都有一处旷野可去
      </footer>
    </main>
  );
}