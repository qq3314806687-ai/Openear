'use client';

/**
 * 晨雾原野横幅背景：黑胶唱机视频（慢速 0.6x 循环）+ 本地海报兜底。
 * 外部视频被墙/超时时回落到海报首帧，黑色卡底保证文字可读。
 */
import { useEffect, useRef } from 'react';

const VIDEO_URL = 'https://motionsites.org/assets/prompt-media/fdf088e281c69fca93f9.mp4';
const POSTER_URL = '/poster-vinyl.webp';

export default function FieldBannerVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (v) v.playbackRate = 0.6;
  }, []);

  return (
    <video
      ref={ref}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      poster={POSTER_URL}
      aria-hidden
      className="h-full w-full object-cover"
    >
      <source src={VIDEO_URL} type="video/mp4" />
    </video>
  );
}
