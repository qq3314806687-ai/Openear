/**
 * 小精灵对话式建号 —— 题库与画像推导。
 * 五道题各摸一个维度：歌的类型、节奏、歌带来的情绪、歌的基调、听歌的时间。
 * 问的是长期口味，与「今日心情」无关。
 * 答案累积成音乐画像（valence 情绪色彩 / arousal 能量节奏 / genres 流派 / openness 探索胆量），
 * 用于铺出初始歌单种子与默认探索强度。
 */
import type { Intensity } from '../types';

/** 情绪色彩：1 积极 / -1 低落 / 0 中性 */
export type ValencePref = 1 | 0 | -1;
/** 能量节奏：low / mid / high / wild */
export type ArousalPref = 'low' | 'mid' | 'high' | 'wild';

export interface SpriteOption {
  /** 固定选项值；「其他」固定为 '__other' */
  value: string;
  label: string;
  /** Oreo 选中后的一句话 */
  reply: string;
  valence: ValencePref;
  arousal: ArousalPref;
  /** 该选项暗示的流派 */
  genres?: string[];
}

export interface SpriteQuestion {
  id: string;
  emoji: string;
  line: string;
  options: SpriteOption[];
  customPrompt: string;
}

export const OTHER = '__other';

export const SPRITE_QUESTIONS: SpriteQuestion[] = [
  {
    id: 'genre',
    emoji: '💿',
    line: '喵～先从你走得最熟的那条路开始：歌单里被你翻来覆去听的，是哪一类？别怕说错，我只是想知道，你耳朵最常落脚的地方长什么样。',
    customPrompt: '写下你循环最多的那一类…',
    options: [
      {
        value: 'soul',
        label: '灵魂乐 · 深夜的深情',
        reply:
          '🎧 灵魂乐，深夜那一挂。好眼光——那种声音不吵，却能把人整个包住。像夜里的一盏小灯，我先把它记进地图。',
        valence: 0,
        arousal: 'mid',
        genres: ['Soul', 'R&B', 'Funk'],
      },
      {
        value: 'rock',
        label: '摇滚 · 吉他与鼓',
        reply:
          '🎸 摇滚。鼓点一响，人就醒了。这股劲儿我喜欢——像背包一甩就能上路，前方有什么都不怕。',
        valence: 0,
        arousal: 'high',
        genres: ['Rock', 'Alternative', 'Indie'],
      },
      {
        value: 'electronic',
        label: '电子 · 合成器脉动',
        reply:
          '🎛️ 电子。合成器的光一层层铺开，像夜里走过霓虹的街。你会喜欢那种被推着往前的感觉，对吧？这颗星我挂上了。',
        valence: 0,
        arousal: 'high',
        genres: ['Electronic', 'House', 'Synthwave'],
      },
      {
        value: 'folk',
        label: '民谣 · 木吉他与故事',
        reply:
          '🪵 民谣。木吉他和故事，慢慢讲也不着急。这是很稳的落脚点——走得再远，回头都找得到回家的路。',
        valence: 0,
        arousal: 'low',
        genres: ['Folk', 'Country', 'Blues'],
      },
    ],
  },
  {
    id: 'tempo',
    emoji: '🥁',
    line: '第二个问题。你偏爱的节奏走得多快？慢的像呼吸，快的像奔跑——你的心跳，习惯停在哪一档？',
    customPrompt: '写下你偏爱的节奏…',
    options: [
      {
        value: 'slow',
        label: '慢板 · 像呼吸',
        reply: '慢板。听得清呼吸，也听得见自己。走慢一点没关系，好风景本来就都在路上。',
        valence: 0,
        arousal: 'low',
      },
      {
        value: 'mid',
        label: '中板 · 正好走路',
        reply: '中板。不快不慢，正好走路——这种节奏最耐听，也最能陪你走很远。',
        valence: 0,
        arousal: 'mid',
      },
      {
        value: 'fast',
        label: '快板 · 想跑起来',
        reply: '快板，想跑起来的那种！那就别收着——前面正好有一整片旷野在等你。',
        valence: 0,
        arousal: 'high',
      },
      {
        value: 'varied',
        label: '多变 · 看当天',
        reply: '多变。那就都不设限——今天这样、明天那样。耳朵自由的人，往往最能撞见惊喜。',
        valence: 0,
        arousal: 'wild',
      },
    ],
  },
  {
    id: 'feeling',
    emoji: '🫧',
    line: '第三个。一首歌真正打动你的时候，通常让你怎么样？是想哭、想笑、想安静，还是浑身来劲？',
    customPrompt: '写下它让你怎么了…',
    options: [
      {
        value: 'cry',
        label: '想哭 · 被戳中',
        reply:
          '想哭。能让你哭出来的，都是好歌——它替你说了你没说出口的那句话。这份真诚我收好了，不轻放。',
        valence: -1,
        arousal: 'low',
        genres: ['Blues', 'Shoegaze'],
      },
      {
        value: 'smile',
        label: '想笑 · 跟着哼',
        reply: '想笑、会跟着哼的那种，最好听。快乐是会传染的——你看，我这就被你传染了。',
        valence: 1,
        arousal: 'mid',
        genres: ['Pop', 'Gospel'],
      },
      {
        value: 'calm',
        label: '安静 · 心沉下来',
        reply:
          '安静。能把心按下来的歌，像给情绪盖了条毯子。你要的从来不是热闹，是一个能安放的地方。',
        valence: 0,
        arousal: 'low',
        genres: ['Ambient', 'New Age', 'Classical'],
      },
      {
        value: 'rush',
        label: '想冲 · 浑身来劲',
        reply: '想冲，一开口就想冲出去！这股劲先存着——等会儿画地图的时候，正好用得上。',
        valence: 1,
        arousal: 'high',
        genres: ['Punk', 'EDM'],
      },
    ],
  },
  {
    id: 'tone',
    emoji: '🎨',
    line: '第四个。你偏爱什么样的底色？阳光下的明亮、旧毛衣一样的温暖、雨后的一点忧郁，还是深夜的冷冽？',
    customPrompt: '写下你偏爱的底色…',
    options: [
      {
        value: 'bright',
        label: '明亮 · 阳光下的',
        reply: '明亮。亮色的底子，走到哪儿都晒得到太阳。好，我在你的地图上留一片晴。',
        valence: 1,
        arousal: 'mid',
        genres: ['City Pop', 'Latin'],
      },
      {
        value: 'warm',
        label: '温暖 · 像旧毛衣',
        reply: '温暖。像旧毛衣，不扎人，也不声张——这种底色看着普通，却最能长久。',
        valence: 1,
        arousal: 'low',
        genres: ['Jazz', 'Lo-fi'],
      },
      {
        value: 'melancholy',
        label: '忧郁 · 雨后的',
        reply: '忧郁。带一点忧郁的底色，其实很好看——那不是坏天气，是一片有故事的天。',
        valence: -1,
        arousal: 'low',
        genres: ['Post-Rock', 'Grunge'],
      },
      {
        value: 'cold',
        label: '冷冽 · 深夜的',
        reply: '冷冽。像雨后的街，清醒、干净，还带着一点锋利。我喜欢这种不讨好的诚实。',
        valence: 0,
        arousal: 'low',
        genres: ['Ambient', 'Techno'],
      },
    ],
  },
  {
    id: 'moment',
    emoji: '🕰️',
    line: '最后一个问题。你最常在什么时候按下播放？清晨的路上、午后的独处、深夜的睡前，还是出门运动的时候？',
    customPrompt: '写下你最常听歌的时刻…',
    options: [
      {
        value: 'morning',
        label: '清晨 · 通勤路上',
        reply: '清晨。通勤路上需要一点提神——那是给一整天打底的声音，你选得很认真。',
        valence: 0,
        arousal: 'mid',
        genres: ['Pop', 'City Pop'],
      },
      {
        value: 'afternoon',
        label: '午后 · 一个人',
        reply: '午后，一个人的时候，慢一点正好。这段时光值得被好好配乐，我陪你一起。',
        valence: 0,
        arousal: 'low',
        genres: ['Lo-fi', 'Jazz', 'Chillhop'],
      },
      {
        value: 'night',
        label: '深夜 · 睡前',
        reply:
          '深夜。深夜的耳朵最诚实——白天不敢想的事，这会儿都冒出来了。别怕，我在这儿陪着你。',
        valence: 0,
        arousal: 'low',
        genres: ['Ambient', 'New Age', 'Classical'],
      },
      {
        value: 'workout',
        label: '运动 · 出门时',
        reply: '出门运动。得有劲，得能推着你往前——这类声音最适合在风里放，跑起来吧！',
        valence: 0,
        arousal: 'high',
        genres: ['EDM', 'House', 'Hip-Hop'],
      },
    ],
  },
];

