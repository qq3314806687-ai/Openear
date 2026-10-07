'use client';

/**
 * 「今日一首」心情重测弹窗。
 * 只问一件事：今天是什么心情。心情是随时段变化的临时状态，
 * 与「新的出发」那套长期口味画像完全无关，也不会新建账号或改动口味。
 */
import { useEffect } from 'react';
import { TODAY_MOODS, type TodayMood } from '@/lib/lib/today';

interface Props {
  open: boolean;
  onClose: () => void;
  onPick: (m: TodayMood) => void;
}

export default function TodayMoodPicker({ open, onClose, onPick }: Props) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] grid place-items-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="关闭" onClick={onClose} className="absolute inset-0 bg-black/25" />
      <div className="animate-card-in relative w-full max-w-[460px] rounded-3xl glass-raised p-5">
        <h2 className="text-sm font-semibold text-ink">今天是什么心情？</h2>
        <p className="mt-1 text-[11px] leading-relaxed text-ink/45">
          重新挑选后，会为你换一首新的「今日一首」当今天探索的起点。它只代表今天的心情，不会改动你的口味画像或账号。
        </p>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {TODAY_MOODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => onPick(m)}
              className="lift rounded-2xl border border-ink/10 bg-ink/[0.04] p-3 text-left hover:border-violet-400/50 hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-400"
            >
              <span className="text-base">{m.emoji}</span>
              <span className="mt-1 block text-[13px] font-medium text-ink/85">{m.label}</span>
              <span className="block text-[11px] text-ink/45">{m.desc}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}