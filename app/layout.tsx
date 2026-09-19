import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '闻野 OpenEar · 在音浪里，遇见旷野',
  description: '用你爱听的歌，画出一张只属于你的情绪边界地图。',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <head>
        <link rel="stylesheet" href="/fonts/lxgw-wenkai/regular.css" />
      </head>
      <body>{children}</body>
    </html>
  );
}