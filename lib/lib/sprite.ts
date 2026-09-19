/**
 * 小精灵对话式建号 —— 题库与画像推导。
 * 5 个"探索音乐世界"的问题，每个含 4 个固定选项（value 固定）+ 隐藏的「其他」自填项。
 * 用户的回答会累积成一套音乐画像（情绪色彩 valence / 能量节奏 arousal / 流派口味 / 探索胆量），
 * 用于生成属于 TA 的听歌历史与默认探索强度。
 */
import type { Intensity } from '../types';

/** 情绪色彩：1 积极 / -1 低落 / 0 中性 */
export type ValencePref = 1 | 0 | -1;
/** 能量节奏：low / mid / high / wild（wild 会抬升探索胆量） */
export type ArousalPref = 'low' | 'mid' | 'high' | 'wild';

export interface SpriteOption {
  /** 固定选项值；「其他」固定为 '__other' */
  value: string;
  label: string;
  /** 小精灵选中后的俏皮回应 */
  reply: string;
  valence: ValencePref;
  arousal: ArousalPref;
  /** 该选项暗示的偏好流派（用于让历史更贴 TA 的口味） */
  genres?: string[];
  /** Q5 专用：探索胆量 */
  openness?: Intensity;
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
    id: 'q1',
    emoji: '🌆',
    line: '如果把你的今天配一首 BGM，此刻你更想被哪种声音包围？',
    customPrompt: '写下你想被什么样的声音包围…',
    options: [
      {
        value: 'coffee',
        label: '傍晚一杯热咖啡，热气升腾',
        reply: '☕ 好耶，是那种能把坏心情泡软的暖。',
        valence: 1,
        arousal: 'low',
        genres: ['Lo-fi', 'Jazz'],
      },
      {
        value: 'dance',
        label: '午夜舞池，灯球开始旋转',
        reply: '🪩 身体先动起来，世界晚点再说。',
        valence: 1,
        arousal: 'wild',
        genres: ['House', 'Techno', 'K-pop'],
      },
      {
        value: 'soul',
        label: '深夜地铁，耳机里的深情演唱',
        reply: '🎧 有些歌是呼吸，有些歌是心跳。',
        valence: 0,
        arousal: 'mid',
        genres: ['Soul', 'R&B'],
      },
      {
        value: 'seaside',
        label: '无人的海边，只有风与浪',
        reply: '🌊 安静，但不空洞的那种辽阔。',
        valence: -1,
        arousal: 'low',
        genres: ['Ambient', 'Post-Rock', 'New Age'],
      },
    ],
  },
  {
    id: 'q2',
    emoji: '🥁',
    line: '你的心跳，此刻想跟紧哪种节拍？',
    customPrompt: '告诉我你想要的节奏…',
    options: [
      {
        value: 'walk',
        label: '慢悠悠的散步节拍',
        reply: '散步党，世界转慢一点也没关系。',
        valence: 0,
        arousal: 'low',
      },
      {
        value: 'nod',
        label: '适中律动，边走边点头',
        reply: '刚刚好，松弛又带着节奏。',
        valence: 0,
        arousal: 'mid',
      },
      {
        value: 'sprint',
        label: '高铁般的冲刺感',
        reply: '冲刺模式，肾上腺先到站。',
        valence: 0,
        arousal: 'high',
      },
      {
        value: 'moody',
        label: '忽快忽慢，全看心情',
        reply: '心情即节奏，下一秒谁也不知道。',
        valence: 0,
        arousal: 'wild',
      },
    ],
  },
  {
    id: 'q3',
    emoji: '🎭',
    line: '此刻你最想被触动的情绪，是哪一种？',
    customPrompt: '描述你此刻的情绪…',
    options: [
      {
        value: 'warm',
        label: '温暖治愈，像下午三点的太阳',
        reply: '大大的暖意，先收进歌单再说。',
        valence: 1,
        arousal: 'low',
        genres: ['Pop', 'Gospel', 'Folk'],
      },
      {
        value: 'blue',
        label: '略带忧郁的浪漫',
        reply: '那种忧郁也很美，我懂。',
        valence: -1,
        arousal: 'low',
        genres: ['Blues', 'Shoegaze', 'Lo-fi'],
      },
      {
        value: 'zen',
        label: '平静释然，什么都不想追究',
        reply: '归于平静，呼吸也跟着变长。',
        valence: 0,
        arousal: 'low',
        genres: ['Ambient', 'New Age', 'Classical'],
      },
      {
        value: 'blaze',
        label: '狂喜爆发，想把开心喊出来',
        reply: '那就别藏了，一起喊出来！',
        valence: 1,
        arousal: 'high',
        genres: ['Punk', 'K-pop', 'EDM'],
      },
    ],
  },
  {
    id: 'q4',
    emoji: '🍽️',
    line: '如果只能冲进一家「声音食堂」，你会直奔哪家？',
    customPrompt: '写下你最爱的那家声音食堂…',
    options: [
      {
        value: 'cafeshop',
        label: '☕ 咖啡因馆（Lo-fi / Chillhop / Jazz）',
        reply: '咖啡因馆老主顾，氛围感拉满。',
        valence: 0,
        arousal: 'low',
        genres: ['Lo-fi', 'Chillhop', 'Jazz'],
      },
      {
        value: 'neonclub',
        label: '🪩 霓虹电子俱乐部（House / Synthwave）',
        reply: '俱乐部的霓虹灯认得你的脚步。',
        valence: 0,
        arousal: 'high',
        genres: ['Electronic', 'House', 'Synthwave'],
      },
      {
        value: 'vinyl',
        label: '📀 街头黑胶唱片行（Hip-Hop / R&B / Soul）',
        reply: '黑胶的沙沙声，是时代的温柔。',
        valence: 0,
        arousal: 'mid',
        genres: ['Hip-Hop', 'R&B', 'Soul', 'Funk'],
      },
      {
        value: 'campfire',
        label: '🏕️ 山野篝火营（Folk / Country / Blues）',
        reply: '篝火边的木吉他，慵懒又诚实。',
        valence: -1,
        arousal: 'low',
        genres: ['Folk', 'Country', 'Blues', 'Rock'],
      },
    ],
  },
  {
    id: 'q5',
    emoji: '🪄',
    line: '你会允许小精灵带你，在你的音乐宇宙里走多远？',
    customPrompt: '告诉我想走的路…',
    options: [
      {
        value: 'nearby',
        label: '就在我熟悉的地方附近散步',
        reply: '稳扎稳打，先守住自己喜欢的一亩三分地。',
        valence: 0,
        arousal: 'low',
        openness: 25, // 保守贴身（0-100 探索强度）
      },
      {
        value: 'block',
        label: '偶尔绕到隔壁街区看看',
        reply: '老地方保留，但新街区的风景也想瞄一眼。',
        valence: 0,
        arousal: 'mid',
        openness: 50, // 平衡
      },
      {
        value: 'far',
        label: '放手，带我去我没去过的地方',
        reply: '勇敢的小耳朵，未知的旋律正在等你。',
        valence: 0,
        arousal: 'high',
        openness: 75, // 野探
      },
      {
        value: 'explain',
        label: '先告诉我为什么，再带我走',
        reply: '好奇心拉满，每步都要明白走向何方。',
        valence: 0,
        arousal: 'mid',
        openness: 50, // 平衡
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

/** 把每题的作答累积成一份画像（宽松：选多个就取多数/取和最激进的） */
export function aggregateProfile(
  picks: Record<string, SpriteOption>,
): Omit<SpriteProfile, 'nickname'> {
  const opts = Object.values(picks).filter((o) => o && o.value !== OTHER);
  let valenceSum = 0;
  let arousal: ArousalPref = 'mid';
  const genres: string[] = [];
  let openness: Intensity | undefined;

  for (const o of opts) {
    valenceSum += o.valence;
    const rank: Record<ArousalPref, number> = { low: 0, mid: 1, high: 2, wild: 3 };
    if (rank[o.arousal] > rank[arousal]) arousal = o.arousal;
    o.genres?.forEach((g) => { if (!genres.includes(g)) genres.push(g); });
    if (o.openness) openness = o.openness;
  }

  const valence: ValencePref = valenceSum > 0 ? 1 : valenceSum < 0 ? -1 : 0;
  // 「wild」抬升探索胆量，至少到平衡（>25）
  let finalOpenness: Intensity = openness ?? 50;
  if (arousal === 'wild' && finalOpenness <= 25) finalOpenness = 50;

  return { valence, arousal, genres: genres.slice(0, 4), openness: finalOpenness };
}