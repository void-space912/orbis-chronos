/**
 * 首屏性能测量：冷启动（空缓存）与热启动（走缓存）分别测一次。
 * 用法：先启动带调试端口的浏览器，再 node scripts/perf.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'verify');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3180';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9333';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const collect = () => {
  const t = (window.__orbis && window.__orbis.state && window.__orbis.state.timing) || {};
  const nav = performance.getEntriesByType('navigation')[0] || {};
  const res = performance.getEntriesByType('resource');
  let transfer = 0;
  const items = [];
  for (const r of res) {
    const bytes = r.transferSize || 0;
    transfer += bytes;
    items.push({ file: r.name.split('/').slice(-2).join('/'), kb: Math.round(bytes / 1024), ms: Math.round(r.duration) });
  }
  items.sort((a, b) => b.kb - a.kb);
  return {
    domContentLoadedMs: Math.round(nav.domContentLoadedEventEnd || 0),
    loadEventMs: Math.round(nav.loadEventEnd || 0),
    bootStartMs: Math.round(t.start || 0),
    globeReadyMs: t.globeReadyMs || null,
    eraDataMs: t.dataMs || null,
    firstPaintMs: t.firstPaintMs || null,
    requests: res.length,
    transferKB: Math.round(transfer / 1024),
    topResources: items.slice(0, 10),
  };
};

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error') logs.push(m.text()); });
  page.on('pageerror', (e) => logs.push(`pageerror: ${e.message}`));

  const report = { base: BASE, cold: null, warm: null, logs };

  await page.goto(`${BASE}/#y=1900`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__orbis?.state?.booted === true, { timeout: 60000, polling: 100 });
  await sleep(1200);
  report.cold = await page.evaluate(collect);
  await page.screenshot({ path: path.join(OUT, 'perf-cold.png') });

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__orbis?.state?.booted === true, { timeout: 60000, polling: 100 });
  await sleep(1200);
  report.warm = await page.evaluate(collect);

  // 换个年代再测一次（同一个年代已缓存，取一个没预取过的 1400）
  const t0 = Date.now();
  await page.evaluate(() => window.__orbis.requestEra(window.__orbis.ERAS.findIndex((e) => e.key === '1400')));
  await page.waitForFunction(() => window.__orbis.state.era && window.__orbis.state.era.key === '1400', { timeout: 30000, polling: 100 });
  report.switchMsTo1400 = Date.now() - t0;

  // 近景截图：确认压缩后的贴图质量
  await page.setViewport({ width: 1000, height: 700, deviceScaleFactor: 2 });
  await page.evaluate(() => window.__orbis.globe.pointOfView({ lat: 32, lng: 92, altitude: 1.3 }, 0));
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, 'texture-zoom.png') });
  report.textureInfo = await page.evaluate(() => {
    const m = window.__orbis.globe.globeMaterial();
    const tex = m.map;
    return {
      dayMap: tex && tex.image ? `${tex.image.width}x${tex.image.height}` : null,
      hasSpecular: Boolean(m.specularMap),
      hasBump: Boolean(m.bumpMap),
      background: Boolean(window.__orbis.globe.backgroundImageUrl()),
    };
  });

  await writeFile(path.join(OUT, 'perf.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await page.close();
  await browser.disconnect();
}

main().catch((e) => { console.error('PERF FAILED', e); process.exit(1); });
