'use client';

/**
 * 推荐路线列表：每首歌一张卡片（PRD §3.2.3）
 * 左侧色块、歌名/歌手/流派 Badge、底部三层理由 Chip。
 */
import type { Recommendation } from '@/lib/types';

interface Props {
  recommendations: Recommendation[];
  userGenreTop: string[];
  /** songId → 自动润色后的一句话理由 */
  polished?: Record<string, string>;
  /** 已在歌单中的歌曲 id */
  playlistIds?: string[];
  onTogglePlaylist?: (song: Recommendation['song']) => void;
  onPlay?: (song: Recommendation['song']) => void;
}

export default function RecommendationPanel({
  recommendations,
  userGenreTop,
  polished = {},
  playlistIds = [],
  onTogglePlaylist,
  onPlay,
}: Props) {
  const inPlaylist = new Set(playlistIds);
  return (
    <div className="flex flex-col gap-3">
      {recommendations.length === 0 && (
        <p className="py-10 text-center text-sm text-white/40">调整强度或点击空白区，生成你的探索路线…</p>
      )}

      {recommendations.map((r, i) => (
        <article
          key={r.song.id}
          className="animate-card-in group flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/40 hover:bg-white/10 hover:shadow-glow"
          style={{ animationDelay: `${Math.min(i, 9) * 45}ms` }}
        >
          {/* 序号 + 色块 */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-bold text-white/40">{i + 1}</span>
            <span
              className="block h-11 w-11 shrink-0 rounded-xl shadow-inner"
              style={{ background: r.song.coverColor }}
              aria-hidden="true"
            />
          </div>

          {/* 主体 */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <h4 className="text-sm font-semibold text-white">{r.song.title}</h4>
              <span className="truncate text-xs text-white/50">{r.song.artist}</span>
              <div className="ml-auto flex items-center gap-2">
                {onTogglePlaylist && (
                  <button
                    type="button"
                    onClick={() => onTogglePlaylist(r.song)}
                    aria-pressed={inPlaylist.has(r.song.id)}
                    title={inPlaylist.has(r.song.id) ? '已在歌单，点击移出' : '加入我的歌单'}
                    className={`grid h-6 w-6 place-items-center rounded-lg border text-sm leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                      inPlaylist.has(r.song.id)
                        ? 'border-rose-400/50 bg-rose-500/20 text-rose-300'
                        : 'border-white/10 text-white/35 hover:border-violet-400/40 hover:text-white'
                    }`}
                  >
                    {inPlaylist.has(r.song.id) ? '✓' : '+'}
                  </button>
                )}
                {onPlay && r.song.audioUrl && (
                  <button
                    type="button"
                    onClick={() => onPlay(r.song)}
                    title="试听"
                    aria-label="试听"
                    className="grid h-6 w-6 place-items-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                  >
                    <PlayGlyph />
                  </button>
                )}
                <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/60">
                  <span
                    className="h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: r.song.coverColor }}
                  />
                  <span className="truncate">{r.song.genre} · BPM {r.song.bpm}</span>
                </span>
              </div>
            </div>

            {/* 情绪距离 */}
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-cyan-300/80">
              <span>VA 距离 {r.vaDistanceFromUserAvg.toFixed(2)}</span>
              <span className="text-white/25">·</span>
              <span>过渡步长 {r.vaDistance.toFixed(2)}</span>
              {r.song.genre !== userGenreTop[0] && (
                <span className="ml-1 rounded-full bg-fuchsia-500/15 px-1.5 py-0.5 text-fuchsia-300">跨流派</span>
              )}
            </div>

            {/* 自动润色的一句话理由（信息层级最高） */}
            {polished[r.song.id] && (
              <p className="mt-2 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2.5 py-1.5 text-xs leading-relaxed text-violet-100">
                {polished[r.song.id]}
              </p>
            )}

            {/* 三层规则理由（次级细节，折叠成紧凑行） */}
            <div className="mt-2 grid grid-cols-1 gap-1">
              <ReasonChip label="技术" text={r.reasonTags.technical} color="#22d3ee" />
              <ReasonChip label="情绪" text={r.reasonTags.emotional} color="#a78bfa" />
              <ReasonChip label="行为" text={r.reasonTags.behavioral} color="#34d399" />
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

function ReasonChip({ label, text, color }: { label: string; text: string; color: string }) {
  return (
    <span className="flex items-start gap-1.5 text-[11px] leading-snug text-white/70">
      <span
        className="mt-px shrink-0 rounded px-1 py-0.5 text-[9px] font-bold text-black/80"
        style={{ backgroundColor: color }}
      >
        {label}
      </span>
      <span>{text}</span>
    </span>
  );
}

function PlayGlyph() {
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5.5v13l11-6.5L8 5.5Z" />
    </svg>
  );
}