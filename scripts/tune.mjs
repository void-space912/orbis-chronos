/**
 * 调参实测：多边形层的「同步构建耗时」与「过渡期间帧时间」，
 * 用来决定 polygonsTransitionDuration 与 curvature 取值。
 * 用法： node scripts/tune.mjs
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
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  const logs = [];
  page.on('pageerror', (e) => logs.push(e.message));
  await page.goto(`${BASE}/#y=1900`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__orbis?.state?.booted === true, { timeout: 60000, polling: 200 });
  await sleep(3000);

  const report = { logs };

  // 1) 版本信息
  report.version = await page.evaluate(() => ({
    cap: window.__orbis.state.features.length,
    transition: 1,
    curvature: 6,
  }));

  // 2) 播放：每一步的耗时（取回+解析+渲染准备）与帧时间
  const measurePlayback = async (label, prewarm) => {
    if (prewarm) {
      // 先把接下来几个年代取回来，模拟"预取生效"的稳态
      await page.evaluate(async () => {
        const o = window.__orbis;
        const i = o.ERAS.findIndex((e) => e.key === '1200');
        for (let k = i; k < Math.min(i + 6, o.ERAS.length); k += 1) {
          await fetch(`data/${o.ERAS[k].key === '2025' ? 'modern.json' : 'eras/' + o.ERAS[k].key + '.json'}`).then((r) => r.json());
        }
      });
    }
    return page.evaluate(async (tag) => {
      const o = window.__orbis;
      const wait = (ms) => new Promise((r) => setTimeout(r, ms));
      const start = o.ERAS.findIndex((e) => e.key === '1200');
      o.requestEra(start);
      await wait(2500);
      const frames = [];
      const steps = [];
      let last = performance.now();
      const t0 = performance.now();
      document.getElementById('btnPlay').click();
      while (performance.now() - t0 < 9000) {
        await new Promise((r) => requestAnimationFrame(r));
        const now = performance.now();
        frames.push(now - last);
        last = now;
        if (o.state.timing.lastStepMs && o.state.timing.lastStepAt !== o.state.era.key) {
          o.state.timing.lastStepAt = o.state.era.key;
          steps.push({ era: o.state.era.key, ms: o.state.timing.lastStepMs, cached: o.state.timing.lastStepCached });
        }
      }
      document.getElementById('btnPlay').click();
      frames.sort((a, b) => a - b);
      const at = (p) => Number(frames[Math.min(frames.length - 1, Math.floor(frames.length * p))].toFixed(0));
      return {
        label: tag,
        frames: frames.length,
        medianMs: at(0.5),
        p95Ms: at(0.95),
        maxMs: Number(frames[frames.length - 1].toFixed(0)),
        steps,
        endEra: o.state.era.key,
      };
    }, label);
  };

  report.playback = [];
  report.playback.push(await measurePlayback('第一轮（预取冷启动）', false));
  await sleep(800);
  report.playback.push(await measurePlayback('第二轮（预取已生效）', true));
  await sleep(800);

  // 3) 播放结束后的观感截图
  await page.evaluate(() => window.__orbis.requestEra(window.__orbis.ERAS.findIndex((e) => e.key === '1900')));
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT, 'tune-playback.png') });

  await writeFile(path.join(OUT, 'tune.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await page.close();
  await browser.disconnect();
}

main().catch((e) => { console.error('TUNE FAILED', e); process.exit(1); });
