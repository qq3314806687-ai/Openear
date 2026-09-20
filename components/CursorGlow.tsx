'use client';

/**
 * 柔和光斑：半透明暖光平滑跟随鼠标（略微滞后形成惯性），
 * 悬停到可点击元素时放大、增亮。仅装饰，pointer-events 透明不挡点击。
 */
import { useEffect, useRef } from 'react';

const CLICKABLE_SELECTOR =
  'button, a, [role="button"], input, select, textarea, label, summary, [onclick], [data-clickable]';

export default function CursorGlow() {
  const spotRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const spot = spotRef.current;
    if (!spot) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let raf = 0;
    // 位置（x/y）+ 悬停放大系数（0..1），都为 lerp 目标
    const s = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      tx: window.innerWidth / 2,
      ty: window.innerHeight / 2,
      hover: 0,
      targetHover: 0,
    };

    const onMove = (e: MouseEvent) => {
      s.tx = e.clientX;
      s.ty = e.clientY;
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const clickable = !!(el && el.closest(CLICKABLE_SELECTOR));
      s.targetHover = clickable ? 1 : 0;
    };
    const onLeave = () => {
      s.targetHover = 0;
    };

    // 初始隐藏，避免入场瞬间闪一个固定光斑
    spot.style.opacity = '0';

    const tick = () => {
      // 位置跟随较快（略滞后制造惯性），光斑缩放放缓更柔和
      const kPos = reduced ? 1 : 0.16;
      const kOp = reduced ? 1 : 0.1;
      s.x += (s.tx - s.x) * kPos;
      s.y += (s.ty - s.y) * kPos;
      s.hover += (s.targetHover - s.hover) * kOp;

      // 光斑直径：基础 90px（大幅聚焦），悬停时放大至最大 160px；亮度与渐变中心不变
      const size = 90 + 70 * s.hover;
      // 亮度比原来更亮：基础 0.72，悬停到满亮 1.0
      const opacity = 0.72 + 0.28 * s.hover;
      spot.style.transform = `translate3d(${s.x - size / 2}px, ${s.y - size / 2}px, 0)`;
      spot.style.width = `${size}px`;
      spot.style.height = `${size}px`;
      spot.style.opacity = String(opacity);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    window.addEventListener('mousemove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  return (
    <div
      ref={spotRef}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 rounded-full"
      style={{
        zIndex: 60,
        mixBlendMode: 'screen',
        willChange: 'transform, width, height, opacity',
        background:
          'radial-gradient(circle, rgba(255,231,186,0.50), rgba(255,214,150,0.20) 42%, transparent 52%)',
      }}
    />
  );
}