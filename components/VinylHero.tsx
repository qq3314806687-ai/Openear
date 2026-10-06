'use client';

/**
 * 黑胶 hero 首屏：金色黄昏的旷野黑胶唱机（视频背景）+ 墨色大字标题 + 全屏菜单。
 * 开场动画完成后点击任意入口 → onEnter 进入应用。
 */
import { useEffect, useRef, useState } from 'react';

const VIDEO_URL = 'https://motionsites.org/assets/prompt-media/fdf088e281c69fca93f9.mp4';
const POSTER_URL = 'https://motionsites.org/assets/prompt-media/b56bca6626151625e1e8.webp';

const NAV_ITEMS = [
  { zh: '首页', en: 'Home' },
  { zh: '情绪边界地图', en: 'Emotion Map' },
  { zh: '我的歌单', en: 'My Playlist' },
  { zh: '今日一首', en: 'Today' },
];

interface Props {
  onEnter: () => void;
  fading?: boolean;
}

export default function VinylHero({ onEnter, fading = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuShow, setMenuShow] = useState(false);

  // 视频就绪后再淡入（避免首帧闪烁）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const reveal = () => video.classList.add('is-ready');
    if (video.readyState >= 3) reveal();
    else video.addEventListener('loadeddata', reveal, { once: true });
    return () => video.removeEventListener('loadeddata', reveal);
  }, []);

  // 播放：立即尝试 + 首次触摸/点击再补一次（部分移动浏览器要求手势）
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const kick = () => {
      const p = video.play();
      if (p && p.catch) p.catch(() => {});
    };
    kick();
    const onGesture = () => kick();
    document.addEventListener('touchstart', onGesture, { once: true, passive: true });
    document.addEventListener('click', onGesture, { once: true });
    return () => {
      document.removeEventListener('touchstart', onGesture);
      document.removeEventListener('click', onGesture);
    };
  }, []);

  const closeMenu = () => {
    setMenuOpen(false);
    setTimeout(() => setMenuShow(false), 860);
  };

  const toggleMenu = () => {
    if (menuOpen) {
      closeMenu();
    } else {
      setMenuShow(true);
      requestAnimationFrame(() => requestAnimationFrame(() => setMenuOpen(true)));
    }
  };

  const go = () => {
    if (menuOpen) closeMenu();
    onEnter();
  };

  // 菜单打开时锁住背后滚动 + Esc / 超宽屏自动收起
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && menuOpen) closeMenu();
    };
    const onResize = () => {
      if (menuOpen && window.innerWidth > 900) closeMenu();
    };
    if (menuShow) document.body.classList.add('menu-open');
    else document.body.classList.remove('menu-open');
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.classList.remove('menu-open');
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, menuShow]);

  return (
    <section
      className={`hero${fading ? ' hero-fade' : ''}`}
      style={{ '--poster': `url("${POSTER_URL}")` } as React.CSSProperties}
    >
      {/* 媒体层：poster 首帧 + 视频淡入 */}
      <div className="hero__media" aria-hidden>
        <img
          src={POSTER_URL}
          alt="金色黄昏时分，苔石上的一台黑胶唱机，远处是雪山与淡蓝天空"
        />
        <video
          ref={videoRef}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          poster={POSTER_URL}
          aria-hidden="true"
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
      </div>

      {/* 导航 */}
      <header className="nav">
        <button type="button" className="logo rise d1" onClick={go} aria-label="闻野 OpenEar — 首页">
          <span>闻野</span>
          <span className="word-en">OpenEar</span>
        </button>

        <nav className="nav__links" aria-label="Primary">
          {NAV_ITEMS.map((it, i) => (
            <button
              key={it.en}
              type="button"
              className={`rise d${i + 2}`}
              onClick={go}
            >
              {it.zh}
            </button>
          ))}
        </nav>

        <div className="nav__right">
          <button type="button" className="btn-ink rise d6 px-6 py-3 text-[15px]" onClick={go}>
            走进音乐世界
          </button>
          <button
            type="button"
            aria-label={menuOpen ? '收起菜单' : '展开菜单'}
            aria-expanded={menuOpen}
            aria-controls="hero-menu"
            className={`menu-toggle menu-toggle--nav rise d6${menuOpen ? ' menu-open' : ''}`}
            onClick={toggleMenu}
          >
            <span className="menu-bar" />
            <span className="menu-bar" />
            <span className="menu-bar" />
          </button>
        </div>
      </header>

      {/* 大字标题（顶部锚定，留白给唱机画面） */}
      <div className="hero__inner">
        <h1 className="headline">
          <span className="line"><span>你曾听过的那张唱片</span></span>
          <span className="line"><span>此刻正在某处播放</span></span>
        </h1>
      </div>

      {/* 全屏菜单 */}
      {menuShow && (
        <div id="hero-menu" className={`fullscreen-menu${menuOpen ? ' menu-open' : ''}`} onClick={closeMenu}>
          {NAV_ITEMS.map((it, i) => (
            <button
              key={it.en}
              type="button"
              className="menu-item"
              style={{ '--i': i } as React.CSSProperties}
              onClick={(e) => {
                e.stopPropagation();
                go();
              }}
            >
              <span className="menu-en">{it.en}</span>
              <span className="menu-zh">{it.zh}</span>
            </button>
          ))}
          <div className="menu__rule" aria-hidden />
          <div className="menu__foot">
            <button type="button" className="btn-ink" onClick={go}>
              走进音乐世界
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
