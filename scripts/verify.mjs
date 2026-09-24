/**
 * 浏览器端验收：连接到本机已启动的调试端口浏览器，检查渲染、交互与性能并截图。
 *
 * 启动浏览器（Windows PowerShell）：
 *   & "<Edge 路径>\msedge.exe" --headless=new --remote-debugging-port=9333 `
 *     --user-data-dir=<临时目录> --enable-unsafe-swiftshader --use-angle=swiftshader `
 *     --window-size=1600,1000 about:blank
 * 然后： node scripts/verify.mjs [eraKey ...]
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'verify');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3180';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9333';
const eras = process.argv.slice(2).length ? process.argv.slice(2) : ['1900', '1500', 'bc1000', '2025'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

  const logs = [];
  page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));
  page.on('requestfailed', (r) => logs.push(`[requestfailed] ${r.url()} :: ${r.failure()?.errorText}`));

  const report = { base: BASE, logs, checks: {}, eras: [] };
  await page.goto(`${BASE}/#y=${eras[0]}`, { waitUntil: 'domcontentloaded', timeout: 60000 });

  try {
    await page.waitForFunction(() => window.__orbis?.state?.booted === true, { timeout: 60000, polling: 300 });
    report.checks.booted = true;
  } catch {
    report.checks.booted = false;
    report.checks.bootText = await page.$eval('#bootStep', (el) => el.textContent).catch(() => 'n/a');
  }
  await sleep(2500);

  report.checks.resources = await page.evaluate(async () => {
    const urls = [...new Set(performance.getEntriesByType('resource').map((e) => e.name))];
    const bad = [];
    for (const u of urls) {
      try { const r = await fetch(u, { cache: 'no-store' }); if (!r.ok) bad.push(`${r.status} ${u}`); }
      catch { bad.push(`ERR ${u}`); }
    }
    return { count: urls.length, bad };
  });

  report.checks.fx = await page.evaluate(() => {
    const c = document.getElementById('fx');
    const ctx = c.getContext('2d');
    const { width, height } = c;
    const d = ctx.getImageData(0, 0, width, height).data;
    let lit = 0;
    let maxA = 0;
    for (let i = 3; i < d.length; i += 4) { if (d[i] > 6) lit += 1; if (d[i] > maxA) maxA = d[i]; }
    return { cssSize: `${c.clientWidth}x${c.clientHeight}`, buffer: `${width}x${height}`, litPixels: lit, maxAlpha: maxA };
  });

  report.checks.webgl = await page.evaluate(() => {
    const g = window.__orbis.globe;
    const gl = g.renderer().getContext();
    const cam = g.camera();
    const dist = cam.position.length();
    const ang = Math.asin(Math.min(0.9999, 100 / dist));
    return {
      version: gl.getParameter(gl.VERSION),
      globeRadiusPx: Math.round((Math.tan(ang) * (document.getElementById('stage').clientHeight / 2)) / Math.tan(((cam.fov * Math.PI) / 180) / 2)),
    };
  });

  // 绘制调用构成（判断性能瓶颈）
  report.checks.drawCalls = await page.evaluate(async () => {
    const g = window.__orbis.globe;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const calls = async () => { await frame(); return g.renderer().info.render.calls; };
    const data = window.__orbis.state.features;
    const base = await calls();
    g.polygonStrokeColor(() => null);
    const noStroke = await calls();
    g.polygonStrokeColor((f) => f.stroke);
    g.polygonsData([]);
    const noPolygons = await calls();
    g.polygonsData(data);
    await wait(1400);
    g.htmlElementsData([]);
    const noLabels = await calls();
    g.htmlElementsData(window.__orbis.state.tops);
    await wait(600);
    g.arcsData([]);
    g.ringsData([]);
    g.pathsData([]);
    const bare = await calls();
    return { polygons: data.length, base, noStroke, noPolygons, noLabels, bare };
  });

  // 球面标签（DOM）是否正常渲染
  report.checks.labels = await page.evaluate(() => [...document.querySelectorAll('.g-label')].map((el) => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), fontSize: el.style.fontSize };
  }));

  for (const key of eras) {
    const t0 = Date.now();
    await page.evaluate((k) => window.__orbis.requestEra(window.__orbis.ERAS.findIndex((e) => e.key === k)), key);
    await page.waitForFunction(
      (k) => { const s = window.__orbis.state; return s.era && s.era.key === k && s.features.length > 0; },
      { timeout: 45000, polling: 200 }, key,
    );
    await sleep(2000);
    const info = await page.evaluate(() => {
      const s = window.__orbis.state;
      const g = window.__orbis.globe;
      return {
        era: s.era.key,
        shown: s.features.length,
        labels: g.labelsData().length,
        ranges: g.ringsData().length,
        arcs: g.arcsData().length,
        yearText: document.getElementById('yearValue').textContent,
        yearLabel: document.getElementById('yearLabel').textContent,
        stats: document.getElementById('tlStats').textContent.slice(0, 140),
        legend: [...document.querySelectorAll('.legend-item')].map((el) => el.textContent.trim()).slice(0, 8),
        drawCalls: g.renderer().info.render.calls,
        triangles: g.renderer().info.render.triangles,
      };
    });
    info.pickMs = Date.now() - t0;
    report.eras.push(info);
    await page.screenshot({ path: path.join(OUT, `era-${key}.png`) });
  }

  await page.evaluate(() => window.__orbis.requestEra(window.__orbis.ERAS.findIndex((e) => e.key === '1900')));
  await sleep(2500);
  const target = await page.evaluate(() => {
    const f = window.__orbis.state.features[0];
    const p = window.__orbis.globe.getScreenCoords(f.lat, f.lng, 0.02);
    return { name: f.nameZh, x: Math.round(p.x), y: Math.round(p.y) };
  });
  await page.mouse.move(target.x - 40, target.y - 40);
  await sleep(300);
  await page.mouse.move(target.x, target.y);
  await sleep(1200);
  report.checks.hover = {
    target,
    tooltipShown: await page.$eval('#tooltip', (el) => !el.hidden).catch(() => null),
    tooltipName: await page.$eval('#tooltip .tt-name', (el) => el.textContent).catch(() => null),
    tooltipMeta: await page.$eval('#tooltip .tt-meta', (el) => el.textContent).catch(() => null),
  };
  await page.screenshot({ path: path.join(OUT, 'hover.png') });

  await page.mouse.click(target.x, target.y);
  await sleep(1600);
  report.checks.click = {
    detailShown: await page.$eval('#detailPanel', (el) => !el.hidden).catch(() => null),
    name: await page.$eval('#detailName', (el) => el.textContent).catch(() => null),
    sub: await page.$eval('#detailSub', (el) => el.textContent).catch(() => null),
    type: await page.$eval('#detailType', (el) => el.textContent).catch(() => null),
    share: await page.$eval('#detailShare', (el) => el.textContent).catch(() => null),
    span: await page.$eval('#detailSpan', (el) => el.textContent).catch(() => null),
  };
  await page.screenshot({ path: path.join(OUT, 'click.png') });

  report.checks.scrub = await page.evaluate(async () => {
    const o = window.__orbis;
    const t0 = performance.now();
    for (const k of ['1800', '1600', '1400', '1200', '1000', '800', '500', '100', 'bc3000']) {
      o.requestEra(o.ERAS.findIndex((e) => e.key === k));
      await new Promise((r) => setTimeout(r, 260));
    }
    const settle0 = performance.now();
    while (performance.now() - settle0 < 6000) {
      if (o.state.era && o.state.era.key === 'bc3000') break;
      await new Promise((r) => setTimeout(r, 200));
    }
    return { totalMs: Math.round(performance.now() - t0), landedOn: o.state.era.key, features: o.state.features.length };
  });
  await page.screenshot({ path: path.join(OUT, 'scrub.png') });

  // 历史大事：标记 + 面板
  report.checks.events = await page.evaluate(() => {
    const o = window.__orbis;
    return {
      eraEvents: o.state.eraEvents.length,
      eventMarkers: document.querySelectorAll('.g-event').length,
      panelHidden: document.getElementById('eventsPanel').hidden,
      rows: document.querySelectorAll('.event-row').length,
      firstRow: document.querySelector('.event-row')?.textContent.replace(/\s+/g, ' ').trim() || null,
      tickMarkers: document.querySelectorAll('.ticks i.has-event').length,
      warTicks: document.querySelectorAll('.ticks i.has-war').length,
    };
  });
  const evRow = await page.$('.event-row');
  if (evRow) {
    const before = await page.evaluate(() => ({ lat: window.__orbis.globe.pointOfView().lat, lng: window.__orbis.globe.pointOfView().lng }));
    await evRow.click();
    await sleep(1800);
    const after = await page.evaluate(() => ({ lat: window.__orbis.globe.pointOfView().lat, lng: window.__orbis.globe.pointOfView().lng }));
    report.checks.eventClick = {
      moved: Math.abs(before.lat - after.lat) + Math.abs(before.lng - after.lng) > 0.5,
      active: await page.$eval('.event-row.active', (el) => el.textContent.replace(/\s+/g, ' ').trim()).catch(() => null),
    };
    await page.screenshot({ path: path.join(OUT, 'events.png') });
  }

  // 播放流畅度：连续播放若干年代，采样每帧间隔
  report.checks.playback = await page.evaluate(async () => {
    const o = window.__orbis;
    const start = o.ERAS.findIndex((e) => e.key === '1200');
    o.requestEra(start);
    await new Promise((r) => setTimeout(r, 2500));
    const frames = [];
    let last = performance.now();
    let longTasks = 0;
    let observer = null;
    try {
      observer = new PerformanceObserver((list) => { longTasks += list.getEntries().length; });
      observer.observe({ entryTypes: ['longtask'] });
    } catch { /* 不支持则忽略 */ }
    const t0 = performance.now();
    document.getElementById('btnPlay').click();
    while (performance.now() - t0 < 12000) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      frames.push(now - last);
      last = now;
    }
    document.getElementById('btnPlay').click();
    if (observer) observer.disconnect();
    frames.sort((a, b) => a - b);
    const pct = (p) => Number(frames[Math.min(frames.length - 1, Math.floor(frames.length * p))].toFixed(1));
    return {
      frames: frames.length,
      medianMs: pct(0.5),
      p95Ms: pct(0.95),
      maxMs: Number(frames[frames.length - 1].toFixed(1)),
      over33ms: frames.filter((f) => f > 33).length,
      over100ms: frames.filter((f) => f > 100).length,
      longTasks,
      endEra: o.state.era.key,
    };
  });
  await page.screenshot({ path: path.join(OUT, 'playing.png') });

  report.checks.fpsSoftware = await page.evaluate(() => new Promise((resolve) => {
    let frames = 0;
    const t0 = performance.now();
    const loop = () => {
      frames += 1;
      if (performance.now() - t0 > 2500) resolve(Number((frames / ((performance.now() - t0) / 1000)).toFixed(1)));
      else requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }));

  // 「更多政权」开关（在要素最多的快照上验证性能边界）
  await page.evaluate(() => window.__orbis.requestEra(window.__orbis.ERAS.findIndex((e) => e.key === '1492')));
  await sleep(2600);
  report.checks.moreToggle = await page.evaluate(async () => {
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const cb = document.querySelector('input[data-layer="all"]');
    const o = window.__orbis;
    const before = o.state.features.length;
    const t0 = performance.now();
    cb.click();
    await wait(3500);
    const after = o.state.features.length;
    const info = { before, after, ms: Math.round(performance.now() - t0), drawCalls: o.globe.renderer().info.render.calls };
    cb.click();
    await wait(2500);
    info.backTo = o.state.features.length;
    return info;
  });
  await page.screenshot({ path: path.join(OUT, 'era-1492-more.png') });

  // 近景：检查标签可读性（高分辨率截图）
  await page.setViewport({ width: 1000, height: 700, deviceScaleFactor: 2 });
  await page.evaluate(() => window.__orbis.globe.pointOfView({ lat: 32, lng: 92, altitude: 1.35 }, 0));
  await sleep(2200);
  await page.screenshot({ path: path.join(OUT, 'labels-zoom.png') });
  report.checks.labelsZoom = await page.evaluate(() => [...document.querySelectorAll('.g-label')].map((el) => {
    const r = el.getBoundingClientRect();
    return { text: el.textContent.trim(), w: Math.round(r.width), h: Math.round(r.height), opacity: getComputedStyle(el).opacity };
  }));
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });

  await page.setViewport({ width: 420, height: 860, deviceScaleFactor: 1 });
  await sleep(2200);
  await page.screenshot({ path: path.join(OUT, 'mobile.png') });
  report.checks.mobile = await page.evaluate(() => {
    const tl = document.querySelector('.hud-timeline').getBoundingClientRect();
    const year = document.querySelector('.hud-year').getBoundingClientRect();
    return {
      timelineBottom: Math.round(tl.bottom),
      viewportH: window.innerHeight,
      timelineOverflows: tl.right > window.innerWidth + 2 || tl.left < -2,
      yearVisible: year.top >= 0 && year.bottom <= window.innerHeight,
    };
  });

  await writeFile(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await page.close();
  await browser.disconnect();
}

main().catch((e) => { console.error('VERIFY FAILED', e); process.exit(1); });
