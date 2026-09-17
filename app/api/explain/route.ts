/**
 * OpenEar /api/explain —— LLM 推荐理由润色
 * 边界：仅接收规则理由标签 → 融合为 50 字内自然语言；失败/未配置时降级。
 * LLM 绝不参与推荐排序（排序完全在 lib/lib/recommendations.ts 完成）。
 */
import { NextResponse } from 'next/server';
import type { Recommendation } from '@/lib/types';

export const runtime = 'nodejs';

const BASE = (process.env.OPENAI_BASE_URL ?? 'https://api.deepseek.com').replace(/\/+$/, '');
const KEY = process.env.OPENAI_API_KEY ?? '';
const MODEL = process.env.OPENAI_MODEL ?? 'deepseek-chat';
const TIMEOUT = Number(process.env.LLM_TIMEOUT_MS ?? 8000);

interface ExplainItem {
  title: string;
  artist: string;
  genre: string;
  reasonTags: Recommendation['reasonTags'];
}

function buildPrompt(items: ExplainItem[]): string {
  const list = items
    .map(
      (it, i) =>
        `${i + 1}.《${it.title}》- ${it.artist}（${it.genre}）\n` +
        `   技术:${it.reasonTags.technical}\n` +
        `   情绪:${it.reasonTags.emotional}\n` +
        `   行为:${it.reasonTags.behavioral}`,
    )
    .join('\n\n');

  return (
    `请为下面 ${items.length} 首歌各生成一句 50 字以内的自然中文推荐理由：` +
    `把"技术 / 情绪 / 行为"三层信息融合成连贯的一段话，点出为什么推荐、情绪如何过渡、与用户听歌习惯的关系。` +
    `不要任何解释、序号或 markdown，只输出一个 JSON 字符串数组，元素顺序与输入一一对应。\n\n` +
    `---输入---\n${list}`
  );
}

/** 从模型输出中提取 JSON 数组（容忍 ```json 围栏与前后噪音） */
function extractJsonArray(text: string): string[] | null {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const m = clean.match(/\[[\s\S]*\]/);
  if (!m) return null;
  try {
    const arr = JSON.parse(m[0]);
    return Array.isArray(arr) ? arr.filter((x) => typeof x === 'string') : null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const items: ExplainItem[] = Array.isArray(body?.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json({ ok: false, error: 'EMPTY' }, { status: 400 });
  }

  // 未配置 Key → 降级（前端将回退到规则理由文本）
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
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: '你是音乐推荐文案助手，擅长把结构化理由自然流畅地融合成一句人话。',
          },
          { role: 'user', content: buildPrompt(items) },
        ],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!resp.ok) {
      return NextResponse.json({ ok: false, error: 'API', status: resp.status });
    }
    const data = await resp.json();
    const content: string = data?.choices?.[0]?.message?.content ?? '';
    const polished = extractJsonArray(content) ?? [];
    return NextResponse.json({ ok: true, polished });
  } catch {
    // 超时 / 网络错误 → 降级，由前端回退规则文本
    return NextResponse.json({ ok: false, error: 'ERROR' });
  }
}