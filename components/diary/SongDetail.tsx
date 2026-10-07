'use client';

/** 单首歌详情：大贴纸 + 便利贴 + 歌曲信息 + 属性条 + AI tips */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { DiaryEntry, SongEdits } from '@/lib/lib/diary';
import StickyNote from './StickyNote';
import EditSongSheet from './EditSongSheet';

interface Props {
  entry: DiaryEntry;
  onBack: () => void;
  onSaveNote: (text: string) => void;
  onSaveMeta: (edits: SongEdits) => void;
  onDelete: () => void;
}

/** 贴纸图（data URL）转成可分享的文件 */
async function toFile(url: string, name: string): Promise<File | null> {
  try {
    const blob = await (await fetch(url)).blob();
    const type = blob.type || 'image/png';
    return new File([blob], name.replace(/\.png$/, type.includes('svg') ? '.svg' : '.png'), { type });
  } catch {
    return null;
  }
}

export default function SongDetail({ entry, onBack, onSaveNote, onSaveMeta, onDelete }: Props) {
  const { song, userNote } = entry;
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [editing, setEditing] = useState(false);
  const [toast, setToast] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  // 点击外部 / Esc 关闭菜单
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirming(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setConfirming(false);
      }
    };
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  /** 分享：优先带贴纸图分享 → 退回纯文字分享 → 再退回复制文案 */
  const handleShare = async () => {
    setMenuOpen(false);
    const text = `我在 openear 的音乐日记里贴了一首《${song.title}》—— ${song.artist}`;
    const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
    if (typeof nav.share === 'function') {
      try {
        const file = await toFile(song.coverStickerUrl, `${song.title}.png`);
        if (file && nav.canShare?.({ files: [file] })) {
          await nav.share({ files: [file], title: song.title, text });
          return;
        }
        await nav.share({ title: song.title, text });
        return;
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return; // 用户主动取消
      }
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast('分享文案已复制');
    } catch {
      setToast('这台设备暂不支持分享');
    }
  };

  const personalized = userNote
    ? `${song.aiTips.personalized} 你写下「${userNote.length > 18 ? `${userNote.slice(0, 18)}…` : userNote}」—— 听到了，就让这首歌再陪你一会儿吧。`
    : song.aiTips.personalized;

  return (
    <div className="diary-in mx-auto w-full max-w-[560px] px-5 pb-16 pt-5">
      {/* 顶部：返回 + 右上角更多（分享 / 删除） */}
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

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            onClick={() => {
              setMenuOpen((v) => !v);
              setConfirming(false);
            }}
            aria-label="更多操作"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            className="grid h-10 w-10 place-items-center rounded-full bg-white text-[#6B5644] shadow-[0_2px_10px_rgba(0,0,0,0.06)] transition-transform duration-150 active:scale-95"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="5" cy="12" r="2" />
              <circle cx="12" cy="12" r="2" />
              <circle cx="19" cy="12" r="2" />
            </svg>
          </button>

          {menuOpen && (
            <div
              role="menu"
              className="diary-in absolute right-0 top-12 z-20 w-[168px] overflow-hidden rounded-2xl bg-white py-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.14)]"
            >
              {confirming ? (
                <div className="px-3.5 py-2">
                  <p className="text-[12px] text-[#6B5644]">删掉这张贴纸？</p>
                  <div className="mt-2.5 flex gap-2">
                    <button
                      type="button"
                      onClick={onDelete}
                      className="flex-1 rounded-full bg-[#C0563F] py-1.5 text-[12px] font-semibold text-white transition-transform duration-150 active:scale-95"
                    >
                      删除
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirming(false)}
                      className="flex-1 rounded-full bg-[#F5F1EB] py-1.5 text-[12px] font-medium text-[#6B5644] transition-transform duration-150 active:scale-95"
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      setEditing(true);
                    }}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#6B5644] transition-colors hover:bg-[#F5F1EB]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 20h9" />
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                    </svg>
                    编辑
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleShare}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#6B5644] transition-colors hover:bg-[#F5F1EB]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 16V4" />
                      <path d="m8 8 4-4 4 4" />
                      <path d="M4 14v4a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-4" />
                    </svg>
                    分享
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => setConfirming(true)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13px] text-[#C0563F] transition-colors hover:bg-[#FBEEE9]"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4h8v2" />
                      <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
                      <path d="M10 11v6M14 11v6" />
                    </svg>
                    删除
                  </button>
                </>
              )}
            </div>
          )}
        </div>
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
        <p className="mt-3 text-[11px] text-[#C4B6A4]">识别有误？点右上角 ··· 可以自己改</p>
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

      <EditSongSheet
        open={editing}
        initial={{ title: song.title, artist: song.artist, genre: song.genre }}
        onClose={() => setEditing(false)}
        onSave={(edits) => {
          onSaveMeta(edits);
          setEditing(false);
          setToast('已更新歌曲信息');
        }}
      />

      {toast && (
        <div
          role="status"
          className="diary-in fixed bottom-8 left-1/2 z-[95] -translate-x-1/2 rounded-full bg-[#6B5644] px-4 py-2 text-[12px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
        >
          {toast}
        </div>
      )}
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
