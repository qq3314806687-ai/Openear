'use client';

/**
 * 我的歌单 · 全览界面：另起一整屏浏览全部歌曲。
 * 保留主界面的歌单面板作为预览，这里提供完整列表 + 试听 + 移除。
 */
import type { Song } from '@/lib/types';

interface Props {
  songs: Song[];
  onClose: () => void;
  onPlay: (song: Song) => void;
  onRemove: (id: string) => void;
  nowPlayingId?: string;
  playing?: boolean;
}

export default function FullPlaylistScreen({
  songs,
  onClose,
  onPlay,
  onRemove,
  nowPlayingId,
  playing,
}: Props) {
  return (
    <div className="fixed inset-0 z-[110] overflow-y-auto bg-[#121a15]/90 backdrop-blur-2xl">
      <div className="mx-auto max-w-[920px] px-5 py-8 pb-20">
        {/* 页头 */}
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-lift flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-[#f0e8d8] hover:bg-white/20"
          >
            ← 返回预览
          </button>
          <h2 className="text-xl tracking-wide text-[#f0e8d8]">我的歌单 · 全览</h2>
          <span className="shrink-0 text-xs text-white/45">{songs.length} 首</span>
        </header>

        {/* 歌单列表 */}
        <div className="mt-7 flex flex-col gap-2.5">
          {songs.length === 0 ? (
            <p className="mt-20 text-center text-sm text-white/40">
              歌单还是空的 —— 去主界面加入几首歌吧。
            </p>
          ) : (
            songs.map((s) => {
              const isCurrent = nowPlayingId === s.id && playing;
              return (
                <div
                  key={s.id}
                  className={`lift flex items-center gap-3 rounded-2xl border p-3 ${
                    isCurrent
                      ? 'border-violet-400/40 bg-violet-500/10'
                      : 'border-white/10 bg-white/[0.05]'
                  }`}
                >
                  <span
                    className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg"
                    style={{ background: s.coverColor }}
                    aria-hidden
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">《{s.title}》</p>
                    <p className="truncate text-xs text-white/50">{s.artist}</p>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-white/40">
                      <span className="rounded-full border border-white/10 px-2 py-0.5">{s.genre}</span>
                      <span>V {s.valence.toFixed(2)}</span>
                      <span>A {s.arousal.toFixed(2)}</span>
                      <span>{s.bpm} BPM</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlay(s)}
                    className="btn-lift grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime-500/80 text-sm text-white"
                    title={isCurrent ? '暂停' : '试听'}
                    aria-label={isCurrent ? '暂停' : '试听'}
                  >
                    {isCurrent ? '⏸' : '▶'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemove(s.id)}
                    className="btn-lift grid h-9 w-9 shrink-0 place-items-center rounded-full bg-rose-500/20 text-rose-300 hover:bg-rose-500/35"
                    title="移出歌单"
                    aria-label="移出歌单"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}