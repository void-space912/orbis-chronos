/**
 * 年代数据仓库：按需加载某个年代的政权版图，做一次轻量预处理后交给渲染层。
 * 数据文件由 scripts/build-data.mjs 从 historical-basemaps / Natural Earth 生成。
 */
import { eraFile } from './eras.js';
import { classify, labelOf, zhName, CONTINENTS } from './i18n.js';

const cache = new Map();
const pending = new Map();

// 配色刻意避开高饱和的洋红/粉红：大面积疆域色块闪烁时观感很差
const PALETTE_HUES = [188, 196, 205, 214, 224, 232, 268, 280, 158, 96, 42, 26];

function hash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

// alpha 压得比较低，让真实地表透出来，切换年代时也不会有整片色块"盖上来"的感觉
const CLASS_TONE = {
  empire: { s: 74, l: 60, alpha: 0.48 },
  kingdom: { s: 66, l: 62, alpha: 0.46 },
  republic: { s: 70, l: 62, alpha: 0.46 },
  colonial: { s: 56, l: 60, alpha: 0.42 },
  farming: { s: 52, l: 58, alpha: 0.4 },
  hunting: { s: 46, l: 56, alpha: 0.34 },
  culture: { s: 48, l: 58, alpha: 0.38 },
  state: { s: 58, l: 60, alpha: 0.44 },
  other: { s: 42, l: 60, alpha: 0.34 },
};

function toneOf(cls, modern = false) {
  if (modern) return { s: 62, l: 60, alpha: 0.44 };
  if (cls && cls.startsWith('c:')) return { s: 62, l: 60, alpha: 0.44 };
  return CLASS_TONE[cls] || CLASS_TONE.other;
}

/**
 * 取最大多边形的外接矩形：既当标签锚点，也用来判断"这是个跨越半个地球的巨型要素"。
 * 跨 300° 以上经度、且整体位于高纬度（或南半球高纬）的多边形是环绕极点的"盖帽"，
 * 一旦上色就会像罩子扣在地球顶上，需要特殊处理。
 */
function anchorOf(polys) {
  let best = null;
  let bestArea = -1;
  let minXAll = 180;
  let maxXAll = -180;
  let minYAll = 90;
  let maxYAll = -90;
  let poleCap = false;

  for (const rings of polys) {
    const r = rings[0];
    let minX = 180;
    let maxX = -180;
    let minY = 90;
    let maxY = -90;
    for (const [x, y] of r) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
    if (minX < minXAll) minXAll = minX;
    if (maxX > maxXAll) maxXAll = maxX;
    if (minY < minYAll) minYAll = minY;
    if (maxY > maxYAll) maxYAll = maxY;
    const spanLng = maxX - minX;
    if (spanLng > 300 && (minY > 50 || maxY < -50)) poleCap = true;

    const area = spanLng * (maxY - minY);
    if (area > bestArea) {
      bestArea = area;
      best = { lat: (minY + maxY) / 2, lng: (minX + maxX) / 2 };
    }
  }

  return {
    anchor: best || { lat: 0, lng: 0 },
    spanLng: maxXAll - minXAll,
    spanLat: maxYAll - minYAll,
    poleCap,
  };
}

/**
 * 面积越大，填充越淡：跨洲帝国那种"铺满半个可见半球"的色块，
 * 在高不透明度下看起来就像一层彩色罩子盖住地球。
 * 描边保持得比较清楚，这样疆域轮廓仍然可读。
 */
function giantFactor(share) {
  return Math.max(0.26, 1 - (share - 0.02) * 3.8);
}

