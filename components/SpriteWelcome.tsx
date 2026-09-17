'use client';

/**
 * 小精灵 Oreo 对话式建号向导。
 * 一步一步抛出 5 个探索音乐世界的问题，每题 4 个固定选项 + 一个「其他」自填，
 * 让用户的回答真实地长成 TA 的口味画像，最后一键生成音乐世界。
 */
import { useEffect, useRef, useState } from 'react';
import type { Intensity, User } from '@/lib/types';
import { spriteOnboard } from '@/lib/lib/onboard';
import {
  OTHER,
  SPRITE_QUESTIONS,
  aggregateProfile,
  type SpriteOption,
} from '@/lib/lib/sprite';

interface Props {
  onLogin: (user: User, opts?: { intensity?: Intensity }) => void;
}

interface Chat {
  id: number;
  who: 'sprite' | 'me';
  text: string;
}

const GREETING = '嗨～我是小精灵 Oreo 👋 接下来我会用 5 个问题，一步步画出你的音乐宇宙。准备好了吗？';
const DONE_LINE = '你的音乐宇宙，我好像已经画出来了 🗺️ 最后一件小事：你想怎么称呼自己？';

export default function SpriteWelcome({ onLogin }: Props) {
  const idRef = useRef(0);
  const idxRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [step, setStep] = useState(-1);
  const [mode, setMode] = useState<'boot' | 'answer' | 'custom' | 'done'>('boot');
  const [picks, setPicks] = useState<Record<string, SpriteOption>>({});
  const [customText, setCustomText] = useState('');
  const [nickname, setNickname] = useState('');

  const push = (who: Chat['who'], text: string) =>
    setChats((c) => [...c, { id: ++idRef.current, who, text }]);

  const ask = (i: number) => {
    idxRef.current = i;
    setStep(i);
    setMode('answer');
    push('sprite', SPRITE_QUESTIONS[i].line);
  };

  const advance = () => {
    const n = idxRef.current + 1;
    if (n >= SPRITE_QUESTIONS.length) {
      setTimeout(() => {
        setMode('done');
        push('sprite', DONE_LINE);
      }, 420);
    } else {
      setTimeout(() => ask(n), 420);
    }
  };

  // 开场白
  useEffect(() => {
    const t1 = setTimeout(() => push('sprite', GREETING), 320);
    const t2 = setTimeout(() => ask(0), 1350);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 自动滚到底
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chats, mode]);

  const current = step >= 0 ? SPRITE_QUESTIONS[step] : null;

  const pick = (opt: SpriteOption) => {
    if (mode !== 'answer' || !current) return;
    if (opt.value === OTHER) {
      push('sprite', '✍️ 那当然要是你自己的答案，写给我吧——');
      setMode('custom');
      return;
    }
    push('me', opt.label);
    setPicks((p) => ({ ...p, [current.id]: opt }));
    setTimeout(() => {
      push('sprite', opt.reply);
      advance();
    }, 400);
  };

  const confirmCustom = () => {
    if (mode !== 'custom' || !current) return;
    const t = customText.trim();
    if (!t) return;
    const opt: SpriteOption = {
      value: OTHER,
      label: t,
      reply: '独一份的味道，收到 ✅',
      valence: 0,
      arousal: 'mid',
    };
    push('me', t);
    setPicks((p) => ({ ...p, [current.id]: opt }));
    setCustomText('');
    setTimeout(() => {
      push('sprite', opt.reply);
      advance();
    }, 400);
  };

  const finish = () => {
    const base = aggregateProfile(picks);
    const { user, intensity } = spriteOnboard({ ...base, nickname });
    onLogin(user, { intensity });
  };

  return (
    <section className="flex min-h-[560px] flex-col rounded-3xl border border-white/10 bg-panel p-4 backdrop-blur">
      {/* 顶栏 */}
      <div className="flex items-center gap-3 border-b border-white/10 pb-3">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-glow">
          <span className="text-xl">🫧</span>
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-[9px] font-bold text-black ring-2 ring-black">
            AI
          </span>
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-white">小精灵 Oreo</h2>
          <p className="truncate text-[11px] text-white/45">正在探索你的音乐宇宙…</p>
        </div>
        {/* 进度点 */}
        <div className="ml-auto flex items-center gap-1.5">
          {SPRITE_QUESTIONS.map((q, i) => (
            <span
              key={q.id}
              className={`h-1.5 rounded-full transition-all ${i < step ? 'w-3 bg-violet-400' : i === step ? 'w-4 bg-cyan-300' : 'w-1.5 bg-white/15'}`}
            />
          ))}
        </div>
      </div>

      {/* 对话区 */}
      <div ref={scrollRef} className="mt-3 flex-1 space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 360 }}>
        {chats.map((c) =>
          c.who === 'sprite' ? (
            <div key={c.id} className="flex items-start gap-2.5 animate-card-in">
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-violet-500/60 to-cyan-500/60 text-sm">
                🫧
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-white/85">
                {c.text}
              </div>
            </div>
          ) : (
            <div key={c.id} className="flex justify-end animate-card-in">
              <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-violet-500/70 to-cyan-500/70 px-3.5 py-2 text-[13px] leading-relaxed text-white">
                {c.text}
              </div>
            </div>
          ),
        )}

        {/* 选项区 */}
        {mode === 'answer' && current && (
          <div className="animate-card-in space-y-2 pl-10">
            {current.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o)}
                className="block w-full max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-left text-[13px] text-white/80 transition-all hover:-translate-y-0.5 hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
              >
                {o.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pick({ value: OTHER, label: '其他', reply: '', valence: 0, arousal: 'mid' })}
              className="block w-full max-w-[85%] rounded-2xl border border-dashed border-white/15 px-3.5 py-2 text-[13px] text-white/50 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
            >
              ✍️ 其他（写下属于你的答案）
            </button>
          </div>
        )}

        {/* 其他自填 */}
        {mode === 'custom' && current && (
          <div className="animate-card-in flex items-center gap-2 pl-10">
            <input
              value={customText}
              maxLength={40}
              onChange={(e) => setCustomText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && confirmCustom()}
              placeholder={current.customPrompt}
              autoFocus
              className="min-w-0 max-w-[85%] flex-1 rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder-white/30 outline-none focus:border-violet-400/60"
            />
            <button
              type="button"
              onClick={confirmCustom}
              className="shrink-0 rounded-full bg-cyan-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400"
            >
              发送
            </button>
          </div>
        )}

        {/* 完成 */}
        {mode === 'done' && (
          <div className="animate-card-in space-y-3 pl-10">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={nickname}
                maxLength={12}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给自己起个名字（可留空）"
                className="rounded-2xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[13px] text-white placeholder-white/30 outline-none focus:border-violet-400/60"
              />
              <button
                type="button"
                onClick={finish}
                className="rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-glow transition-transform hover:-translate-y-0.5"
              >
                ✨ 点亮我的音乐世界 →
              </button>
            </div>
            <p className="text-[11px] text-white/40">
              根据你的回答，引擎会生成属于你的听歌画像与情绪边界图。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}