'use client';

/**
 * 探索强度滑块（PRD §3.2.1）
 * 0-100 连续数值，档位刻度标在 0/25/50/75/100。
 * 强度越低 → 技术(流派跨界)/情绪(VA步长)/行为(熟悉度)三层都更保守。
 */
import type { Intensity } from '@/lib/types';

/** 档位刻度与文案（用于标记与动态命名） */
const MARKS: Array<{ v: number; label: string; desc: string; color: string }> = [
  { v: 0, label: '贴身', desc: '只在本便步，情绪几乎不动', color: '#7ba07d' },
  { v: 25, label: '缓进', desc: '同族流派 · 情绪微调', color: '#8aa87e' },
  { v: 50, label: '平衡', desc: '适度跨界 · 平滑过渡', color: '#9fbeae' },
  { v: 75, label: '野探', desc: '跨家族 · 大步探索', color: '#d9a06a' },
  { v: 100, label: '极野', desc: '放开手脚 · 到处走走', color: '#e08a5f' },
];

function bandOf(v: Intensity): (typeof MARKS)[number] {
  const last = MARKS[MARKS.length - 1];
  if (v >= last.v) return last;
  return MARKS.find((m) => v < m.v) ?? last;
}

interface Props {
  value: Intensity;
  onChange: (v: Intensity) => void;
}

export default function IntensitySlider({ value, onChange }: Props) {
  const meta = bandOf(value);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm font-semibold text-white">探索强度</p>
          <p className="text-xs text-white/50">{value} / 100 · 向左保守贴身，向右野探世界</p>
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
        max={100}
        step={1}
        value={value}
        aria-label="探索强度 (0-100)"
        onChange={(e) => onChange(Number(e.target.value))}
        className="intensity-range"
      />

      {/* 档位刻度：0 / 25 / 50 / 75 / 100 */}
      <div className="flex justify-between text-xs text-white/50">
        {MARKS.map((m) => (
          <span
            key={m.v}
            className={value === m.v ? 'font-bold' : ''}
            style={value === m.v ? { color: m.color } : {}}
          >
            {m.v === 0 ? '0' : m.v === 25 ? '25%' : m.v === 50 ? '50%' : m.v === 75 ? '75%' : '100%'}
          </span>
        ))}
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/60">
        <span style={{ color: meta.color }}>{meta.desc}</span> · 拖动滑块，推荐路线会实时重新计算
      </div>
    </div>
  );
}