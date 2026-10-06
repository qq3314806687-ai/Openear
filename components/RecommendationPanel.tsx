'use client';

/**
 * 推荐路线列表：两列紧凑网格（PRD §3.2.3 通栏卡片）
 * 每格：封面色块 + 歌名/歌手 + 流派 Badge + 加入/试听 + 一句话理由 + 三层理由 Chip。
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
    <div className="relative grid grid-cols-1 gap-3 md:grid-cols-2">
      {/* 两列之间的虚线分隔（与情绪地图同风格的轻分隔） */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-1 left-1/2 hidden -translate-x-1/2 border-l border-dashed border-ink/15 md:block"
      />

      {/* 第 1 → 2 首之间的路线箭头 */}
      {recommendations.length > 1 && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[56px] z-10 hidden -translate-x-1/2 md:block"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full border border-ink/15 bg-white/90 text-ink/60 shadow-glow">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14" />
              <path d="m13 6 6 6-6 6" />
            </svg>
          </span>
        </span>
      )}

      {recommendations.length === 0 && (
        <p className="col-span-full py-10 text-center text-sm text-ink/40">调整强度或点击空白区，生成你的探索路线…</p>
      )}

      {recommendations.map((r, i) => (
        <article
          key={r.song.id}
          className="animate-card-in group lift flex gap-2.5 rounded-2xl border border-ink/10 bg-ink/5 p-3 hover:border-violet-400/40 hover:bg-ink/10"
          style={{ animationDelay: `${Math.min(i, 9) * 45}ms` }}
        >
          {/* 封面色块 */}
          <span
            className="block h-12 w-12 shrink-0 rounded-xl shadow-inner"
            style={{ background: r.song.coverColor }}
            aria-hidden="true"
          />

          {/* 主体 */}
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-baseline gap-x-1.5">
              <span className="text-[10px] font-semibold text-ink/30">{i + 1}</span>
              <h4 className="min-w-0 truncate text-[13px] font-semibold text-ink">{r.song.title}</h4>
              <span className="min-w-0 truncate text-[10px] text-ink/50">{r.song.artist}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-1">
              <span className="inline-flex max-w-full items-center gap-1 rounded-full border border-ink/10 px-1.5 py-0.5 text-[9px] text-ink/55">
                <span className="h-1 w-1 shrink-0 rounded-full" style={{ backgroundColor: r.song.coverColor }} />
                <span className="truncate">{r.song.genre} · {r.song.bpm}</span>
              </span>
              <span className="text-[9px] text-cyan-600/70">VA {r.vaDistanceFromUserAvg.toFixed(2)}</span>
              {r.song.genre !== userGenreTop[0] && (
                <span className="rounded-full bg-fuchsia-500/15 px-1.5 py-0.5 text-[9px] text-fuchsia-500">跨流派</span>
              )}
              <span className="ml-auto flex items-center gap-1">
                {onTogglePlaylist && (
                  <button
                    type="button"
                    onClick={() => onTogglePlaylist(r.song)}
                    aria-pressed={inPlaylist.has(r.song.id)}
                    title={inPlaylist.has(r.song.id) ? '已在歌单，点击移出' : '加入我的歌单'}
                    className={`grid h-5 w-5 place-items-center rounded-md border text-[11px] leading-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 ${
                      inPlaylist.has(r.song.id)
                        ? 'border-rose-400/50 bg-rose-500/20 text-rose-500'
                        : 'border-ink/10 text-ink/35 hover:border-violet-400/40 hover:text-ink'
                    }`}
                  >
                    {inPlaylist.has(r.song.id) ? '✓' : '+'}
                  </button>
                )}
                {onPlay && (
                  <button
                    type="button"
                    onClick={() => onPlay(r.song)}
                    title="试听"
                    aria-label="试听"
                    className="grid h-5 w-5 place-items-center rounded-full border border-ink/10 text-ink/60 transition-colors hover:border-cyan-400/50 hover:text-cyan-600"
                  >
                    <PlayGlyph />
                  </button>
                )}
              </span>
            </div>

            {/* 自动润色的一句话理由（信息层级最高） */}
            {polished[r.song.id] && (
              <p className="mt-1.5 rounded-lg border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[11px] leading-snug text-violet-600">
                {polished[r.song.id]}
              </p>
            )}

            {/* 三层规则理由（次级细节，压成一行紧凑 chip） */}
            <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5">
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
    <span className="flex items-start gap-1.5 text-[10.5px] leading-snug text-ink/70">
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
