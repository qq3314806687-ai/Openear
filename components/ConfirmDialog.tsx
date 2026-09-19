'use client';

/**
 * 通用确认弹窗：居中玻璃卡片，供「是否回到出发的地方」这类二次确认使用。
 */
interface Props {
  open: boolean;
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title = '确认',
  message,
  confirmText = '是',
  cancelText = '否',
  onConfirm,
  onCancel,
}: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[150] grid place-items-center bg-black/45 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-card-in w-[min(88vw,380px)] rounded-3xl border border-white/15 bg-[#1c2621]/90 p-6 shadow-glow backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-lg text-[#f0e8d8]" style={{ fontFamily: 'inherit' }}>
            {title}
          </h3>
        )}
        {message && (
          <p className="mt-3 text-sm leading-relaxed text-[#c9c4b6]">{message}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-lift rounded-full bg-white/10 px-5 py-2 text-sm text-white/85 hover:bg-white/20"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="btn-lift rounded-full bg-amber-500/85 px-5 py-2 text-sm text-[#201a10] hover:bg-amber-400"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}