// Build the compact era dataset for the historical globe from real sources:
//  * historical-basemaps (aourednik) GeoJSON snapshots  -> data/eras/<key>.json
//  * Natural Earth 110m admin-0 countries (nvkelso)     -> data/modern.json
import { writeFile, mkdir, stat, readFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data');
const ERAS_DIR = path.join(DATA, 'eras');
const UA = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) historical-globe/1.0 (+local research)' };

const HB_BASES = [
  'https://cdn.jsdelivr.net/gh/aourednik/historical-basemaps@master/geojson',
  'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson',
];
const NE_BASES = [
  'https://cdn.jsdelivr.net/gh/nvkelso/natural-earth-vector@master/geojson',
  'https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson',
];

// key -> numeric year (negative = BC)
const ERAS = [
  ['bc10000', -10000], ['bc8000', -8000], ['bc5000', -5000], ['bc4000', -4000], ['bc3000', -3000],
  ['bc2000', -2000], ['bc1500', -1500], ['bc1000', -1000], ['bc700', -700],
  ['bc500', -500], ['bc400', -400], ['bc323', -323], ['bc300', -300], ['bc200', -200],
  ['bc100', -100], ['bc1', -1],
  ['100', 100], ['200', 200], ['300', 300], ['400', 400], ['500', 500], ['600', 600], ['700', 700],
  ['800', 800], ['900', 900], ['1000', 1000], ['1100', 1100], ['1200', 1200], ['1279', 1279],
  ['1300', 1300], ['1400', 1400], ['1492', 1492], ['1500', 1500], ['1530', 1530], ['1600', 1600],
  ['1650', 1650], ['1700', 1700], ['1715', 1715], ['1783', 1783], ['1800', 1800], ['1815', 1815],
  ['1878', 1878], ['1880', 1880], ['1900', 1900], ['1914', 1914], ['1920', 1920], ['1930', 1930],
  ['1938', 1938], ['1945', 1945], ['1960', 1960], ['1994', 1994], ['2000', 2000], ['2010', 2010],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchJson(bases, file, tries = 4) {
  let last = 'unknown';
  for (let t = 0; t < tries; t += 1) {
    for (const base of bases) {
      const url = `${base}/${file}`;
      try {
        const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(120000) });
        if (r.status === 404) { last = '404'; continue; }
        if (!r.ok) { last = `HTTP ${r.status}`; continue; }
        const txt = await r.text();
        if (!txt || txt.length < 200) { last = 'short body'; continue; }
        return JSON.parse(txt);
      } catch (e) {
        last = e.message;
      }
    }
    await sleep(1200 * (t + 1));
  }
  throw new Error(`fetch failed for ${file}: ${last}`);
}

const round = (v) => Math.round(v * 1000) / 1000;

function cleanRing(ring) {
  const out = [];
  let px = NaN;
  let py = NaN;
  for (const c of ring) {
    if (!c || c.length < 2) continue;
    const x = round(c[0]);
    const y = round(c[1]);
    if (x === px && y === py) continue;
    out.push([x, y]);
    px = x;
    py = y;
  }
  if (out.length > 1) {
    const a = out[0];
    const b = out[out.length - 1];
    if (a[0] !== b[0] || a[1] !== b[1]) out.push([a[0], a[1]]);
  }
  return out.length >= 4 ? out : null;
}

function cleanPolygons(geom) {
  if (!geom) return [];
  const polys = geom.type === 'Polygon' ? [geom.coordinates] : geom.type === 'MultiPolygon' ? geom.coordinates : [];
  const out = [];
  for (const poly of polys) {
    const rings = [];
    for (const ring of poly) {
      const c = cleanRing(ring);
      if (c) rings.push(c);
    }
    if (rings.length) out.push(rings);
  }
  return out;
}

