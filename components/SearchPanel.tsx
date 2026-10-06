'use client';

/**
 * 音乐搜索卡：取代原「我的歌单」卡片，只做两件事——
 * ① 搜索在库歌曲（加入歌单）；② 上传自己的音频（粘贴直链 / 选择文件 合二为一）。
 * 「我的歌单」的完整列表改由目录里的「我的歌单」跳转全览查看。
 */
import { useMemo, useRef, useState } from 'react';
import type { Song } from '@/lib/types';
import { MOOD_PRESETS, GENRE_TAG, getRuntimeSongs } from '@/lib/lib/playlist';

const MOOD_KEYS = Object.keys(MOOD_PRESETS);
const GENRE_KEYS = Object.keys(GENRE_TAG);

interface Props {
  playlist: Song[];
  onAddBuiltIn: (song: Song) => void;
  onAddCustom: (input: { title: string; artist?: string; audioUrl: string; mood: string; genre?: string }) => void;
  onAddUploaded?: (input: { title: string; artist?: string; mood: string; genre?: string; file: Blob }) => Promise<void>;
  onOpenPlaylist?: () => void;
}

export default function SearchPanel({
  playlist,
  onAddBuiltIn,
  onAddCustom,
  onAddUploaded,
  onOpenPlaylist,
}: Props) {
  const [q, setQ] = useState('');
  const [gen, setGen] = useState('');
  // 统一音源：srcUrl（粘贴直链）与 file（选择文件）二选一
  const [srcUrl, setSrcUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [fm, setFm] = useState({ title: '', artist: '', mood: 'chill' as string, genre: 'Electronic' as string });
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const inPlaylist = useMemo(() => new Set(playlist.map((s) => s.id)), [playlist]);
  const library = useMemo(() => {
    const pool = getRuntimeSongs().filter((s) => s.source !== 'custom');
    const kw = q.trim().toLowerCase();
    return pool
      .filter((s) => !inPlaylist.has(s.id))
      .filter((s) => !gen || s.genre === gen)
      .filter((s) => !kw || s.title.toLowerCase().includes(kw) || s.artist.toLowerCase().includes(kw) || s.genre.toLowerCase().includes(kw))
      .slice(0, 8);
  }, [q, inPlaylist, gen]);

  // 只展示当前曲库真实存在的流派 tag（已全部加入的流派自动隐藏）
  const liveGenres = useMemo(() => {
    const available = getRuntimeSongs().filter((s) => s.source !== 'custom' && !inPlaylist.has(s.id));
    const set = new Set(available.map((s) => s.genre));
    return GENRE_KEYS.filter((g) => set.has(g));
  }, [inPlaylist]);

  const pickFile = (f: File | null) => {
    setErr('');
    setOk('');
    setFile(f);
    if (f) {
      setSrcUrl('');
      const name = f.name.replace(/\.[^.]+$/, '');
      setFm((s) => ({ ...s, title: s.title || name }));
      if (!/^audio\//i.test(f.type) && !/\.(mp3|m4a|aac|ogg|oga|opus|flac|wav|webm)$/i.test(f.name)) {
        setErr('请选择音频文件（mp3 / m4a / aac / ogg / wav 等）');
      }
    }
  };

  const submit = async () => {
    setErr('');
    setOk('');
    if (!fm.title.trim()) return setErr('先填歌曲名');
    if (file) {
      if (!onAddUploaded) return setErr('当前暂不支持上传');
      try {
        await onAddUploaded({ title: fm.title, artist: fm.artist, mood: fm.mood, genre: fm.genre, file });
        setFm({ title: '', artist: '', mood: 'chill', genre: 'Electronic' });
        setFile(null);
        setOk('已加入歌单');
      } catch {
        setErr('保存失败：文件过大或本地存储不可用');
      }
      return;
    }
    const url = srcUrl.trim();
    if (!/^https?:\/\/.+/i.test(url)) return setErr('请粘贴 http(s) 开头的音频直链，或选择本地文件');
    onAddCustom({ title: fm.title, artist: fm.artist, audioUrl: url, mood: fm.mood, genre: fm.genre });
    setFm({ title: '', artist: '', mood: 'chill', genre: 'Electronic' });
    setSrcUrl('');
    setOk('已加入歌单');
  };

  return (
    <section className="lift rounded-3xl glass p-4">
      {/* 头 */}
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-ink">搜索音乐</h2>
        {onOpenPlaylist && (
          <button
            type="button"
            onClick={onOpenPlaylist}
            className="flex items-center gap-1 text-[11px] text-ink/45 transition-colors hover:text-ink"
            title="前往查看我的歌单"
          >
            我的歌单（{playlist.length} 首）
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>
        )}
      </div>

      {/* ① 搜索在库歌曲 */}
      <p className="mb-2 text-[10px] uppercase tracking-widest text-ink/40">搜索在库歌曲</p>
      <div className="flex items-center gap-2 rounded-xl border border-ink/10 bg-ink/5 px-3 py-2.5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink/35">
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="歌名 / 歌手 / 流派"
          className="min-w-0 flex-1 bg-transparent text-xs text-ink placeholder-ink/30 outline-none"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ('')}
            className="shrink-0 text-ink/35 transition-colors hover:text-ink"
            aria-label="清空搜索"
          >
            ×
          </button>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setGen('')}
          className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
            !gen ? 'bg-violet-500/30 text-ink ring-1 ring-violet-400/40' : 'border border-ink/10 text-ink/45 hover:bg-ink/10 hover:text-ink'
          }`}
        >
          全部
        </button>
        {liveGenres.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => setGen((cur) => (cur === g ? '' : g))}
            className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
              gen === g ? 'bg-violet-500/30 text-ink ring-1 ring-violet-400/40' : 'border border-ink/10 text-ink/45 hover:bg-ink/10 hover:text-ink'
            }`}
          >
            {g}
          </button>
        ))}
      </div>
      <ul className="mt-2 max-h-[200px] space-y-1 overflow-y-auto pr-1">
        {library.length === 0 && (
          <li className="py-6 text-center text-xs text-ink/35">{q || gen ? '没有匹配的曲目' : '曲库已全部加入'}</li>
        )}
        {library.map((s) => (
          <li
            key={s.id}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-ink/5"
          >
            <span className="h-6 w-6 shrink-0 rounded-md" style={{ backgroundColor: s.coverColor }} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs text-ink">{s.title}</span>
              <span className="block truncate text-[10px] text-ink/45">{s.artist} · {s.genre}</span>
            </span>
            <button
              type="button"
              onClick={() => onAddBuiltIn(s)}
              aria-label="加入歌单"
              className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-ink/10 text-sm text-ink/50 transition-colors hover:border-violet-400/50 hover:text-ink"
            >
              +
            </button>
          </li>
        ))}
      </ul>

      {/* 分隔 */}
      <div className="my-4 border-t border-ink/10" />

      {/* ② 上传自己的音频（粘贴直链 / 上传 MP3 合二为一） */}
      <p className="mb-2 text-[10px] uppercase tracking-widest text-ink/40">上传自己的音频</p>
      <form
        className="space-y-2"
        onSubmit={(e) => { e.preventDefault(); submit(); }}
      >
        <div className="rounded-xl border border-dashed border-ink/15 bg-ink/[0.02] p-3">
          <div className="flex items-center gap-2">
            <input
              value={srcUrl}
              onChange={(e) => { setSrcUrl(e.target.value); if (e.target.value.trim()) setFile(null); }}
              placeholder="粘贴音频链接（mp3 / m4a 直链）…"
              inputMode="url"
              className="min-w-0 flex-1 rounded-lg border border-ink/10 bg-white/50 px-3 py-2 text-xs text-ink placeholder-ink/30 outline-none focus:border-violet-400/50"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="btn-lift shrink-0 rounded-lg border border-ink/10 bg-ink/5 px-3 py-2 text-xs text-ink/70 transition-colors hover:text-ink"
            >
              选择文件
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.flac,.wav,.webm"
              className="hidden"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {file && (
            <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ink/60">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink/40">
                <path d="M13 2 3 14h6l-1 8 10-12h-6l1-8Z" />
              </svg>
              <span className="truncate">{file.name}</span>
              <button
                type="button"
                onClick={() => setFile(null)}
                className="shrink-0 text-ink/35 transition-colors hover:text-rose-500"
                aria-label="取消选择文件"
              >
                ×
              </button>
            </p>
          )}
          <p className="mt-2 text-[10px] text-ink/35">粘贴直链或上传 MP3 二选一，都会作为专属曲目参与口味分析</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <input
            value={fm.title}
            onChange={(e) => setFm({ ...fm, title: e.target.value })}
            placeholder="歌曲名 *"
            className="rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 text-xs text-ink placeholder-ink/30 outline-none focus:border-violet-400/50"
          />
          <input
            value={fm.artist}
            onChange={(e) => setFm({ ...fm, artist: e.target.value })}
            placeholder="歌手（可选）"
            className="rounded-xl border border-ink/10 bg-ink/5 px-3 py-2 text-xs text-ink placeholder-ink/30 outline-none focus:border-violet-400/50"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-[11px] text-ink/60">
            口味定位
            <select
              value={fm.mood}
              onChange={(e) => setFm({ ...fm, mood: e.target.value })}
              className="flex-1 rounded-lg border border-ink/10 bg-ink/5 px-2 py-1.5 text-xs text-ink outline-none"
            >
              {MOOD_KEYS.map((k) => (
                <option key={k} value={k} className="bg-white">{MOOD_PRESETS[k as keyof typeof MOOD_PRESETS].label}</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-[11px] text-ink/60">
            流派
            <select
              value={fm.genre}
              onChange={(e) => setFm({ ...fm, genre: e.target.value })}
              className="flex-1 rounded-lg border border-ink/10 bg-ink/5 px-2 py-1.5 text-xs text-ink outline-none"
            >
              {GENRE_KEYS.map((g) => (
                <option key={g} value={g} className="bg-white">{g}</option>
              ))}
            </select>
          </label>
        </div>

        {err && <p className="text-[11px] text-rose-500">{err}</p>}
        {ok && <p className="text-[11px] text-emerald-300">{ok}</p>}
        <button
          type="submit"
          className="btn-lift w-full rounded-xl bg-gradient-to-r from-violet-500/80 to-cyan-500/80 py-2 text-xs font-semibold text-white hover:opacity-90"
        >
          加入歌单并参与分析
        </button>
      </form>
    </section>
  );
}
