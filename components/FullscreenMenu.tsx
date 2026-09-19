'use client';

/**
 * 右上角全屏菜单：三横线按钮 → 点击展开全屏毛玻璃菜单，图标动画变成叉号，
 * 菜单项逐条淡入上浮；再点叉号（或空白/Esc）收起。
 * 点击菜单项会通过 onNavigate 分流到对应界面/区块。
 */
import { useEffect, useState } from 'react';

export type MenuRoute = 'home' | 'map' | 'playlist' | 'trail' | 'today';

interface Props {
  onNavigate: (route: MenuRoute) => void;
}

const ITEMS: Array<{ zh: string; en: string; route: MenuRoute }> = [
  { zh: '首页', en: 'Home', route: 'home' },
  { zh: '情绪边界地图', en: 'Emotion Map', route: 'map' },
  { zh: '我的歌单', en: 'My Playlist', route: 'playlist' },
  { zh: '推荐路线', en: 'Recommended Trail', route: 'trail' },
  { zh: '今日一首', en: 'Today', route: 'today' },
];

export default function FullscreenMenu({ onNavigate }: Props) {
  const [open, setOpen] = useState(false);
  const [show, setShow] = useState(false); // 控制挂载，以支持收起动画

  const close = () => {
    setOpen(false);
    setTimeout(() => setShow(false), 420);
  };

  const toggle = () => {
    if (open) {
      close();
    } else {
      setShow(true);
      // 下一帧再加 .menu-open，保证进场过渡生效
      requestAnimationFrame(() => requestAnimationFrame(() => setOpen(true)));
    }
  };

  const select = (route: MenuRoute) => {
    close();
    onNavigate(route);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-label={open ? '收起菜单' : '展开菜单'}
        aria-expanded={open}
        className={`menu-toggle${open ? ' menu-open' : ''}`}
        onClick={toggle}
      >
        <span className="menu-bar" />
        <span className="menu-bar" />
        <span className="menu-bar" />
      </button>

      {show && (
        <div className={`fullscreen-menu${open ? ' menu-open' : ''}`} onClick={close}>
          {ITEMS.map((it, i) => (
            <button
              key={it.route}
              type="button"
              className="menu-item"
              style={{ '--i': i } as React.CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                select(it.route);
              }}
            >
              <span className="menu-en">{it.en}</span>
              <span className="menu-zh">{it.zh}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}