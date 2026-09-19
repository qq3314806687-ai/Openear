'use client';

/**
 * AI 音乐向导对话窗：承接地图下方空间。
 * 作为「Oreo」陪你聊口味 / 情绪 / 流派，或让它再帮忙挖几首野路子。
 * 对话上下文取自当前歌单；LLM 失败 / 未配置时回退到离线规则回复。
 */
import { useEffect, useRef, useState } from 'react';
import type { Song } from '@/lib/types';

interface Msg {
  id: number;
  who: 'me' | 'ai';
  text: string;
}

interface Props {
  playlist: Song[];
}

const GREETING = '嗨～我是 Oreo 🫧 想聊聊你的音乐口味、今天的心情，或者让我帮你再挖几首野路子？';

const SUGGESTIONS = ['根据我的口味再推几首', '我的情绪边界是什么样的', '帮我挑一首今天适合的歌'];

export default function AiChat({ playlist }: Props) {
  const [messages, setMessages] = useState<Msg[]>([{ id: 0, who: 'ai', text: GREETING }]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const idRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  // 离线兜底：避免接口失败时冷场，用歌单信息拼一句规则回复
  const fallback = (q: string): string => {
    if (!playlist.length) {
      return '你的歌单还是空的，先去右上方加几首喜欢的歌，我才能替你探路呀～';
    }
    const names = playlist.slice(0, 3).map((s) => s.title).join('》《');
    return `我先用离线的小脑瓜给你个办法：顺着《${names}》这条口味线索，把探索强度往右拨一档，就能撞见几首新野路子。稍后再问我，我会答得更细～`;
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
          context: { titles: playlist.map((s) => s.title), genres: playlist.map((s) => s.genre) },
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

  return (
    <section className="lift flex min-h-[360px] flex-1 flex-col rounded-3xl glass p-4">
      {/* 头 */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-glow">
          <span className="text-lg">🫧</span>
          <span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full bg-emerald-400 text-[8px] font-bold text-black ring-2 ring-black">
            AI
          </span>
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">Oreo · 音乐向导</h2>
          <p className="truncate text-[11px] text-white/45">聊聊口味、情绪，或让它再挖几首野路子</p>
        </div>
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
              <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/60 to-cyan-500/60 text-xs">
                🫧
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-white/85">
                {m.text}
              </div>
            </div>
          ),
        )}

        {busy && (
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/60 to-cyan-500/60 text-xs">
              🫧
            </span>
            <div className="max-w-[85%] flex-1 space-y-2 rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-3.5 py-2.5">
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
              className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] text-white/70 transition-colors hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-white"
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
          className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-400/50"
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
    </section>
  );
}