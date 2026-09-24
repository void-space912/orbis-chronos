/**
 * 静态自检：语法、年代数据完整性、DOM id 与 JS 引用的一致性。
 * 用法： node scripts/check.mjs
 */
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const problems = [];
const notes = [];

const read = (rel) => readFile(path.join(ROOT, rel), 'utf8');

/* 1) 语法检查由外层 shell 的 `node --check` 完成（见 README 的自检命令），
      这里只做模块文件存在性检查。 */
const jsFiles = ['js/app.js', 'js/data.js', 'js/eras.js', 'js/i18n.js', 'js/effects.js'];
for (const f of jsFiles) {
  try { await read(f); } catch { problems.push(`缺少模块文件 ${f}`); }
}

/* 2) 年代清单 vs 数据文件 */
const erasSrc = await read('js/eras.js');
const eras = [...erasSrc.matchAll(/\{\s*key:\s*'([^']+)'[^}]*?year:\s*(-?\d+)([^}]*)\}/g)]
  .map((m) => ({ key: m[1], year: Number(m[2]), modern: /data\/modern\.json/.test(m[3]) }));
const keys = eras.map((e) => e.key);
const eraFiles = (await readdir(path.join(ROOT, 'data', 'eras'))).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', ''));
const missing = eras.filter((e) => !e.modern && !eraFiles.includes(e.key)).map((e) => e.key);
const unused = eraFiles.filter((k) => !keys.includes(k));
if (missing.length) problems.push(`时间轴包含但缺少数据文件: ${missing.join(', ')}`);
if (unused.length) notes.push(`数据文件未出现在时间轴（将被跳过）: ${unused.join(', ')}`);
notes.push(`时间轴 ${keys.length} 个年代 · 历史数据文件 ${eraFiles.length} 个 · 现代层 data/modern.json`);

const years = eras.map((e) => e.year);
const increasing = years.every((y, i) => i === 0 || years[i - 1] < y);
if (!increasing) problems.push('时间轴 year 未按时间递增排列');
notes.push(`year 单调递增: ${increasing}（${years[0]} → ${years[years.length - 1]}）`);

/* 3) index.html 中的 id 是否覆盖 JS 引用 */
const html = await read('index.html');
const htmlIds = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
const appSrc = await read('js/app.js');
const usedIds = new Set([...appSrc.matchAll(/\$\('([^']+)'\)/g)].map((m) => m[1]));
const missingIds = [...usedIds].filter((id) => !htmlIds.has(id));
if (missingIds.length) problems.push(`JS 引用了 index.html 中不存在的 id: ${missingIds.join(', ')}`);

/* 4) 资源引用是否存在于磁盘 */
const refs = [
  ...[...html.matchAll(/(?:src|href)="((?!http|#|data:)[^"]+)"/g)].map((m) => m[1]),
  ...[...appSrc.matchAll(/'(vendor\/[^']+)'/g)].map((m) => m[1]),
];
for (const rel of new Set(refs)) {
  try { await readFile(path.join(ROOT, rel)); } catch { problems.push(`页面引用了不存在的资源: ${rel}`); }
}

/* 5) 数据体量与结构抽查 */
const manifest = JSON.parse(await read('data/manifest.json'));
const total = manifest.eras.reduce((s, e) => s + (e.bytes || 0), 0);
notes.push(`数据总量 ${(total / 1024 / 1024).toFixed(1)}MB / ${manifest.eras.length} 个年代快照`);
const big = manifest.eras.slice().sort((a, b) => b.count - a.count).slice(0, 3).map((e) => `${e.key}:${e.count}`);
const appSrcForCap = await read('js/app.js');
const capMatch = appSrcForCap.match(/const MAX_POLYGONS = (\d+);/);
const allCapMatch = appSrcForCap.match(/const MAX_POLYGONS_ALL = (\d+);/);
notes.push(`政权数量最多的快照: ${big.join(', ')}（页面默认按面积显示前 ${capMatch ? capMatch[1] : '?'} 个`
  + `，可放宽到 ${allCapMatch ? allCapMatch[1] : '?'} 个）`);

const modern = JSON.parse(await read('data/modern.json'));
if (!modern.f.some((f) => f.n === '中国')) problems.push('现代层缺少「中国」要素');
notes.push(`现代层 ${modern.f.length} 个国家/地区要素`);

/* 6) 历史大事表抽查 */
const ev = JSON.parse(await read('data/events.json'));
const evTypes = new Set(Object.keys(ev.types || {}));
let evBad = 0;
for (const e of ev.events || []) {
  if (!Number.isFinite(e.y) || !e.n || !Number.isFinite(e.lat) || !Number.isFinite(e.lng)) evBad += 1;
  else if (e.lat < -90 || e.lat > 90 || e.lng < -180 || e.lng > 180) evBad += 1;
  else if (!evTypes.has(e.k)) evBad += 1;
}
if (evBad) problems.push(`事件表有 ${evBad} 条记录字段不合法`);
const evYears = (ev.events || []).map((e) => e.y).sort((a, b) => a - b);
const firstEraYear = eras[0].year;
const outside = (ev.events || []).filter((e) => e.y <= firstEraYear).length;
const covered = years.filter((y, i) => (ev.events || []).some((e) => e.y > (i > 0 ? years[i - 1] : -Infinity) && e.y <= y)).length;
notes.push(`历史大事 ${(ev.events || []).length} 条（${evYears[0]} → ${evYears[evYears.length - 1]}），`
  + `覆盖 ${covered}/${years.length} 个年代快照`
  + (outside ? `，${outside} 条早于最早快照将被忽略` : ''));
const evKinds = {};
for (const e of ev.events || []) evKinds[e.k] = (evKinds[e.k] || 0) + 1;
notes.push(`事件类型分布：${Object.entries(evKinds).map(([k, v]) => `${ev.types[k] || k} ${v}`).join(' · ')}`);

/* 输出 */
console.log('=== 说明 ===');
for (const n of notes) console.log('·', n);
console.log('\n=== 问题 ===');
if (!problems.length) console.log('无');
else for (const p of problems) console.log('✗', p);
process.exit(problems.length ? 1 : 0);
