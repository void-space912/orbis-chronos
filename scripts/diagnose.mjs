/**
 * 诊断脚本：连接到已启动的调试端口浏览器，采集页面运行数据并试探若干显示参数。
 * 用法： node scripts/diagnose.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
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
  await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

  await page.goto(`${BASE}/#y=1900`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__orbis?.state?.booted === true, { timeout: 60000, polling: 300 });
  await sleep(2500);

  const out = { logs };

  // 1) 哪些请求返回了非 200
  out.resourceStatus = await page.evaluate(async () => {
    const urls = [...new Set(performance.getEntriesByType('resource').map((e) => e.name))];
    const bad = [];
    for (const u of urls) {
      try {
        const r = await fetch(u, { method: 'GET', cache: 'no-store' });
        if (!r.ok) bad.push(`${r.status} ${u}`);
      } catch (e) { bad.push(`ERR ${e.message} ${u}`); }
    }
    return { total: urls.length, bad };
  });

  // 2) 特效画布是否真的在绘制
  out.fxCanvas = await page.evaluate(() => {
    const c = document.getElementById('fx');
    const ctx = c.getContext('2d');
    const { width, height } = c;
    const img = ctx.getImageData(0, 0, width, height).data;
    let nonEmpty = 0;
    let maxA = 0;
    for (let i = 3; i < img.length; i += 4) {
      const a = img[i];
      if (a > 6) nonEmpty += 1;
      if (a > maxA) maxA = a;
    }
    return {
      cssSize: `${c.clientWidth}x${c.clientHeight}`,
      bufferSize: `${width}x${height}`,
      nonEmptyPixels: nonEmpty,
      maxAlpha: maxA,
      orbit: (() => { try { return window.__orbis.globe ? 'n/a' : 'n/a'; } catch { return 'err'; } })(),
    };
  });

  // 3) 绘制调用构成
  out.drawCalls = await page.evaluate(async () => {
    const g = window.__orbis.globe;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const info = () => g.renderer().info.render.calls;
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const measure = async () => { await frame(); return info(); };
    const base = await measure();
    const withStroke = g.polygonStrokeColor((f) => f.stroke);
    await frame();
    const strokeOn = await measure();
    g.polygonStrokeColor(() => null);
    await frame();
    const strokeOff = await measure();
    g.polygonStrokeColor((f) => f.stroke);
    g.polygonsData([]);
    await frame();
    const noPolygons = await measure();
    const data = window.__orbis.state.features;
    g.polygonCapCurvatureResolution(10);
    g.polygonsData([]);
    g.polygonsData(data);
    await frame();
    await wait(1200);
    const coarse = await measure();
    g.polygonCapCurvatureResolution(3);
    g.polygonsData([]);
    g.polygonsData(data);
    await frame();
    await wait(1200);
    const fine = await measure();
    return { base, strokeOn, strokeOff, noPolygons, curvature10: coarse, curvature3: fine,
      meshes: (() => { let n = 0; g.scene().traverse((o) => { if (o.isMesh) n += 1; }); return n; })(),
      polygons: data.length, triangles: g.renderer().info.render.triangles };
  });

  // 4) 标签：加大字号后的观感
  await page.screenshot({ path: path.join(OUT, 'dx-labels-current.png') });
  await page.evaluate(() => {
    const g = window.__orbis.globe;
    g.labelSize((d) => 2.2 + Math.min(2.6, Math.sqrt(d.rel) * 4));
    g.labelDotRadius((d) => 0.5 + Math.min(0.9, Math.sqrt(d.rel) * 1.1));
    g.labelAltitude(0.03);
  });
  await sleep(1600);
  await page.screenshot({ path: path.join(OUT, 'dx-labels-big.png') });

  // 5) 相机拉近
  await page.evaluate(() => window.__orbis.globe.pointOfView({ lat: 30, lng: 100, altitude: 1.75 }, 0));
  await sleep(1400);
  await page.screenshot({ path: path.join(OUT, 'dx-zoom.png') });

  // 6) 真实交互：悬停 + 点击（用屏幕坐标）
  const target = await page.evaluate(() => {
    const s = window.__orbis.state;
    const f = s.features[0];
    const p = window.__orbis.globe.getScreenCoords(f.lat, f.lng, 0.02);
    return { name: f.nameZh, id: f.id, x: p.x, y: p.y };
  });
  out.target = target;
  const t0 = Date.now();
  await page.mouse.move(target.x, target.y);
  await sleep(700);
  out.hover = {
    ms: Date.now() - t0,
    tooltipVisible: await page.$eval('#tooltip', (el) => !el.hidden).catch(() => null),
    tooltipName: await page.$eval('#tooltip .tt-name', (el) => el.textContent).catch(() => null),
    tooltipMeta: await page.$eval('#tooltip .tt-meta', (el) => el.textContent).catch(() => null),
  };
  await page.screenshot({ path: path.join(OUT, 'dx-hover.png') });

  const t1 = Date.now();
  await page.mouse.click(target.x, target.y);
  await sleep(1500);
  out.click = {
    ms: Date.now() - t1,
    detailVisible: await page.$eval('#detailPanel', (el) => !el.hidden).catch(() => null),
    detailName: await page.$eval('#detailName', (el) => el.textContent).catch(() => null),
    detailSpan: await page.$eval('#detailSpan', (el) => el.textContent).catch(() => null),
    detailShare: await page.$eval('#detailShare', (el) => el.textContent).catch(() => null),
  };
  await page.screenshot({ path: path.join(OUT, 'dx-click.png') });

  // 7) 帧率（软件渲染下仅供参考）
  out.fpsSoftware = await page.evaluate(() => new Promise((resolve) => {
    let frames = 0;
    const t0 = performance.now();
    const loop = () => {
      frames += 1;
      if (performance.now() - t0 > 2500) resolve(Number((frames / ((performance.now() - t0) / 1000)).toFixed(1)));
      else requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }));

  out.logs = logs;
  await writeFile(path.join(OUT, 'diagnose.json'), JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out, null, 2));
  await page.close();
  await browser.disconnect();
}

main().catch((e) => { console.error('DIAGNOSE FAILED', e); process.exit(1); });
