'use client';

/**
 * 开场：一本摊开的日记本（左页 slogan · 右页正文），即"那本书"本身。
 * 日期随真实系统时间变化，天气随登录 IP 的当日天气变化。
 * 点击按钮后，这本书的右页自己快速翻过几页，最后停在欢迎页，镜头推近，进入音乐世界。
 * 整个转场都发生在这本书上，不另外生成新界面，保证丝滑。
 */
import { useEffect, useMemo, useState } from 'react';

interface Props {
  onEnter: () => void;
  fading?: boolean;
}

const MONTHS = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'];
const WEEKS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

/** 中文数字日期，如 9 月 19 日 -> 「九月十九」 */
function dayCn(n: number): string {
  const u = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return u[n];
  if (n === 10) return '十';
  if (n < 20) return '十' + (u[n % 10] ?? '');
  const ten = Math.floor(n / 10);
  const one = n % 10;
  return u[ten] + '十' + (one ? u[one] : '');
}

function formatDate(d: Date): string {
  return `${MONTHS[d.getMonth()]}${dayCn(d.getDate())} · ${WEEKS[d.getDay()]}`;
}

/** wttr.in weatherCode -> 中文（lang_zh 实际返回英文，只认 weatherCode） */
const WEATHER_ZH: Record<string, string> = {
  '113': '晴', '116': '多云', '119': '阴', '122': '阴',
  '143': '雾', '248': '雾', '260': '冻雾',
  '176': '小阵雨', '263': '小雨', '266': '小雨', '293': '小雨', '296': '小雨',
  '299': '中雨', '302': '中雨', '305': '大雨', '308': '大雨', '311': '冻雨', '314': '冻雨',
  '317': '小冻雨', '320': '雨夹雪', '323': '小雪', '326': '小雪', '329': '中雪', '332': '中雪',
  '335': '大雪', '338': '大雪', '350': '冻雨', '353': '阵雨', '356': '阵雨', '359': '大雨',
  '362': '小雷阵雨', '365': '雷阵雨', '368': '雨夹雪', '371': '冻雨', '374': '冻雨', '377': '冻雨',
  '386': '雷阵雨', '389': '雷阵雨', '392': '小雷雪', '395': '强雷雪',
};

/** 过渡页上的短句（每翻一页换一句，像翻到不同的日记） */
const TRANSITION_LINES = [
  '把心事，交给一页纸。',
  '把耳朵，交给风。',
  '有些歌一响，',
];

function pageStyle(delay: string, dur: string): React.CSSProperties {
  return { '--delay': delay, '--dur': dur } as React.CSSProperties;
}

