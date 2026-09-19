/**
 * 品牌标：小山脉 logo + 中文名「闻野」+ 英文 OpenEar + 副语。
 * logo 为「新月 + 连绵山峦 + 星点」，呼应自由山野的气质。
 */
export default function BrandMark({
  compact = false,
  tagline = true,
}: {
  compact?: boolean;
  tagline?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="grid place-items-center rounded-2xl border border-[color:rgba(238,240,234,0.14)] bg-gradient-to-br from-violet-500/25 to-cyan-500/20 text-[color:#eef0ea] shadow-glow">
        <svg width={compact ? 40 : 46} height={compact ? 40 : 46} viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
          {/* 新月 */}
          <path d="M40 10a6.4 6.4 0 1 0 4.6 8.2A5 5 0 0 1 40 10Z" />
          {/* 连绵山峦 + 地线 */}
          <path d="M6 36 L15 22 L23 30 L31 18 L40 30 L46 26" />
          <path d="M8 44 H44" opacity="0.55" />
          {/* 星点 */}
          <circle cx="27" cy="12" r="1.7" fill="currentColor" stroke="none" />
          <circle cx="15" cy="14" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
        </svg>
      </span>
      <div className="leading-tight">
        <div className="flex items-baseline gap-2">
          <span className={compact ? 'text-xl font-bold tracking-tight' : 'text-2xl font-bold tracking-tight'}>
            闻野
          </span>
          <span className="text-[10px] uppercase tracking-[0.35em] opacity-45">OpenEar</span>
        </div>
        {tagline && <p className={compact ? 'mt-0.5 text-xs opacity-60' : 'mt-0.5 text-sm opacity-65'}>在音浪里，遇见旷野</p>}
      </div>
    </div>
  );
}