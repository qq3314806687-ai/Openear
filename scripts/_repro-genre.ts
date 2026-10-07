import { generateRecommendations } from '../lib/lib/recommendations.ts';
import { getGenreDistance } from '../lib/lib/metrics.ts';
import { getSongs } from '../lib/lib/store.ts';

const all = getSongs();
const one = (g: string) => all.filter((s) => s.genre === g).slice(0, 1);

for (const g of ['Ambient', 'Lo-fi', 'K-pop', 'Post-Rock', 'Soul']) {
  const owned = one(g);
  console.log(`\n=== 歌单 = 1 首 ${g}（${owned[0].id} V${owned[0].valence} A${owned[0].arousal}）===`);
  for (const i of [0, 25, 50, 75, 100]) {
    const recs = generateRecommendations(owned, i as 0 | 25 | 50 | 75 | 100).recommendations;
    const d = (n: number) => recs.filter((r) => getGenreDistance(r.song.genre, g) === n).length;
    console.log(
      `  强度${String(i).padStart(4)}: 同流派${d(0)} 同家族${d(1)} 桥梁${d(2)} 无关${d(3)} | ${recs
        .map((r) => r.song.genre)
        .join(' · ')}`,
    );
  }
}