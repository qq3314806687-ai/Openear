import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'OpenEar 解茧 · 把探索音乐的控制权还给你',
  description: '可控探索强度、可视化情绪边界、可解释的反茧房推荐。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}