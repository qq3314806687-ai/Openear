'use client';

/** 周历条：7 个圆形日期，选中实心深棕；有贴纸的日子亮小橙点 */
import { dateLabel, toDateStr, weekOf, type DiaryEntry } from '@/lib/lib/diary';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];

interface Props {
  selected: string;
  entries: DiaryEntry[];
  onChange: (date: string) => void;
}

export default function WeekStrip({ selected, entries, onChange }: Props) {
  const days = weekOf(selected);
  const has = (date: string) => entries.some((e) => e.date === date);
  return (
    <div className="px-5 pt-3">
      <p className="mb-2.5 flex items-center gap-1 text-[13px] font-medium text-[#6B5644]">
        {dateLabel(selected)}
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </p>
      <div className="flex items-start justify-between">
        {days.map((d) => {
          const date = toDateStr(d);
          const active = date === selected;
          return (
            <button
              key={date}
              type="button"
              onClick={() => onChange(date)}
              aria-pressed={active}
              className="flex flex-col items-center gap-1"
            >
              <span className="text-[10px] text-[#B5A99B]">周{WEEK[(d.getDay() + 6) % 7]}</span>
              <span
                className={`grid h-9 w-9 place-items-center rounded-full text-[13px] font-semibold tabular-nums transition-colors ${
                  active ? 'bg-[#6B5644] text-white' : 'ring-1 ring-[#E8E2D9] text-[#6B5644]'
                }`}
              >
                {d.getDate()}
              </span>
              <span className={`h-1.5 w-1.5 rounded-full ${has(date) ? 'bg-[#E8A87C]' : 'bg-transparent'}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
