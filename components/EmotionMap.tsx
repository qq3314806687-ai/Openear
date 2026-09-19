'use client';

/**
 * 情绪边界地图 · 四象限散点图（纯 2D）
 * - X 轴：能量（安静 → 激烈），即 Arousal 0 → 1
 * - Y 轴：情绪色彩（冷 → 暖），即 Valence 0 → 1（暖在上）
 * - 以 (能量 0.5, 色彩 0.5) 为中轴，把地图切成四个象限，各填一种代表性底色：
 *   左上「温暖」、右上「热烈」、左下「冷寂」、右下「躁动」。
 * - 我的歌单 = 实心亮点；推荐候选 = 空心描边。所有点均可点击一键播放。
 * - 点击点弹出预览卡（常驻，不随光标离开消失）：歌曲信息 + 试听 + 加入歌单；
 *   点击卡片内按钮执行后关闭，点击地图空白或其它点切换。
 */
import { useMemo, useState } from 'react';
import type { Song } from '@/lib/types';

const W = 460;
const H = 340;
const PAD_L = 44;
const PAD_B = 38;
const PAD_T = 16;
const PAD_R = 12;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = H - PAD_T - PAD_B;
const MID_X = PAD_L + PLOT_W / 2;
const MID_Y = PAD_T + PLOT_H / 2;

// X 用能量 arousal，Y 用情绪色彩 valence（暖在上）
const xOf = (s: { arousal: number }) => PAD_L + s.arousal * PLOT_W;
const yOf = (s: { valence: number }) => PAD_T + (1 - s.valence) * PLOT_H;

/** 四个象限：左上/右上/左下/右下（屏幕坐标），各有代表性名称与底色 */
const QUADRANTS = [
  { left: PAD_L, top: PAD_T, name: '温暖', color: '#d9b06a' },
  { left: MID_X, top: PAD_T, name: '热烈', color: '#e08a5f' },
  { left: PAD_L, top: MID_Y, name: '冷寂', color: '#7da6b5' },
  { left: MID_X, top: MID_Y, name: '躁动', color: '#9b8bd0' },
];

const CANDIDATE_COLOR = '#a78bfa';

interface Props {
  songs: Song[];
  candidates: Song[];
  onPlaySong: (song: Song) => void;
  onTogglePlaylist?: (song: Song) => void;
  playlistIds?: string[];
  nowPlayingId?: string;
  playing?: boolean;
}

