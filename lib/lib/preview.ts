/**
 * 内置曲库「可试听音源」合成器（纯客户端，无需外网/版权音源）。
 * - 依据歌曲的流派 / BPM / valence(冷暖) / arousal(能量) 用 Web Audio 合成一段约 6.4s 的试听片段。
 * - 相同歌曲始终得到相同片段（确定性），并按歌曲 id 缓存 blob URL。
 * - 输出 WAV(16-bit PCM，单声道)，交给现有 <audio> 播放链路，进度条/时长/暂停均可复用。
 */
import type { Song } from '../types';

const SR = 44100;
const DUR = 6.4;

const previewCache = new Map<string, string>();

/** 流派 → 音色取向 */
const SOFT = new Set([
  'Lo-fi', 'Chillhop', 'Ambient', 'Lounge', 'New Age', 'Classical', 'Jazz',
  'Soul', 'R&B', 'Folk', 'Country', 'Blues', 'Gospel', 'Reggae', 'Afrobeats', 'Latin',
]);
const EDM = new Set([
  'Electronic', 'House', 'Techno', 'Trance', 'EDM', 'Dubstep', 'Drum & Bass', 'Synthwave',
  'Pop', 'City Pop', 'K-pop', 'Hip-Hop', 'Funk',
]);
const EDGY = new Set([
  'Rock', 'Alternative', 'Indie', 'Punk', 'Metal', 'Grunge', 'Post-Rock', 'Shoegaze',
]);

function hash32(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);

/** 大/小调自然音阶（半音间隔） */
const SCALES: Record<'major' | 'minor', number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10],
};
/** 和弦进行（音阶级数索引）：大调 I–V–vi–IV，小调 i–VI–III–VII */
const PROG: Record<'major' | 'minor', number[]> = {
  major: [0, 4, 5, 3],
  minor: [0, 5, 2, 6],
};

/** 元音共振峰（F1/F2/F3，Hz）：从黯淡到明亮，映射情绪色彩 valence */
const VOWELS = [
  { f1: 320, f2: 860, f3: 2350 }, // 低落 · 黯淡
  { f1: 500, f2: 1020, f3: 2550 },
  { f1: 760, f2: 1180, f3: 2750 }, // 平和 · 中性
  { f1: 420, f2: 1720, f3: 2900 },
  { f1: 270, f2: 2300, f3: 3050 }, // 愉悦 · 明亮
];

