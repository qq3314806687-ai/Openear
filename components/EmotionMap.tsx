'use client';

/**
 * 情绪边界地图 · 四象限散点图（纯 2D）
 * - X 轴：能量（安静 → 激烈），即 Arousal 0 → 1
 * - Y 轴：情绪色彩（冷 → 暖），即 Valence 0 → 1（暖在上）
 * - 四象限对应四季：春 = 暖 + 安静（左上）、夏 = 暖 + 热烈（右上）、
 *   秋 = 冷 + 安静（左下）、冬 = 冷 + 激烈（右下）。
 *   每个象限的点都是该季节的真实花色：春樱（粉）、夏茉莉（白）、秋桂（黄）、冬梅（红）。
 * - 花蕊实心 = 已加入歌单；花蕊空心 = 推荐候选。所有点均可点击一键播放。
 * - 光影：顶部天空柔光 + 象限斜向渐变 + 底部收口暗角 + 点光晕分层；
 *   呼吸：每朵花以错开的节奏缓慢开合，当前播放点带旋转绽放的扩散花环。
 * - 注意：推荐逻辑链路不依赖象限展示名，仅按 arousal / valence 数值计算，改动不影响算法。
 */
import { useMemo, useRef, useState } from 'react';
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

/** 花朵外半径余量：把花朵中心收进绘图区内，避免花瓣尖端伸出地图边界 */
const FLOWER_M = 11;
const flowerX = (s: { arousal: number }) => Math.min(PAD_L + PLOT_W - FLOWER_M, Math.max(PAD_L + FLOWER_M, xOf(s)));
const flowerY = (s: { valence: number }) => Math.min(PAD_T + PLOT_H - FLOWER_M, Math.max(PAD_T + FLOWER_M, yOf(s)));

/** 四季花的配置：花瓣路径 + 花瓣数 + 真实花色 + 花蕊（局部坐标：花心 0,0，瓣尖朝上） */
interface FlowerStyle {
  petals: number;
  path: string;
  fill: string;        // 花瓣主色（真实花色）
  stroke: string;      // 花瓣描边
  strokeWidth: number;
  core: string;        // 花蕊色
  coreR: number;       // 花蕊半径 ≈ size * coreR
  glow: string;        // 氛围光 / 涟漪色
}

/** 樱花单瓣（春）：尖端带 V 形裂口 */
const PETAL = [
  'M0 0',
  'C0.16 -0.14 0.3 -0.36 0.27 -0.62',
  'C0.24 -0.86 0.09 -1 0.024 -1.06',
  'L0.028 -0.87',
  'L-0.028 -0.87',
  'L-0.024 -1.06',
  'C-0.09 -1 -0.24 -0.86 -0.27 -0.62',
  'C-0.3 -0.36 -0.16 -0.14 0 0',
  'Z',
].join(' ');

/** 茉莉单瓣（夏）：圆润无裂口 */
const JASMINE = [
  'M0 0',
  'C0.22 -0.12 0.36 -0.32 0.34 -0.55',
  'C0.32 -0.8 0.15 -0.95 0 -1.02',
  'C-0.15 -0.95 -0.32 -0.8 -0.34 -0.55',
  'C-0.36 -0.32 -0.22 -0.12 0 0',
  'Z',
].join(' ');

/** 桂花单瓣（秋）：小而圆 */
const OSMANTHUS = [
  'M0 0',
  'C0.24 -0.1 0.34 -0.3 0.31 -0.5',
  'C0.28 -0.68 0.13 -0.82 0 -0.88',
  'C-0.13 -0.82 -0.28 -0.68 -0.31 -0.5',
  'C-0.34 -0.3 -0.24 -0.1 0 0',
  'Z',
].join(' ');

/** 梅花单瓣（冬）：圆润略尖 */
const PLUM = [
  'M0 0',
  'C0.2 -0.12 0.32 -0.32 0.3 -0.54',
  'C0.27 -0.76 0.12 -0.93 0 -1',
  'C-0.12 -0.93 -0.27 -0.76 -0.3 -0.54',
  'C-0.32 -0.32 -0.2 -0.12 0 0',
  'Z',
].join(' ');

