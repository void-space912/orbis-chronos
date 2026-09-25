/**
 * 流畅度体检：像素比、绘制调用、三角面、2D 特效层每帧耗时、帧时间分布。
 * 用法： node scripts/smooth.mjs [eraKey]
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'verify');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3180';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9333';
const era = process.argv[2] || '1900';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  const logs = [];
  page.on('pageerror', (e) => logs.push(e.message));

  await page.goto(`${BASE}/#y=${era}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__orbis?.state?.booted === true, { timeout: 60000, polling: 200 });
  await sleep(6500); // 等帧率自检跑完（揭幕 ~3.5s 后触发）

  const report = { era, logs };

  // 低帧率提示（仅当设备确实吃力时才出现）
  report.perfTip = await page.evaluate(() => {
    const el = document.querySelector('[data-role="perf-tip"]');
    return {
      shown: Boolean(el),
      text: el ? el.textContent : null,
      medianFrameMs: window.__orbis.state.timing.medianFrameMs ?? null,
    };
  });
  await page.screenshot({ path: path.join(OUT, `smooth-tip-${era}.png`) });

  report.renderer = await page.evaluate(() => {
    const g = window.__orbis.globe;
    const r = g.renderer();
    const gl = r.getContext();
    return {
      devicePixelRatio: window.devicePixelRatio,
      rendererPixelRatio: r.getPixelRatio(),
      drawingBuffer: `${gl.drawingBufferWidth}x${gl.drawingBufferHeight}`,
      cssSize: `${document.getElementById('stage').clientWidth}x${document.getElementById('stage').clientHeight}`,
    };
  });

  // 像素比上限：模拟高分屏（dpr=2）后调用 capPixelRatio()，检查画布是否被压到 1.5
  report.pixelRatioCap = await page.evaluate(() => {
    const o = window.__orbis;
    const r = o.globe.renderer();
    const before = { dpr: window.devicePixelRatio, ratio: r.getPixelRatio(), buffer: `${r.getContext().drawingBufferWidth}x${r.getContext().drawingBufferHeight}` };
    const original = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio');
    try {
      Object.defineProperty(window, 'devicePixelRatio', { configurable: true, get: () => 2 });
      o.capPixelRatio();
      const after = { ratio: r.getPixelRatio(), buffer: `${r.getContext().drawingBufferWidth}x${r.getContext().drawingBufferHeight}` };
      return { before, after };
    } finally {
      if (original) Object.defineProperty(window, 'devicePixelRatio', original);
      else delete window.devicePixelRatio;
      o.capPixelRatio();
    }
  });

  // 2D 特效层每帧 CPU 耗时（同步连续绘制 60 帧取平均）
  report.fxBenchMs = await page.evaluate(() => {
    const fx = window.__orbis.fx && window.__orbis.fx();
    if (!fx || !fx.bench) return null;
    fx.bench(10); // 预热
    return Number(fx.bench(60).toFixed(3));
  });

  // 绘制调用构成
  report.drawCalls = await page.evaluate(async () => {
    const g = window.__orbis.globe;
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    const calls = async () => { await frame(); return g.renderer().info.render.calls; };
    const tris = () => g.renderer().info.render.triangles;
    const base = await calls();
    const triangles = tris();
    const withStroke = g.polygonStrokeColor((f) => f.stroke);
    const allStrokes = await calls();
    g.polygonStrokeColor((f) => (f.share < 0.004 ? null : f.stroke));
    const thresholded = await calls();
    g.polygonsData([]);
    const noPolygons = await calls();
    const data = window.__orbis.state.features;
    g.polygonsData(data);
    await wait(1200);
    void withStroke;
    return { features: data.length, allStrokes, thresholded, noPolygons, triangles, base };
  });

  // 空闲自转时的帧时间
  const sample = async (label, doPlay) => page.evaluate(async (tag) => {
    const frames = [];
    let last = performance.now();
    if (tag) document.getElementById('btnPlay').click();
    const t0 = performance.now();
    while (performance.now() - t0 < 8000) {
      await new Promise((r) => requestAnimationFrame(r));
      const now = performance.now();
      frames.push(now - last);
      last = now;
    }
    if (tag) document.getElementById('btnPlay').click();
    frames.sort((a, b) => a - b);
    const at = (p) => Number(frames[Math.min(frames.length - 1, Math.floor(frames.length * p))].toFixed(1));
    return { frames: frames.length, median: at(0.5), p95: at(0.95), max: Number(frames[frames.length - 1].toFixed(1)) };
  }, doPlay);

  report.idle = await sample('idle', false);
  report.playing = await sample('playing', true);

  await page.screenshot({ path: path.join(OUT, `smooth-${era}.png`) });

  await writeFile(path.join(OUT, 'smooth.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await page.close();
  await browser.disconnect();
}

main().catch((e) => { console.error('SMOOTH FAILED', e); process.exit(1); });
