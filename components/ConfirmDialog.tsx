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
      className="fixed inset-0 z-[150] grid place-items-center bg-ink/30 backdrop-blur-sm"
      onClick={onCancel}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="animate-card-in glass w-[min(88vw,380px)] rounded-3xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <h3 className="text-lg text-ink" style={{ fontFamily: 'inherit' }}>
            {title}
          </h3>
        )}
        {message && (
          <p className="mt-3 text-sm leading-relaxed text-ink/60">{message}</p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="btn-lift rounded-full bg-ink/5 px-5 py-2 text-sm text-ink/80 hover:bg-ink/10"
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