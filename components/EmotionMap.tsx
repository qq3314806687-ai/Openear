'use client';

/**
 * 情绪边界地图 · 热力图
 * - X 轴：能量（安静 → 激烈），即 Arousal 0 → 1
 * - Y 轴：情绪色彩（冷 → 暖），即 Valence 0 → 1（暖色在上）
 * - 每一个点 = 你听过的一首歌；以每首歌为中心叠加柔和光晕，形成"热区"，
 *   热区越亮/越大代表你在这片情绪里堆积的回忆越多。
 * - 红圈 = 未探索的空白地带，点击可把推荐路线拉向那里。
 * 纯 SVG 实现，热力背景 + 可点歌点 + 悬浮详情。
 */
import { useMemo, useState } from 'react';
import type { Song, BlankZone } from '@/lib/types';
import { BLANK_ZONES } from '@/lib/lib/metrics';

const W = 460;
const H = 420;
const PAD_L = 44;
const PAD_B = 38;
const PAD_T = 16;
const PAD_R = 12;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;

// X 用能量 arousal，Y 用情绪色彩 valence（暖在上）
const xOf = (s: { arousal: number }) => PAD_L + s.arousal * PLOT_W;
const yOf = (s: { valence: number }) => PAD_T + (1 - s.valence) * PLOT_H;

const ZONE_COLOR = 'rgba(239,68,68,0.7)';

interface Props {
  songs: Song[];
  candidates: Song[];
  activeZoneId: string | null;
  onZoneSelect: (id: string) => void;
  onPlaySong: (song: Song) => void;
}

