'use client';

/** 歌曲贴纸卡：白边 + 虚线外框 + 随机倾斜，像随手贴在手账上 */
import type { DiaryEntry } from '@/lib/lib/diary';

interface Props {
  entry: DiaryEntry;
  fresh?: boolean;
  onClick: () => void;
}

export default function StickerCard({ entry, fresh, onClick }: Props) {
  return (
    <div className={fresh ? 'diary-new' : ''}>
      <div
        className="flex flex-col items-center"
        style={{ transform: `rotate(${entry.stickerRotation}deg)` }}
      >
        <button
          type="button"
          onClick={onClick}
          aria-label={`查看《${entry.song.title}》详情`}
          className="block w-full max-w-[150px] transition-transform duration-150 active:scale-[0.98]"
          style={{
            padding: 8,
            background: '#fff',
            borderRadius: 14,
            outline: '2px dashed #E8E2D9',
            outlineOffset: 4,
            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          }}
        >
          <img
            src={entry.song.coverStickerUrl}
            alt={`${entry.song.title} 封面贴纸`}
            draggable={false}
            className="aspect-square w-full rounded-[10px] object-cover"
          />
        </button>
        <p className="mt-2 max-w-full truncate px-1 text-center text-[13px] font-semibold text-[#6B5644]">
          {entry.song.title}
        </p>
        <p className="mt-0.5 text-[10px] text-[#B5A99B] tabular-nums">
          {entry.song.genre} · V{entry.song.visualRating} · A{entry.song.moodRating} · {entry.song.bpm} BPM
        </p>
      </div>
    </div>
  );
}
