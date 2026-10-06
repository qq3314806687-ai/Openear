'use client';

/**
 * 登录 / 建号界面：与小精灵 Oreo 对话，一步步探索你的音乐世界。
 * - 整页浅色天空渐变 + 花瓣飘落背景，对话面板融合其中
 * - 主区：全屏对话向导（5 题 × 4 选项 +「其他」自填），生成专属口味画像
 */
import type { Intensity, User } from '@/lib/types';
import SpriteWelcome from '@/components/SpriteWelcome';
import PetalRain from '@/components/PetalRain';

interface Props {
  onLogin: (user: User, opts?: { intensity?: Intensity }) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-gradient-to-b from-white/75 via-[#dbe6ee] to-[#c9d9e8]">
      {/* 全屏花瓣飘落 */}
      <PetalRain />

      <div className="relative z-10 mx-auto flex w-full max-w-[1100px] flex-col justify-center px-5 py-6 sm:py-10">
        {/* 主区：小精灵对话（融入全屏） */}
        <SpriteWelcome onLogin={onLogin} />

        <footer className="mt-6 text-center text-[11px] text-ink/35">
          闻野 OpenEar · 让每一种情绪，都有一处旷野可去
        </footer>
      </div>
    </main>
  );
}
