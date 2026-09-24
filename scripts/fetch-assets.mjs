// 下载并固化第三方运行时资源（离线可用）。
import { writeFile, mkdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) historical-globe/1.0' };

export const ASSETS = [
  ['https://cdn.jsdelivr.net/npm/globe.gl@2.46.2/dist/globe.gl.min.js', 'vendor/globe.gl.min.js'],
  // 贴图先原样抓进 _source/，再由 scripts/optimize_textures.py 压缩到 vendor/img/
  ['https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/earth-blue-marble.jpg', 'vendor/img/_source/earth-blue-marble.jpg'],
  ['https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/earth-topology.png', 'vendor/img/_source/earth-topology.png'],
  ['https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/earth-water.png', 'vendor/img/_source/earth-water.png'],
  ['https://cdn.jsdelivr.net/npm/three-globe@2.45.2/example/img/night-sky.png', 'vendor/img/_source/night-sky.png'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function download(url, tries = 4) {
  let last = '';
  for (let t = 0; t < tries; t += 1) {
    try {
      const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(120000) });
      if (!r.ok) { last = `HTTP ${r.status}`; continue; }
      const buf = Buffer.from(await r.arrayBuffer());
      if (!buf.length) { last = 'empty body'; continue; }
      return buf;
    } catch (e) { last = e.message; }
    await sleep(900 * (t + 1));
  }
  throw new Error(`${url}: ${last}`);
}

async function main() {
  const manifest = [];
  for (const [url, rel] of ASSETS) {
    const out = path.join(ROOT, rel);
    await mkdir(path.dirname(out), { recursive: true });
    try {
      const st = await stat(out);
      if (st.size > 1024 && process.env.FORCE !== '1') {
        console.log(`skip ${rel} (${(st.size / 1024).toFixed(0)}KB 已存在)`);
        manifest.push({ url, file: rel, bytes: st.size, sha256: null, cached: true });
        continue;
      }
    } catch { /* 需要下载 */ }
    const buf = await download(url);
    await writeFile(out, buf);
    const sha256 = createHash('sha256').update(buf).digest('hex');
    manifest.push({ url, file: rel, bytes: buf.length, sha256 });
    console.log(`ok   ${rel} ${(buf.length / 1024).toFixed(0)}KB sha256=${sha256.slice(0, 12)}`);
  }
  await writeFile(path.join(ROOT, 'vendor', 'VERSIONS.json'), JSON.stringify({
    note: '第三方运行时资源，按固定版本固化，页面不依赖外部 CDN。'
      + '原始贴图存于 vendor/img/_source/，实际使用 vendor/img/*.jpg（由 scripts/optimize_textures.py 压缩）。',
    fetchedAt: new Date().toISOString(),
    assets: manifest,
  }, null, 2));
  console.log('\n下一步：python scripts/optimize_textures.py --force  生成压缩后的 vendor/img/*.jpg');
}

main().catch((e) => { console.error('ASSET FETCH FAILED', e.message); process.exit(1); });