export interface SpriteProfile {
  valence: ValencePref;
  arousal: ArousalPref;
  genres: string[];
  openness: Intensity;
  nickname?: string;
}

/** 把每题的作答累积成一份画像（宽松：取多数情绪、取最激进的节奏、流派去重） */
export function aggregateProfile(
  picks: Record<string, SpriteOption>,
): Omit<SpriteProfile, 'nickname'> {
  const opts = Object.values(picks).filter((o) => o && o.value !== OTHER);
  let valenceSum = 0;
  let arousal: ArousalPref = 'mid';
  const genres: string[] = [];

  for (const o of opts) {
    valenceSum += o.valence;
    const rank: Record<ArousalPref, number> = { low: 0, mid: 1, high: 2, wild: 3 };
    if (rank[o.arousal] > rank[arousal]) arousal = o.arousal;
    o.genres?.forEach((g) => { if (!genres.includes(g)) genres.push(g); });
  }

  const valence: ValencePref = valenceSum > 0 ? 1 : valenceSum < 0 ? -1 : 0;
  // 探索胆量由口味跨度推断：节奏越多变的耳朵，越愿意往外走
  const openness: Intensity = arousal === 'wild' ? 75 : 50;

  return { valence, arousal, genres: genres.slice(0, 4), openness };
}