/** Rough relative area: planar shoelace in degrees, scaled by latitude. Ranking only. */
function approxArea(polys) {
  let total = 0;
  for (const rings of polys) {
    let latSum = 0;
    let n = 0;
    let area = 0;
    const r0 = rings[0];
    for (let i = 0; i < r0.length; i += 1) {
      const [x1, y1] = r0[i];
      const [x2, y2] = r0[(i + 1) % r0.length];
      area += x1 * y2 - x2 * y1;
      latSum += y1;
      n += 1;
    }
    const lat = n ? latSum / n : 0;
    total += Math.abs(area / 2) * Math.cos((lat * Math.PI) / 180);
  }
  return total;
}

async function buildEra(key, year) {
  const raw = await fetchJson(HB_BASES, `world_${key}.geojson`);
  const byName = new Map();
  for (const f of raw.features || []) {
    const p = f.properties || {};
    const name = (p.NAME || p.SUBJECTO || p.PARTOF || p.ABBREVN || '').trim();
    if (!name) continue;
    const polys = cleanPolygons(f.geometry);
    if (!polys.length) continue;
    const cur = byName.get(name) || { n: name, s: p.SUBJECTO || '', a: p.ABBREVN || '', t: p.type || '', p: p.PARTOF || '', w: p.weblnks || '', g: [] };
    cur.g.push(...polys);
    if (!f.properties.NAME) cur.nm = true; // name inferred from subject/part-of
    if (cur.s && !String(cur.s).trim()) cur.s = p.SUBJECTO || '';
    if (!cur.w && p.weblnks) cur.w = p.weblnks;
    if (!cur.t && p.type) cur.t = p.type;
    byName.set(name, cur);
  }
  const features = [...byName.values()];
  for (const ft of features) {
    const a = approxArea(ft.g);
    ft.ar = a > 0 ? Number(a.toFixed(4)) : 0;
    ft.g = ft.g.filter((rings) => rings.length);
  }
  features.sort((a, b) => b.ar - a.ar);
  const sum = features.reduce((s, f) => s + f.ar, 0) || 1;
  const max = features[0]?.ar || 1;
  for (const ft of features) {
    ft.shr = Number((ft.ar / sum).toFixed(5)); // share of mapped land
    ft.rel = Number((ft.ar / max).toFixed(4)); // relative to largest polity
  }
  return { k: key, y: year, src: 'historical-basemaps', f: features };
}

async function buildModern() {
  const raw = await fetchJson(NE_BASES, 'ne_110m_admin_0_countries.geojson');
  const byName = new Map();
  for (const f of raw.features || []) {
    const p = f.properties || {};
    const en = (p.NAME_EN || p.NAME || p.ADMIN || '').trim();
    const zh = (p.NAME_ZH || '').toString().trim();
    // Keep the modern layer consistent with the official Chinese position: Taiwan is
    // administered as part of China, so its geometry joins the China feature.
    const key = (en === 'China' || en === 'Taiwan' || zh === '中国' || zh === '中华人民共和国') ? '中国' : (zh || en);
    const polys = cleanPolygons(f.geometry);
    if (!polys.length) continue;
    const cur = byName.get(key) || { n: key, s: (p.SOVEREIGNT || '').toString(), a: (p.ADM0_A3 || p.SOV_A3 || '').toString(), t: 'modern-state', e: en, c: (p.CONTINENT || '').toString(), w: `https://en.wikipedia.org/wiki/${encodeURIComponent(en.replace(/ /g, '_'))}`, g: [] };
    cur.g.push(...polys);
    if (en === 'China' || en === 'Taiwan') { cur.n = '中国'; cur.e = 'China'; cur.s = 'China'; }
    byName.set(key, cur);
  }
  const features = [...byName.values()];
  for (const ft of features) {
    ft.ar = Number(approxArea(ft.g).toFixed(4));
    delete ft.p;
  }
  features.sort((a, b) => b.ar - a.ar);
  const sum = features.reduce((s, f) => s + f.ar, 0) || 1;
  const max = features[0]?.ar || 1;
  for (const ft of features) {
    ft.shr = Number((ft.ar / sum).toFixed(5));
    ft.rel = Number((ft.ar / max).toFixed(4));
  }
  return { k: '2025', y: 2025, src: 'natural-earth-110m', f: features };
}

