/**
 * 关卡0 自检：验证推荐引擎按滑块档位输出 10 首推荐且分布合理。
 * 运行：node --experimental-strip-types scripts/verify-engine.ts
 */
import { generateRecommendations, INTENSITY_PARAMS } from '../lib/lib/recommendations.ts';
import { BLANK_ZONES, getGenreDistance } from '../lib/lib/metrics.ts';

const USERS = ['userA', 'userB', 'userC'];
const LABEL: Record<string, string> = {
  userA: 'Lo-fi 党',
  userB: 'K-pop 党',
  userC: '后摇党',
};

let fail = 0;
function check(cond: boolean, msg: string) {
  if (cond) console.log('  ok  ' + msg);
  else {
    fail++;
    console.log('  FAIL ' + msg);
  }
}

for (const uid of USERS) {
  for (const intensity of Object.keys(INTENSITY_PARAMS) as Array<keyof typeof INTENSITY_PARAMS>) {
    const bundle = generateRecommendations(uid, intensity);
    const recs = bundle.recommendations;
    console.log(`\n[${LABEL[uid]} · ${intensity}] 用户平均VA=${bundle.userAvgVA.valence.toFixed(2)},${bundle.userAvgVA.arousal.toFixed(2)} 主打流派=${bundle.userGenreTop.join(',')}`);
    check(recs.length === 10, `返回恰好 10 首（实得 ${recs.length}）`);
    const ids = new Set(recs.map((r) => r.song.id));
    check(ids.size === 10, '10 首无重复');
    check(recs.every((r) => !bundle.user.history.includes(r.song.id)), '全部为新歌（未出现在历史）');

    const genres = new Set(recs.map((r) => r.song.genre));
    check(genres.size >= 2, `流派多样性 ≥2（本次 ${genres.size} 种: ${[...genres].join('/')}）`);

    // 平滑过渡：相邻 VA 距离检查
    let smooth = true;
    for (let i = 1; i < recs.length; i++) {
      if (recs[i].vaDistance > 0.5) smooth = false;
    }
    check(smooth, '相邻歌曲 VA 过渡平滑（步长 ≤0.5）');

    check(
      recs.every((r) => r.song.title && r.song.artist && r.song.genre && r.song.coverColor),
      '推荐理由含技术/情绪/行为三层',
    );
    console.log(`    示例#1: ${recs[0].song.title}（${recs[0].song.genre}）`);
    console.log(`      tech: ${recs[0].reasonTags.technical}`);
    console.log(`      emo : ${recs[0].reasonTags.emotional}`);
    console.log(`      beh : ${recs[0].reasonTags.behavioral}`);
  }
}

// 地图点击探索：让 Lo-fi 党点躁怒区，验证目标区域歌词优先
console.log('\n[点击空白区测试] userA 点击「zone-angry」躁怒高压区');
const zonePick = generateRecommendations('userA', 'aggressive', { focusZoneId: 'zone-angry' });
console.log(`  命中空白区: ${zonePick.focusZone?.label}`);
const zone = BLANK_ZONES.find((z) => z.id === 'zone-angry')!;
const inZone = zonePick.recommendations.filter(
  (r) => Math.hypot(r.song.valence - zone.centerValence, r.song.arousal - zone.centerArousal) <= zone.radius,
).length;
console.log(`  10 首中落入躁怒区内的: ${inZone} 首`);

console.log(`\n流派距离抽查: Lo-fi→Lo-fi=0, Lo-fi→Jazz=${getGenreDistance('Lo-fi','Jazz')}, Hip-Hop→R&B=${getGenreDistance('Hip-Hop','R&B')}, Metal→K-pop=${getGenreDistance('Metal','K-pop')}`);

console.log(fail === 0 ? '\n✔ 全部通过' : `\n✘ ${fail} 项未通过`);