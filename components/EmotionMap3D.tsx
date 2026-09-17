'use client';

/**
 * CSS 3D 情绪边界地图（零依赖，纯 CSS 变换 + 指针拖动）
 * 以「用户红心歌单」为真实地形：每首歌一根彩柱。
 * 世界坐标：X=Valence(情绪色彩) · Y=Arousal(越高越兴奋) · Z=Energy(纵深)
 * - 彩色柱 = 你歌单里的歌（带光晕的可直接试听）
 * - 地面荧光小圈 = 算法为你推荐的下一站
 * - 红圈 = 未探索空白区：点击 → 推荐该地带的歌并尝试播放
 */
import { useMemo, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import type { Song } from '@/lib/types';
import { BLANK_ZONES } from '@/lib/lib/metrics';

const W = 360;
const D = 270;
const HMAX = 150;
const TILT = -58;

interface Props {
  songs: Song[];
  candidates: Song[];
  activeZoneId: string | null;
  onZoneSelect: (id: string) => void;
  onPlaySong: (song: Song) => void;
}

function pos(v: number, e: number) {
  return { x: (v - 0.5) * W, z: (e - 0.5) * D };
}

export default function EmotionMap3D({
  songs,
  candidates,
  activeZoneId,
  onZoneSelect,
  onPlaySong,
}: Props) {
  const [rot, setRot] = useState({ rx: TILT, ry: 0 });
  const [hover, setHover] = useState<Song | null>(null);
  const drag = useRef<{ on: boolean; x: number; y: number }>({ on: false, x: 0, y: 0 });

  const sceneStyle = { transform: `rotateX(${rot.rx}deg) rotateY(${rot.ry}deg)` };

  const onDown = (e: React.PointerEvent) => {
    drag.current = { on: true, x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current.on) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { on: true, x: e.clientX, y: e.clientY };
    setRot((r) => ({
      rx: Math.max(-85, Math.min(-25, r.rx + dy * 0.45)),
      ry: Math.max(-28, Math.min(46, r.ry + dx * 0.45)),
    }));
  };
  const onUp = () => (drag.current.on = false);

  return (
    <div className="relative h-[320px] w-full select-none overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-violet-500/8 to-transparent">
      <div
        className="absolute inset-0 touch-none"
        style={{ perspective: '1100px' }}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerLeave={onUp}
      >
        <div
          className="absolute left-1/2 top-1/2"
          style={{ transformStyle: 'preserve-3d', ...sceneStyle, transition: drag.current.on ? 'none' : 'transform 0.3s ease' }}
        >
          {/* 地面格栅（Valence × Energy） */}
          <div
            className="absolute grid-floor-3d"
            style={{ width: W, height: D, transform: `translate3d(${-W / 2}px, 0, ${-D / 2}px)` }}
          />

          {/* 空白区（可点红圈） */}
          {BLANK_ZONES.map((z) => {
            const { x, z: wz } = pos(z.centerValence, z.centerArousal > 0.5 ? 0.65 : 0.4);
            const r = z.radius * (W / 1);
            const active = z.id === activeZoneId;
            return (
              <button
                key={z.id}
                type="button"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onZoneSelect(z.id);
                }}
                style={{
                  transform: `translate3d(${x}px, 0, ${wz}px) rotateX(90deg)`,
                  width: r * 2,
                  height: r * 2,
                  transformStyle: 'preserve-3d',
                }}
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full"
                aria-label={z.label}
                title={z.label}
              >
                <span
                  className="block h-full w-full rounded-full"
                  style={{
                    border: active ? '2.5px solid #ef4444' : '1.6px dashed rgba(239,68,68,0.75)',
                    boxShadow: active ? '0 0 18px rgba(239,68,68,0.55)' : 'none',
                    background: 'rgba(239,68,68,0.10)',
                  }}
                />
              </button>
            );
          })}

          {/* 推荐候选（地面小圈：下一站） */}
          {candidates.map((s) => {
            const { x, z } = pos(s.valence, s.energy);
            return (
              <span
                key={s.id}
                className="absolute cursor-pointer rounded-full ring-1 ring-white/70"
                style={{
                  transform: `translate3d(${x}px, 0, ${z}px) rotateX(90deg)`,
                  width: 9,
                  height: 9,
                  backgroundColor: s.coverColor,
                  boxShadow: `0 0 8px ${s.coverColor}`,
                }}
              />
            );
          })}

          {/* 歌单曲柱 */}
          {songs.map((song) => {
            const { x, z } = pos(song.valence, song.energy);
            const h = Math.max(3, song.arousal * HMAX);
            return (
              <div
                key={song.id}
                className="absolute cursor-pointer"
                style={({
                  transformStyle: 'preserve-3d',
                  transform: `translate3d(${x}px, 0, ${z}px)`,
                  '--bh': `${h}px`,
                } as CSSProperties)}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => {
                  e.stopPropagation();
                  onPlaySong(song);
                }}
                onMouseEnter={() => setHover(song)}
                onMouseLeave={() => setHover((c) => (c?.id === song.id ? null : c))}
              >
                <span
                  className="bar-rise absolute left-1/2 top-0 w-[2.5px] -translate-x-1/2"
                  style={{
                    height: h,
                    transform: `translateY(${-h}px)`,
                    background: `linear-gradient(to top, ${song.coverColor}, rgba(255,255,255,0.4))`,
                  }}
                />
                {song.audioUrl && <span className="glow-pulse" aria-hidden="true" />}
                <span
                  className="dot-rise block absolute rounded-full"
                  style={({
                    width: 13,
                    height: 13,
                    transform: `translate3d(-6.5px, ${-h}px, 0)`,
                    backgroundColor: song.coverColor,
                    boxShadow: song.audioUrl ? `0 0 14px ${song.coverColor}` : '0 0 4px rgba(0,0,0,0.4)',
                    opacity: 1,
                    '--bh': `${h}px`,
                    '--bx': '-6.5px',
                  } as CSSProperties)}
                >
                  {hover?.id === song.id && <PlayGlyph />}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 悬浮详情 */}
      {hover && (
        <div className="pointer-events-none absolute left-3 top-3 max-w-[220px] rounded-xl border border-white/10 bg-black/80 px-3 py-2 text-xs backdrop-blur">
          <div className="truncate font-semibold text-white">{hover.title}</div>
          <div className="text-white/55">{hover.artist}</div>
          <div className="mt-1 flex items-center gap-1 text-[10px] text-white/60">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: hover.coverColor }} />
            {hover.genre} · BPM {hover.bpm} · 能量 {hover.energy.toFixed(2)}
          </div>
          <div className="mt-0.5 flex items-center justify-between text-white/50">
            <span>Valence {hover.valence.toFixed(2)} · Arousal {hover.arousal.toFixed(2)}</span>
            {hover.audioUrl && <span className="text-cyan-300">可试听</span>}
          </div>
        </div>
      )}
    </div>
  );
}

function PlayGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="11"
      height="11"
      className="absolute -right-[7px] -top-[6px] translate-x-full -translate-y-full drop-shadow"
    >
      <path d="M8 5.5v13l11-6.5L8 5.5Z" fill="#fff" />
    </svg>
  );
}