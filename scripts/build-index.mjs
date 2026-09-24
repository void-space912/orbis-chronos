// 生成政权名称 → 出现年代索引（用于详情面板的“存在年代”）。
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const ERAS_DIR = path.join(ROOT, 'data', 'eras');

async function main() {
  const files = (await readdir(ERAS_DIR)).filter((f) => f.endsWith('.json'));
  const index = new Map();
  let snapshots = 0;

  const add = (name, year) => {
    if (!name) return;
    const arr = index.get(name) || [];
    if (!arr.includes(year)) arr.push(year);
    index.set(name, arr);
  };

  for (const file of files) {
    const j = JSON.parse(await readFile(path.join(ERAS_DIR, file), 'utf8'));
    snapshots += 1;
    for (const f of j.f) add(f.n, j.y);
  }

  try {
    const modern = JSON.parse(await readFile(path.join(ROOT, 'data', 'modern.json'), 'utf8'));
    snapshots += 1;
    for (const f of modern.f) add(f.n, modern.y);
  } catch { /* 现代数据缺失时忽略 */ }

  const out = {};
  for (const [name, years] of index) out[name] = years.sort((a, b) => a - b);
  const json = JSON.stringify(out);
  await writeFile(path.join(ROOT, 'data', 'name-index.json'), json);
  console.log(`snapshots=${snapshots} names=${index.size} size=${(Buffer.byteLength(json) / 1024).toFixed(0)}KB`);
}

main().catch((e) => { console.error('INDEX FAILED', e); process.exit(1); });
