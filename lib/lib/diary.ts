/**
 * 音乐日记 · 数据层（本地 JSON 模拟，无外部依赖）。
 * 首次进入自动播种示例贴纸；上传截图走 mock 识别。
 * analyzeScreenshot 独立封装，后续可直接替换成真实音乐识别 API。
 */
export type Mood = 1 | 2 | 3 | 4 | 5;

export interface SongMeta {
  title: string; // 歌名
  artist: string; // 歌手
  genre: string; // e.g. "R&B"
  bpm: number; // e.g. 92
  visualRating: Mood; // V 色彩分 1-5，由 LLM 按封面视觉打分
  moodRating: Mood; // A 情绪分 1-5，由 LLM 按歌曲氛围打分
  coverStickerUrl: string; // 抠好的贴纸图（base64 / dataURL / objectURL）
  aiTips: {
    intro: string; // 歌曲简介
    analysis: string; // 音乐分析
    personalized: string; // 结合用户感受的客制化内容
  };
}

export interface DiaryEntry {
  id: string;
  date: string; // "2026-10-06"
  song: SongMeta;
  userNote: string; // 便利贴里用户写的感受
  stickerRotation: number; // -3 ~ 3 度
}

const KEY = 'openear.diary';

/* ---------- 日期工具 ---------- */
export function toDateStr(d: Date): string {
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function dateLabel(d: Date | string): string {
  const dt = typeof d === 'string' ? new Date(`${d}T00:00:00`) : d;
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

/** 所在周的周一 ~ 周日 */
export function weekOf(d: Date | string): Date[] {
  const dt = typeof d === 'string' ? new Date(`${d}T00:00:00`) : new Date(d);
  const off = (dt.getDay() + 6) % 7; // 周一 = 0
  const mon = new Date(dt);
  mon.setDate(dt.getDate() - off);
  return Array.from({ length: 7 }, (_, i) => {
    const x = new Date(mon);
    x.setDate(mon.getDate() + i);
    return x;
  });
}

/* ---------- Mock 曲库（第一版：元数据用 mock，截图抠图用真实裁剪） ---------- */
interface PoolSong {
  title: string;
  artist: string;
  genre: string;
  bpm: number;
  visualRating: Mood;
  moodRating: Mood;
}

const POOL: PoolSong[] = [
  { title: 'Redbone', artist: 'Childish Gambino', genre: 'Funk / R&B', bpm: 160, visualRating: 4, moodRating: 5 },
  { title: 'Luv(sic) Part 3', artist: 'Nujabes', genre: 'Jazz Hip-Hop', bpm: 92, visualRating: 5, moodRating: 4 },
  { title: 'Best Part', artist: 'H.E.R.', genre: 'R&B', bpm: 85, visualRating: 4, moodRating: 5 },
  { title: '雾中列车', artist: '森海', genre: 'Lo-fi', bpm: 78, visualRating: 4, moodRating: 3 },
  { title: '橘子汽水', artist: '白白', genre: 'Pop', bpm: 118, visualRating: 3, moodRating: 4 },
];

const GENRE_PALETTE: Record<string, [string, string]> = {
  'Funk / R&B': ['#E8A87C', '#C97B63'],
  'R&B': ['#E8A87C', '#C97B63'],
  'Jazz Hip-Hop': ['#C9B6A5', '#8E7A66'],
  'Lo-fi': ['#A8C3BC', '#6E9185'],
  Pop: ['#E8C4A2', '#D98B78'],
};

/** 示例封面的 SVG 贴纸图（无外部资源） */
export function svgCover(genre: string): string {
  const [a, b] = GENRE_PALETTE[genre] ?? ['#D9CFC0', '#B5A99B'];
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/>` +
    `</linearGradient></defs>` +
    `<rect width="300" height="300" fill="url(#g)"/>` +
    `<circle cx="150" cy="150" r="96" fill="rgba(255,255,255,0.16)"/>` +
    `<circle cx="150" cy="150" r="52" fill="rgba(43,32,24,0.35)"/>` +
    `<circle cx="150" cy="150" r="13" fill="rgba(255,255,255,0.85)"/>` +
    `<path d="M180 96v78a16 16 0 1 1-8-13.9V120l-40 9.6v70a16 16 0 1 1-8-13.9V106l56-13v3z" fill="rgba(255,255,255,0.9)"/>` +
    `</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

const GENRE_VIBE: Record<string, { aura: string; analysis: string }> = {
  'Funk / R&B': {
    aura: '慵懒里带着一点俏皮，副歌像被阳光烤过的蜂蜜',
    analysis: '节拍粗粝又稳，贝斯线在缝隙里来回蹭，和声不急着走，让每一个鼓点都像在伸懒腰',
  },
  'R&B': {
    aura: '丝滑、温柔，像夜里房间里只开着一盏小灯',
    analysis: '人声贴着鼓点走，转音不炫技，编曲留白很多，和声像慢慢化开的糖',
  },
  'Jazz Hip-Hop': {
    aura: '把爵士的呼吸缝进节拍里，适合雨天和旧街道',
    analysis: '采样器剪出毛边，钢琴短句和鼓错落有致，整体像一场不急不慢的城市散步',
  },
  'Lo-fi': {
    aura: '沙沙的、软软的，像收音机里传来的晚安曲',
    analysis: '鼓点轻微走调地打着盹，环境音藏在底噪里，旋律不催你，只是陪你',
  },
  Pop: {
    aura: '明亮、元气，像冰镇汽水打开的那一声',
    analysis: '副歌的旋律钩子很顺，鼓点轻快利落，编曲层次干净，听完嘴角会不自觉翘起来',
  },
};

function buildMeta(p: PoolSong): SongMeta {
  const vibe = GENRE_VIBE[p.genre] ?? GENRE_VIBE['Lo-fi'];
  return {
    title: p.title,
    artist: p.artist,
    genre: p.genre,
    bpm: p.bpm,
    visualRating: p.visualRating,
    moodRating: p.moodRating,
    coverStickerUrl: svgCover(p.genre),
    aiTips: {
      intro: `《${p.title}》是${p.artist}的一首${p.genre}，${vibe.aura}。`,
      analysis: `${vibe.analysis}；BPM ${p.bpm} 的节奏刚刚好，不会太赶，也不会太散。`,
      personalized: '今天听它正好——闭上眼睛，让旋律慢慢接管呼吸就好，它会接住你的。',
    },
  };
}

/** 图片 → 居中裁成正方形，作为贴纸图（模拟「抠图」） */
function cropSquare(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const size = Math.min(img.naturalWidth, img.naturalHeight);
        const sx = (img.naturalWidth - size) / 2;
        const sy = (img.naturalHeight - size) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('no canvas');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      } catch (err) {
        URL.revokeObjectURL(url);
        reject(err);
      }
    };
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 识别截图 → 结构化 SongMeta。
 * 第一版：封面做真实居中裁剪，元数据 / 评分 / tips 用 mock；后续替换成真实识别 API + LLM 打分。
 */
export async function analyzeScreenshot(imageFile: File): Promise<SongMeta> {
  const coverStickerUrl = await cropSquare(imageFile);
  const pick = POOL[Math.floor(Math.random() * POOL.length)];
  return { ...buildMeta(pick), coverStickerUrl };
}

/** 解析失败时的温柔兜底：随机 mock 一首，作为占位贴纸 */
export function fallbackMeta(): SongMeta {
  const pick = POOL[Math.floor(Math.random() * POOL.length)];
  return buildMeta(pick);
}

/* ---------- localStorage 存取 ---------- */
export function loadDiary(): DiaryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as DiaryEntry[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    /* 损坏则重新播种 */
  }
  const seeded = seedDiary();
  saveDiary(seeded);
  return seeded;
}

export function saveDiary(entries: DiaryEntry[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(entries));
  } catch {
    /* 忽略 */
  }
}

export function entriesOf(entries: DiaryEntry[], date: string): DiaryEntry[] {
  return entries.filter((e) => e.date === date);
}

/** 首次加载的示例：最近 5 天各一首，覆盖不同风格，一打开就有完整贴纸墙 */
function seedDiary(): DiaryEntry[] {
  const today = new Date();
  return POOL.map((p, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (POOL.length - 1 - i));
    return {
      id: `seed-${i + 1}`,
      date: toDateStr(d),
      song: buildMeta(p),
      userNote: i === 2 ? '加班到很晚，回家路上单曲循环，好像也没那么累了。' : '',
      stickerRotation: Math.round((Math.random() * 6 - 3) * 10) / 10,
    };
  });
}
