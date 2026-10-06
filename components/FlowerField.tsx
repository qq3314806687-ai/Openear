'use client';

/**
 * 花朵摇曳动态背景（吉卜力风）：粉白花海 + 蓝天白云 + 远山 + 飘落花瓣。
 * 部署在「今日一首」卡片背景，纯 CSS/SVG 动画，仅 transform/opacity，GPU 友好；
 * 尊重 prefers-reduced-motion（见 globals.css 的 reduce 规则）。
 * overlay 模式：只渲染摇曳花朵与飘落花瓣，供叠放在图片/视频背景之上。
 */
interface Props {
  overlay?: boolean;
}

interface Bloom {
  left: number;
  size: number;
  hue: string;
  dur: number;
  delay: number;
  amp: number;
}

const BLOOMS: Bloom[] = [
  { left: 5, size: 72, hue: '#ffb6c1', dur: 3.6, delay: 0, amp: 3 },
  { left: 15, size: 56, hue: '#ffffff', dur: 4.2, delay: 0.4, amp: 2.6 },
  { left: 26, size: 88, hue: '#ff9eb5', dur: 3.2, delay: 0.9, amp: 3.4 },
  { left: 38, size: 62, hue: '#ffc2cf', dur: 4.6, delay: 0.2, amp: 2.4 },
  { left: 50, size: 94, hue: '#ffb6c1', dur: 3.8, delay: 1.2, amp: 3.2 },
  { left: 62, size: 68, hue: '#ffffff', dur: 4.0, delay: 0.6, amp: 2.8 },
  { left: 73, size: 82, hue: '#ff9eb5', dur: 3.4, delay: 1.6, amp: 3 },
  { left: 85, size: 58, hue: '#ffc2cf', dur: 4.4, delay: 0.8, amp: 2.6 },
  { left: 94, size: 74, hue: '#ffb6c1', dur: 3.9, delay: 1.9, amp: 3.3 },
];

interface Petal {
  left: number;
  size: number;
  dur: number;
  delay: number;
  drift: number;
}

const PETALS: Petal[] = [
  { left: 12, size: 9, dur: 6.5, delay: 0, drift: 30 },
  { left: 30, size: 7, dur: 8, delay: 1.4, drift: -20 },
  { left: 47, size: 8, dur: 7.2, delay: 0.6, drift: 46 },
  { left: 64, size: 6, dur: 8.8, delay: 2.1, drift: -34 },
  { left: 80, size: 9, dur: 6.9, delay: 1, drift: 24 },
  { left: 91, size: 7, dur: 7.8, delay: 2.8, drift: -14 },
];

export default function FlowerField({ overlay = false }: Props) {
  return (
    <div className={overlay ? 'flower-field flower-field--overlay' : 'flower-field'} aria-hidden>
      {!overlay && (
        <>
          {/* 远景山丘 */}
          <svg
            className="flower-field__hills"
            viewBox="0 0 600 200"
            preserveAspectRatio="none"
          >
            <path d="M0 128 Q150 58 320 118 T600 98 V200 H0 Z" fill="#b9dca6" />
            <path d="M0 158 Q180 98 360 148 T600 128 V200 H0 Z" fill="#9cc98d" />
          </svg>

          {/* 云层缓慢漂移 */}
          <div className="flower-field__cloud c1" />
          <div className="flower-field__cloud c2" />
        </>
      )}

      {/* 花海：每朵绕茎底摇曳 */}
      {BLOOMS.map((b, i) => (
        <svg
          key={i}
          className="flower-field__bloom"
          viewBox="0 0 100 160"
          style={
            {
              left: `${b.left}%`,
              height: b.size,
              '--dur': `${b.dur}s`,
              '--delay': `${b.delay}s`,
              '--amp': `${b.amp}deg`,
            } as React.CSSProperties
          }
        >
          <path
            d="M50 160 C 46 122, 54 88, 50 46"
            stroke="#4f8f4f"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M50 118 C 40 112, 34 104, 32 94"
            stroke="#5aa05a"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="30" cy="92" rx="9" ry="5" fill="#79b96f" transform="rotate(-28 30 92)" />
          <path
            d="M50 86 C 62 80, 68 70, 70 60"
            stroke="#5aa05a"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
          />
          <ellipse cx="72" cy="58" rx="9" ry="5" fill="#79b96f" transform="rotate(24 72 58)" />
          <g transform="translate(50 40)">
            <ellipse cx="0" cy="-9" rx="6.5" ry="9.5" fill={b.hue} transform="rotate(0)" />
            <ellipse cx="0" cy="-9" rx="6.5" ry="9.5" fill={b.hue} transform="rotate(72)" />
            <ellipse cx="0" cy="-9" rx="6.5" ry="9.5" fill={b.hue} transform="rotate(144)" />
            <ellipse cx="0" cy="-9" rx="6.5" ry="9.5" fill={b.hue} transform="rotate(216)" />
            <ellipse cx="0" cy="-9" rx="6.5" ry="9.5" fill={b.hue} transform="rotate(288)" />
            <circle r="3.5" fill="#ffd54f" />
          </g>
        </svg>
      ))}

      {/* 飘落花瓣 */}
      {PETALS.map((p, i) => (
        <span
          key={i}
          className="flower-field__petal"
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
