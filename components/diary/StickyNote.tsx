'use client';

/** 粉色便利贴：右下角卷角，点击展开输入框写听歌感受，多行自动保存 */
import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string;
  onSave: (text: string) => void;
}

const FOLD = 'polygon(0 0, 100% 0, 100% calc(100% - 14px), calc(100% - 14px) 100%, 0 100%)';

export default function StickyNote({ value, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) taRef.current?.focus();
  }, [editing]);

  const save = () => {
    onSave(draft.trim());
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        className="rounded-xl bg-[#F7E4D4] p-3 shadow-[0_4px_14px_rgba(0,0,0,0.10)]"
        style={{ clipPath: FOLD }}
      >
        <textarea
          ref={taRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={4}
          placeholder="写下听到这首歌的感受…"
          className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-[#6B5644] outline-none placeholder:text-[#C4B6A4]"
        />
        <div className="mt-1 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => {
              setDraft(value);
              setEditing(false);
            }}
            className="px-2 py-1 text-[12px] text-[#B5A99B]"
          >
            取消
          </button>
          <button
            type="button"
            onClick={save}
            className="rounded-lg bg-[#6B5644] px-3 py-1 text-[12px] font-medium text-white"
          >
            保存
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      className="w-full rounded-xl bg-[#F7E4D4] p-3 text-left shadow-[0_4px_14px_rgba(0,0,0,0.10)] transition-transform duration-150 active:scale-[0.98]"
      style={{ clipPath: FOLD }}
    >
      {value ? (
        <p className="line-clamp-4 text-[13px] leading-relaxed text-[#6B5644]">{value}</p>
      ) : (
        <p className="text-[13px] text-[#B5A99B]">写点什么…</p>
      )}
    </button>
  );
}
