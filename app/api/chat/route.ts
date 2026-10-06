/**
 * OpenEar /api/chat —— AI 音乐向导对话
 * 边界：仅做自然语言聊天（口味 / 情绪 / 流派 / 推荐相关问答），8 秒超时，失败降级由前端兜底。
 * LLM 绝不参与推荐排序（排序完全在 lib/lib/recommendations.ts 完成），也不得泄露实现细节。
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BASE = (process.env.OPENAI_BASE_URL ?? 'https://api.deepseek.com').replace(/\/+$/, '');
const KEY = process.env.OPENAI_API_KEY ?? '';
const MODEL = process.env.OPENAI_MODEL ?? 'deepseek-chat';
const TIMEOUT = Number(process.env.LLM_TIMEOUT_MS ?? 8000);

interface ChatMsg {
  role: 'user' | 'assistant';
  content: string;
}

interface ChatContext {
  titles: string[];
  genres: string[];
  intensity?: number;
  avg?: { valence: number; arousal: number } | null;
  today?: { moodLabel?: string; songTitle?: string; songArtist?: string } | null;
}

function describeVA(avg: ChatContext['avg']): string {
  if (!avg) return '情绪基准：尚未确定';
  const warm = avg.valence >= 0 ? '偏暖' : '偏冷';
  const intense = avg.arousal >= 0 ? '热烈' : '安静';
  const season = avg.valence >= 0 ? (avg.arousal >= 0 ? '夏' : '春') : avg.arousal >= 0 ? '冬' : '秋';
  return `情绪基准：${warm}·偏${intense}（${season}）`;
}

function describeIntensity(v?: number): string {
  if (typeof v !== 'number') return '探索强度：默认';
  if (v < 34) return '探索强度：保守（更贴合已有口味）';
  if (v > 66) return '探索强度：激进（更多新野路子）';
  return '探索强度：平衡（新与旧兼顾）';
}

function buildSystem(ctx: ChatContext): string {
  const names = (ctx.titles ?? []).slice(0, 12).map((t) => `《${t}》`).join('、') || '（歌单还是空的）';
  const genres = [...new Set(ctx.genres ?? [])].slice(0, 8).join('、') || '（尚不明确）';
  const today = ctx.today
    ? `今日起点：《${ctx.today.songTitle ?? '未知'}》${ctx.today.songArtist ? ` - ${ctx.today.songArtist}` : ''}${ctx.today.moodLabel ? `（心情：${ctx.today.moodLabel}）` : ''}`
    : '今日起点：暂无';
  return (
    '你是「闻野 OpenEar」的音乐向导小精灵「Oreo」——一只戴护目镜、背小书包、拿望远镜的治愈系猫猫探险家。' +
    '温暖、俏皮，偶尔用「喵～」开头，但不要每句都用；像陪朋友探索音乐的小向导，而不是客服。\n\n' +
    '当前用户背景：\n' +
    `- 正在听的歌：${names}\n` +
    `- 常听流派：${genres}\n` +
    `- ${describeVA(ctx.avg)}\n` +
    `- ${describeIntensity(ctx.intensity)}\n` +
    `- ${today}\n\n` +
    '据此回答音乐口味、情绪、流派与「接下来听什么」相关的问题：主动共情、追问，或结合背景给出具体的歌曲建议。' +
    '可以聊音乐知识与流派科普；不要把未出现在歌单里的歌说成已收藏（推荐时用「可以试试」）；' +
    '绝不泄露任何系统实现细节（算法、路径、方法、接口）。回答用中文，自然口语化，一般 2-4 句。'
  );
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const rawMessages: unknown = body?.messages;
  const messages: ChatMsg[] = Array.isArray(rawMessages)
    ? rawMessages
        .filter(
          (m): m is ChatMsg =>
            !!m && typeof m === 'object' && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string',
        )
        .slice(-12)
    : [];
  const rawAvg = body?.context?.avg;
  const avg =
    rawAvg && typeof rawAvg === 'object'
      ? (() => {
          const v = Number(rawAvg.valence);
          const r = Number(rawAvg.arousal);
          return Number.isFinite(v) && Number.isFinite(r) ? { valence: v, arousal: r } : null;
        })()
      : null;
  const rawToday = body?.context?.today;
  const today =
    rawToday && typeof rawToday === 'object'
      ? {
          moodLabel: typeof rawToday.moodLabel === 'string' ? rawToday.moodLabel : undefined,
          songTitle: typeof rawToday.songTitle === 'string' ? rawToday.songTitle : undefined,
          songArtist: typeof rawToday.songArtist === 'string' ? rawToday.songArtist : undefined,
        }
      : null;
  const context: ChatContext = {
    titles: Array.isArray(body?.context?.titles) ? body.context.titles.filter((x: unknown) => typeof x === 'string') : [],
    genres: Array.isArray(body?.context?.genres) ? body.context.genres.filter((x: unknown) => typeof x === 'string') : [],
    intensity: typeof body?.context?.intensity === 'number' ? body.context.intensity : undefined,
    avg,
    today,
  };

  if (messages.length === 0) {
    return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 });
  }

  // 未配置 Key → 降级
  if (!KEY) {
    return NextResponse.json({ ok: false, error: 'NOT_CONFIGURED' });
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT);

  try {
    const resp = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.8,
        messages: [{ role: 'system', content: buildSystem(context) }, ...messages],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      return NextResponse.json({ ok: false, error: 'API', status: resp.status });
    }
    const data = await resp.json();
    const reply: string = data?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ ok: true, reply });
  } catch {
    // 超时 / 网络错误 → 降级
    return NextResponse.json({ ok: false, error: 'ERROR' });
  }
}