function renderBuffer(song: Song): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(1, Math.ceil(SR * DUR), SR);
  const rand = mulberry32(hash32(song.id));

  // 主控：低通柔化 + 压限防削波
  const master = ctx.createGain();
  master.gain.value = 0.55;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp).connect(ctx.destination);

  // 人声总线（汇入主控，整体响度随能量起伏）
  const vocalBus = ctx.createGain();
  vocalBus.gain.value = 0.64 + song.arousal * 0.26;
  vocalBus.connect(master);

  // 音色取向
  const soft = SOFT.has(song.genre);
  const edgy = EDGY.has(song.genre);
  const leadType: OscillatorType = soft ? 'triangle' : edgy ? 'sawtooth' : 'square';
  const leadFilter = soft ? 1800 : edgy ? 5200 : 3200;
  const padType: OscillatorType = 'triangle';

  // 调式与调性
  const mode: 'major' | 'minor' = song.valence >= 0.5 ? 'major' : 'minor';
  const scale = SCALES[mode];
  const root = 48 + Math.floor(rand() * 12); // C3..B3
  const notes: number[] = [];
  for (let oct = 0; oct < 3; oct++) for (const iv of scale) notes.push(root + iv + 12 * oct);

  const beat = 60 / Math.max(40, Math.min(200, song.bpm));
  const segDur = DUR / 4;

  const pluck = (freq: number, t: number, dur: number, vol: number, type: OscillatorType, filter: number) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filter;
    const g = ctx.createGain();
    o.connect(f).connect(g).connect(master);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  const pad = (freq: number, t: number, dur: number, vol: number) => {
    const o = ctx.createOscillator();
    o.type = padType;
    o.frequency.value = freq;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 1300;
    const g = ctx.createGain();
    o.connect(f).connect(g).connect(master);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.35);
    g.gain.setValueAtTime(vol, t + dur - 0.25);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  const bass = (freq: number, t: number, dur: number, vol: number) => {
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const g = ctx.createGain();
    o.connect(g).connect(master);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.08);
    g.gain.setValueAtTime(vol, t + dur - 0.2);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.start(t);
    o.stop(t + dur + 0.05);
  };

  // —— 人声层：合成"哼唱式"嗓音 ——
  // 情绪色彩决定元音明暗（valence↑ 元音更明亮），能量决定力度与颤音幅度。
  const vowel =
    VOWELS[Math.max(0, Math.min(VOWELS.length - 1, Math.round(song.valence * (VOWELS.length - 1))))];
  // 气声/辅音噪声（音节起音用）
  const breathNoise = ctx.createBuffer(1, Math.ceil(SR * 0.05), SR);
  {
    const bd = breathNoise.getChannelData(0);
    for (let i = 0; i < bd.length; i++) bd[i] = Math.random() * 2 - 1;
  }

  const voice = (freq: number, t: number, dur: number, vol: number) => {
    // 声源：锯齿波（谐波丰富，接近人声）
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(freq, t);
    // 颤音（能量越高越明显）
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const lfoAmp = ctx.createGain();
    lfoAmp.gain.value = freq * (0.006 + song.arousal * 0.006);
    lfo.connect(lfoAmp).connect(o.frequency);
    lfo.start(t);
    lfo.stop(t + dur + 0.05);

    // 三个共振峰（元音音色）
    const f1 = ctx.createBiquadFilter();
    f1.type = 'bandpass';
    f1.frequency.value = vowel.f1;
    f1.Q.value = 9;
    const f2 = ctx.createBiquadFilter();
    f2.type = 'bandpass';
    f2.frequency.value = vowel.f2;
    f2.Q.value = 9;
    const f3 = ctx.createBiquadFilter();
    f3.type = 'bandpass';
    f3.frequency.value = vowel.f3;
    f3.Q.value = 5;

    const g = ctx.createGain();
    o.connect(f1).connect(f2).connect(f3).connect(g).connect(vocalBus);

    // 音节包络：快速起音 → 持续 → 释放（浊音感）
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.028);
    g.gain.setValueAtTime(vol * 0.82, t + dur * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

    // 辅音/气声瞬态（"t/h"）：能量越高爆破感越清晰
    const con = ctx.createBufferSource();
    con.buffer = breathNoise;
    const cp = ctx.createBiquadFilter();
    cp.type = 'highpass';
    cp.frequency.value = 1600;
    const cg = ctx.createGain();
    con.connect(cp).connect(cg).connect(vocalBus);
    cg.gain.setValueAtTime(0.02 + song.arousal * 0.05, t);
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.035);
    con.start(t);
    con.stop(t + 0.05);

    o.start(t);
    o.stop(t + dur + 0.06);
  };

  // 高能量时加噪声「沙锤/踩镲」节拍
  const hats = song.arousal >= 0.55;
  let noise: AudioBuffer | null = null;
  if (hats) {
    noise = ctx.createBuffer(1, Math.ceil(SR * 0.08), SR);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  const prog = PROG[mode];
  for (let c = 0; c < 4; c++) {
    const t0 = c * segDur;
    const deg = prog[c];
    const chordRoot = notes[deg];
    const triad = [chordRoot, notes[deg + 2], notes[deg + 4]];

    bass(chordRoot - 12 >= 0 ? mtof(chordRoot - 12) : mtof(chordRoot), t0, segDur, 0.22);
    triad.forEach((n, k) => pad(mtof(n), t0, segDur, 0.11 - k * 0.02));

    // 主旋律：每拍一个音，从上和弦音附近随机游走
    let t = t0;
    let melIdx = deg + 14; // 高八度区起点
    while (t < t0 + segDur - 0.02) {
      const step = Math.floor(rand() * 5) - 2; // -2..2
      melIdx = Math.max(7, Math.min(notes.length - 3, melIdx + step));
      if (t + beat <= DUR) {
        pluck(mtof(notes[melIdx]), t, beat * (0.7 + rand() * 0.5), 0.18, leadType, leadFilter);
      }
      if (hats && noise) {
        const bs = ctx.createBufferSource();
        bs.buffer = noise;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass';
        hp.frequency.value = 6500;
        const hg = ctx.createGain();
        bs.connect(hp).connect(hg).connect(master);
        hg.gain.setValueAtTime(0.05, t);
        hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
        bs.start(t);
        bs.stop(t + 0.08);
      }
      t += beat;
    }

    // 人声旋律：每个和弦唱 2 个音节（上八度根音 → 三音/五音），情绪色彩决定音符走向
    const bright = song.valence >= 0.5;
    const vow = bright ? [notes[deg + 7], notes[deg + 11]] : [notes[deg + 7], notes[deg + 9]];
    const sylDur = segDur / 2;
    for (let k = 0; k < 2; k++) {
      voice(mtof(vow[k]), t0 + 0.04 + k * sylDur, sylDur * 0.94, 0.2 + song.arousal * 0.18);
    }
  }

  return ctx.startRendering();
}

function encodeWav(buffer: AudioBuffer): Blob {
  const numCh = buffer.numberOfChannels;
  const sr = buffer.sampleRate;
  const len = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numCh * bytesPerSample;
  const dataSize = len * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const dv = new DataView(ab);
  const wstr = (off: number, s: string) => {
    for (let i = 0; i < s.length; i++) dv.setUint8(off + i, s.charCodeAt(i));
  };
  wstr(0, 'RIFF');
  dv.setUint32(4, 36 + dataSize, true);
  wstr(8, 'WAVE');
  wstr(12, 'fmt ');
  dv.setUint32(16, 16, true);
  dv.setUint16(20, 1, true);
  dv.setUint16(22, numCh, true);
  dv.setUint32(24, sr, true);
  dv.setUint32(28, sr * blockAlign, true);
  dv.setUint16(32, blockAlign, true);
  dv.setUint16(34, 16, true);
  wstr(36, 'data');
  dv.setUint32(40, dataSize, true);

  const chans: Float32Array[] = [];
  for (let c = 0; c < numCh; c++) chans.push(buffer.getChannelData(c));
  let off = 44;
  for (let i = 0; i < len; i++) {
    for (let c = 0; c < numCh; c++) {
      let s = chans[c][i];
      s = s < -1 ? -1 : s > 1 ? 1 : s;
      dv.setInt16(off, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      off += 2;
    }
  }
  return new Blob([ab], { type: 'audio/wav' });
}

/** 返回一首歌可播放的预览 blob URL（内置曲库无音源时用） */
export async function getPreviewUrl(song: Song): Promise<string> {
  const cached = previewCache.get(song.id);
  if (cached) return cached;
  if (typeof OfflineAudioContext === 'undefined') return '';
  try {
    const buffer = await renderBuffer(song);
    const url = URL.createObjectURL(encodeWav(buffer));
    previewCache.set(song.id, url);
    return url;
  } catch {
    return '';
  }
}