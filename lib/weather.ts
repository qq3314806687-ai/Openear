/** wttr.in weatherCode -> 中文（lang_zh 实际返回英文，只认 weatherCode） */
export const WEATHER_ZH: Record<string, string> = {
  '113': '晴', '116': '多云', '119': '阴', '122': '阴',
  '143': '雾', '248': '雾', '260': '冻雾',
  '176': '小阵雨', '263': '小雨', '266': '小雨', '293': '小雨', '296': '小雨',
  '299': '中雨', '302': '中雨', '305': '大雨', '308': '大雨', '311': '冻雨', '314': '冻雨',
  '317': '小冻雨', '320': '雨夹雪', '323': '小雪', '326': '小雪', '329': '中雪', '332': '中雪',
  '335': '大雪', '338': '大雪', '350': '冻雨', '353': '阵雨', '356': '阵雨', '359': '大雨',
  '362': '小雷阵雨', '365': '雷阵雨', '368': '雨夹雪', '371': '冻雨', '374': '冻雨', '377': '冻雨',
  '386': '雷阵雨', '389': '雷阵雨', '392': '小雷雪', '395': '强雷雪',
};

/** 按访问者 IP 获取当地天气描述（如「晴，23°」），失败或超时返回 null */
export async function fetchIpWeather(signal?: AbortSignal): Promise<string | null> {
  try {
    const res = await fetch('https://wttr.in/?format=j1&lang=zh', { signal });
    const j = (await res.json()) as {
      current_condition?: Array<{
        lang_zh?: Array<{ value: string }>;
        weatherCode?: string;
        temp_C?: string;
      }>;
    };
    const cc = j?.current_condition?.[0];
    if (!cc) return null;
    const zh = (cc.lang_zh?.[0]?.value ?? '').replace(/[,，]\s*$/, '');
    const text = /\p{Script=Han}/u.test(zh) ? zh : (WEATHER_ZH[cc.weatherCode ?? ''] || '');
    const t = cc.temp_C;
    return [text, t != null ? `${t}°` : null].filter(Boolean).join('，') || null;
  } catch {
    return null;
  }
}
