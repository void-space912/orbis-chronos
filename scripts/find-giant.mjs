/**
 * 找出"巨型多边形"：跨越大半个地球的要素（这类要素一旦上色就会像罩子盖住地球）。
 * 用法： node scripts/find-giant.mjs
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DIR = path.join(ROOT, 'data', 'eras');

function bboxSpan(polys) {
  let minX = 180;
  let maxX = -180;
  let minY = 90;
  let maxY = -90;
  let rings = 0;
  let pts = 0;
  for (const ringsOfPoly of polys) {
    for (const r of ringsOfPoly) {
      rings += 1;
      pts += r.length;
      for (const [x, y] of r) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  return { spanLng: maxX - minX, spanLat: maxY - minY, rings, pts, minX, maxX, minY, maxY };
}

const files = (await readdir(DIR)).filter((f) => f.endsWith('.json')).sort();
const rows = [];
for (const f of files) {
  const j = JSON.parse(await readFile(path.join(DIR, f), 'utf8'));
  for (const ft of j.f) {
    const s = bboxSpan(ft.g);
    // 跨经度 150° 以上或跨纬度 80° 以上 → 视觉上就是"一大片"
    if (s.spanLng > 150 || s.spanLat > 80) {
      rows.push({ era: j.k, name: ft.n, share: (ft.shr * 100).toFixed(1) + '%', lng: Math.round(s.spanLng), lat: Math.round(s.spanLat), rings: s.rings, box: `${Math.round(s.minX)}..${Math.round(s.maxX)} / ${Math.round(s.minY)}..${Math.round(s.maxY)}` });
    }
  }
}
rows.sort((a, b) => b.lng - a.lng);
console.log(`跨半球要素共 ${rows.length} 个（全部数据合计）`);
console.log(rows.slice(0, 40).map((r) => `${r.era.padEnd(8)} ${r.name.padEnd(38)} 占比 ${r.share.padStart(6)}  跨经 ${String(r.lng).padStart(4)}° 跨纬 ${String(r.lat).padStart(3)}°  环 ${r.rings}  ${r.box}`).join('\n'));

const perEra = new Map();
for (const r of rows) perEra.set(r.era, (perEra.get(r.era) || 0) + 1);
console.log('\n按年代统计（含巨型要素的年代）:');
console.log([...perEra.entries()].sort().map(([k, v]) => `${k}:${v}`).join('  '));

// 全地球级别的（几乎覆盖整个世界）
const world = rows.filter((r) => r.lng > 300 || (r.lng > 200 && r.lat > 100));
console.log('\n近乎覆盖全球的要素:', world.length);
console.log(world.map((r) => `${r.era} ${r.name} 跨经${r.lng}° 跨纬${r.lat}° 占比${r.share}`).join('\n'));
