'use client';

/**
 * 黑胶 hero 首屏：金色黄昏的旷野黑胶唱机（视频背景）+ 墨色大字标题 + 全屏菜单。
 * 顶部随访问者 IP 显示当地日期、时间与天气；开场动画完成后点击任意入口 → onEnter 进入应用。
 */
import { useEffect, useRef, useState } from 'react';
import { fetchIpWeather } from '@/lib/weather';

const VIDEO_URL = 'https://motionsites.org/assets/prompt-media/fdf088e281c69fca93f9.mp4';
// 海报图放本地（随包分发）：外部视频被墙/超时时，静态唱机画面也能兜底显示
const POSTER_URL = '/poster-vinyl.webp';

const NAV_ITEMS = [
  { zh: '首页', en: 'Home' },
  { zh: '情绪边界地图', en: 'Emotion Map' },
  { zh: '我的歌单', en: 'My Playlist' },
  { zh: '今日一首', en: 'Today' },
];

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 中文数字日期，如 10 月 6 日 -> 「十月六」 */
function dayCn(n: number): string {
  const u = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return u[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + (u[n % 10] ?? '');
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return u[ten] + '十' + (one ? u[one] : '');
}

function formatDate(d: Date): string {
  return `${MONTHS[d.getMonth()]}${dayCn(d.getDate())} · ${WEEKS[d.getDay()]}`;
}

function fmtTime(d: Date): string {
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
}

interface Props {
  onEnter: () => void;
  fading?: boolean;
}

export default function VinylHero({ onEnter, fading = false }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuShow, setMenuShow] = useState(false);
  // 本地实时时钟 + 按 IP 定位的当日天气（mount 后再取，避免 hydration 不一致）
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<string | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30000);
    let alive = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetchIpWeather(ctrl.signal).then((w) => {
      if (alive) setWeather(w);
    });
    return () => {
      alive = false;
      clearInterval(id);
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  const metaLine = now
    ? `${formatDate(now)} ${fmtTime(now)}${weather ? ` · ${weather}` : ''}`
    : '';

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
      {/* 媒体层：poster 首帧 + 视频淡入；点击黑胶播放器进入音乐世界 */}
      <div
        className="hero__media"
        role="button"
        tabIndex={0}
        aria-label="点击黑胶播放器，走进音乐世界"
        onClick={go}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            go();
          }
        }}
      >
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
        <div className="hero__enter-hint" aria-hidden>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M7 4.5v15l13-7.5-13-7.5Z" />
          </svg>
          点击唱机，走进音乐世界
        </div>
      </div>

      {/* 导航：logo · 当地时间天气 · 菜单（目录） */}
      <header className="nav">
        <button type="button" className="logo rise d1" onClick={go} aria-label="闻野 OpenEar — 首页">
          <span>闻野</span>
          <span className="word-en">OpenEar</span>
        </button>

        <div className="nav__meta rise d2" aria-live="off">
          {metaLine || '· · ·'}
        </div>

        <div className="nav__right">
          <button
            type="button"
            aria-label={menuOpen ? '收起菜单' : '展开菜单'}
            aria-expanded={menuOpen}
            aria-controls="hero-menu"
            className={`menu-toggle menu-toggle--nav rise d3${menuOpen ? ' menu-open' : ''}`}
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
          <span className="line"><span>愿每一次出发，</span></span>
          <span className="line"><span>都有一首歌，</span></span>
          <span className="line"><span>接住你。</span></span>
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
        </div>
      )}
    </section>
  );
}
