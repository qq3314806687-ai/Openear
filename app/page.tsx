'use client';

/**
 * 主页面：登录门 · 情绪边界地图 · 探索强度 + 推荐路线。
 * 情绪地图与推荐都由「我的歌单」（用户添加的音源）生成。
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Intensity, Song, User } from '@/lib/types';
import { generateRecommendations } from '@/lib/lib/recommendations';
import { getUsers, registerUser, pinUser, removeUser } from '@/lib/lib/store';
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
import { getPreviewUrl } from '@/lib/lib/preview';
import { getTodayMoodById } from '@/lib/lib/today';
import MapSection from '@/components/MapSection';
import AiChat from '@/components/AiChat';
import IntensitySlider from '@/components/IntensitySlider';
import RecommendationPanel from '@/components/RecommendationPanel';
import PlaylistPanel from '@/components/PlaylistPanel';
import AudioPlayer from '@/components/AudioPlayer';
import LoginScreen from '@/components/LoginScreen';
import OpeningScreen from '@/components/OpeningScreen';
import UserMenu from '@/components/UserMenu';
import BrandMark from '@/components/BrandMark';
import CursorGlow from '@/components/CursorGlow';
import FullscreenMenu, { type MenuRoute } from '@/components/FullscreenMenu';
import FullPlaylistScreen from '@/components/FullPlaylistScreen';
import ConfirmDialog from '@/components/ConfirmDialog';

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

  // 开场阶段：opening（日记本）→ fade（渐隐转场）→ welcome（正式界面）
  const [phase, setPhase] = useState<'opening' | 'fade' | 'welcome'>('opening');

  const [intensity, setIntensity] = useState<Intensity>(50);

  // 我的歌单「全览」界面是否展开（主界面的歌单面板保留为预览）
  const [fullList, setFullList] = useState(false);

  // 「今日一首」回到出发点的确认弹窗
  const [confirmToday, setConfirmToday] = useState(false);

  // 用户列表版本号：置顶/删除后强制重渲染身份列表
  const [usersTick, setUsersTick] = useState(0);

  // 用户歌单（驱动地图地形与推荐基准）
  const [playlist, setPlaylist] = useState<Song[]>([]);

  // 今日起点：今日心情 + 最适配歌曲（来自对话建号）
  const [today, setToday] = useState<{ moodId: string; songId: string } | null>(null);

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

  // 载入「今日起点」（进入主界面后用户可随时更改今天的心情）
  useEffect(() => {
    try {
      const raw = localStorage.getItem('openear.today');
      setToday(raw ? (JSON.parse(raw) as { moodId: string; songId: string }) : null);
    } catch {
      setToday(null);
    }
  }, [userId]);

  // 转场：这本书翻页 → 定格空白页 → 整屏渐隐 → 让位给下一界面，共约 2.05s
  useEffect(() => {
    if (phase !== 'fade') return;
    const t = setTimeout(() => setPhase('welcome'), 2050);
    return () => clearTimeout(t);
  }, [phase]);

  const users = getUsers();
  const user = useMemo(
    () => users.find((u) => u.userId === (userId ?? 'userA'))!,
    [users, userId],
  );

  const playlistIds = useMemo(() => playlist.map((s) => s.id), [playlist]);

  // 推荐（滑块 / 歌单任一变化即重算）
  const bundle = useMemo(
    () =>
      generateRecommendations(playlist, intensity, {
        songs: getRuntimeSongs(),
      }),
    [playlist, intensity],
  );

  // 今日起点：今日心情 + 最适配歌曲
  const todaySong = useMemo(() => {
    if (!today) return null;
    return getRuntimeSongs().find((s) => s.id === today.songId) ?? null;
  }, [today]);
  const todayMood = today ? getTodayMoodById(today.moodId) : undefined;

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

  /** 计算可播放的 src：本地 data/blob 直放，sound:// 从 IndexedDB 取，其余走服务端代理，无音源则合成试听 */
  const resolvePlayableSrc = async (song: Song): Promise<string> => {
    const u = song.audioUrl;
    if (!u) return getPreviewUrl(song);
    if (u.startsWith('data:') || u.startsWith('blob:')) return u;
    if (u.startsWith('sound://')) {
      const blob = await getAudioBlob(u.slice('sound://'.length));
      return blob ? URL.createObjectURL(blob) : '';
    }
    return `/api/audio?url=${encodeURIComponent(u)}`;
  };

  const playSong = async (song: Song) => {
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
  };

  /* ---------- 会话操作 ---------- */
  const login = (u: User, opts?: { intensity?: Intensity }) => {
    setUserId(u.userId);
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
    closePlayer();
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* 忽略 */
    }
  };

  const switchUser = (next: string) => {
    setUserId(next);
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify({ userId: next }));
    } catch {
      /* 忽略 */
    }
  };

  /** 右键「置顶」：把身份移到列表最前并持久化 */
  const pinUserAction = (id: string) => {
    pinUser(id);
    setUsersTick((t) => t + 1);
  };

  /** 右键「删除」：移除身份并持久化；若删的是当前身份则切换/退出 */
  const deleteUserAction = (id: string) => {
    const isCurrent = id === userId;
    removeUser(id);
    if (isCurrent) {
      const remaining = getUsers();
      const next = remaining[0];
      if (next) switchUser(next.userId);
      else logout();
    }
    setUsersTick((t) => t + 1);
  };

  /* ---------- 全屏菜单分流 ---------- */
  const scrollTo = (sel: string) => {
    requestAnimationFrame(() => {
      document.querySelector(sel)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleNavigate = (route: MenuRoute) => {
    setFullList(false);
    switch (route) {
      case 'home':
        // 首页 → 回最初界面（有日期行那本日记）
        setPhase('opening');
        break;
      case 'today':
        // 今日一首 → 询问是否回到出发点（是则退出当前身份，重新测试生成新的今日一首）
        setConfirmToday(true);
        break;
      case 'map':
        scrollTo('#emotion-map');
        break;
      case 'trail':
        scrollTo('#recommend');
        break;
      case 'playlist':
        setFullList(true);
        break;
    }
  };

  /** 「今日一首」确认后：退出当前身份并清除今日状态，回到出发点重新测试 */
  const restartToToday = () => {
    setConfirmToday(false);
    logout();
    setPlaylist([]);
    try {
      localStorage.removeItem('openear.today');
    } catch {
      /* 忽略 */
    }
  };

  // 正式界面内容：开场阶段不挂载（只留日记本），渐隐时再挂载登录/主界面，保证小精灵开场白在转场后出现
  let content: ReactNode;
  if (phase === 'opening') {
    content = null;
  } else if (!hydrated) {
    content = (
      <>
        <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="bg-kenburns absolute inset-0">
            <img src="/hero-mist.jpg" alt="" className="h-full w-full object-cover blur-[2px]" />
          </div>
          <div className="absolute inset-0 bg-[#202a24]/55" />
        </div>
        <main className="animate-page-in relative z-10 mx-auto max-w-[1400px] px-5 py-6" aria-hidden>
          {/* 页头骨架 */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="h-10 w-44 rounded-2xl skeleton" />
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-full skeleton" />
              <div className="h-10 w-36 rounded-2xl skeleton" />
            </div>
          </div>
          {/* hero 骨架 */}
          <div className="mt-6 h-40 w-full rounded-3xl skeleton sm:h-44" />
          {/* 主体骨架：左（地图 + 向导）右（歌单 + 强度 + 推荐） */}
          <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
            <div className="flex flex-col gap-5">
              <div className="h-[360px] w-full rounded-3xl skeleton" />
              <div className="h-[360px] w-full rounded-3xl skeleton" />
            </div>
            <div className="flex flex-col gap-5">
              <div className="h-[480px] w-full rounded-3xl skeleton" />
              <div className="h-[120px] w-full rounded-3xl skeleton" />
              <div className="h-[420px] w-full rounded-3xl skeleton" />
            </div>
          </div>
        </main>
      </>
    );
  } else if (!userId) {
    content = <LoginScreen onLogin={login} />;
  } else {
    content = (
      <>
      {/* 山野 ins 风背景：固定在底层缓慢移动并轻微模糊，衬托上层毛玻璃层级 */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="bg-kenburns absolute inset-0">
          <img src="/hero-mist.jpg" alt="" className="h-full w-full object-cover blur-[2px]" />
        </div>
        <div className="absolute inset-0 bg-[#202a24]/55" />
      </div>

      <main className="animate-page-in relative z-10 mx-auto max-w-[1400px] px-5 pb-28 pt-6">
      {/* 页头 */}
      <header className="flex flex-wrap items-center justify-between gap-4 pr-[84px]">
        <BrandMark compact />
        <UserMenu users={users} current={user} onSwitch={switchUser} onPin={pinUserAction} onDelete={deleteUserAction} />
      </header>

      {/* 晨雾原野横幅 */}
      <div className="relative mt-4 mb-5 overflow-hidden rounded-3xl border border-panelEdge shadow-glow lift">
        <img src="/hero-mist.jpg" alt="晨雾中的远山与草地" className="h-36 w-full object-cover sm:h-40" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#202a24] via-[#202a24]/35 to-[#202a24]/5" />
        <p className="absolute bottom-3 left-4 right-4 text-sm italic text-[#eef0ea]/90">
          在音浪里，遇见旷野 —— 今天想走哪条野路？
        </p>
      </div>

      {/* 今日起点：今日心情的当季主打 */}
      {todayMood && todaySong && (
        <div className="lift mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-panelEdge bg-gradient-to-r from-violet-500/15 to-cyan-500/10 p-3">
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl"
            style={{ background: todaySong.coverColor }}
            aria-hidden="true"
          >
            {todayMood.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-widest text-white/40">
              今日起点 · {todayMood.label}
            </p>
            <p className="truncate text-sm font-semibold text-white">
              《{todaySong.title}》 — {todaySong.artist}
            </p>
            <p className="truncate text-xs text-white/50">
              {todaySong.genre} · {todaySong.bpm} BPM · 为今天的你挑了这首歌
            </p>
          </div>
          <button
            type="button"
            onClick={() => playSong(todaySong)}
            className="btn-lift grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cyan-500/80 text-sm text-white shadow-glow"
            title="播放今日主打"
            aria-label="播放今日主打"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => toggleSongInPlaylist(todaySong)}
            aria-pressed={playlistIds.includes(todaySong.id)}
            className={`btn-lift shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
              playlistIds.includes(todaySong.id) ? 'border border-rose-400/50 bg-rose-500/20 text-rose-300'
                : 'border border-violet-400/40 bg-violet-500/15 text-white hover:bg-violet-500/30'
            }`}
          >
            {playlistIds.includes(todaySong.id) ? '✓ 已在歌单' : '+ 加入歌单'}
          </button>
        </div>
      )}

      {/* 主体：左（地图 + AI 向导）/ 右面板 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.25fr_1fr]">
        {/* 左列：情绪边界地图（紧凑瀑布式）+ AI 音乐向导 */}
        <div className="flex flex-col gap-5">
          <div id="emotion-map" className="scroll-mt-24">
            <MapSection
              songs={playlist}
              candidates={bundle.recommendations.map((r) => r.song)}
              onPlaySong={playSong}
              onClearPlaylist={resetPlaylist}
              onTogglePlaylist={toggleSongInPlaylist}
              playlistIds={playlistIds}
              nowPlayingId={nowPlaying?.id}
              playing={playing}
              avg={bundle.userAvgVA}
            />
          </div>
          <AiChat playlist={playlist} />
        </div>

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

          <div className="lift rounded-3xl glass p-4">
            <IntensitySlider value={intensity} onChange={setIntensity} />
          </div>

          <div className="lift flex min-h-0 flex-1 flex-col rounded-3xl glass p-4">
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
              <div id="recommend" className="scroll-mt-24">
                <RecommendationPanel
                  recommendations={bundle.recommendations}
                  userGenreTop={bundle.userGenreTop}
                  playlistIds={playlistIds}
                  onTogglePlaylist={toggleSongInPlaylist}
                  onPlay={playSong}
                />
              </div>
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
        <span>闻野 · OpenEar</span>
        <span>在音浪里，遇见旷野。</span>
      </footer>
      </main>
      </>
    );
  }

  return (
    <>
      {content}
      {/* 柔和光斑跟随鼠标（含惯性），悬停可点元素时放大 */}
      <CursorGlow />
      {/* 右上角全屏菜单（最终界面） */}
      {phase === 'welcome' && <FullscreenMenu onNavigate={handleNavigate} />}
      {/* 我的歌单「全览」界面（另起一整屏；主界面的歌单面板保留为预览） */}
      {phase === 'welcome' && fullList && (
        <FullPlaylistScreen
          songs={playlist}
          onClose={() => setFullList(false)}
          onPlay={playSong}
          onRemove={removeSong}
          nowPlayingId={nowPlaying?.id}
          playing={playing}
        />
      )}
      {(phase === 'opening' || phase === 'fade') && (
        <OpeningScreen fading={phase === 'fade'} onEnter={() => setPhase('fade')} />
      )}

      {/* 「今日一首」回到出发点确认 */}
      <ConfirmDialog
        open={confirmToday}
        title="回到出发的地方"
        message="是否回到出发的地方？回到起点后，你将退出当前身份，重新测试生成新的一首「今日一首」。"
        confirmText="是，回去"
        cancelText="再想想"
        onConfirm={restartToToday}
        onCancel={() => setConfirmToday(false)}
      />
    </>
  );
}