/**
 * 离线量测：某个年代的数据在「解析 → 预处理 → 环过滤」上花多少时间，
 * 以及不同面积阈值会砍掉多少环（环数≈绘制调用数）。
 * 用法： node scripts/measure-data.mjs [eraKey ...]
 */
import { readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const keys = process.argv.slice(2).length ? process.argv.slice(2) : ['1900', '1492', '1600', '2010'];
const THRESHOLDS = [0, 0.0005, 0.002, 0.01, 0.05];

function ringArea(ring) {
  let minX = 180;
  let maxX = -180;
  let minY = 90;
  let maxY = -90;
  for (const [x, y] of ring) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return (maxX - minX) * (maxY - minY);
}

for (const key of keys) {
  const file = key === '2025' ? 'data/modern.json' : path.join('data', 'eras', `${key}.json`);
  const t0 = performance.now();
  const raw = await readFile(path.join(ROOT, file), 'utf8');
  const t1 = performance.now();
  const json = JSON.parse(raw);
  const t2 = performance.now();

  let vertices = 0;
  const ringAreas = [];
  for (const f of json.f) {
    for (const rings of f.g) {
      vertices += rings[0].length;
      ringAreas.push(ringArea(rings[0]));
    }
  }
  const t3 = performance.now();
  const stats = THRESHOLDS.map((th) => {
    const kept = ringAreas.filter((a) => a >= th).length;
    return `${th}: ${kept}（${((1 - kept / ringAreas.length) * 100).toFixed(0)}% 去掉）`;
  });
  console.log(
    `${key.padEnd(6)} ${(raw.length / 1024).toFixed(0)}KB 解析 ${(t1 - t0).toFixed(0)}+${(t2 - t1).toFixed(0)}ms  `
    + `要素 ${json.f.length} 环 ${ringAreas.length} 顶点 ${vertices} 扫描 ${(t3 - t2).toFixed(0)}ms\n`
    + `         环面积阈值 → ${stats.join(' | ')}`,
  );
}
