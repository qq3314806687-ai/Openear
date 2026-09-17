'use client';

/**
 * 探索强度滑块（PRD §3.2.1）
 * 三档：保守 / 平衡 / 激进。轨道蓝→紫→橙红渐变。
 */
import type { Intensity } from '@/lib/types';

const LEVELS: Intensity[] = ['conservative', 'balanced', 'aggressive'];
const LEVEL_META: Record<Intensity, { label: string; desc: string; color: string }> = {
  conservative: { label: '保守', desc: '同族流派 · 情绪微调', color: '#3b82f6' },
  balanced: { label: '平衡', desc: '适度跨界 · 平滑过渡', color: '#8b5cf6' },
  aggressive: { label: '激进', desc: '跨家族 · 大步探索', color: '#f97316' },
};

interface Props {
  value: Intensity;
  onChange: (v: Intensity) => void;
}

export default function IntensitySlider({ value, onChange }: Props) {
  const idx = LEVELS.indexOf(value);
  const meta = LEVEL_META[value];

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-white">探索强度</p>
          <p className="text-xs text-white/50">向左保守不踏空，向右激进走世界</p>
        </div>
        <span
          className="rounded-full px-3 py-1 text-sm font-bold"
          style={{ background: `${meta.color}22`, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      <input
        type="range"
        min={0}
        max={2}
        step={1}
        value={idx}
        aria-label="探索强度"
        onChange={(e) => onChange(LEVELS[Number(e.target.value)])}
        className="intensity-range"
      />

      <div className="flex justify-between text-xs text-white/50">
        {LEVELS.map((l) => (
          <span key={l} className={l === value ? 'font-bold' : ''} style={l === value ? { color: LEVEL_META[l].color } : {}}>
            {LEVEL_META[l].label}
          </span>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
        <span style={{ color: meta.color }}>{meta.desc}</span> · 拖动滑块，推荐路线会实时重新计算
      </div>
    </div>
  );
}