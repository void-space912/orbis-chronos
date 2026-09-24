/**
 * 贴图质量检查：在同一机位下分别截图，用来判断画面上的方块是来自
 * 白天贴图、凹凸图还是海面高光。
 * 用法： node scripts/texcheck.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'verify');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3180';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9333';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1000, height: 700, deviceScaleFactor: 2 });
  const logs = [];
  page.on('pageerror', (e) => logs.push(e.message));

  await page.goto(`${BASE}/#y=1492`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__orbis?.state?.booted === true, { timeout: 60000, polling: 200 });
  await sleep(3500); // 等增强贴图补载完成
  await page.evaluate(() => window.__orbis.globe.pointOfView({ lat: 32, lng: 92, altitude: 1.35 }, 0));
  await sleep(2000);

  const shot = async (name) => {
    await sleep(1500);
    await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  };

  const state = await page.evaluate(() => {
    const g = window.__orbis.globe;
    const m = g.globeMaterial();
    return {
      day: m.map?.image ? `${m.map.image.width}x${m.map.image.height}` : null,
      bump: Boolean(m.bumpMap),
      specular: Boolean(m.specularMap),
      background: Boolean(g.backgroundImageUrl()),
      bumpUrl: g.bumpImageUrl(),
      backgroundUrl: g.backgroundImageUrl(),
    };
  });

  await shot('tex-a-all');

  await page.evaluate(() => {
    const g = window.__orbis.globe;
    g.bumpImageUrl('');
    g.globeMaterial().bumpMap = null;
    g.globeMaterial().needsUpdate = true;
  });
  await shot('tex-b-nobump');

  await page.evaluate(() => {
    const g = window.__orbis.globe;
    g.globeMaterial().specularMap = null;
    g.globeMaterial().needsUpdate = true;
  });
  await shot('tex-c-nospec');

  await page.evaluate(() => {
    const o = window.__orbis;
    o.globe.globeMaterial().specular = null;
    o.globe.polygonsData([]);
    o.globe.htmlElementsData([]);
    o.globe.ringsData([]);
    o.globe.arcsData([]);
    o.globe.pathsData([]);
    o.globe.backgroundImageUrl('');
  });
  await shot('tex-d-raw');

  console.log(JSON.stringify({ state, logs }, null, 2));
  await page.close();
  await browser.disconnect();
}

main().catch((e) => { console.error('TEXCHECK FAILED', e); process.exit(1); });
