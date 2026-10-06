'use client';

/**
 * 花瓣飘落动态层：浅色天空底上的粉色花瓣雨（小精灵对话界面横幅）。
 * 纯 CSS transform 动画，GPU 友好；尊重 prefers-reduced-motion（globals.css）。
 */
interface Petal {
  left: number;
  size: number;
  dur: number;
  delay: number;
  drift: number;
  deep?: boolean;
}

const PETALS: Petal[] = [
  { left: 8, size: 9, dur: 6.5, delay: 0, drift: 30 },
  { left: 18, size: 6, dur: 8.2, delay: 1.2, drift: -22 },
  { left: 28, size: 8, dur: 7.0, delay: 0.4, drift: 44 },
  { left: 39, size: 7, dur: 8.8, delay: 2.0, drift: -30 },
  { left: 50, size: 10, dur: 6.8, delay: 0.9, drift: 26, deep: true },
  { left: 61, size: 7, dur: 8.4, delay: 1.6, drift: -18 },
  { left: 71, size: 8, dur: 7.4, delay: 0.2, drift: 40 },
  { left: 81, size: 6, dur: 9.0, delay: 2.6, drift: -26 },
  { left: 90, size: 9, dur: 7.6, delay: 1.1, drift: 22, deep: true },
];

export default function PetalRain() {
  return (
    <div className="petal-rain" aria-hidden>
      {PETALS.map((p, i) => (
        <span
          key={i}
          className={`petal-rain__petal${p.deep ? ' petal-deep' : ''}`}
          style={
            {
              left: `${p.left}%`,
              width: p.size,
              height: p.size * 1.15,
              '--fall-dur': `${p.dur}s`,
              '--fall-delay': `${p.delay}s`,
              '--drift': `${p.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
