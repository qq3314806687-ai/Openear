/**
 * 推荐引擎单元测试（Node 内置 test runner）。
 * 覆盖：getIntensityParams 插值、radialScatter 离家百分位、generateRecommendations 单调性。
 * 运行：esbuild 打包后 `node --test scripts/.build/recommendations.test.js`
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Song, User } from '../lib/types.ts';
import {
  generateRecommendations,
  getIntensityParams,
  radialScatter,
} from '../lib/lib/recommendations.ts';
import { getSongs, getUsers } from '../lib/lib/store.ts';

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

const EMPTY_USER: User = { userId: 't', name: 'test', history: [] };

// ---------------------------------------------------------------------------
// getIntensityParams
// ---------------------------------------------------------------------------

test('getIntensityParams：三个锚点端点值', () => {
  const close = (a: number, b: number) => Math.abs(a - b) < 1e-9;
  const p0 = getIntensityParams(0);
  assert.equal(p0.styleDistanceMax, 1);
  assert.equal(p0.emotionStepMax, 0);
  assert.ok(close(p0.familiarityWeight, 0.75));

  const p50 = getIntensityParams(50);
  assert.equal(p50.styleDistanceMax, 2);
  assert.equal(p50.emotionStepMax, 0.5);
  assert.ok(close(p50.familiarityWeight, 0.4));

  const p100 = getIntensityParams(100);
  assert.equal(p100.styleDistanceMax, 4);
  assert.equal(p100.emotionStepMax, 1);
  assert.ok(close(p100.familiarityWeight, 0.1));
});

test('getIntensityParams：越界值钳制到 [0, 100]', () => {
  assert.deepEqual(getIntensityParams(-999), getIntensityParams(0));
  assert.deepEqual(getIntensityParams(0.5), getIntensityParams(0.5)); // 小数允许
  assert.deepEqual(getIntensityParams(999), getIntensityParams(100));
});

test('getIntensityParams：中间值线性插值', () => {
  const p25 = getIntensityParams(25);
  const p75 = getIntensityParams(75);
  assert.ok(Math.abs(p25.emotionStepMax - 0.25) < 1e-9);
  assert.ok(Math.abs(p25.styleDistanceMax - 1.5) < 1e-9);
  assert.ok(Math.abs(p25.familiarityWeight - 0.575) < 1e-9);
  assert.ok(Math.abs(p75.emotionStepMax - 0.75) < 1e-9);
  assert.ok(Math.abs(p75.styleDistanceMax - 3) < 1e-9);
});

test('getIntensityParams：全区间单调（0→100 逐点）', () => {
  let prev = getIntensityParams(0);
  for (let i = 1; i <= 100; i++) {
    const cur = getIntensityParams(i);
    assert.ok(cur.emotionStepMax >= prev.emotionStepMax, `emotionStepMax 应单调不减 @${i}`);
    assert.ok(cur.styleDistanceMax >= prev.styleDistanceMax, `styleDistanceMax 应单调不减 @${i}`);
    assert.ok(cur.familiarityWeight <= prev.familiarityWeight, `familiarityWeight 应单调不增 @${i}`);
    prev = cur;
  }
});

// ---------------------------------------------------------------------------
// radialScatter（离家百分位 —— 本次修复核心）
// ---------------------------------------------------------------------------

/** 对角候选池：四个斜方向（45/135/225/315°）各离家 0.1 / 0.3 / 0.5 三个点（圆心 0.5,0.5）。 */
function crossPool(): Song[] {
  const radii = [0.1, 0.3, 0.5];
  // 四个对角方向：东北 / 西北 / 西南 / 东南（每个方向唯一落在对应扇区中心）
  const dirs: Array<[number, number]> = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ];
  const out: Song[] = [];
  for (const [sv, sa] of dirs) {
    for (const r of radii) {
      const k = r / Math.SQRT2;
      out.push(song({ valence: 0.5 + sv * k, arousal: 0.5 + sa * k }));
    }
  }
  return out;
}

const center = { valence: 0.5, arousal: 0.5 };

test('radialScatter：pct=0 取最近、pct=1 取最远', () => {
  const near = radialScatter(crossPool(), center, 0, 0.5, EMPTY_USER, [], 4);
  const far = radialScatter(crossPool(), center, 1, 0.5, EMPTY_USER, [], 4);
  const dist = (s: Song) => Math.hypot(s.valence - 0.5, s.arousal - 0.5);
  assert.equal(near.length, 4);
  assert.equal(far.length, 4);
  near.forEach((s) => assert.ok(Math.abs(dist(s) - 0.1) < 1e-9));
  far.forEach((s) => assert.ok(Math.abs(dist(s) - 0.5) < 1e-9));
});

test('radialScatter：pct 越大，平均离家距离越远（严格单调）', () => {
  const dist = (s: Song) => Math.hypot(s.valence - 0.5, s.arousal - 0.5);
  const avg = (pct: number) => {
    const picked = radialScatter(crossPool(), center, pct, 0.5, EMPTY_USER, [], 4);
    return picked.reduce((a, s) => a + dist(s), 0) / picked.length;
  };
  assert.ok(avg(0) < avg(0.5));
  assert.ok(avg(0.5) < avg(1));
  assert.ok(Math.abs(avg(0) - 0.1) < 1e-9);
  assert.ok(Math.abs(avg(0.5) - 0.3) < 1e-9);
  assert.ok(Math.abs(avg(1) - 0.5) < 1e-9);
});

