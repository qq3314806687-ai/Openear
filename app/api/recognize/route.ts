/**
 * OpenEar /api/recognize —— 从播放截图里读歌曲信息（歌名 / 歌手 / 风格）
 * 边界：只做一次视觉识别，返回三个字段；识别不到就返回空字段，
 * 由前端决定降级，绝不让整条上传流程失败。
 * 该接口不参与任何排序或推荐逻辑。
 */
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const BASE = (process.env.OPENAI_BASE_URL ?? 'https://api.deepseek.com').replace(/\/+$/, '');
const KEY = process.env.OPENAI_API_KEY ?? '';
const MODEL = process.env.VISION_MODEL ?? 'deepseek-flash';
const TIMEOUT = Number(process.env.VISION_TIMEOUT_MS ?? 15000);

const PROMPT = `这是一张音乐 App 的截图（可能是播放页、歌单页、分享卡片或歌词页）。
请只提取截图里真实出现的信息，不要猜测、不要改写、不要补充截图里没有的内容：

- title：歌曲名
- artist：歌手 / 演唱者（截图里没有就留空字符串）
- genre：音乐风格。截图里写了就用截图里的；没写就按你对这首歌的了解填一个最接近的风格；不确定就留空字符串

只输出一个 JSON 对象，形如 {"title":"","artist":"","genre":""}。
不要解释、不要 markdown 代码块、不要多余文字。
如果截图里根本没有歌曲信息，三个字段全部留空字符串。`;

/** 从模型输出里抠出第一个 JSON 对象（容忍 ```json 围栏与前后噪音） */
function extractJsonObject(text: string): Record<string, unknown> | null {
  const clean = text.replace(/```json/gi, '').replace(/```/g, '').trim();
  const m = clean.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const obj = JSON.parse(m[0]);
    return obj && typeof obj === 'object' ? (obj as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** 收窄成短字段：去掉多余空白，超长截断 */
function field(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  const s = v.trim().replace(/\s+/g, ' ');
  return s.length > max ? s.slice(0, max) : s;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const image = typeof body?.image === 'string' ? body.image : '';
  if (!image.startsWith('data:image/')) {
    return NextResponse.json({ ok: false, error: 'NO_IMAGE' }, { status: 400 });
  }

  // 未配置 Key → 降级（前端将回退到示例曲库）
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
        temperature: 0,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: image, detail: 'high' } },
            ],
          },
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
    const parsed = extractJsonObject(content);
    if (!parsed) {
      return NextResponse.json({ ok: false, error: 'PARSE' });
    }

    return NextResponse.json({
      ok: true,
      song: {
        title: field(parsed.title, 80),
        artist: field(parsed.artist, 80),
        genre: field(parsed.genre, 40),
      },
    });
  } catch {
    // 超时 / 网络错误 → 降级，由前端回退示例曲库
    return NextResponse.json({ ok: false, error: 'ERROR' });
  }
}