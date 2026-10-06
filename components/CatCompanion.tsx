'use client';

/**
 * 小梨花 Oreo 浮窗伙伴：常驻视口右下角，可拖动；
 * 光标悬停时伸爪对屏幕外的你打招呼并微笑；
 * 点击（或键盘回车）展开对话，替代地图下方原来的静态聊天框。
 */
import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { Song } from '@/lib/types';

interface Msg {
  id: number;
  who: 'me' | 'ai';
  text: string;
}

interface OreoContext {
  intensity?: number;
  avg?: { valence: number; arousal: number } | null;
  today?: { moodLabel: string; song: Song } | null;
}

interface Props {
  playlist: Song[];
  context?: OreoContext;
}

const GREETING = '喵～我是 Oreo，你的音乐向导。想聊聊口味、心情，或者让我再挖几首野路子？';

const SUGGESTIONS = ['根据我的口味再推几首', '我的情绪边界是什么样的', '帮我挑一首今天适合的歌'];

export default function CatCompanion({ playlist, context }: Props) {
  // 浮窗：锚点在视口右下角，x/y 为 translate3d 位移
  const wrapRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number; moved: boolean } | null>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(false);

  // 对话状态（与旧 AiChat 同源逻辑）
  const [messages, setMessages] = useState<Msg[]>([{ id: 0, who: 'ai', text: GREETING }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // 离线兜底：接口失败时用歌单 + 背景信息拼一句规则回复
  const fallback = (q: string): string => {
    if (!playlist.length) {
      return '你的歌单还是空的，去地图旁的搜索卡加几首喜欢的歌，我才能替你探路呀～';
    }
    const names = playlist.slice(0, 3).map((s) => s.title).join('》《');
    const todayLine = context?.today ? `今天这首《${context.today.song.title}》当起点就很合适；` : '';
    const intensityLine = (() => {
      const v = context?.intensity;
      if (typeof v !== 'number') return '把探索强度往右拨一档，就能撞见几首新野路子。';
      if (v < 34) return '把探索强度往左收一点，会撞见更多贴着旧爱的曲目。';
      return '把探索强度再往右拨一档，就能撞见更多新野路子。';
    })();
    return `先用离线小脑瓜给你个办法：顺着《${names}》这条口味线索，${todayLine}${intensityLine}稍后再问我，我会答得更细～`;
  };

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setInput('');
    setMessages((m) => [...m, { id: ++idRef.current, who: 'me', text: q }]);
    setBusy(true);

    const history: { role: 'user' | 'assistant'; content: string }[] = [
      ...messages.map((m) => ({ role: (m.who === 'me' ? 'user' : 'assistant') as 'user' | 'assistant', content: m.text })),
      { role: 'user', content: q },
    ];

    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: history,
          context: {
            titles: playlist.map((s) => s.title),
            genres: playlist.map((s) => s.genre),
            intensity: context?.intensity,
            avg: context?.avg ?? null,
            today: context?.today
              ? { moodLabel: context.today.moodLabel, songTitle: context.today.song.title, songArtist: context.today.song.artist }
              : null,
          },
        }),
      });
      const data = await resp.json();
      const reply = data?.ok && typeof data.reply === 'string' ? data.reply : fallback(q);
      setMessages((m) => [...m, { id: ++idRef.current, who: 'ai', text: reply }]);
    } catch {
      setMessages((m) => [...m, { id: ++idRef.current, who: 'ai', text: fallback(q) }]);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- 拖动 ---------- */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-panel]')) return;
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y, moved: false };
    e.currentTarget.setPointerCapture(e.pointerId);
    setHovered(false);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.sx;
    const dy = e.clientY - d.sy;
    if (Math.abs(dx) + Math.abs(dy) > 5) d.moved = true;
    if (!d.moved) return;
    // 锚点 right:16 bottom:120，钳制在视口内（留 8px 边距）
    const rect = wrapRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 96;
    const h = rect?.height ?? 96;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.min(8, Math.max(-(vw - 24 - w), d.ox + dx));
    const y = Math.min(112, Math.max(120 + h - vh + 8, d.oy + dy));
    setPos({ x, y });
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    dragRef.current = null;
    if (d && !d.moved) setOpen((o) => !o);
  };

  const toggle = () => setOpen((o) => !o);

  const waving = hovered && !open && !dragRef.current?.moved;
  const face = open ? '/cat-sprite.png' : waving ? '/cat-sprite-wave.png' : '/cat-sprite.png';

  return (
    <div
      ref={wrapRef}
      className="fixed z-50"
      style={{ right: 16, bottom: 120, transform: `translate3d(${pos.x}px, ${pos.y}px, 0)` }}
    >
      {/* 对话面板 */}
      {open && (
        <div
          data-panel
          className="animate-card-in absolute bottom-[calc(100%_+_14px)] right-0 flex max-h-[min(480px,calc(100vh_-_240px))] w-[min(380px,calc(100vw_-_32px))] flex-col rounded-3xl glass-raised p-4 touch-auto"
        >
          {/* 头 */}
          <div className="flex items-center gap-3 border-b border-ink/10 pb-3">
            <span className="relative h-10 w-10 shrink-0">
              <img src="/cat-sprite-head.png" alt="Oreo" className="h-full w-full object-contain" />
              <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-[8px] font-bold text-black ring-2 ring-white">
                AI
              </span>
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-ink">Oreo · 音乐向导</h2>
              <p className="truncate text-[11px] text-ink/45">聊聊口味、情绪，或让它再挖几首野路子</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="btn-lift ml-auto grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-ink/10 bg-ink/5 text-ink/60 hover:text-ink"
              aria-label="收起对话"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 消息区 */}
          <div ref={scrollRef} className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1">
            {messages.map((m) =>
              m.who === 'me' ? (
                <div key={m.id} className="flex justify-end animate-card-in">
                  <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-violet-500/70 to-cyan-500/70 px-3.5 py-2 text-[13px] leading-relaxed text-white">
                    {m.text}
                  </div>
                </div>
              ) : (
                <div key={m.id} className="flex items-start gap-2.5 animate-card-in">
                  <span className="mt-0.5 h-7 w-7 shrink-0">
                    <img src="/cat-sprite-head.png" alt="" className="h-full w-full object-contain" />
                  </span>
                  <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ink/10 bg-ink/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink/85">
                    {m.text}
                  </div>
                </div>
              ),
            )}

            {busy && (
              <div className="flex items-start gap-2.5">
                <span className="mt-0.5 h-7 w-7 shrink-0">
                  <img src="/cat-sprite-head.png" alt="" className="h-full w-full object-contain" />
                </span>
                <div className="max-w-[85%] flex-1 space-y-2 rounded-2xl rounded-tl-sm border border-ink/10 bg-ink/5 px-3.5 py-2.5">
                  <div className="h-2.5 w-4/5 rounded-full skeleton" />
                  <div className="h-2.5 w-3/5 rounded-full skeleton" />
                </div>
              </div>
            )}
          </div>

          {/* 建议 chip（仅开场时显示） */}
          {messages.length <= 1 && !busy && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => send(s)}
                  className="rounded-full border border-ink/10 bg-ink/[0.04] px-3 py-1 text-[11px] text-ink/70 transition-colors hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* 输入 */}
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="问点什么，比如「今天适合听什么」…"
              className="min-w-0 flex-1 rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 text-xs text-ink placeholder-ink/30 outline-none focus:border-violet-400/50"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="btn-lift grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-500 text-white disabled:opacity-40"
              aria-label="发送"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 2 11 13" />
                <path d="M22 2 15 22l-4-9-9-4 20-7Z" />
              </svg>
            </button>
          </form>
        </div>
      )}

      {/* 悬停招呼气泡 */}
      {waving && (
        <div className="cat-hello absolute -top-9 right-1 rounded-full border border-ink/10 bg-white/80 px-3 py-1 text-[11px] text-ink/75 shadow-glow backdrop-blur">
          喵～嗨！
        </div>
      )}

      {/* 猫猫本体（可拖动 / 悬停伸爪 / 点击开合） */}
      <div
        role="button"
        tabIndex={0}
        aria-label={open ? '收起与 Oreo 的对话' : '展开与 Oreo 的对话'}
        aria-expanded={open}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => (dragRef.current = null)}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggle();
          }
        }}
        className={`relative h-20 w-20 cursor-grab touch-none active:cursor-grabbing sm:h-[88px] sm:w-[88px] ${
          waving ? 'cat-wave' : open ? '' : 'cat-idle'
        }`}
      >
        <img src={face} alt="Oreo" className="h-full w-full object-contain" draggable={false} />
      </div>
    </div>
  );
}
