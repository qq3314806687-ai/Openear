'use client';

/**
 * 情绪边界地图模块（紧凑、可折叠、可切换 2D/3D）。
 * 地形由「用户红心歌单」的歌曲生成；空白地带点击可探索&试听。
 */
import { useState } from 'react';
import type { Song } from '@/lib/types';
import EmotionMap from './EmotionMap';
import EmotionMap3D from './EmotionMap3D';

interface Props {
  songs: Song[];
  candidates: Song[];
  activeZoneId: string | null;
  onZoneSelect: (id: string) => void;
  onPlaySong: (song: Song) => void;
  onClearPlaylist: () => void;
  avg: { valence: number; arousal: number };
}

export default function MapSection(props: Props) {
  const { songs, candidates, activeZoneId, onZoneSelect, onPlaySong, onClearPlaylist, avg } = props;
  const [open, setOpen] = useState(true);
  const [mode, setMode] = useState<'3d' | '2d'>('3d');

  return (
    <section className="rounded-3xl border border-white/10 bg-panel p-4 backdrop-blur">
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
          <div className="flex overflow-hidden rounded-lg border border-white/10 text-[11px]">
            <button
              type="button"
              onClick={() => setMode('3d')}
              className={`px-2 py-1 transition-colors ${mode === '3d' ? 'bg-violet-500/30 text-white' : 'text-white/50 hover:text-white'}`}
            >
              3D
            </button>
            <button
              type="button"
              onClick={() => setMode('2d')}
              className={`px-2 py-1 transition-colors ${mode === '2d' ? 'bg-violet-500/30 text-white' : 'text-white/50 hover:text-white'}`}
            >
              2D
            </button>
          </div>

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
          <span>{songs.length > 0 ? `由 ${songs.length} 首歌曲生成的 3D 情绪地形` : '情绪边界地图（空）'}</span>
          <span className="text-white/35">展开 →</span>
        </button>
      )}

      {open && (
        <>
          {/* 空歌单引导态 */}
          {songs.length === 0 ? (
            <div className="grid h-[280px] place-items-center rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-8 py-6 text-center">
              <div>
                <p className="text-sm font-medium text-white">你的情绪地形还是空白</p>
                <p className="mx-auto mt-2 max-w-[300px] text-xs leading-relaxed text-white/45">
                  在右侧往歌单里添加喜欢的歌，或粘贴一首音频直链参与口味分析，地图就会长出专属你的情绪山地。
                </p>
              </div>
            </div>
          ) : mode === '3d' ? (
            <div className="mt-1">
              <EmotionMap3D
                songs={songs}
                candidates={candidates}
                activeZoneId={activeZoneId}
                onZoneSelect={onZoneSelect}
                onPlaySong={onPlaySong}
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-1 text-[11px] text-white/55">
                <LegendDot color="rgba(255,255,255,0.7)" label="你的歌单（带光晕=可试听）" />
                <LegendDot color="rgba(139,92,246,0.7)" label="推荐候选 · 下一站" />
                <LegendDot color="rgba(239,68,68,0.8)" label="空白地带 · 点击探索&试听" />
              </div>
            </div>
          ) : (
            <EmotionMap
              songs={songs}
              candidates={candidates}
              activeZoneId={activeZoneId}
              onZoneSelect={onZoneSelect}
              onPlaySong={onPlaySong}
            />
          )}
        </>
      )}
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  );
}