'use client';

/** 底部播放器：正在试听哪首歌、进度与播放/暂停 */
import type { Song } from '@/lib/types';

interface Props {
  song: Song | null;
  playing: boolean;
  currentTime: number;
  duration: number;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onClose: () => void;
}

function fmt(s: number) {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export default function AudioPlayer({ song, playing, currentTime, duration, onTogglePlay, onSeek, onClose }: Props) {
  if (!song) return null;
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 glass-raised">
      <div className="mx-auto flex max-w-[1400px] items-center gap-4 px-5 py-3">
        <span className="h-9 w-9 shrink-0 rounded-lg shadow-inner" style={{ backgroundColor: song.coverColor }} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-xs font-semibold text-white">{song.title}</span>
              <span className="truncate text-[11px] text-white/45">{song.artist}</span>
            </div>
            <span className="shrink-0 text-[10px] text-white/40">{fmt(currentTime)} / {fmt(duration)}</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const ratio = (e.clientX - rect.left) / rect.width;
              onSeek(ratio * duration);
            }}
            className="group relative mt-1.5 block h-1.5 w-full rounded-full bg-white/10"
            aria-label="播放进度"
          >
            <span className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400" style={{ width: `${pct}%` }} />
            <span className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full bg-white opacity-0 shadow group-hover:opacity-100" style={{ left: `calc(${pct}% - 6px)` }} />
          </button>
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? '暂停' : '播放'}
          className="btn-lift grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 text-white hover:border-cyan-400/50 hover:text-cyan-300"
        >
          {playing ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5L8 5.5Z" /></svg>
          )}
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label="关闭播放器"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-white/40 transition-colors hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}