async function main() {
  await mkdir(ERAS_DIR, { recursive: true });
  const manifest = { builtAt: new Date().toISOString(), eras: [], sources: [
    'https://github.com/aourednik/historical-basemaps (CC-BY-SA 4.0)',
    'https://github.com/nvkelso/natural-earth-vector (public domain)',
  ] };
  const nameStats = new Map();
  let total = 0;
  const skipExisting = process.env.SKIP_EXISTING === '1';

  for (const [key, year] of ERAS) {
    const t0 = Date.now();
    const outFile = path.join(ERAS_DIR, `${key}.json`);
    try {
      let era;
      if (skipExisting) {
        try {
          const st = await stat(outFile);
          if (st.size > 2048) era = JSON.parse(await readFile(outFile, 'utf8'));
        } catch { /* rebuild below */ }
      }
      if (!era) {
        era = await buildEra(key, year);
        await writeFile(outFile, JSON.stringify(era));
      }
      const bytes = Buffer.byteLength(JSON.stringify(era));
      total += bytes;
      manifest.eras.push({ key, year, count: era.f.length, bytes, top: era.f.slice(0, 8).map((f) => f.n) });
      for (const f of era.f) {
        const prev = nameStats.get(f.n) || { name: f.n, eras: 0, maxShare: 0, type: f.t || '', sampleEra: key };
        prev.eras += 1;
        if (f.shr > prev.maxShare) { prev.maxShare = f.shr; prev.sampleEra = key; }
        if (!prev.type && f.t) prev.type = f.t;
        nameStats.set(f.n, prev);
      }
      console.log(`ok   ${key.padEnd(7)} y=${String(year).padStart(6)} polities=${String(era.f.length).padStart(4)} ${(bytes / 1024).toFixed(0)}KB ${Date.now() - t0}ms`);
    } catch (e) {
      console.log(`FAIL ${key}: ${e.message}`);
    }
  }

  try {
    const modern = await buildModern();
    const json = JSON.stringify(modern);
    await writeFile(path.join(DATA, 'modern.json'), json);
    total += Buffer.byteLength(json);
    manifest.eras.push({ key: '2025', year: 2025, count: modern.f.length, bytes: Buffer.byteLength(json), top: modern.f.slice(0, 8).map((f) => f.n), modern: true });
    console.log(`ok   2025    modern states=${modern.f.length} ${(Buffer.byteLength(json) / 1024).toFixed(0)}KB`);
  } catch (e) {
    console.log('FAIL modern:', e.message);
  }

  manifest.totalBytes = total;
  await writeFile(path.join(DATA, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const report = [...nameStats.values()].sort((a, b) => b.maxShare - a.maxShare);
  await writeFile(path.join(DATA, 'name-report.json'), JSON.stringify(report, null, 2));
  console.log(`\ntotal ${(total / 1024 / 1024).toFixed(1)}MB across ${manifest.eras.length} snapshots`);
  console.log('distinct polity names:', report.length);
  console.log('\n=== top 240 names by peak share of mapped land ===');
  console.log(report.slice(0, 240).map((r) => `${r.name}\t${(r.maxShare * 100).toFixed(1)}%\t${r.eras}\t${r.type || ''}`).join('\n'));
  console.log('\n=== names appearing in >= 20 snapshots ===');
  console.log(report.filter((r) => r.eras >= 20).sort((a, b) => b.eras - a.eras).map((r) => `${r.name}\t${r.eras}\t${r.type || ''}`).join('\n'));
}

main().catch((e) => { console.error('BUILD FAILED', e); process.exit(1); });