export default function EmotionMap({
  songs,
  candidates,
  onPlaySong,
  onTogglePlaylist,
  playlistIds = [],
  nowPlayingId,
  playing = false,
}: Props) {
  // 点击选中的点（驱动预览卡，常驻不随光标消失）
  const [active, setActive] = useState<{ song: Song; x: number; y: number } | null>(null);
  // 光标悬停高亮（仅视觉反馈，不控制弹窗）
  const [hoverId, setHoverId] = useState<string | null>(null);
  const candidateIds = useMemo(() => new Set(candidates.map((c) => c.id)), [candidates]);
  const inPlaylist = useMemo(() => new Set(playlistIds), [playlistIds]);

  const activeId = active?.song.id ?? null;
  // 卡片在点上方/下方翻转，避免顶部溢出
  const placeBelow = active ? active.y / H < 0.42 : false;
  // 当前点是否正在播放（试听按钮联动）
  const isThisPlaying = !!active && nowPlayingId != null && nowPlayingId === active.song.id && playing;

  const openCard = (s: Song) => setActive({ song: s, x: xOf(s), y: yOf(s) });

  return (
    <div className="flex h-full min-h-[340px] w-full flex-col">
      <div className="relative w-full flex-1">
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" onClick={() => setActive(null)}>
          <defs>
            <clipPath id="plotClip">
              <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} rx={12} />
            </clipPath>
          </defs>

          {/* 绘图区底 */}
          <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} rx={12} fill="rgba(255,255,255,0.02)" />

          {/* 四象限底色 */}
          <g clipPath="url(#plotClip)">
            {QUADRANTS.map((q) => (
              <rect
                key={q.name}
                x={q.left}
                y={q.top}
                width={PLOT_W / 2}
                height={PLOT_H / 2}
                fill={q.color}
                fillOpacity={0.16}
              />
            ))}
          </g>

          {/* 象限分隔线 + 中轴十字 */}
          <line x1={MID_X} y1={PAD_T} x2={MID_X} y2={PAD_T + PLOT_H} stroke="rgba(255,255,255,0.16)" strokeDasharray="4 4" />
          <line x1={PAD_L} y1={MID_Y} x2={PAD_L + PLOT_W} y2={MID_Y} stroke="rgba(255,255,255,0.16)" strokeDasharray="4 4" />

          {/* 辅助网格 */}
          {[0.25, 0.75].map((t) => (
            <g key={`v${t}`}>
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

          {/* 象限名称（高对比描边艺术字） */}
          {QUADRANTS.map((q) => {
            const cx = q.left + PLOT_W / 4;
            const cy = q.top + PLOT_H / 4;
            return (
              <text
                key={q.name}
                x={cx}
                y={cy + 3}
                textAnchor="middle"
                fill={q.color}
                fontSize="13"
                fontWeight="400"
                letterSpacing="2"
                paintOrder="stroke"
                stroke="rgba(12,18,14,0.7)"
                strokeWidth="3"
                style={{ pointerEvents: 'none' }}
              >
                {q.name}
              </text>
            );
          })}

          {/* 坐标轴 + 边框 */}
          <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + PLOT_H} stroke="rgba(255,255,255,0.22)" />
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} stroke="rgba(255,255,255,0.22)" />

          {/* X 刻度 */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text
              key={t} x={PAD_L + t * PLOT_W} y={PAD_T + PLOT_H + 16}
              textAnchor="middle" fill="rgba(255,255,255,0.8)" fontSize="10.5"
              paintOrder="stroke" stroke="rgba(12,18,14,0.55)" strokeWidth="2"
            >
              {t.toFixed(2)}
            </text>
          ))}
          {/* Y 刻度（暖在顶） */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => (
            <text
              key={t} x={PAD_L - 8} y={PAD_T + (1 - t) * PLOT_H + 3}
              textAnchor="end" fill="rgba(255,255,255,0.8)" fontSize="10.5"
              paintOrder="stroke" stroke="rgba(12,18,14,0.55)" strokeWidth="2"
            >
              {t.toFixed(2)}
            </text>
          ))}

          {/* 轴标注（汇文明朝体 · 玻璃透色字；箭头用系统无衬线字体） */}
          <text
            x={PAD_L + PLOT_W / 2} y={H - 5} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="13"
            fontWeight="400" letterSpacing="1"
            className="font-huiwen"
          >
            <tspan>能量 · 安静</tspan>
            <tspan fontFamily="system-ui, sans-serif"> → </tspan>
            <tspan>激烈</tspan>
          </text>
          <text
            x={16} y={PAD_T + PLOT_H / 2} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="13"
            fontWeight="400" letterSpacing="1"
            transform={`rotate(-90 16 ${PAD_T + PLOT_H / 2})`}
            className="font-huiwen"
          >
            <tspan>情绪色彩 · 冷</tspan>
            <tspan fontFamily="system-ui, sans-serif"> → </tspan>
            <tspan>暖</tspan>
          </text>

          {/* 推荐候选（空心描边 + 虚线外圈，点击打开预览卡） */}
          {candidates.map((s) => {
            const lit = hoverId === s.id || activeId === s.id;
            return (
              <g
                key={`c-${s.id}`}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={(e) => { e.stopPropagation(); openCard(s); }}
                onMouseEnter={(e) => { e.stopPropagation(); setHoverId(s.id); }}
                onMouseLeave={() => setHoverId((h) => (h === s.id ? null : h))}
              >
                <circle
                  cx={xOf(s)} cy={yOf(s)} r={10} fill="none"
                  stroke={lit ? '#c4b5fd' : CANDIDATE_COLOR}
                  strokeWidth={1.2} strokeDasharray="3 2.5" strokeOpacity={lit ? 1 : 0.9}
                />
                <circle cx={xOf(s)} cy={yOf(s)} r={6.5} fill="none" stroke={activeId === s.id ? '#ffffff' : CANDIDATE_COLOR} strokeWidth={2} />
              </g>
            );
          })}

          {/* 我的歌单（实心亮点 + 白描边，点击打开预览卡） */}
          {songs.map((s) => (
            <g
              key={`d-${s.id}`}
              style={{ cursor: 'pointer' }}
              onClick={(e) => { e.stopPropagation(); openCard(s); }}
              onMouseEnter={(e) => { e.stopPropagation(); setHoverId(s.id); }}
              onMouseLeave={() => setHoverId((h) => (h === s.id ? null : h))}
            >
              <circle cx={xOf(s)} cy={yOf(s)} r={9} fill={s.coverColor} stroke="rgba(255,255,255,0.92)" strokeWidth={1.5} />
              <circle
                cx={xOf(s)} cy={yOf(s)} r={9} fill="none"
                stroke={hoverId === s.id || activeId === s.id ? s.coverColor : 'transparent'}
                strokeWidth={2.5}
              />
            </g>
          ))}
        </svg>

        {/* 预览卡（点击点后常驻；点按钮执行后关闭） */}
        {active && (
          <div
            className="absolute z-10 w-56 rounded-xl border border-white/10 bg-black/90 px-3 py-2.5 text-xs shadow-glow pointer-events-auto"
            style={{
              left: `${(active.x / W) * 100}%`,
              top: `${(active.y / H) * 100}%`,
              transform: placeBelow ? 'translate(-50%, 14px)' : 'translate(-50%, calc(-100% - 14px))',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-white">{active.song.title}</span>
              {candidateIds.has(active.song.id) && (
                <span className="shrink-0 rounded-full border border-violet-400/40 bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-300">
                  推荐
                </span>
              )}
            </div>
            <div className="text-white/60">{active.song.artist}</div>
            <div className="mt-1 flex items-center gap-1 text-white/70">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: active.song.coverColor }} />
              {active.song.genre} · BPM {active.song.bpm}
            </div>
            <div className="mt-0.5 text-white/50">
              能量 {active.song.arousal.toFixed(2)} · 色彩 {active.song.valence.toFixed(2)}
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onPlaySong(active.song); setActive(null); }}
                aria-label={isThisPlaying ? '暂停' : '试听'}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 font-semibold transition-colors ${
                  isThisPlaying
                    ? 'border-cyan-400/60 bg-cyan-500/30 text-cyan-100'
                    : 'border-cyan-400/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/30'
                }`}
              >
                {isThisPlaying ? <PauseGlyph /> : <PlayGlyph />}
                {isThisPlaying ? '暂停' : '试听'}
              </button>
              {candidateIds.has(active.song.id) && onTogglePlaylist && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onTogglePlaylist(active.song); setActive(null); }}
                  aria-pressed={inPlaylist.has(active.song.id)}
                  title={inPlaylist.has(active.song.id) ? '已在歌单，点击移出' : '加入我的歌单'}
                  className={`flex flex-1 items-center justify-center gap-1 rounded-lg border py-1.5 font-semibold transition-colors ${
                    inPlaylist.has(active.song.id)
                      ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-300'
                      : 'border-violet-400/40 bg-violet-500/15 text-white hover:bg-violet-500/30'
                  }`}
                >
                  {inPlaylist.has(active.song.id) ? '✓ 已加入' : '加入歌单'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 图例 */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-white/75">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-400 ring-1 ring-white" />
          已加入歌单
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-violet-400" />
          推荐候选
        </span>
      </div>
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
    </svg>
  );
}

function PauseGlyph() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 5h4v14H6zM14 5h4v14h-4z" />
    </svg>
  );
}