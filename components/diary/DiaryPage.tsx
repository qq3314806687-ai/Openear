'use client';

/** 音乐日记主页：手账式记录每天听的歌（openear 子功能，全屏手机壳视图） */
import { useEffect, useState } from 'react';
import type { DiaryEntry } from '@/lib/lib/diary';
import {
  analyzeScreenshot,
  entriesOf,
  fallbackMeta,
  loadDiary,
  saveDiary,
  toDateStr,
} from '@/lib/lib/diary';
import WeekStrip from './WeekStrip';
import StickerCard from './StickerCard';
import SongDetail from './SongDetail';
import AddSongSheet from './AddSongSheet';

interface Props {
  onClose: () => void;
}

export default function DiaryPage({ onClose }: Props) {
  const [entries, setEntries] = useState<DiaryEntry[]>(() => loadDiary());
  const [selected, setSelected] = useState<string>(() => toDateStr(new Date()));
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [freshId, setFreshId] = useState<string | null>(null);

  // 日记打开期间锁定页面滚动，返回主界面时恢复
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const dayEntries = entriesOf(entries, selected);
  const viewing = entries.find((e) => e.id === viewingId) ?? null;

  const updateEntries = (updater: (prev: DiaryEntry[]) => DiaryEntry[]) => {
    setEntries((prev) => {
      const next = updater(prev);
      saveDiary(next);
      return next;
    });
  };

  const saveNote = (id: string, text: string) => {
    updateEntries((prev) => prev.map((e) => (e.id === id ? { ...e, userNote: text } : e)));
  };

  /** 刷新当天贴纸：重新微调倾斜角度（「重新解析」占位交互） */
  const refreshDay = () => {
    updateEntries((prev) =>
      prev.map((e) =>
        e.date === selected
          ? { ...e, stickerRotation: Math.round((Math.random() * 6 - 3) * 10) / 10 }
          : e,
      ),
    );
  };

  /** 上传播放截图 → mock 识别 → 新贴纸「啪嗒」贴上 */
  const handleAnalyze = async (file: File) => {
    setShowAdd(false);
    setParsing(true);
    let meta;
    try {
      meta = await analyzeScreenshot(file);
    } catch {
      meta = fallbackMeta();
    }
    const entry: DiaryEntry = {
      id: `d-${Date.now()}`,
      date: toDateStr(new Date()),
      song: meta,
      userNote: '',
      stickerRotation: Math.round((Math.random() * 6 - 3) * 10) / 10,
    };
    updateEntries((prev) => [...prev, entry]);
    setFreshId(entry.id);
    setSelected(entry.date);
    setParsing(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-[#EFE8DE]">
      {/* 手机壳：奶油色日记列在桌面端居中 */}
      <div className="relative mx-auto h-full w-full max-w-[430px] overflow-y-auto bg-[#F5F1EB] shadow-[0_0_0_1px_rgba(0,0,0,0.04)]">
        {viewing ? (
          <SongDetail
            entry={viewing}
            onBack={() => setViewingId(null)}
            onSaveNote={(text) => saveNote(viewing.id, text)}
          />
        ) : (
          <>
            {/* 顶部栏 */}
            <header className="flex items-center justify-between px-5 pt-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="返回主界面"
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#6B5644] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-transform duration-150 active:scale-95"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5" />
                    <path d="m12 19-7-7 7-7" />
                  </svg>
                </button>
                <Logo />
              </div>
              <span className="flex items-center gap-1.5 text-[12px] font-medium text-[#B5A99B]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
                月报
              </span>
            </header>

            <WeekStrip selected={selected} entries={entries} onChange={setSelected} />

            {/* 日记本大卡片：横线纸 + 活页圆点 */}
            <div className="relative mx-4 mt-3 rounded-[32px] bg-white p-5 pb-32 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <div aria-hidden className="paper-lines pointer-events-none absolute inset-x-5 bottom-5 top-5 rounded-xl" />
              <div className="relative pl-5">
                {/* 卡片头：日期 + 刷新 */}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-[#B5A99B]">
                    {new Date(`${selected}T00:00:00`).getFullYear()} 年{' '}
                    {new Date(`${selected}T00:00:00`).getMonth() + 1} 月
                  </p>
                  <button
                    type="button"
                    onClick={refreshDay}
                    aria-label="重新解析"
                    title="重新解析"
                    className="grid h-7 w-7 place-items-center rounded-full text-[#B5A99B] transition-transform duration-300 hover:rotate-180 hover:text-[#6B5644]"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                      <path d="M3 3v5h5" />
                    </svg>
                  </button>
                </div>
                {/* 当日统计 */}
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="text-[44px] font-bold leading-none text-[#6B5644] tabular-nums">
                    {dayEntries.length}
                  </span>
                  <span className="text-[13px] text-[#B5A99B]">首</span>
                </p>

                {/* 贴纸墙 */}
                {dayEntries.length > 0 ? (
                  <div className="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 justify-items-center">
                    {dayEntries.map((e) => (
                      <StickerCard
                        key={e.id}
                        entry={e}
                        fresh={e.id === freshId}
                        onClick={() => setViewingId(e.id)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="mt-10 flex flex-col items-center gap-2 pb-6 text-center">
                    <p className="text-[13px] text-[#B5A99B]">这一天还没留下歌</p>
                    <p className="text-[12px] text-[#C4B6A4]">点下方 + 上传一张播放截图，让它「啪嗒」贴上纸吧</p>
                  </div>
                )}
              </div>
            </div>

            {/* 底部导航：悬浮在日记本下方 */}
            <nav className="absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-6 pb-5">
              <button
                type="button"
                aria-label="我的"
                className="grid h-11 w-11 place-items-center overflow-hidden rounded-full bg-[#2B2118] shadow-[0_4px_14px_rgba(43,33,24,0.25)] transition-transform duration-150 active:scale-95"
              >
                <img src="/oreo-sprite.jpg" alt="Oreo" className="h-full w-full object-cover object-[50%_22%]" />
              </button>
              <button
                type="button"
                onClick={() => setShowAdd(true)}
                aria-label="添加新歌"
                className="-mt-9 grid h-16 w-16 place-items-center rounded-full bg-[#2B2118] text-white shadow-[0_10px_24px_rgba(43,33,24,0.35)] transition-transform duration-150 active:scale-95"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
              <button
                type="button"
                aria-label="切换视图"
                className="grid h-11 w-11 place-items-center rounded-full bg-[#2B2118] text-white shadow-[0_4px_14px_rgba(43,33,24,0.25)] transition-transform duration-150 active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="7" rx="1.5" />
                  <rect x="14" y="3" width="7" height="7" rx="1.5" />
                  <rect x="3" y="14" width="7" height="7" rx="1.5" />
                  <rect x="14" y="14" width="7" height="7" rx="1.5" />
                </svg>
              </button>
            </nav>
          </>
        )}

        {/* AI 解析中浮层 */}
        {parsing && (
          <div className="fixed inset-0 z-[90] flex items-center justify-center bg-[#F5F1EB]/85" role="status" aria-label="AI 解析中">
            <div className="flex flex-col items-center gap-4 rounded-3xl bg-white px-8 py-7 shadow-[0_8px_30px_rgba(0,0,0,0.10)]">
              <span className="diary-pulse grid h-14 w-14 place-items-center rounded-full border-2 border-dashed border-[#E8A87C] text-[#E8A87C]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M3 12h4m10 0h4M12 3v4m0 10v4" />
                </svg>
              </span>
              <p className="text-[14px] font-medium text-[#6B5644]">AI 解析中…</p>
              <p className="-mt-2 text-[12px] text-[#B5A99B]">正在把封面抠成贴纸</p>
            </div>
          </div>
        )}

        <AddSongSheet open={showAdd} onClose={() => setShowAdd(false)} onAnalyze={handleAnalyze} />
      </div>
    </div>
  );
}

/** 品牌 logo：openear，小写圆润，o 里填暖橙小圆点 */
function Logo() {
  return (
    <span className="text-[20px] font-bold lowercase tracking-tight text-[#6B5644]">
      <span className="relative">
        o
        <span className="absolute left-1/2 top-1/2 h-[5px] w-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#E8A87C]" />
      </span>
      penear
    </span>
  );
}
