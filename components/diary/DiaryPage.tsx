'use client';

/** 音乐日记：手账式记录每天听的歌（openear 子功能，桌面全宽视图） */
import { useEffect, useState } from 'react';
import type { DiaryEntry } from '@/lib/lib/diary';
import {
  analyzeScreenshot,
  applySongEdits,
  entriesOf,
  fallbackMeta,
  loadDiary,
  saveDiary,
  toDateStr,
  type SongEdits,
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
  const [toast, setToast] = useState('');

  // 日记打开期间锁定页面滚动，返回主界面时恢复
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2600);
    return () => clearTimeout(t);
  }, [toast]);

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

  /** 手动修正识别结果：只改这一张贴纸的歌曲信息 */
  const saveMeta = (id: string, edits: SongEdits) => {
    updateEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, song: applySongEdits(e.song, edits) } : e)),
    );
  };

  /** 删除贴纸：从日记移除并退回贴纸墙 */
  const deleteEntry = (id: string) => {
    updateEntries((prev) => prev.filter((e) => e.id !== id));
    setViewingId(null);
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

  /** 上传播放截图 → 识别歌曲信息 → 新贴纸「啪嗒」贴上 */
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
    setToast(`已贴上《${meta.title}》· 认错了就点开它改一改`);
  };

  return (
    <div className="fixed inset-0 z-[60] overflow-y-auto bg-[#dbe6ee]">
      <div className="mx-auto w-full max-w-[1200px] px-5 py-6 sm:px-8">
        {viewing ? (
          <SongDetail
            entry={viewing}
            onBack={() => setViewingId(null)}
            onSaveNote={(text) => saveNote(viewing.id, text)}
            onSaveMeta={(edits) => saveMeta(viewing.id, edits)}
            onDelete={() => deleteEntry(viewing.id)}
          />
        ) : (
          <>
            {/* 顶部栏：返回 + 品牌 */}
            <header className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                aria-label="返回主界面"
                className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#6B5644] shadow-[0_2px_8px_rgba(0,0,0,0.05)] transition-transform duration-150 active:scale-95"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 12H5" />
                  <path d="m12 19-7-7 7-7" />
                </svg>
              </button>
              <Logo />
            </header>

            {/* 周历条：桌面端居中限制宽度 */}
            <div className="mx-auto mt-2 w-full max-w-[640px]">
              <WeekStrip selected={selected} entries={entries} onChange={setSelected} />
            </div>

            {/* 日记本大卡片：横线纸 + 活页圆点，桌面端加宽可多贴几首 */}
            <div className="relative mt-4 rounded-[32px] bg-white p-6 pb-24 shadow-[0_8px_30px_rgba(0,0,0,0.06)]">
              <div aria-hidden className="paper-lines pointer-events-none absolute inset-x-6 bottom-6 top-6 rounded-xl" />
              <div className="relative pl-6">
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

                {/* 贴纸墙：桌面端多列，方便一次贴更多歌 */}
                {dayEntries.length > 0 ? (
                  <div className="mt-6 grid grid-cols-2 justify-items-center gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
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
                    <p className="text-[12px] text-[#C4B6A4]">点右下角 + 上传一张播放截图，让它「啪嗒」贴上纸吧</p>
                  </div>
                )}
              </div>
            </div>
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
              <p className="-mt-2 text-[12px] text-[#B5A99B]">正在识别歌曲信息并抠成贴纸</p>
            </div>
          </div>
        )}

        <AddSongSheet open={showAdd} onClose={() => setShowAdd(false)} onAnalyze={handleAnalyze} />

        {toast && (
          <div
            role="status"
            className="diary-in fixed bottom-8 left-1/2 z-[95] -translate-x-1/2 rounded-full bg-[#6B5644] px-4 py-2 text-[12px] text-white shadow-[0_8px_24px_rgba(0,0,0,0.18)]"
          >
            {toast}
          </div>
        )}
      </div>

      {/* 右下角悬浮「+」：只保留添加新歌；毛玻璃样式与情绪边界地图一致 */}
      {!viewing && (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          aria-label="添加新歌"
          className="btn-lift glass fixed bottom-8 right-8 z-20 grid h-14 w-14 place-items-center rounded-full text-ink"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
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
