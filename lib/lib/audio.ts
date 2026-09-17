/**
 * 音频链接解析：把用户粘贴的各种链接归一成"可被 <audio> 播放的原始地址"。
 * - 网易云：网页分享链接 → 公开外层播放地址（部分版权受限曲目仍可能失败）
 * - QQ 音乐：提取 songmid → 免登录试播地址（通常需登录签名，成功率不保证）
 * - 其余直链（.mp3/.m4a/.ogg/...）或 data:/blob: → 原样返回
 * 纯函数，无 DOM / window 依赖，可被客户端与服务端共用。
 */
const AUDIO_EXTS = /\.(m4a|mp3|aac|oga|ogg|opus|flac|wav)([?#].*)?$/i;

export interface AudioResolution {
  url: string;
  note?: string;
}

/** 归一化用户输入的链接为可请求的音频地址 */
export function resolveAudioUrl(input: string): AudioResolution {
  const s = input.trim();

  // 本地 / 内存数据，直接可播
  if (/^(data:|blob:|sound:)/i.test(s)) return { url: s };
  if (!/^https?:\/\/.+/i.test(s)) return { url: s, note: '无法识别的链接格式' };

  // —— 网易云 ——
  // https://music.163.com/#/song?id=xxx / /song?id=xxx / /song/xxx
  const ncmQId = s.match(/music\.163\.com[^"'\s]*[?&]id=(\d{5,})/i)?.[1];
  const ncmPath = s.match(/music\.163\.com[^"'\s]*\/song\/(\d{5,})/i)?.[1];
  if (ncmQId || ncmPath) {
    const id = ncmQId || ncmPath!;
    return {
      url: `https://music.163.com/song/media/outer/url?id=${id}.mp3`,
      note: '网易云（版权受限曲目可能失效）',
    };
  }

  // —— QQ 音乐 ——
  // https://y.qq.com/n/ryqq/songDetail/003OUlho2HcRHC / x?songmid=xxx
  const qqSongmid = s.match(/songDetail\/([0-9A-Za-z]{4,})/i)?.[1]
    || s.match(/songmid=([0-9A-Za-z]{4,})/i)?.[1];
  if (qqSongmid) {
    const guid = Math.floor(2147483647 * Math.random()).toString();
    return {
      url: `https://ws.stream.qqmusic.qq.com/C100${qqSongmid}.m4a?fromtag=0&guid=${guid}&V=0&type=0`,
      note: 'QQ 音乐（需登录签名，常有时效/失效，建议下载后上传文件）',
    };
  }

  // 明确的音频直链，原样返回
  if (AUDIO_EXTS.test(s)) return { url: s };

  return { url: s, note: '看起来不是标准音频直链，可能无法直接播放' };
}

/** 反防盗链所需的 Referer（按目标域名推断） */
export function refererFor(url: string): string {
  if (/163\.com/i.test(url)) return 'https://music.163.com/';
  if (/qqmusic\.com|y\.qq\.com/i.test(url)) return 'https://y.qq.com/';
  return '';
}