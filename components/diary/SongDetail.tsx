'use client';

/** 单首歌详情：大贴纸 + 便利贴 + 歌曲信息 + 属性条 + AI tips */
import type { ReactNode } from 'react';
import type { DiaryEntry } from '@/lib/lib/diary';
import StickyNote from './StickyNote';

interface Props {
  entry: DiaryEntry;
  onBack: () => void;
  onSaveNote: (text: string) => void;
}

export default function SongDetail({ entry, onBack, onSaveNote }: Props) {
  const { song, userNote } = entry;

  const personalized = userNote
    ? `${song.aiTips.personalized} 你写下「${userNote.length > 18 ? `${userNote.slice(0, 18)}…` : userNote}」—— 听到了，就让这首歌再陪你一会儿吧。`
    : song.aiTips.personalized;

  return (
    <div className="diary-in mx-auto w-full max-w-[560px] px-5 pb-16 pt-5">
      {/* 顶部：返回 + 占位菜单 */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="返回"
          className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#6B5644] shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-transform duration-150 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5" />
            <path d="m12 19-7-7 7-7" />
          </svg>
        </button>
        <span aria-hidden className="px-3 text-[#B5A99B]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
        </span>
      </div>

      {/* 大图区域：大贴纸 + 虚线圆装饰 + 右下便利贴 */}
      <div className="relative mx-auto mt-5 w-[68%]">
        <div aria-hidden className="pointer-events-none absolute -inset-[12%] rounded-full border-2 border-dashed border-[#E8E2D9]" />
        <div aria-hidden className="pointer-events-none absolute -inset-[26%] rounded-full border border-dashed border-[#E8E2D9]/70" />
        <div className="relative" style={{ transform: `rotate(${entry.stickerRotation}deg)` }}>
          <img
            src={song.coverStickerUrl}
            alt={`${song.title} 封面贴纸`}
            draggable={false}
            className="aspect-square w-full rounded-[20px] object-cover"
            style={{
              padding: 10,
              background: '#fff',
              boxShadow: '0 6px 18px rgba(0,0,0,0.10)',
              outline: '2px dashed #E8E2D9',
              outlineOffset: 5,
            }}
          />
          <div className="absolute -bottom-5 -right-4 w-[46%] rotate-2">
            <StickyNote value={userNote} onSave={onSaveNote} />
          </div>
        </div>
      </div>

      {/* 歌曲信息 */}
      <div className="mt-12 text-center">
        <h2 className="text-[22px] font-bold text-[#6B5644]">{song.title}</h2>
        <p className="mt-1 text-[13px] text-[#B5A99B]">{song.artist}</p>
        <p className="mt-2 text-[11px] text-[#B5A99B] tabular-nums">
          {song.genre} · V{song.visualRating} · A{song.moodRating} · {song.bpm} BPM
        </p>
      </div>

      {/* 属性条 */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="风格">
          <span className="block truncate">{song.genre}</span>
        </Metric>
        <Metric label="BPM">
          <span className="tabular-nums">{song.bpm}</span>
        </Metric>
        <Metric label="色彩分 V">
          <span className="flex gap-1 pt-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <span
                key={i}
                className={`h-2.5 w-2.5 rounded-full ${i <= song.visualRating ? 'bg-[#E8A87C]' : 'bg-[#E8E2D9]'}`}
              />
            ))}
          </span>
        </Metric>
        <Metric label="情绪分 A">
          <span className="flex items-center gap-1 pt-0.5">
            {[1, 2, 3, 4, 5].map((i) => (
              <svg key={i} width="16" height="6" viewBox="0 0 18 6" aria-hidden className="shrink-0">
                <path
                  d="M1 4.5C3 1.5 4.6 1.5 6 4c1.4 2.5 3.6 2.5 5.5.5s3-2 5-0.5"
                  fill="none"
                  stroke={i <= song.moodRating ? '#E8A87C' : '#E8E2D9'}
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            ))}
          </span>
        </Metric>
      </div>

      {/* AI tips */}
      <div className="mt-6 rounded-3xl bg-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
        <p className="mb-3 text-[15px] font-bold text-[#6B5644]">tips</p>
        <p className="text-[13px] leading-relaxed text-[#6B5644]/85">{song.aiTips.intro}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6B5644]/85">{song.aiTips.analysis}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-[#6B5644]/85">{personalized}</p>
      </div>
    </div>
  );
}

function Metric({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
      <p className="text-[10px] uppercase tracking-widest text-[#B5A99B]">{label}</p>
      <div className="mt-1 text-[15px] font-semibold text-[#6B5644]">{children}</div>
    </div>
  );
}