export default function OpeningScreen({ onEnter, fading = false }: Props) {
  // 真实日期（mount 后再取，避免 hydration 不一致）
  const [dateStr, setDateStr] = useState<string | null>(null);
  // 登录 IP 当日天气
  const [weather, setWeather] = useState<string | null>(null);

  useEffect(() => {
    setDateStr(formatDate(new Date()));

    let alive = true;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    fetch('https://wttr.in/?format=j1&lang=zh', { signal: ctrl.signal })
      .then((r) => r.json())
      .then((j: { current_condition?: Array<{ lang_zh?: Array<{ value: string }>; weatherDesc?: Array<{ value: string }>; weatherCode?: string; temp_C?: string }> }) => {
        const cc = j?.current_condition?.[0];
        if (!alive || !cc) return;
        const zh = (cc.lang_zh?.[0]?.value ?? '').replace(/[,，]\s*$/, '');
        const text = /\p{Script=Han}/u.test(zh) ? zh : (WEATHER_ZH[cc.weatherCode ?? ''] || '');
        const t = cc.temp_C;
        setWeather([text, t != null ? `${t}°` : null].filter(Boolean).join('，') || null);
      })
      .catch(() => {
        /* 无网/被墙时仅显示日期 */
      })
      .finally(() => clearTimeout(timer));
    return () => {
      alive = false;
      ctrl.abort();
      clearTimeout(timer);
    };
  }, []);

  const dateLine = dateStr ? (weather ? `${dateStr} · ${weather}` : dateStr) : '';

  // 翻页过渡页（3 张，都在书的右页位置上依次翻过）
  const transitionPages = useMemo(
    () => TRANSITION_LINES.map((line, i) => ({
      id: i,
      line,
      delay: `${0.08 + i * 0.1}s`,
      dur: '0.32s',
    })),
    [],
  );

  return (
    <div className={`opening-screen${fading ? ' opening-fade' : ''}`}>
      <div className="opening-dust" aria-hidden />

      <div className="diary-stage">
        {/* 书签带 */}
        <span className="ribbon" aria-hidden />

        <div className="diary">
          {/* 封面（入场时合着，翻开后露出左右页） */}
          <div className="book-cover">
            <div className="book-cover-face book-cover-front">
              <svg width="48" height="48" viewBox="0 0 52 52" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
                <path d="M40 10a6.4 6.4 0 1 0 4.6 8.2A5 5 0 0 1 40 10Z" />
                <path d="M6 36 L15 22 L23 30 L31 18 L40 30 L46 26" />
                <path d="M8 44 H44" opacity="0.55" />
                <circle cx="27" cy="12" r="1.7" fill="currentColor" stroke="none" />
              </svg>
              <div className="mt-3 text-center">
                <h2 className="text-3xl leading-tight tracking-[0.14em]">闻野</h2>
                <p className="mt-2 text-[11px] uppercase tracking-[0.32em] opacity-70">OpenEar</p>
              </div>
              <div className="mt-4 h-px w-16 bg-current opacity-40" />
              <p className="mt-3 text-sm opacity-85">我的音乐手记</p>
            </div>
          </div>

          {/* 左页：深色磨砂 · 品牌 Slogan */}
          <div className="diary-page-left">
            <p className="text-[13px] tracking-[0.34em] uppercase opacity-70">OpenEar</p>
            <p className="mt-3 text-[18px] leading-relaxed">
              愿每一次出发，
              <br />
              都有一首歌，<br />
              接住你。
            </p>
          </div>

          {/* 右页：多页堆叠（都在这本书里翻，不另生成界面） */}
          <div className="diary-pages">
            {/* 第 1 页：序 · 给耳朵的一封信（初始显示） */}
            <div className="diary-page diary-page-cover">
              <p className="text-[13px] tracking-wide text-[#7b6f57]">{dateLine || '· · ·'}</p>

              <h1 className="mt-3 text-2xl leading-tight text-[#34402f]">序 · 给耳朵的一封信</h1>

              <div className="paper-ruled mt-4 flex-1 text-[15px] leading-[34px] text-[#4b4537]">
                <p>今天，想去没有天花板的地方。</p>
                <p>把心事交给风，</p>
                <p>把耳朵交给旷野。</p>
                <p>有些歌一响，</p>
                <p>人，就到了山的那一边。</p>
              </div>

              <div className="mt-5 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={onEnter}
                  className="enter-btn -translate-y-0.5 rounded-full bg-gradient-to-r from-[#2f4030] to-[#4a5f43] px-6 py-3 text-[15px] text-[#f5edd8] transition-transform hover:-translate-y-1 hover:scale-[1.03] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#5a6f52]"
                >
                  推开这页 · 走进音乐世界
                </button>
                <span className="text-[11px] text-[#9a8e75]">闻野 OpenEar · 愿你有歌可依</span>
              </div>
            </div>

            {/* 第 2~4 页：过渡页（快速翻过，每页一句） */}
            {transitionPages.map((p, i) => (
              <div
                key={p.id}
                className="diary-page diary-page-flip"
                style={pageStyle(p.delay, p.dur)}
                data-index={i}
              >
                <p className="text-center text-[16px] leading-relaxed text-[#5a5344]">{p.line}</p>
              </div>
            ))}

            {/* 最后一页：翻完后定格的空白页（不留任何内容） */}
            <div className="diary-page diary-page-final" />
          </div>
        </div>
      </div>
    </div>
  );
}