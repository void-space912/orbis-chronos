/**
 * 中英文切换验收：分别截图并对比两种语言下的关键文案。
 * 用法： node scripts/langcheck.mjs
 */
import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = path.join(ROOT, 'verify');
const BASE = process.env.BASE_URL || 'http://127.0.0.1:3180';
const CDP = process.env.CDP_URL || 'http://127.0.0.1:9333';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const snapshot = () => ({
  htmlLang: document.documentElement.lang,
  title: document.title,
  tagline: document.querySelector('.brand-text p')?.textContent,
  yearLabel: document.getElementById('yearLabel').textContent,
  yearValue: document.getElementById('yearValue').textContent,
  stats: document.getElementById('tlStats').textContent.slice(0, 110),
  yearMeta: document.getElementById('yearMeta').textContent.slice(0, 110),
  play: document.getElementById('btnPlayLabel').textContent,
  prev: document.getElementById('btnPrev').textContent,
  hint: document.querySelector('.tl-hint')?.textContent,
  consoleTitle: document.getElementById('consoleToggle').textContent,
  layerLabels: [...document.querySelectorAll('#layerSwitches .switch > span:first-child')].map((s) => s.textContent),
  legend: [...document.querySelectorAll('.legend-item')].map((e) => e.textContent.trim()).slice(0, 4),
  eventsTitle: document.querySelector('.events-title')?.textContent,
  eventRows: [...document.querySelectorAll('.event-row')].map((r) => r.textContent.replace(/\s+/g, ' ').trim()).slice(0, 3),
  globeLabels: [...document.querySelectorAll('.g-label .g-txt')].map((e) => e.textContent).slice(0, 5),
  globeEvents: [...document.querySelectorAll('.g-event .g-event-name')].map((e) => e.textContent).slice(0, 3),
  bootNote: document.querySelector('.boot-note')?.textContent,
  langButtons: [...document.querySelectorAll('.lang-btn')].map((b) => `${b.textContent}${b.classList.contains('active') ? '*' : ''}`),
});

const dossier = () => ({
  shown: !document.getElementById('detailPanel').hidden,
  kicker: document.getElementById('detailKicker').textContent,
  name: document.getElementById('detailName').textContent,
  sub: document.getElementById('detailSub').textContent,
  rows: [...document.querySelectorAll('#detailGrid > div')].map((d) => `${d.querySelector('dt').textContent}=${d.querySelector('dd').textContent}`),
  eventsTitle: document.querySelector('#detailEventsBlock .detail-block-title')?.textContent,
  linksTitle: document.querySelector('#detailLinksBlock .detail-block-title')?.textContent,
  links: [...document.querySelectorAll('#detailLinks a')].map((a) => a.textContent.trim()),
  chips: [...document.querySelectorAll('#detailEvents .detail-chip')].map((c) => c.textContent.trim()),
  source: document.getElementById('detailSource').textContent,
  foot: document.getElementById('detailFoot').textContent.slice(0, 90),
});

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await puppeteer.connect({ browserURL: CDP, defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  const logs = [];
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') logs.push(`[${m.type()}] ${m.text()}`); });
  page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`));

  const report = { logs, zh: null, en: null, dossierZh: null, dossierEn: null, labelsAfterSwitch: null };

  await page.goto(`${BASE}/#y=1900`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => window.__orbis?.state?.booted === true, { timeout: 60000, polling: 200 });
  await sleep(3000);
  report.zh = await page.evaluate(snapshot);
  await page.screenshot({ path: path.join(OUT, 'lang-zh.png') });

  // 切到英文
  await page.click('.lang-btn[data-lang="en"]');
  await sleep(2500);
  report.en = await page.evaluate(snapshot);
  await page.screenshot({ path: path.join(OUT, 'lang-en.png') });

  // 英文下点开一个政权卡片
  const target = await page.evaluate(() => {
    const f = window.__orbis.state.features[0];
    const p = window.__orbis.globe.getScreenCoords(f.lat, f.lng, 0.02);
    return { x: Math.round(p.x), y: Math.round(p.y) };
  });
  await page.mouse.move(target.x, target.y);
  await sleep(400);
  await page.mouse.click(target.x, target.y);
  await sleep(1600);
  report.dossierEn = await page.evaluate(dossier);
  await page.screenshot({ path: path.join(OUT, 'lang-en-dossier.png') });

  // 切回中文，卡片与球面标签都应即时变回中文
  await page.click('.lang-btn[data-lang="zh"]');
  await sleep(1800);
  report.dossierZh = await page.evaluate(dossier);
  report.zhAgain = await page.evaluate(snapshot);
  report.labelsAfterSwitch = await page.evaluate(() => ({
    globeLabels: [...document.querySelectorAll('.g-label .g-txt')].map((e) => e.textContent).slice(0, 5),
    globeEvents: [...document.querySelectorAll('.g-event .g-event-name')].map((e) => e.textContent).slice(0, 3),
  }));
  await page.screenshot({ path: path.join(OUT, 'lang-zh-dossier.png') });

  await writeFile(path.join(OUT, 'langcheck.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  await page.close();
  await browser.disconnect();
}

main().catch((e) => { console.error('LANGCHECK FAILED', e); process.exit(1); });
