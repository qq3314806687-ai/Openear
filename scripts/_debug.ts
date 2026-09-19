import type { Song, User } from '../lib/types.ts';

let seq = 0;
function song(partial: Partial<Song> = {}): Song {
  seq += 1;
  return {
    id: partial.id ?? `t${seq}`,
    title: partial.title ?? `T${seq}`,
    artist: partial.artist ?? 'Art',
    genre: partial.genre ?? 'Lo-fi',
    bpm: partial.bpm ?? 80,
    energy: partial.energy ?? 0.5,
    valence: partial.valence ?? 0.5,
    arousal: partial.arousal ?? 0.5,
    mood: partial.mood ?? 'calm',
    coverColor: partial.coverColor ?? '#888',
    ...partial,
  };
}
const c = (v: number, a: number) => song({ valence: v, arousal: a });
const pool = [
  c(0.6, 0.5), c(0.8, 0.5), c(1.0, 0.5),
  c(0.4, 0.5), c(0.2, 0.5), c(0.0, 0.5),
  c(0.5, 0.6), c(0.5, 0.8), c(0.5, 1.0),
  c(0.5, 0.4), c(0.5, 0.2), c(0.5, 0.0),
];
const TWO_PI = Math.PI * 2;
function normAngle(a: number) { let x = a % TWO_PI; if (x < 0) x += TWO_PI; return x; }
function angularGap(a: number, b: number) { const d = Math.abs(normAngle(a) - normAngle(b)); return d > Math.PI ? TWO_PI - d : d; }

for (const s of pool) {
  const dv = s.valence - 0.5, da = s.arousal - 0.5;
  const angle = normAngle(Math.atan2(da, dv));
  console.log(`${s.id} V=${s.valence} A=${s.arousal} dv=${dv} da=${da} angle_deg=${(angle * 180 / Math.PI).toFixed(3)}`);
}

const count = 4;
const slot = TWO_PI / count;
console.log(`slot/2 deg = ${(slot / 2 * 180 / Math.PI).toFixed(6)}`);
for (let k = 0; k < count; k++) {
  const center = slot * (k + 0.5);
  const bucket = pool.filter((p) => angularGap(normAngle(Math.atan2(p.arousal - 0.5, p.valence - 0.5)), center) <= slot / 2);
  console.log(`k=${k} center_deg=${(center * 180 / Math.PI).toFixed(2)} bucket=[${bucket.map((b) => b.id).join(',')}]`);
}