const FLOWERS: Record<'spring' | 'summer' | 'autumn' | 'winter', FlowerStyle> = {
  spring: {
    petals: 5,
    path: PETAL,
    fill: '#f8a8c6',
    stroke: '#e67ba6',
    strokeWidth: 0.7,
    core: '#f9cf72',
    coreR: 0.3,
    glow: '#f8a8c6',
  },
  summer: {
    petals: 6,
    path: JASMINE,
    fill: '#ffffff',
    stroke: '#aab6c2',
    strokeWidth: 0.7,
    core: '#f2c15b',
    coreR: 0.32,
    glow: '#e8eef2',
  },
  autumn: {
    petals: 4,
    path: OSMANTHUS,
    fill: '#f4b63c',
    stroke: '#d8931f',
    strokeWidth: 0.7,
    core: '#e07f24',
    coreR: 0.3,
    glow: '#f4b63c',
  },
  winter: {
    petals: 5,
    path: PLUM,
    fill: '#e85562',
    stroke: '#c23a49',
    strokeWidth: 0.7,
    core: '#f6cd5f',
    coreR: 0.3,
    glow: '#e85562',
  },
};

/** 四个象限 = 春夏秋冬：左上 春（暖+安静）、右上 夏（暖+热烈）、左下 秋（冷+安静）、右下 冬（冷+激烈） */
const QUADRANTS = [
  { left: PAD_L, top: PAD_T, name: '春', color: '#d98aa8', light: 'rgba(255,228,238,0.55)', dark: 'rgba(217,138,168,0.07)', flower: FLOWERS.spring },
  { left: MID_X, top: PAD_T, name: '夏', color: '#79b089', light: 'rgba(234,246,238,0.55)', dark: 'rgba(121,176,137,0.07)', flower: FLOWERS.summer },
  { left: PAD_L, top: MID_Y, name: '秋', color: '#c8912a', light: 'rgba(252,240,216,0.55)', dark: 'rgba(200,145,42,0.07)', flower: FLOWERS.autumn },
  { left: MID_X, top: MID_Y, name: '冬', color: '#8aa2c4', light: 'rgba(228,238,250,0.55)', dark: 'rgba(138,162,196,0.07)', flower: FLOWERS.winter },
];

/** 点所属季节：按 valence（暖/冷）与 arousal（安静/激烈）映射，与推荐算法数值口径一致 */
const flowerOf = (s: { arousal: number; valence: number }): FlowerStyle => {
  if (s.valence >= 0.5 && s.arousal < 0.5) return FLOWERS.spring;
  if (s.valence >= 0.5 && s.arousal >= 0.5) return FLOWERS.summer;
  if (s.valence < 0.5 && s.arousal < 0.5) return FLOWERS.autumn;
  return FLOWERS.winter;
};

/** 花瓣组：按花型绕花心均分旋转；默认实心花瓣，ring=涟漪/描边花环 */
function FlowerPetals({ flower, size, ring = false }: { flower: FlowerStyle; size: number; ring?: boolean }) {
  return (
    <>
      {Array.from({ length: flower.petals }, (_, i) => (
        <path
          key={i}
          d={flower.path}
          fill={ring ? 'none' : flower.fill}
          stroke={ring ? flower.glow : flower.stroke}
          strokeWidth={ring ? 1.7 : flower.strokeWidth}
          strokeOpacity={ring ? 0.95 : 1}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          transform={`rotate(${(360 / flower.petals) * i}) scale(${size})`}
        />
      ))}
    </>
  );
}

