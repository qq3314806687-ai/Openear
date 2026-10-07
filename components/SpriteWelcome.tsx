'use client';

/**
 * 小精灵 Oreo 对话式建号向导（「新的出发」）。
 * 先问 5 个关于「长期口味」的问题（口味 / 节奏 / 情绪底色 / 常去流派 / 探索胆量），
 * 再请你上传一首最喜欢的歌，最后收集昵称。
 * 完成后：口味画像 + 最爱歌曲一起铺成初始歌单，情绪边界地图与推荐路线当场成形；
 * 之后每往歌单加一首歌，地图与推荐都会按算法实时更新。
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
import { MOOD_PRESETS, GENRE_TAG, addUploadedSong } from '@/lib/lib/playlist';
import { genUserId } from '@/lib/lib/store';

interface Props {
  onLogin: (user: User, opts?: { intensity?: Intensity }) => void;
  /** 预设 userId：注册流程已生成 userId 时复用，昵称仍由本向导收集 */
  presetUserId?: string;
}

interface Chat {
  id: number;
  who: 'sprite' | 'me';
  text: string;
}

const MOOD_KEYS = Object.keys(MOOD_PRESETS);
const GENRE_KEYS = Object.keys(GENRE_TAG);

const GREETING =
  '喵～我是 Oreo，一只背着书包、揣着望远镜的猫猫探险家。接下来五个问题，我想先摸清你耳朵里的地形——没有标准答案，也没有对错，你答成什么样，都是你。';
const UPLOAD_LINE =
  '你的耳朵地形，我大致摸清了。现在只剩最后一件、也是最重要的一件事：把你最喜欢的一首歌交给我吧。它会成为你情绪地图上的第一颗星——我就从它出发，替你画出这片旷野，再找几条你还没走过的路。';
const DONE_LINE = '地图的第一笔，已经画下了。最后，你想在这片旷野里，叫什么名字？';

