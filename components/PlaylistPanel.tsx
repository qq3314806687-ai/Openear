'use client';

/**
 * 我的歌单：用户添加的音源管理。
 * - 从内置曲库搜索添加
 * - 粘贴音频直链，自建一首歌参与口味分析
 * - 列表内可试听（有直链的）或移除
 */
import { useMemo, useState } from 'react';
import type { Song } from '@/lib/types';
import { MOOD_PRESETS, GENRE_TAG, getRuntimeSongs } from '@/lib/lib/playlist';

const MOOD_KEYS = Object.keys(MOOD_PRESETS);
const GENRE_KEYS = Object.keys(GENRE_TAG);

interface Props {
  playlist: Song[];
  onAddBuiltIn: (song: Song) => void;
  onAddCustom: (input: { title: string; artist?: string; audioUrl: string; mood: string; genre?: string }) => void;
  onAddUploaded?: (input: { title: string; artist?: string; mood: string; genre?: string; file: Blob }) => Promise<void>;
  onRemove: (songId: string) => void;
  onPlay: (song: Song) => void;
  nowPlayingId?: string;
  playing?: boolean;
}

export default function PlaylistPanel({
  playlist,
  onAddBuiltIn,
  onAddCustom,
  onAddUploaded,
  onRemove,
  onPlay,
  nowPlayingId,
  playing,
}: Props) {
  const [tab, setTab] = useState<'library' | 'url' | 'upload'>('library');
  const [q, setQ] = useState('');
  const [fm, setFm] = useState({ title: '', artist: '', audioUrl: '', mood: 'chill' as string, genre: 'Electronic' as string });
  const [up, setUp] = useState({ title: '', artist: '', mood: 'chill' as string, genre: 'Electronic' as string });
  const [file, setFile] = useState<File | null>(null);
  const [err, setErr] = useState('');
  const [ok, setOk] = useState('');
  const [gen, setGen] = useState<string>('');

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

  const submitCustom = () => {
    setErr('');
    const url = fm.audioUrl.trim();
    if (!fm.title.trim()) return setErr('先填歌曲名');
    if (!/^https?:\/\/.+/i.test(url)) return setErr('请粘贴 http(s) 开头的音频直链');
    onAddCustom({ title: fm.title, artist: fm.artist, audioUrl: url, mood: fm.mood, genre: fm.genre });
    setFm({ title: '', artist: '', audioUrl: '', mood: 'chill', genre: 'Electronic' });
  };

  const pickFile = (f: File | null) => {
    setErr('');
    setOk('');
    setFile(f);
    if (!f) return;
    const name = f.name.replace(/\.[^.]+$/, '');
    setUp((s) => ({ ...s, title: s.title || name }));
    if (!/^audio\//i.test(f.type) && !/\.(mp3|m4a|aac|ogg|oga|opus|flac|wav|webm)$/i.test(f.name)) {
      setErr('请选择音频文件（mp3 / m4a / aac / ogg / wav 等）');
    }
  };

  const submitUpload = async () => {
    setOk('');
    setErr('');
    if (!onAddUploaded) return setErr('当前暂不支持上传');
    if (!file) return setErr('请先选择一个音频文件');
    if (!up.title.trim()) return setErr('先填歌曲名');
    try {
      await onAddUploaded({
        title: up.title,
        artist: up.artist,
        mood: up.mood,
        genre: up.genre,
        file,
      });
      setUp({ title: '', artist: '', mood: 'chill', genre: 'Electronic' });
      setFile(null);
      setOk('已加入歌单');
    } catch {
      setErr('保存失败：文件过大或本地存储不可用');
    }
  };

  return (
    <section className="rounded-3xl border border-white/10 bg-panel p-4 backdrop-blur">
      <div className="mb-3 flex items-center justify-between px-1">
        <h2 className="text-sm font-semibold text-white">我的歌单</h2>
        <span className="text-[11px] text-white/40">{playlist.length} 首</span>
      </div>

      {/* 添加入口 */}
      <div className="mb-2 flex gap-1 rounded-xl border border-white/10 p-1 text-[12px]">
        <button
          type="button"
          onClick={() => setTab('library')}
          className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${tab === 'library' ? 'bg-violet-500/30 text-white' : 'text-white/50 hover:text-white'}`}
        >
          从曲库添加
        </button>
        <button
          type="button"
          onClick={() => setTab('url')}
          className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${tab === 'url' ? 'bg-violet-500/30 text-white' : 'text-white/50 hover:text-white'}`}
        >
          粘贴音频直链
        </button>
        <button
          type="button"
          onClick={() => setTab('upload')}
          className={`flex-1 rounded-lg px-2 py-1.5 transition-colors ${tab === 'upload' ? 'bg-violet-500/30 text-white' : 'text-white/50 hover:text-white'}`}
        >
          上传音频文件
        </button>
      </div>

      {tab === 'library' ? (
        <div>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索曲库（歌名 / 歌手 / 流派）"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-400/50"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setGen('')}
              className={`rounded-full px-2.5 py-1 text-[11px] transition-colors ${
                !gen ? 'bg-violet-500/30 text-white ring-1 ring-violet-400/40' : 'border border-white/10 text-white/45 hover:bg-white/10 hover:text-white'
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
                  gen === g ? 'bg-violet-500/30 text-white ring-1 ring-violet-400/40' : 'border border-white/10 text-white/45 hover:bg-white/10 hover:text-white'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
          <ul className="mt-2 max-h-[220px] space-y-1 overflow-y-auto pr-1">
            {library.length === 0 && (
              <li className="py-6 text-center text-xs text-white/35">{q ? '没有匹配的曲目' : '曲库已全部加入'}</li>
            )}
            {library.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5"
              >
                <span className="h-6 w-6 shrink-0 rounded-md" style={{ backgroundColor: s.coverColor }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-white">{s.title}</span>
                  <span className="block truncate text-[10px] text-white/45">{s.artist} · {s.genre}</span>
                </span>
                <button
                  type="button"
                  onClick={() => onAddBuiltIn(s)}
                  aria-label="加入歌单"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/10 text-sm text-white/50 transition-colors hover:border-violet-400/50 hover:text-white"
                >
                  +
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : tab === 'url' ? (
        <form
          className="space-y-2"
          onSubmit={(e) => { e.preventDefault(); submitCustom(); }}
        >
          <div className="grid grid-cols-2 gap-2">
            <input
              value={fm.title}
              onChange={(e) => setFm({ ...fm, title: e.target.value })}
              placeholder="歌曲名 *"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-400/50"
            />
            <input
              value={fm.artist}
              onChange={(e) => setFm({ ...fm, artist: e.target.value })}
              placeholder="歌手（可选）"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-400/50"
            />
          </div>
          <input
            value={fm.audioUrl}
            onChange={(e) => setFm({ ...fm, audioUrl: e.target.value })}
            placeholder="https://…/song.mp3 （音频直链）*"
            inputMode="url"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-400/50"
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-[11px] text-white/60">
              口味定位
              <select
                value={fm.mood}
                onChange={(e) => setFm({ ...fm, mood: e.target.value })}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
              >
                {MOOD_KEYS.map((k) => (
                  <option key={k} value={k} className="bg-black">{MOOD_PRESETS[k as keyof typeof MOOD_PRESETS].label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-white/60">
              流派
              <select
                value={fm.genre}
                onChange={(e) => setFm({ ...fm, genre: e.target.value })}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
              >
                {GENRE_KEYS.map((g) => (
                  <option key={g} value={g} className="bg-black">{g}</option>
                ))}
              </select>
            </label>
          </div>
          {err && <p className="text-[11px] text-rose-300">{err}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-violet-500/80 to-cyan-500/80 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            加入歌单并参与分析
          </button>
        </form>
      ) : (
        <form
          className="space-y-2"
          onSubmit={(e) => { e.preventDefault(); submitUpload(); }}
        >
          <label className="block">
            <span className="mb-1 block text-[11px] text-white/50">选择音频文件（从网页下载的 mp3 / m4a 等）</span>
            <input
              type="file"
              accept="audio/*,.mp3,.m4a,.aac,.ogg,.opus,.flac,.wav,.webm"
              onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
              className="block w-full text-xs text-white/70 file:mr-2 file:rounded-lg file:border-0 file:bg-violet-500/25 file:px-3 file:py-1.5 file:text-xs file:text-white hover:file:bg-violet-500/35"
            />
          </label>

          <div className="grid grid-cols-2 gap-2">
            <input
              value={up.title}
              onChange={(e) => setUp({ ...up, title: e.target.value })}
              placeholder="歌曲名 *"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-400/50"
            />
            <input
              value={up.artist}
              onChange={(e) => setUp({ ...up, artist: e.target.value })}
              placeholder="歌手（可选）"
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-violet-400/50"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <label className="flex items-center gap-2 text-[11px] text-white/60">
              口味定位
              <select
                value={up.mood}
                onChange={(e) => setUp({ ...up, mood: e.target.value })}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
              >
                {MOOD_KEYS.map((k) => (
                  <option key={k} value={k} className="bg-black">{MOOD_PRESETS[k as keyof typeof MOOD_PRESETS].label}</option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-2 text-[11px] text-white/60">
              流派
              <select
                value={up.genre}
                onChange={(e) => setUp({ ...up, genre: e.target.value })}
                className="flex-1 rounded-lg border border-white/10 bg-black/40 px-2 py-1.5 text-xs text-white outline-none"
              >
                {GENRE_KEYS.map((g) => (
                  <option key={g} value={g} className="bg-black">{g}</option>
                ))}
              </select>
            </label>
          </div>
          {err && <p className="text-[11px] text-rose-300">{err}</p>}
          {ok && <p className="text-[11px] text-emerald-300">{ok}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-violet-500/80 to-cyan-500/80 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-90"
          >
            上传并参与分析
          </button>
        </form>
      )}

      {/* 歌单列表 */}
      <div className="mt-3 border-t border-white/10 pt-3">
        {playlist.length === 0 && (
          <p className="py-4 text-center text-xs text-white/40">{tab === 'library' ? '还没有歌曲，先从曲库加几首吧' : '或粘贴一首音频直链创建专属曲目'}</p>
        )}
        <ul className="max-h-[260px] space-y-1 overflow-y-auto pr-1">
          {playlist.map((s) => (
            <li key={s.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-white/5">
              <span className="h-6 w-6 shrink-0 rounded-md" style={{ backgroundColor: s.coverColor }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs text-white">{s.title}</span>
                <span className="block truncate text-[10px] text-white/45">
                  {s.artist} · {s.genre}
                  <span className="ml-1 rounded bg-white/10 px-1 text-[9px]">{s.source === 'custom' ? '直链' : '曲库'}</span>
                </span>
              </span>
              {nowPlayingId === s.id && playing && <span className="text-[9px] text-cyan-300">播放中</span>}
              {s.audioUrl && (
                <button
                  type="button"
                  onClick={() => onPlay(s)}
                  aria-label="试听"
                  className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-white/10 text-white/60 transition-colors hover:border-cyan-400/50 hover:text-cyan-300"
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5.5v13l11-6.5L8 5.5Z" /></svg>
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(s.id)}
                aria-label="移出歌单"
                className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-white/35 transition-colors hover:text-rose-300"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}