/** 花蕊：filled=实心（已加入歌单）/ 空心描边（推荐候选） */
function FlowerCore({ flower, size, filled }: { flower: FlowerStyle; size: number; filled: boolean }) {
  const r = size * flower.coreR;
  return filled ? (
    <circle r={r} fill={flower.core} />
  ) : (
    <circle r={r} fill="none" stroke={flower.core} strokeWidth={1} />
  );
}

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
  // 地图外包容器（用于计算预览卡的水平钳制，防止屏幕边缘的点卡片跑出屏）
  const wrapRef = useRef<HTMLDivElement>(null);
  // 点击选中的点（驱动预览卡，常驻不随光标离开消失）
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

  // 预览卡水平位置：钳制在容器内，避免屏幕边缘的点卡片跑出屏外/产生横向滚动
  const CARD_W = 224; // w-56
  const wrapW = wrapRef.current?.clientWidth ?? W;
  const cardLeftRaw = active ? (active.x / W) * wrapW : 0;
  const cardLeftLo = CARD_W / 2 + 4;
  const cardLeftHi = Math.max(cardLeftLo, wrapW - CARD_W / 2 - 4);
  const cardLeftPx = Math.min(cardLeftHi, Math.max(cardLeftLo, cardLeftRaw));

  const openCard = (s: Song) => setActive({ song: s, x: xOf(s), y: yOf(s) });

  return (
    <div className="flex h-full min-h-[340px] w-full flex-col">
      <div className="relative w-full flex-1" ref={wrapRef}>
        <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" onClick={() => setActive(null)}>
          <defs>
            <clipPath id="plotClip">
              <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} rx={12} />
            </clipPath>

            {/* 顶部天空柔光：模拟光源从画面上方洒下 */}
            <radialGradient id="skyLight" cx="50%" cy="0%" r="95%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.42" />
              <stop offset="55%" stopColor="#ffffff" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>

            {/* 底部收口暗角 */}
            <linearGradient id="floorShade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(11,11,12,0)" />
              <stop offset="82%" stopColor="rgba(11,11,12,0)" />
              <stop offset="100%" stopColor="rgba(11,11,12,0.07)" />
            </linearGradient>

            {/* 象限斜向渐变光（上亮下暗，模拟光影层次） */}
            {QUADRANTS.map((q, i) => (
              <linearGradient key={`qg-${i}`} id={`qGrad${i}`} x1="0" y1="0" x2="0.35" y2="1">
                <stop offset="0%" stopColor={q.light} />
                <stop offset="55%" stopColor={q.color} stopOpacity="0.18" />
                <stop offset="100%" stopColor={q.dark} />
              </linearGradient>
            ))}

            {/* 点柔光滤镜：光晕 + 原图合成 */}
            <filter id="mapGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* 绘图区底 */}
          <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} rx={12} fill="rgba(255,255,255,0.30)" stroke="rgba(11,11,12,0.08)" />

          {/* 四象限渐变底色 */}
          <g clipPath="url(#plotClip)">
            {QUADRANTS.map((q, i) => (
              <rect
                key={q.name}
                x={q.left}
                y={q.top}
                width={PLOT_W / 2}
                height={PLOT_H / 2}
                fill={`url(#qGrad${i})`}
              />
            ))}

            {/* 光照层：顶部柔光 + 底部暗角 */}
            <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} fill="url(#skyLight)" />
            <rect x={PAD_L} y={PAD_T} width={PLOT_W} height={PLOT_H} fill="url(#floorShade)" />
          </g>

          {/* 象限分隔线 + 中轴十字 */}
          <line x1={MID_X} y1={PAD_T} x2={MID_X} y2={PAD_T + PLOT_H} stroke="rgba(11,11,12,0.13)" strokeDasharray="4 4" />
          <line x1={PAD_L} y1={MID_Y} x2={PAD_L + PLOT_W} y2={MID_Y} stroke="rgba(11,11,12,0.13)" strokeDasharray="4 4" />

          {/* 辅助网格 */}
          {[0.25, 0.75].map((t) => (
            <g key={`v${t}`}>
              <line
                x1={PAD_L + t * PLOT_W} y1={PAD_T} x2={PAD_L + t * PLOT_W} y2={PAD_T + PLOT_H}
                stroke="rgba(11,11,12,0.05)"
              />
              <line
                x1={PAD_L} y1={PAD_T + (1 - t) * PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + (1 - t) * PLOT_H}
                stroke="rgba(11,11,12,0.05)"
              />
            </g>
          ))}

          {/* 象限名称（各象限左上角 · 带光晕描边） */}
          {QUADRANTS.map((q) => (
            <text
              key={q.name}
              x={q.left + 10}
              y={q.top + 20}
              textAnchor="start"
              fill={q.color}
              fontSize="11.5"
              fontWeight="400"
              letterSpacing="1.5"
              paintOrder="stroke"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="3.5"
              style={{ pointerEvents: 'none' }}
            >
              {q.name}
            </text>
          ))}

          {/* 坐标轴 + 边框 */}
          <line x1={PAD_L} y1={PAD_T + PLOT_H} x2={PAD_L + PLOT_W} y2={PAD_T + PLOT_H} stroke="rgba(11,11,12,0.25)" />
          <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={PAD_T + PLOT_H} stroke="rgba(11,11,12,0.25)" />

          {/* 轴标注（玻璃透色字；箭头用系统无衬线字体） */}
          <text
            x={PAD_L + PLOT_W / 2} y={H - 5} textAnchor="middle" fill="rgba(11,11,12,0.55)" fontSize="13"
            fontWeight="400" letterSpacing="1"
            className="font-huiwen"
          >
            <tspan>能量 · 安静</tspan>
            <tspan fontFamily="system-ui, sans-serif"> → </tspan>
            <tspan>激烈</tspan>
          </text>
          <text
            x={16} y={PAD_T + PLOT_H / 2} textAnchor="middle" fill="rgba(11,11,12,0.55)" fontSize="13"
            fontWeight="400" letterSpacing="1"
            transform={`rotate(-90 16 ${PAD_T + PLOT_H / 2})`}
            className="font-huiwen"
          >
            <tspan>情绪色彩 · 冷</tspan>
            <tspan fontFamily="system-ui, sans-serif"> → </tspan>
            <tspan>暖</tspan>
          </text>

          {/* 推荐候选（季节花 · 花蕊空心 = 推荐，点击打开预览卡） */}
          {candidates.map((s, i) => {
            const lit = hoverId === s.id || activeId === s.id;
            const isPlaying = nowPlayingId === s.id && playing;
            const flower = flowerOf(s);
            const F_SIZE = 8.5;
            return (
              <g
                key={`c-${s.id}`}
                style={{ cursor: 'pointer', pointerEvents: 'all' }}
                onClick={(e) => { e.stopPropagation(); openCard(s); }}
                onMouseEnter={(e) => { e.stopPropagation(); setHoverId(s.id); }}
                onMouseLeave={() => setHoverId((h) => (h === s.id ? null : h))}
              >
                {/* 柔光晕 */}
                <circle
                  cx={flowerX(s)} cy={flowerY(s)} r={11} fill={flower.glow}
                  fillOpacity={lit ? 0.3 : 0.15} filter="url(#mapGlow)"
                />
                {/* 呼吸花本体 */}
                <g transform={`translate(${flowerX(s)} ${flowerY(s)})`}>
                  <g className="map-cand map-cand--pulse" style={{ animationDelay: `${(i % 6) * 0.4}s` }}>
                    <FlowerPetals flower={flower} size={F_SIZE} />
                    {/* 花蕊（空心 = 推荐） */}
                    <FlowerCore flower={flower} size={F_SIZE} filled={false} />
                  </g>
                </g>
                {/* hover/选中：光晕变亮即高亮反馈 */}
                {/* 播放中：旋转绽放的扩散花环 */}
                {isPlaying && (
                  <g transform={`translate(${flowerX(s)} ${flowerY(s)})`}>
                    <g className="map-playring">
                      <FlowerPetals flower={flower} size={F_SIZE} ring />
                    </g>
                  </g>
                )}
              </g>
            );
          })}

          {/* 我的歌单（季节花 · 花蕊实心 = 已加入，点击打开预览卡） */}
          {songs.map((s, i) => {
            const lit = hoverId === s.id || activeId === s.id;
            const isPlaying = nowPlayingId === s.id && playing;
            const flower = flowerOf(s);
            const F_SIZE = 8.5;
            return (
              <g
                key={`d-${s.id}`}
                style={{ cursor: 'pointer' }}
                onClick={(e) => { e.stopPropagation(); openCard(s); }}
                onMouseEnter={(e) => { e.stopPropagation(); setHoverId(s.id); }}
                onMouseLeave={() => setHoverId((h) => (h === s.id ? null : h))}
              >
                {/* 柔光晕 */}
                <circle
                  cx={flowerX(s)} cy={flowerY(s)} r={12.5} fill={flower.glow}
                  fillOpacity={lit ? 0.34 : 0.18} filter="url(#mapGlow)"
                />
                {/* 呼吸花本体 */}
                <g transform={`translate(${flowerX(s)} ${flowerY(s)})`}>
                  <g className="map-dot map-dot--pulse" style={{ animationDelay: `${(i % 7) * 0.45}s` }}>
                    <FlowerPetals flower={flower} size={F_SIZE} />
                    {/* 花蕊（实心 = 已加入） */}
                    <FlowerCore flower={flower} size={F_SIZE} filled />
                  </g>
                </g>
                {/* hover/选中：光晕变亮即高亮反馈 */}
                {/* 播放中：旋转绽放的扩散花环 */}
                {isPlaying && (
                  <g transform={`translate(${flowerX(s)} ${flowerY(s)})`}>
                    <g className="map-playring">
                      <FlowerPetals flower={flower} size={F_SIZE} ring />
                    </g>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* 预览卡（点击点后常驻；点按钮执行后关闭） */}
        {active && (
          <div
            className="glass absolute z-10 w-56 rounded-xl px-3 py-2.5 text-xs pointer-events-auto"
            style={{
              left: `${cardLeftPx}px`,
              top: `${(active.y / H) * 100}%`,
              transform: placeBelow ? 'translate(-50%, 14px)' : 'translate(-50%, calc(-100% - 14px))',
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="truncate font-medium text-ink">{active.song.title}</span>
              {candidateIds.has(active.song.id) && (
                <span className="shrink-0 rounded-full border border-violet-400/40 bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-600">
                  推荐
                </span>
              )}
            </div>
            <div className="text-ink/55">{active.song.artist}</div>
            <div className="mt-1 flex items-center gap-1 text-ink/65">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: active.song.coverColor }} />
              {active.song.genre} · BPM {active.song.bpm}
            </div>
            <div className="mt-0.5 text-ink/45">
              能量 {active.song.arousal.toFixed(2)} · 色彩 {active.song.valence.toFixed(2)}
            </div>

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onPlaySong(active.song); setActive(null); }}
                aria-label={isThisPlaying ? '暂停' : '试听'}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 font-semibold transition-colors ${
                  isThisPlaying
                    ? 'border-cyan-500/60 bg-cyan-500/20 text-cyan-700'
                    : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-700 hover:bg-cyan-500/20'
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
                      ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-700'
                      : 'border-violet-400/40 bg-violet-500/10 text-violet-700 hover:bg-violet-500/20'
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
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-xs text-ink/60">
        <span className="inline-flex items-center gap-1.5">
          <svg viewBox="-1.3 -1.35 2.6 2.7" className="h-3 w-3" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <path key={i} d={PETAL} fill="#f8a8c6" stroke="#e67ba6" strokeWidth={0.12} transform={`rotate(${(360 / 5) * i}) scale(0.9)`} />
            ))}
            <circle r={0.24} fill="#f9cf72" />
          </svg>
          已加入歌单
        </span>
        <span className="inline-flex items-center gap-1.5">
          <svg viewBox="-1.3 -1.35 2.6 2.7" className="h-3 w-3" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <path key={i} d={PETAL} fill="#f8a8c6" stroke="#e67ba6" strokeWidth={0.12} transform={`rotate(${(360 / 5) * i}) scale(0.9)`} />
            ))}
            <circle r={0.24} fill="none" stroke="#f9cf72" strokeWidth={0.16} />
          </svg>
          推荐歌曲
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
