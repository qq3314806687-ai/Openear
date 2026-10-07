'use client';

/** 底部弹出面板：手动修正识别结果（歌名 / 歌手 / 风格） */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SUGGESTED_GENRES, type SongEdits } from '@/lib/lib/diary';

interface Props {
  open: boolean;
  initial: SongEdits;
  onClose: () => void;
  onSave: (edits: SongEdits) => void;
}

const INPUT =
  'w-full rounded-2xl border border-[#E8E2D9] bg-white px-3.5 py-2.5 text-[14px] text-[#6B5644] outline-none transition-colors focus:border-[#E8A87C]';

export default function EditSongSheet({ open, initial, onClose, onSave }: Props) {
  const [title, setTitle] = useState(initial.title);
  const [artist, setArtist] = useState(initial.artist);
  const [genre, setGenre] = useState(initial.genre);
  const titleRef = useRef<HTMLInputElement>(null);

  // 每次打开都用最新的贴纸内容重置表单
  useEffect(() => {
    if (!open) return;
    setTitle(initial.title);
    setArtist(initial.artist);
    setGenre(initial.genre);
  }, [open, initial.title, initial.artist, initial.genre]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = setTimeout(() => titleRef.current?.focus(), 60);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(focusTimer);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const canSave = title.trim().length > 0;

  const submit = () => {
    if (!canSave) return;
    onSave({ title: title.trim(), artist: artist.trim(), genre: genre.trim() });
  };

  return (
    <div className="fixed inset-0 z-[88] flex items-end justify-center" role="dialog" aria-modal="true" aria-label="编辑歌曲信息">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 bg-black/25" />
      <div className="sheet-up relative w-full max-w-[430px] rounded-t-[28px] bg-[#F5F1EB] px-5 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E8E2D9]" />
        <p className="text-[13px] font-medium text-[#6B5644]">编辑歌曲信息</p>
        <p className="mt-1 text-[11px] text-[#B5A99B]">识别有误？自己改一改就好</p>

        <form
          className="mt-4 flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field label="歌名">
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={80}
              placeholder="这首歌叫什么"
              className={INPUT}
            />
          </Field>
          <Field label="歌手">
            <input
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              maxLength={80}
              placeholder="谁唱的"
              className={INPUT}
            />
          </Field>
          <Field label="风格">
            <input
              value={genre}
              onChange={(e) => setGenre(e.target.value)}
              maxLength={40}
              list="diary-genre-options"
              placeholder="例如 Lo-fi / City Pop"
              className={INPUT}
            />
            <datalist id="diary-genre-options">
              {SUGGESTED_GENRES.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </Field>

          <div className="mt-2 flex gap-2">
            <button
              type="submit"
              disabled={!canSave}
              className="flex-1 rounded-full bg-[#E8A87C] py-2.5 text-[13px] font-semibold text-white transition-transform duration-150 active:scale-95 disabled:opacity-40"
            >
              保存
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-full bg-white py-2.5 text-[13px] font-medium text-[#6B5644] transition-transform duration-150 active:scale-95"
            >
              取消
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] tracking-widest text-[#B5A99B]">{label}</span>
      {children}
    </label>
  );
}