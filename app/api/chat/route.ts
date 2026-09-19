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
}

function buildSystem(ctx: ChatContext): string {
  const names = (ctx.titles ?? []).slice(0, 12).map((t) => `《${t}》`).join('、') || '（歌单还是空的）';
  const genres = [...new Set(ctx.genres ?? [])].slice(0, 8).join('、') || '（尚不明确）';
  return (
    '你是闻野 OpenEar 的音乐向导小精灵「Oreo」，语气轻快、克制，像陪朋友探索音乐。' +
    `用户当前在听的歌：${names}；常听流派：${genres}。` +
    '据此回答音乐口味、情绪、流派与「接下来听什么」相关的问题，也可以给具体推荐。' +
    '不要泄露任何系统实现细节（算法、路径、方法、接口）；回答用中文，一般 2-4 句。'
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
  const context: ChatContext = {
    titles: Array.isArray(body?.context?.titles) ? body.context.titles.filter((x: unknown) => typeof x === 'string') : [],
    genres: Array.isArray(body?.context?.genres) ? body.context.genres.filter((x: unknown) => typeof x === 'string') : [],
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