/**
 * 音频转发代理：/api/audio?url=<encoded>
 * 解决浏览器直接播放第三方音频时的两类问题：
 *  - 防盗链（QQ/网易云校验 Referer / User-Agent）
 *  - 跨域（CORS）导致的加载被拦截
 * 服务端 fetch 转发，并透传 Range 以支持 <audio> 进度拖动。
 */
import { NextRequest } from 'next/server';
import { resolveAudioUrl, refererFor } from '@/lib/lib/audio';

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('url');
  if (!raw) return new Response('missing url', { status: 400, statusText: 'Bad Request' });

  const target = resolveAudioUrl(raw).url;
  if (!/^https?:\/\//i.test(target)) {
    return new Response('unsupported url', { status: 400, statusText: 'Bad Request' });
  }

  const headers = new Headers();
  headers.set(
    'User-Agent',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36',
  );
  headers.set('Accept', 'audio/*,*/*;q=0.8');
  const ref = refererFor(target);
  if (ref) headers.set('Referer', ref);
  const range = req.headers.get('range');
  if (range) headers.set('Range', range);

  try {
    const up = await fetch(target, {
      headers,
      redirect: 'follow',
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const out: Record<string, string> = {
      'Content-Type': up.headers.get('content-type') ?? 'audio/mpeg',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
    };
    const cr = up.headers.get('content-range');
    const cl = up.headers.get('content-length');
    const ar = up.headers.get('accept-ranges');
    if (cr) out['Content-Range'] = cr;
    if (cl) out['Content-Length'] = cl;
    if (ar) out['Accept-Ranges'] = ar;
    return new Response(up.body, { status: up.status, headers: out });
  } catch {
    return new Response('proxy failed', { status: 502, statusText: 'Bad Gateway' });
  }
}