export default function SpriteWelcome({ onLogin, presetUserId }: Props) {
  const idRef = useRef(0);
  const idxRef = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const userIdRef = useRef<string | null>(presetUserId ?? null);

  const [chats, setChats] = useState<Chat[]>([]);
  const [step, setStep] = useState(-1);
  const [mode, setMode] = useState<'boot' | 'answer' | 'custom' | 'upload' | 'done'>('boot');
  const [picks, setPicks] = useState<Record<string, SpriteOption>>({});
  const [customText, setCustomText] = useState('');
  const [nickname, setNickname] = useState('');

  // 最爱歌曲上传
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fav, setFav] = useState({ title: '', artist: '', mood: 'chill' as string, genre: 'Electronic' as string });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [thinking, setThinking] = useState(false);

  /** 惰性拿 userId：注册流程已给就用它的，否则现场生成（小精灵探索路径） */
  const ensureUserId = () => {
    if (!userIdRef.current) userIdRef.current = genUserId();
    return userIdRef.current;
  };

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
        setMode('upload');
        push('sprite', UPLOAD_LINE);
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
  }, [chats, mode, thinking]);

  const current = step >= 0 ? SPRITE_QUESTIONS[step] : null;

  const pick = (opt: SpriteOption) => {
    if (mode !== 'answer' || !current) return;
    if (opt.value === OTHER) {
      push('sprite', '✍️ 那你写给我。');
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

  /** 手输答案 → 让 Oreo 现场接住这句话（接口 8 秒超时，失败退回规则回复） */
  const askOreo = async (question: string, answer: string): Promise<string> => {
    const fallback = `「${answer}」——这个答案，选项里装不下。我先把它稳稳记进你的地图，等会儿画的时候，一定用得上。`;
    try {
      const resp = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'user',
              content:
                `我在回答建号问题「${question}」。我没有从选项里挑，而是自己写下了：「${answer}」。` +
                '请你以 Oreo 的身份，用 2-3 句话温暖而具体地回应我这句话，接住我的情绪，' +
                '不要评价对错、不要反问，最后自然地说会把它记进我的情绪地图。',
            },
          ],
          context: { titles: [], genres: [] },
        }),
      });
      const data = await resp.json();
      return data?.ok && typeof data.reply === 'string' && data.reply.trim() ? data.reply.trim() : fallback;
    } catch {
      return fallback;
    }
  };

  const confirmCustom = async () => {
    if (mode !== 'custom' || !current || thinking) return;
    const t = customText.trim();
    if (!t) return;
    const question = current.line;
    push('me', t);
    setPicks((p) => ({
      ...p,
      [current.id]: { value: OTHER, label: t, reply: '', valence: 0, arousal: 'mid' },
    }));
    setCustomText('');
    setThinking(true);
    const reply = await askOreo(question, t);
    setThinking(false);
    push('sprite', reply);
    advance();
  };

  const toDone = () => {
    setMode('done');
    push('sprite', DONE_LINE);
  };

  const pickFile = (f: File | null) => {
    setErr('');
    setFile(f);
    if (f) {
      const name = f.name.replace(/\.[^.]+$/, '');
      setFav((s) => ({ ...s, title: s.title || name }));
    }
  };

  /** 上传最爱歌曲：直接入歌单，作为情绪地图的第一颗种子 */
  const confirmUpload = async () => {
    setErr('');
    if (!file) {
      setErr('请选择一首你最喜欢的音频文件');
      return;
    }
    if (!fav.title.trim()) {
      setErr('先填一下歌名');
      return;
    }
    setBusy(true);
    try {
      await addUploadedSong(ensureUserId(), {
        title: fav.title,
        artist: fav.artist,
        mood: fav.mood,
        genre: fav.genre,
        file,
      });
      push('me', `🎵 ${fav.title}`);
      push('sprite', '这颗星挂上去了。');
      setBusy(false);
      setTimeout(toDone, 380);
    } catch {
      setBusy(false);
      setErr('保存失败：文件过大或本地存储不可用');
    }
  };

  const finish = () => {
    const base = aggregateProfile(picks);
    const userId = ensureUserId();
    const { user, intensity } = spriteOnboard({ ...base, nickname }, userId);
    onLogin(user, { intensity });
  };

  const totalSteps = SPRITE_QUESTIONS.length + 2; // 5 题 + 上传 + 起名
  const doneSteps = step + (mode === 'upload' || mode === 'done' ? 1 : 0) + (mode === 'done' ? 1 : 0);

  return (
    <section className="flex min-h-[calc(100vh-4.5rem)] flex-col p-1 sm:p-3">
      {/* 顶栏 */}
      <div className="flex items-center gap-3 border-b border-ink/10 pb-3">
        <span className="relative h-11 w-11 shrink-0">
          <img src="/cat-sprite-head.png" alt="小精灵 Oreo" className="h-full w-full object-contain" />
          <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-emerald-400 text-[9px] font-bold text-black ring-2 ring-white">
            AI
          </span>
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink">新的出发 · Oreo</h2>
          <p className="truncate text-[11px] text-ink/45">正在听你平时的样子…</p>
        </div>
        {/* 进度点：5 题 + 上传 + 起名 */}
        <div className="ml-auto flex items-center gap-1.5">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i < doneSteps ? 'w-3 bg-violet-400' : i === doneSteps ? 'w-4 bg-cyan-300' : 'w-1.5 bg-ink/15'
              }`}
            />
          ))}
        </div>
      </div>

      {/* 对话区 */}
      <div ref={scrollRef} className="mt-3 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {chats.map((c) =>
          c.who === 'sprite' ? (
            <div key={c.id} className="flex items-start gap-2.5 animate-card-in">
              <span className="mt-0.5 h-8 w-8 shrink-0">
                <img src="/cat-sprite-head.png" alt="" className="h-full w-full object-contain" />
              </span>
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm border border-ink/10 bg-ink/5 px-3.5 py-2.5 text-[13px] leading-relaxed text-ink/85">
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

        {/* Oreo 正在接住你的答案 */}
        {thinking && (
          <div className="flex items-start gap-2.5 animate-card-in">
            <span className="mt-0.5 h-8 w-8 shrink-0">
              <img src="/cat-sprite-head.png" alt="" className="h-full w-full object-contain" />
            </span>
            <div className="rounded-2xl rounded-tl-sm border border-ink/10 bg-ink/5 px-3.5 py-2.5 text-[13px] text-ink/45">
              Oreo 正在想…
            </div>
          </div>
        )}

        {/* 选项区 */}
        {mode === 'answer' && current && (
          <div className="animate-card-in space-y-2 pl-10">
            {current.options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => pick(o)}
                className="lift block w-full max-w-[85%] rounded-2xl border border-ink/10 bg-ink/[0.04] px-3.5 py-2.5 text-left text-[13px] text-ink/80 hover:border-violet-400/50 hover:bg-violet-500/10 hover:text-ink focus-visible:outline-2 focus-visible:outline-violet-400"
              >
                {o.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => pick({ value: OTHER, label: '其他', reply: '', valence: 0, arousal: 'mid' })}
              className="lift block w-full max-w-[85%] rounded-2xl border border-dashed border-ink/15 px-3.5 py-2 text-[13px] text-ink/50 hover:border-cyan-400/50 hover:text-cyan-300"
            >
              ✍️ 其他
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
              disabled={thinking}
              className="min-w-0 max-w-[85%] flex-1 rounded-2xl border border-ink/10 bg-ink/5 px-3.5 py-2.5 text-[13px] text-ink placeholder-ink/30 outline-none focus:border-violet-400/60 disabled:opacity-60"
            />
            <button
              type="button"
              onClick={confirmCustom}
              disabled={thinking}
              className="btn-lift shrink-0 rounded-full bg-cyan-500/80 px-3 py-1.5 text-xs font-semibold text-white hover:bg-cyan-400 disabled:opacity-60"
            >
              {thinking ? '…' : '发送'}
            </button>
          </div>
        )}

        {/* 上传最爱的一首歌 */}
        {mode === 'upload' && (
          <div className="animate-card-in space-y-2 pl-10">
            <div className="max-w-[85%] space-y-2 rounded-2xl border border-panelEdge bg-gradient-to-br from-violet-500/10 to-cyan-500/10 p-3">
              <p className="text-[11px] font-semibold text-ink/70">💗 我最喜欢的一首歌</p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="btn-lift shrink-0 rounded-lg border border-ink/10 bg-white/60 px-2.5 py-1.5 text-xs text-ink/70 transition-colors hover:text-ink"
                >
                  选择音频文件
                </button>
                <span className="min-w-0 flex-1 truncate text-[11px] text-ink/50">
                  {file ? file.name : 'mp3 / m4a / wav 等'}
                </span>
                <input
                  ref={fileRef}
                  type="file"
                  accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.flac,.wav,.webm"
                  className="hidden"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <input
                  value={fav.title}
                  onChange={(e) => setFav({ ...fav, title: e.target.value })}
                  placeholder="歌名 *"
                  className="rounded-xl border border-ink/10 bg-white/60 px-2.5 py-1.5 text-xs text-ink placeholder-ink/30 outline-none focus:border-violet-400/50"
                />
                <input
                  value={fav.artist}
                  onChange={(e) => setFav({ ...fav, artist: e.target.value })}
                  placeholder="歌手（可选）"
                  className="rounded-xl border border-ink/10 bg-white/60 px-2.5 py-1.5 text-xs text-ink placeholder-ink/30 outline-none focus:border-violet-400/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-[11px] text-ink/60">
                  情绪
                  <select
                    value={fav.mood}
                    onChange={(e) => setFav({ ...fav, mood: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white/60 px-2 py-1 text-xs text-ink outline-none"
                  >
                    {MOOD_KEYS.map((k) => (
                      <option key={k} value={k} className="bg-white">
                        {MOOD_PRESETS[k as keyof typeof MOOD_PRESETS].label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-[11px] text-ink/60">
                  流派
                  <select
                    value={fav.genre}
                    onChange={(e) => setFav({ ...fav, genre: e.target.value })}
                    className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white/60 px-2 py-1 text-xs text-ink outline-none"
                  >
                    {GENRE_KEYS.map((g) => (
                      <option key={g} value={g} className="bg-white">
                        {g}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {err && <p className="text-[11px] text-rose-500">{err}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={confirmUpload}
                  disabled={busy}
                  className="btn-lift rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2 text-[13px] font-bold text-white shadow-glow disabled:opacity-60"
                >
                  {busy ? '正在挂上去…' : '上传这首，继续 →'}
                </button>
                <button
                  type="button"
                  onClick={toDone}
                  disabled={busy}
                  className="text-[11px] text-ink/45 underline-offset-2 transition-colors hover:text-ink hover:underline disabled:opacity-60"
                >
                  暂时跳过
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 起名字 */}
        {mode === 'done' && (
          <div className="animate-card-in space-y-3 pl-10">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input
                value={nickname}
                maxLength={12}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="给自己起个名字（可留空）"
                className="rounded-2xl border border-ink/10 bg-ink/5 px-3.5 py-2.5 text-[13px] text-ink placeholder-ink/30 outline-none focus:border-violet-400/60"
              />
              <button
                type="button"
                onClick={finish}
                className="btn-lift rounded-2xl bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-2.5 text-sm font-bold text-white shadow-glow"
              >
                开始探索 →
              </button>
            </div>
            <p className="text-[11px] text-ink/40">
              名字只用来显示。之后每往歌单加一首歌，地图和推荐路线都会跟着变。
            </p>
          </div>
        )}
      </div>
    </section>
  );
}