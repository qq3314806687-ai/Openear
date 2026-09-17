'use client';

/**
 * 主页面：登录门 · 情绪边界地图 · 探索强度 + 推荐路线。
 * 情绪地图与推荐都由「我的歌单」（用户添加的音源）生成。
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import type { Intensity, Song, User } from '@/lib/types';
import { generateRecommendations } from '@/lib/lib/recommendations';
import { getUsers, registerUser } from '@/lib/lib/store';
import {
  getPlaylist,
  addBuiltIn,
  addCustomSong,
  addUploadedSong,
  removeFromPlaylist,
  clearPlaylist,
  togglePlaylist,
  getRuntimeSongs,
} from '@/lib/lib/playlist';
import { getAudioBlob } from '@/lib/lib/idb';
import MapSection from '@/components/MapSection';
import IntensitySlider from '@/components/IntensitySlider';
import RecommendationPanel from '@/components/RecommendationPanel';
import PlaylistPanel from '@/components/PlaylistPanel';
import AudioPlayer from '@/components/AudioPlayer';
import LoginScreen from '@/components/LoginScreen';
import UserMenu from '@/components/UserMenu';

const SESSION_KEY = 'openear.session';
const CUSTOM_KEY = 'openear.customUsers';

function readCustom(): User[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    return raw ? (JSON.parse(raw) as User[]) : [];
  } catch {
    return [];
  }
}

export default function Page() {
  // 登录门 + 会话恢复
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [intensity, setIntensity] = useState<Intensity>('balanced');
  const [focusZoneId, setFocusZoneId] = useState<string | null>(null);

  // 用户歌单（驱动地图地形与推荐基准）
  const [playlist, setPlaylist] = useState<Song[]>([]);

  // 底部播放器
  const [nowPlaying, setNowPlaying] = useState<Song | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // 恢复会话：重建自定义用户 + 还原上次身份
  useEffect(() => {
    try {
      readCustom().forEach(registerUser);
      const raw = localStorage.getItem(SESSION_KEY);
      if (raw) {
        const { userId: saved } = JSON.parse(raw) as { userId: string };
        if (saved && getUsers().some((u) => u.userId === saved)) setUserId(saved);
      }
    } catch {
      /* 损坏/不可用的数据一律忽略，回到登录 */
    }
    setHydrated(true);
  }, []);

  // 卸载时停止播放
  useEffect(() => {
    const a = audioRef.current;
    return () => {
      a?.pause();
    };
  }, []);

  // 切换身份时载入其歌单
  useEffect(() => {
    if (userId) setPlaylist(getPlaylist(userId));
    else setPlaylist([]);
  }, [userId]);

  const users = getUsers();
  const user = useMemo(
    () => users.find((u) => u.userId === (userId ?? 'userA'))!,
    [users, userId],
  );

  const playlistIds = useMemo(() => playlist.map((s) => s.id), [playlist]);

  // 推荐（滑块 / 歌单 / 空白区任一变化即重算）
  const bundle = useMemo(
    () =>
      generateRecommendations(playlist, intensity, {
        focusZoneId: focusZoneId ?? undefined,
        songs: getRuntimeSongs(),
      }),
    [playlist, intensity, focusZoneId],
  );

  /* ---------- 播放器 ---------- */
  const ensureAudio = (): HTMLAudioElement => {
    if (!audioRef.current) {
      const a = new Audio();
      a.addEventListener('timeupdate', () => setCurrentTime(a.currentTime));
      a.addEventListener('loadedmetadata', () => setDuration(a.duration || 0));
      a.addEventListener('play', () => setPlaying(true));
      a.addEventListener('pause', () => setPlaying(false));
      a.addEventListener('ended', () => setPlaying(false));
      audioRef.current = a;
    }
    return audioRef.current;
  };

  /** 计算可播放的 src：本地 data/blob 直放，sound:// 从 IndexedDB 取，其余走服务端代理 */
  const resolvePlayableSrc = async (song: Song): Promise<string> => {
    const u = song.audioUrl;
    if (!u) return '';
    if (u.startsWith('data:') || u.startsWith('blob:')) return u;
    if (u.startsWith('sound://')) {
      const blob = await getAudioBlob(u.slice('sound://'.length));
      return blob ? URL.createObjectURL(blob) : '';
    }
    return `/api/audio?url=${encodeURIComponent(u)}`;
  };

  const playSong = async (song: Song) => {
    if (!song.audioUrl) return;
    const a = ensureAudio();
    if (nowPlaying?.id === song.id) {
      if (a.paused) a.play();
      else a.pause();
      return;
    }
    const src = await resolvePlayableSrc(song);
    setNowPlaying(song);
    setPlaying(false);
    if (!src) return;
    a.src = src;
    a.load();
    a.play().catch(() => setPlaying(false));
  };

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !nowPlaying) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const handleSeek = (t: number) => {
    const a = audioRef.current;
    if (a && Number.isFinite(t)) a.currentTime = t;
  };

  const closePlayer = () => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.src = '';
    }
    setNowPlaying(null);
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  /* ---------- 歌单操作 ---------- */
  const addSongToPlaylist = (song: Song) => {
    if (!userId) return;
    setPlaylist(addBuiltIn(userId, song.id));
  };

  const addCustom = (input: { title: string; artist?: string; audioUrl: string; mood: string; genre?: string }) => {
    if (!userId) return;
    setPlaylist(addCustomSong(userId, input).playlist);
  };

  const addUploaded = async (input: { title: string; artist?: string; mood: string; genre?: string; file: Blob }) => {
    if (!userId) return;
    const { playlist: after } = await addUploadedSong(userId, input);
    setPlaylist(after);
  };

  const removeSong = (songId: string) => {
    if (!userId) return;
    setPlaylist(removeFromPlaylist(userId, songId));
  };

  const toggleSongInPlaylist = (song: Song) => {
    if (!userId) return;
    setPlaylist(togglePlaylist(userId, song));
  };

  const resetPlaylist = () => {
    if (!userId) return;
    clearPlaylist(userId);
    setPlaylist([]);
    setFocusZoneId(null);
  };

  // 点击空白地带：聚焦该区域，并就近试听该地带排在最前的可试听推荐
  const onZoneSelect = (id: string) => {
    const next = focusZoneId === id ? null : id;
    setFocusZoneId(next);
    const nextBundle = generateRecommendations(playlist, intensity, {
      focusZoneId: next ?? undefined,
      songs: getRuntimeSongs(),
    });
    const first = nextBundle.recommendations.find((r) => r.song.audioUrl);
    if (first) playSong(first.song);
  };

  /* ---------- 会话操作 ---------- */
  const login = (u: User, opts?: { intensity?: Intensity }) => {
    setUserId(u.userId);
    setFocusZoneId(null);
    if (opts?.intensity) setIntensity(opts.intensity);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: u.userId }));
      if (u.userId.startsWith('user-')) {
        const arr = readCustom();
        if (!arr.some((x) => x.userId === u.userId)) arr.push(u);
        localStorage.setItem(CUSTOM_KEY, JSON.stringify(arr));
      }
    } catch {
      /* 忽略写入失败 */
    }
  };

  const logout = () => {
    setUserId(null);
    setFocusZoneId(null);
    closePlayer();
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* 忽略 */
    }
  };

  const switchUser = (next: string) => {
    setUserId(next);
    setFocusZoneId(null);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: next }));
    } catch {
      /* 忽略 */
    }
  };

  // 登录门（使用动画渐入）
  if (!hydrated) {
    return (
      <main className="grid min-h-screen place-items-center">
        <span className="h-8 w-8 animate-spin rounded-full border-2 border-violet-400/30 border-t-violet-400" />
      </main>
    );
  }

  if (!userId) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <main className="animate-page-in relative mx-auto max-w-[1400px] px-5 pb-28 pt-6">
      {/* 页头 */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-violet-500 to-cyan-500 text-xl font-black text-white shadow-glow">
            O
          </span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              OpenEar <span className="text-white/40">解茧</span>
            </h1>
            <p className="text-xs text-white/50">不是给你更多同款，而是带你走出同款。</p>
          </div>
        </div>

        <UserMenu users={users} current={user} onSwitch={switchUser} onLogout={logout} />
      </header>

      {/* 主体：左地图 / 右面板 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* 情绪边界地图（紧凑可折叠 2D/3D） */}
        <MapSection
          songs={playlist}
          candidates={bundle.recommendations.map((r) => r.song)}
          activeZoneId={focusZoneId}
          onZoneSelect={onZoneSelect}
          onPlaySong={playSong}
          onClearPlaylist={resetPlaylist}
          avg={bundle.userAvgVA}
        />

        {/* 右侧面板 */}
        <section className="flex flex-col gap-5">
          <PlaylistPanel
            playlist={playlist}
            onAddBuiltIn={addSongToPlaylist}
            onAddCustom={addCustom}
            onAddUploaded={addUploaded}
            onRemove={removeSong}
            onPlay={playSong}
            nowPlayingId={nowPlaying?.id}
            playing={playing}
          />

          <div className="rounded-3xl border border-white/10 bg-panel p-4 backdrop-blur">
            <IntensitySlider value={intensity} onChange={setIntensity} />
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-panel p-4 backdrop-blur">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 px-1">
              <h2 className="text-sm font-semibold text-white">推荐路线</h2>
              <div className="flex flex-wrap gap-1 text-[10px] text-white/45">
                {bundle.userGenreTop.map((g) => (
                  <span key={g} className="rounded-full border border-white/10 px-2 py-0.5">
                    {g}
                  </span>
                ))}
                <span className="rounded-full border border-white/10 px-2 py-0.5">主打</span>
              </div>
            </div>
            <div className="max-h-[600px] flex-1 overflow-y-auto pr-1">
              <RecommendationPanel
                recommendations={bundle.recommendations}
                userGenreTop={bundle.userGenreTop}
                playlistIds={playlistIds}
                onTogglePlaylist={toggleSongInPlaylist}
                onPlay={playSong}
              />
            </div>
          </div>
        </section>
      </div>

      {/* 底部播放器 */}
      <AudioPlayer
        song={nowPlaying}
        playing={playing}
        currentTime={currentTime}
        duration={duration}
        onTogglePlay={togglePlay}
        onSeek={handleSeek}
        onClose={closePlayer}
      />

      {/* 页脚 */}
      <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 text-[11px] text-white/35">
        <span>OpenEar · 解茧</span>
        <span>也许下一首，能替你解开心里那只茧。</span>
      </footer>
    </main>
  );
}