'use client';

/**
 * 情绪边界地图模块（紧凑、可折叠，纯 2D 四象限散点图）。
 * 由「用户歌单」的歌曲生成；推荐候选与歌单歌曲同图区分展示。
 */
import { useState } from 'react';
import type { Song } from '@/lib/types';
import EmotionMap from './EmotionMap';

interface Props {
  songs: Song[];
  candidates: Song[];
  onPlaySong: (song: Song) => void;
  onClearPlaylist: () => void;
  onTogglePlaylist?: (song: Song) => void;
  playlistIds?: string[];
  nowPlayingId?: string;
  playing?: boolean;
  avg: { valence: number; arousal: number };
}

export default function MapSection(props: Props) {
  const {
    songs,
    candidates,
    onPlaySong,
    onClearPlaylist,
    onTogglePlaylist,
    playlistIds,
    nowPlayingId,
    playing,
    avg,
  } = props;
  const [open, setOpen] = useState(true);

  return (
    <section className="lift rounded-3xl glass p-4">
      {/* 头部 */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white">情绪边界地图</h2>
          {open && songs.length > 0 && (
            <span className="text-[11px] text-white/40">
              {songs.length} 首 · 平均 V {avg.valence.toFixed(2)} / A {avg.arousal.toFixed(2)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {songs.length > 0 && (
            <button
              type="button"
              onClick={onClearPlaylist}
              className="rounded-lg border border-white/10 px-2 py-1 text-[11px] text-white/50 transition-colors hover:border-rose-400/40 hover:text-rose-300"
            >
              清空歌单
            </button>
          )}

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? '折叠地图' : '展开地图'}
            className="grid h-6 w-6 place-items-center rounded-lg border border-white/10 text-white/60 transition-colors hover:text-white"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: open ? 'none' : 'rotate(-90deg)' }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        </div>
      </div>

      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-between rounded-xl border border-dashed border-white/10 bg-white/[0.02] px-3 py-2.5 text-xs text-white/55 transition-colors hover:border-violet-400/40 hover:text-white"
        >
          <span>{songs.length > 0 ? `由 ${songs.length} 首歌曲生成的情绪地图` : '情绪边界地图（空）'}</span>
          <span className="text-white/35">展开 →</span>
        </button>
      )}

      {open && (
        songs.length === 0 ? (
          <div className="grid h-[280px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-6 text-center">
            <div>
              <p className="text-sm font-medium text-white">你的情绪地图还是空白</p>
              <p className="mx-auto mt-2 max-w-[300px] text-xs leading-relaxed text-white/45">
                在右侧往歌单里添加喜欢的歌，或粘贴一首音频直链参与口味分析，地图四个象限就会亮起你的情绪落点。
              </p>
            </div>
          </div>
        ) : (
          <EmotionMap
            songs={songs}
            candidates={candidates}
            onPlaySong={onPlaySong}
            onTogglePlaylist={onTogglePlaylist}
            playlistIds={playlistIds}
            nowPlayingId={nowPlayingId}
            playing={playing}
          />
        )
      )}
    </section>
  );
}