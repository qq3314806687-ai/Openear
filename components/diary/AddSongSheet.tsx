'use client';

/** 底部弹出面板：从相册上传播放截图，上传后交给 analyzeScreenshot 解析成贴纸 */
import { useEffect, useRef } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onAnalyze: (file: File) => void;
}

export default function AddSongSheet({ open, onClose, onAnalyze }: Props) {
  const galleryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) onAnalyze(file);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="关闭"
        onClick={onClose}
        className="absolute inset-0 bg-black/25"
      />
      <div className="sheet-up relative w-full max-w-[430px] rounded-t-[28px] bg-[#F5F1EB] px-5 pb-8 pt-3">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[#E8E2D9]" />
        <p className="mb-3 text-[13px] font-medium text-[#6B5644]">添加一首新歌</p>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="flex w-full items-center gap-3 rounded-2xl bg-white p-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-transform duration-150 active:scale-[0.98]"
        >
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E8A87C]/20 text-[#E8A87C]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="3" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-3.5-3.5a2 2 0 0 0-2.8 0L6 20" />
            </svg>
          </span>
          <span className="flex-1">
            <span className="block text-[14px] font-medium text-[#6B5644]">从相册上传播放截图</span>
            <span className="mt-0.5 block text-[12px] text-[#B5A99B]">自动识别歌曲信息，贴成一张新贴纸</span>
          </span>
        </button>
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}
