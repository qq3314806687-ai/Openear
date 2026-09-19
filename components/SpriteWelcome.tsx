'use client';

/**
 * 小精灵 Oreo 对话式建号向导。
 * 一步一步抛出 5 个探索音乐世界的问题，每题 4 个固定选项 + 一个「其他」自填，
 * 让用户的回答真实地长成 TA 的口味画像，最后一键生成音乐世界。
 */
import { useEffect, useRef, useState } from 'react';
import type { Intensity, Song, User } from '@/lib/types';
import { spriteOnboard } from '@/lib/lib/onboard';
import {
  OTHER,
  SPRITE_QUESTIONS,
  aggregateProfile,
  type SpriteOption,
} from '@/lib/lib/sprite';
import { TODAY_MOODS, pickTodaySong, type TodayMood } from '@/lib/lib/today';

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
const MOOD_LINE = '口味我记下了。不过在出发前——告诉我你今天是什么心情？我为你挑一首「今日主打」，当作今天探索的起点。';

export default function SpriteWelcome({ onLogin }: Props) {
  const idRef = useRef(0);
  const idxRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [step, setStep] = useState(-1);
  const [mode, setMode] = useState<'boot' | 'answer' | 'custom' | 'mood' | 'today' | 'done'>('boot');
  const [picks, setPicks] = useState<Record<string, SpriteOption>>({});
  const [customText, setCustomText] = useState('');
  const [nickname, setNickname] = useState('');
  const [todayMood, setTodayMood] = useState<{ mood: TodayMood; song: Song } | null>(null);

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
        setMode('mood');
        push('sprite', MOOD_LINE);
      }, 420);
    } else {
      setTimeout(() => ask(n), 420);
    }
  };

  const pickToday = (m: TodayMood) => {
    if (mode !== 'mood') return;
    push('me', `${m.emoji} ${m.label}`);
    const song = pickTodaySong(m);
    if (!song) return;
    push('sprite', `${m.reply} 就以这首，开启今天吧。`);
    setTodayMood({ mood: m, song });
    setMode('today');
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
    if (todayMood) {
      try {
        localStorage.setItem(
          'openear.today',
          JSON.stringify({ moodId: todayMood.mood.id, songId: todayMood.song.id }),
        );
      } catch {
        /* 忽略写入失败 */
      }
    }
    onLogin(user, { intensity });
  };

  return (
    <section className="lift flex min-h-[560px] flex-col rounded-3xl glass p-4">
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
          <span
            title="今日心情"
            className={`h-1.5 rounded-full transition-all ${
              mode === 'mood' || mode === 'today' || mode === 'done' ? 'w-3 bg-rose-300' : 'w-1.5 bg-white/15'
            }`}
          />
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
                className="lift block w-full max-w-[85%] rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-left text-[13px] text-white/80 hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-white focus-visible:outline-2 focus-visible:outline-violet-400"
              >
                {o.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pick({ value: OTHER, label: '其他', reply: '', valence: 0, arousal: 'mid' })}
              className="lift block w-full max-w-[85%] rounded-2xl border border-dashed border-white/15 px-3.5 py-2 text-[13px] text-white/50 hover:border-cyan-400/50 hover:text-cyan-300"
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
              className="btn-lift shrink-0 rounded-full bg-cyan-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400"
            >
              发送
            </button>
          </div>
        )}

        {/* 今日心情 */}
        {mode === 'mood' && (
          <div className="animate-card-in space-y-2 pl-10">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {TODAY_MOODS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => pickToday(m)}
                  className="lift rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-left hover:border-violet-400/50 hover:bg-violet-500/10 focus-visible:outline-2 focus-visible:outline-violet-400"
                >
                  <span className="text-base">{m.emoji}</span>
                  <span className="mt-1 block text-[13px] font-medium text-white/85">{m.label}</span>
                  <span className="block text-[11px] text-white/45">{m.desc}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 今日主打（今日探索起点） */}
        {mode === 'today' && todayMood && (
          <div className="animate-card-in space-y-3 pl-10">
            <div className="flex items-center gap-3 rounded-2xl border border-panelEdge bg-gradient-to-br from-violet-500/15 to-cyan-500/15 p-3">
              <span
                className="h-11 w-11 shrink-0 rounded-xl"
                style={{ background: todayMood.song.coverColor }}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-widest text-white/45">
                  今日主打 · {todayMood.mood.emoji} {todayMood.mood.label}
                </p>
                <p className="truncate text-sm font-semibold text-white">{todayMood.song.title}</p>
                <p className="truncate text-xs text-white/55">
                  {todayMood.song.artist} · {todayMood.song.genre} · {todayMood.song.bpm} BPM
                </p>
              </div>
              <span className="ml-auto shrink-0 text-[11px] text-white/40">今日探索起点</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setMode('done');
                push('sprite', DONE_LINE);
              }}
              className="btn-lift rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-glow"
            >
              以它为起点，点亮我的音乐世界 →
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
                className="btn-lift rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-glow"
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