test('radialScatter：数量上限与无重复', () => {
  const picked = radialScatter(crossPool(), center, 0.7, 0.5, EMPTY_USER, [], 10);
  assert.equal(picked.length, 10); // 池里只有 12 首，扇区够多时取满上限
  const ids = new Set(picked.map((s) => s.id));
  assert.equal(ids.size, picked.length);
});

test('radialScatter：空池返回空数组', () => {
  assert.deepEqual(radialScatter([], center, 0.5, 0.5, EMPTY_USER, [], 4), []);
});

test('radialScatter：pct 越界钳制到 [0,1]', () => {
  const dist = (s: Song[]) =>
    s.reduce((a, x) => a + Math.hypot(x.valence - 0.5, x.arousal - 0.5), 0) / s.length;
  const belowZero = radialScatter(crossPool(), center, -5, 0.5, EMPTY_USER, [], 4);
  const aboveOne = radialScatter(crossPool(), center, 5, 0.5, EMPTY_USER, [], 4);
  const atZero = radialScatter(crossPool(), center, 0, 0.5, EMPTY_USER, [], 4);
  const atOne = radialScatter(crossPool(), center, 1, 0.5, EMPTY_USER, [], 4);
  assert.ok(Math.abs(dist(belowZero) - dist(atZero)) < 1e-9);
  assert.ok(Math.abs(dist(aboveOne) - dist(atOne)) < 1e-9);
});

// ---------------------------------------------------------------------------
// generateRecommendations（端到端单调性）
// ---------------------------------------------------------------------------

const byId = new Map(getSongs().map((s) => [s.id, s]));
function ownedOf(uid: string): Song[] {
  const u = getUsers().find((x) => x.userId === uid)!;
  return u.history.map((id) => byId.get(id)!).filter(Boolean);
}
const INTENSITIES = [0, 25, 50, 75, 100];

function avgDist(recs: { vaDistanceFromUserAvg: number }[]): number {
  return recs.reduce((a, r) => a + r.vaDistanceFromUserAvg, 0) / Math.max(recs.length, 1);
}
function quadrantCount(recs: { song: Song }[]): number {
  return new Set(recs.map((r) => `${r.song.valence >= 0.5 ? 'n' : 's'}${r.song.arousal >= 0.5 ? 'e' : 'w'}`)).size;
}

test('generateRecommendations：空歌单返回空推荐', () => {
  const bundle = generateRecommendations([], 50);
  assert.equal(bundle.recommendations.length, 0);
});

test('generateRecommendations：返回 10 首、无重复、全是新歌', () => {
  for (const uid of ['userA', 'userB', 'userC']) {
    const bundle = generateRecommendations(ownedOf(uid), 50);
    const recs = bundle.recommendations;
    assert.equal(recs.length, 10, `${uid} 应返回 10 首`);
    assert.equal(new Set(recs.map((r) => r.song.id)).size, 10, `${uid} 无重复`);
    const owned = new Set(bundle.user.history);
    assert.ok(recs.every((r) => !owned.has(r.song.id)), `${uid} 全是新歌`);
  }
});

test('generateRecommendations：探索强度↑ → 平均离家距离单调↑（三用户）', () => {
  for (const uid of ['userA', 'userB', 'userC']) {
    const dists = INTENSITIES.map((i) =>
      avgDist(generateRecommendations(ownedOf(uid), i).recommendations),
    );
    for (let k = 1; k < dists.length; k++) {
      assert.ok(dists[k] >= dists[k - 1] - 1e-9, `${uid} 离家距离应单调 @${INTENSITIES[k]}`);
    }
  }
});

test('generateRecommendations：探索强度↑ → 跨象限数单调↑（三用户）', () => {
  for (const uid of ['userA', 'userB', 'userC']) {
    const quads = INTENSITIES.map((i) =>
      quadrantCount(generateRecommendations(ownedOf(uid), i).recommendations),
    );
    for (let k = 1; k < quads.length; k++) {
      assert.ok(quads[k] >= quads[k - 1], `${uid} 跨象限应单调 @${INTENSITIES[k]}`);
    }
  }
});

test('generateRecommendations：回归——100% 的平均离家不低 75%（消除平台期）', () => {
  for (const uid of ['userA', 'userB', 'userC']) {
    const d75 = avgDist(generateRecommendations(ownedOf(uid), 75).recommendations);
    const d100 = avgDist(generateRecommendations(ownedOf(uid), 100).recommendations);
    assert.ok(d100 >= d75, `${uid} 100% 应 ≥ 75%`);
  }
});

test('generateRecommendations：100% 显著比 0% 更远', () => {
  for (const uid of ['userA', 'userB', 'userC']) {
    const d0 = avgDist(generateRecommendations(ownedOf(uid), 0).recommendations);
    const d100 = avgDist(generateRecommendations(ownedOf(uid), 100).recommendations);
    assert.ok(d100 > d0, `${uid} 100% 应远于 0%`);
  }
});