function decorate(raw, modern, year) {
  const cls = classify(raw.n, raw.t, modern ? 2025 : year, modern ? raw.c : '');
  const tone = toneOf(cls, modern);
  const baseHue = modern && raw.c && CONTINENTS[raw.c]
    ? CONTINENTS[raw.c].hue
    : PALETTE_HUES[hash(raw.n) % PALETTE_HUES.length];
  const hue = (baseHue + (hash(raw.n) % 17) - 8 + 360) % 360;
  const zh = modern ? raw.n : zhName(raw.n);

  const box = anchorOf(raw.g);
  const share = raw.shr || 0;
  // 巨型 = 面积占比高，或者环绕极点的"盖帽"（后者哪怕面积不大，也会在极地上扣一个圆盘）
  const giant = share >= 0.08 || box.poleCap;
  const factor = giant ? giantFactor(share) : 1;
  const alpha = tone.alpha * factor * (box.poleCap ? 0.42 : 1);
  const strokeAlpha = giant ? 0.72 : 0.85;
  const sideAlpha = (giant ? 0.22 : 0.9) * (box.poleCap ? 0.6 : 1);

  const feature = {
    id: `${raw.n}#${hash(raw.n) % 9973}`,
    name: raw.n,
    nameZh: zh,
    nameEn: modern ? raw.e || raw.n : raw.n,
    translated: modern || zh !== raw.n,
    type: raw.t || '',
    clsLabel: labelOf(cls),
    subject: raw.s || '',
    partOf: raw.p || '',
    wiki: raw.w || (modern && raw.e ? `https://en.wikipedia.org/wiki/${encodeURIComponent(String(raw.e).replace(/ /g, '_'))}` : ''),
    rel: raw.rel || 0,
    share,
    cls,
    lat: 0,
    lng: 0,
    giant,
    poleCap: box.poleCap,
    spanLng: box.spanLng,
    color: `hsla(${hue}, ${tone.s}%, ${tone.l}%, ${alpha.toFixed(3)})`,
    colorHover: `hsla(${hue}, ${Math.min(100, tone.s + 14)}%, ${Math.min(88, tone.l + 18)}%, 0.95)`,
    stroke: `hsla(${hue}, 96%, 76%, ${strokeAlpha})`,
    strokeHover: '#ffffff',
    side: `hsla(${hue}, ${tone.s}%, 30%, ${sideAlpha.toFixed(3)})`,
    hue,
    geometry: null,
  };
  feature.geometry = { type: 'MultiPolygon', coordinates: raw.g };
  feature.lat = box.anchor.lat;
  feature.lng = box.anchor.lng;
  return feature;
}

function prepare(rawFile, { modern = false } = {}) {
  const features = rawFile.f.map((raw) => decorate(raw, modern, rawFile.y));
  features.sort((a, b) => b.rel - a.rel);
  return { key: rawFile.k, year: rawFile.y, features, modern };
}

async function fetchEra(era) {
  const url = eraFile(era);
  // index.html 里的内联脚本已经在解析阶段就发起了当前年代的请求，
  // 这里直接复用那个 Promise，避免同一份数据下载两次
  const pre = window.__eraPrefetch;
  if (pre && pre.file === url && pre.promise) {
    const data = await pre.promise;
    if (data) return data;
  }
  const res = await fetch(url, { cache: 'force-cache', credentials: 'omit' });
  if (!res.ok) throw new Error(`载入 ${era.key} 数据失败（HTTP ${res.status}）`);
  return res.json();
}

/** 载入并缓存某个年代；并发调用会复用同一个 Promise */
export function loadEra(era) {
  if (cache.has(era.key)) return Promise.resolve(cache.get(era.key));
  if (pending.has(era.key)) return pending.get(era.key);
  const p = fetchEra(era)
    .then((raw) => {
      const prepared = prepare(raw, { modern: Boolean(era.modern) });
      cache.set(era.key, prepared);
      pending.delete(era.key);
      return prepared;
    })
    .catch((err) => {
      pending.delete(era.key);
      throw err;
    });
  pending.set(era.key, p);
  return p;
}

/** 后台预热相邻年代，让滑动过程不出现等待 */
export function prefetch(era) {
  if (!era || cache.has(era.key) || pending.has(era.key)) return;
  loadEra(era).catch(() => { /* 预热失败不影响主流程 */ });
}

export function isCached(era) {
  return cache.has(era.key);
}

export function clearCache() {
  cache.clear();
}