export default function EmotionMap({ songs, candidates, activeZoneId, onZoneSelect, onPlaySong }: Props) {
  const [hover, setHover] = useState<{ song: Song; x: number; y: number } | null>(null);

  // 每个点的热区渐变（同色点会重叠叠加，形成更亮的热区）
  const heatDefs = useMemo(
    () =>
      songs.map((s) => (
        <radialGradient key={`h${s.id}`} id={`heat-${s.id}`}>
          <stop offset="0%" stopColor={s.coverColor} stopOpacity="0.5" />
          <stop offset="42%" stopColor={s.coverColor} stopOpacity="0.24" />
          <stop offset="100%" stopColor={s.coverColor} stopOpacity="0" />
        </radialGradient>
      )),
    [songs],
  );

  return (
    <div className="flex h-full min-h-[420px] w-full flex-col">
      <div className="relative w-full flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full">
          <defs>
            {heatDefs}
            {/* 背景冷暖渐进 */}
            <linearGradient id="bgTint" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.06" />
              <stop offset="50%" stopColor="#8b5cf6" stopOpacity="0.03" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.07" />
            </linearGradient>
          </defs>

          {/* 底 + 网格 */}
          <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} rx={10} fill="url(#bgTint)" />
          {[0.25, 0.5, 0.75].map((t) => (
            <g key={t}>
              <line
                x1={PAD_L + t * PLOT_W} y1={PAD_T} x2={PAD_L + t * PLOT_W} y2={PAD_T + PLOT_H}
                stroke="rgba(255,255,255,0.06)"
              />
              <line
                x1={PAD_L} y1={PAD_T + (1 - t) * PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + (1 - t) * PLOT_H}
                stroke="rgba(255,255,255,0.06)"
              />
            </g>
          ))}

          {/* 热区（底层，先画，歌点叠其上） */}
          {songs.map((s) => (
            <circle key={`hspot-${s.id}`} cx={xOf(s)} cy={yOf(s)} r={54} fill={`url(#heat-${s.id})`} />
          ))}

          {/* 轴 */}
          <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + PLOT_H} stroke="rgba(255,255,255,0.22)" />
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} stroke="rgba(255,255,255,0.22)" />
          {/* X 刻度 */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text
              key={t} x={PAD_L + t * PLOT_W} y={PAD_T + PLOT_H + 16}
              textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="10"
            >
              {t.toFixed(2)}
            </text>
          ))}
          {/* Y 刻度（暖在顶） */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text
              key={t} x={PAD_L - 8} y={PAD_T + (1 - t) * PLOT_H + 3}
              textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="10"
            >
              {t.toFixed(2)}
            </text>
          ))}

          {/* 轴标注 */}
          <text x={PAD_L + PLOT_W / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.62)" fontSize="12">
            能量 · 安静 ——→ 激烈
          </text>
          <text
            x={16} y={PAD_T + PLOT_H / 2} textAnchor="middle" fill="rgba(255,255,255,0.62)" fontSize="12"
            transform={`rotate(-90 16 ${PAD_T + PLOT_H / 2})`}
          >
            情绪色彩 · 冷 ——→ 暖
          </text>

          {/* 空白地带（点击探索） */}
          {BLANK_ZONES.map((z) => {
            const cx = PAD_L + z.centerArousal * PLOT_W;
            const cy = PAD_T + (1 - z.centerValence) * PLOT_H;
            const r = z.radius * PLOT_W;
            const active = z.id === activeZoneId;
            return (
              <g
                key={z.id}
                onClick={(e) => { e.stopPropagation(); onZoneSelect(z.id); }}
                style={{ cursor: 'pointer' }}
                opacity={active ? 1 : 0.85}
              >
                <circle cx={cx} cy={cy} r={r} fill={ZONE_COLOR} fillOpacity={active ? 0.3 : 0.14} />
                <circle
                  cx={cx} cy={cy} r={r} fill="none"
                  stroke={active ? ZONE_COLOR : 'rgba(239,68,68,0.55)'}
                  strokeWidth={active ? 2.4 : 1.2}
                  strokeDasharray={active ? 'none' : '5 4'}
                />
                <circle cx={cx} cy={cy} r={active ? 6 : 4} fill={ZONE_COLOR} />
              </g>
            );
          })}

          {/* 推荐候选（空心描边，点击播放） */}
          {candidates.map((s) => (
            <circle
              key={`c-${s.id}`}
              cx={xOf(s)} cy={yOf(s)} r={7}
              fill="none" stroke={s.coverColor} strokeWidth={1.8}
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onClick={(e) => { e.stopPropagation(); onPlaySong(s); }}
              onMouseEnter={(e) => { e.stopPropagation(); setHover({ song: s, x: xOf(s), y: yOf(s) }); }}
              onMouseLeave={() => setHover((h) => (h?.song.id === s.id ? null : h))}
            />
          ))}

          {/* 我的歌单（实心亮点，可点击播放） */}
          {songs.map((s) => (
            <g
              key={`d-${s.id}`}
              onClick={(e) => { e.stopPropagation(); onPlaySong(s); }}
              onMouseEnter={(e) => { e.stopPropagation(); setHover({ song: s, x: xOf(s), y: yOf(s) }); }}
              onMouseLeave={() => setHover((h) => (h?.song.id === s.id ? null : h))}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={xOf(s)} cy={yOf(s)} r={9} fill={s.coverColor} stroke="rgba(255,255,255,0.92)" strokeWidth={1.5} />
              <circle cx={xOf(s)} cy={yOf(s)} r={9} fill="none" stroke={s.coverColor} strokeOpacity={hover?.song.id === s.id ? 0.9 : 0.5} strokeWidth={hover?.song.id === s.id ? 3 : 1} />
            </g>
          ))}
        </svg>

        {/* 悬浮详情 */}
        {hover && (
          <div
            className="pointer-events-none absolute z-10 w-52 -translate-x-1/2 rounded-xl border border-white/10 bg-black/90 px-3 py-2 text-xs shadow-glow"
            style={{
              left: `${(hover.x / W) * 100}%`,
              top: `${(hover.y / H) * 100 - 58}%`,
            }}
          >
            <div className="font-medium text-white">{hover.song.title}</div>
            <div className="text-white/60">{hover.song.artist}</div>
            <div className="mt-1 flex items-center gap-1 text-white/70">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: hover.song.coverColor }} />
              {hover.song.genre} · BPM {hover.song.bpm}
            </div>
            <div className="mt-0.5 text-white/50">
              能量 {hover.song.arousal.toFixed(2)} · 色彩 {hover.song.valence.toFixed(2)}
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-white/55">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 ring-1 ring-white" />
          我听过的歌
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-cyan-300" />
          推荐候选
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ZONE_COLOR }} />
          空白地带 · 点击探索&试听
        </span>
        <div className="ml-auto text-cyan-300">
          {activeZoneId ? '已把推荐路线拉向这片情绪地带' : '光晕越亮，代表你在这里堆积的回忆越多'}
        </div>
      </div>
    </div>
  );
}