/**
 * 寰宇纪年 —— 三维历史版图地球主程序。
 * 渲染：globe.gl（three.js）；数据：historical-basemaps + Natural Earth。
 */
import {
  ERAS, formatYear, formatYearShort, eraLabel, eraNote, isMajorEra,
} from './eras.js';
import { loadEra, prefetch, isCached } from './data.js';
import { createEffects } from './effects.js';
import { labelOf, colorOf, typeLabelOf } from './i18n.js';
import { loadEvents, eventsForEra, formatEventYear, eventTypeLabel } from './events.js';
import {
  LANGS, getLang, setLang, onLangChange, t, pickLang, secondaryName, applyStaticI18n,
} from './lang.js';

const $ = (id) => document.getElementById(id);
const BASE_ALTITUDE = 0.008;
const HOVER_ALTITUDE = 0.05;
const MAX_POLYGONS = 300;
const MAX_POLYGONS_ALL = 500;

const TEXTURE = {
  day: 'vendor/img/earth-blue-marble.jpg',
  bump: 'vendor/img/earth-topology.jpg',
  water: 'vendor/img/earth-water.jpg',
  sky: 'vendor/img/night-sky.jpg',
};

const state = {
  index: Math.max(0, ERAS.findIndex((e) => e.key === '1900')),
  features: [],
  tops: [],
  eraEvents: [],
  eventIndex: new Map(),
  hoverId: null,
  selectedId: null,
  playing: false,
  playTimer: 0,
  speed: 1200,
  maxPolitiesAll: false,
  spin: true,
  timing: {},
  idleHandles: [],
  // 脉冲光环默认关闭：逐帧/逐年代闪烁在播放时很干扰，需要时可在控制台打开
  // hideGiant：跨洲帝国/极地盖帽这类巨型要素默认"淡显"，勾选后完全不绘制
  layers: { fill: true, stroke: true, labels: true, events: true, rings: false, arcs: true, graticule: true, hideGiant: false },
  nameIndex: null,
  booted: false,
  era: null,
};

let globe = null;
let fx = null;
let requestedIndex = null;
let switchRunning = false;

/* ------------------------------------------------------------------ 工具 */

function debounce(fn, ms) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

/** 当前语言下的政权名称 */
function polityName(f) {
  return pickLang(f, 'name') || f.nameZh || f.name;
}

/** 事件名称（按语言） */
function eventName(e) {
  return pickLang(e, 'name') || e.nameZh || e.name;
}

function currentEra() {
  return ERAS[state.index];
}

/* --------------------------------------------------------------- 启动流程 */

function boot() {
  const step = (text, pct) => {
    $('bootStep').textContent = text;
    $('bootBar').style.width = `${Math.max(4, Math.min(100, pct))}%`;
  };

  if (typeof window.Globe !== 'function') {
    step(t('boot.fail.engine'), 100);
    $('bootStep').style.color = '#ff8a8a';
    return;
  }

  const t0 = performance.now();
  state.timing = { start: t0 };

  step(t('boot.globe'), 18);
  let globeReady;
  try {
    globeReady = createGlobe();
  } catch (err) {
    step(t('boot.fail.globe', { msg: err.message }), 100);
    $('bootStep').style.color = '#ff8a8a';
    return;
  }

  step(t('boot.data'), 45);

  const hashKey = (location.hash.match(/y=([\w]+)/) || [])[1];
  const hashIdx = hashKey ? ERAS.findIndex((e) => e.key === hashKey) : -1;
  if (hashIdx >= 0) state.index = hashIdx;

  let settled = 0;
  const mark = (text) => {
    settled += 1;
    step(text, 22 + (settled / 3) * 66);
  };

  const dataReady = loadEra(currentEra())
    .then((data) => {
      applyEraData(data, currentEra());
      onEraChanged({ silent: true });
      state.timing.eraKey = currentEra().key;
      state.timing.dataMs = Math.round(performance.now() - t0);
      mark(t('boot.textures'));
    })
    .catch((err) => {
      step(t('boot.fail.data', { msg: err.message }), 100);
      $('bootStep').style.color = '#ff8a8a';
      throw err;
    });

  // 首屏只等「地球贴图 + 当前年代数据」，其余贴图在露出画面后再补
  Promise.all([dataReady, globeReady])
    .then(() => {
      state.timing.firstPaintMs = Math.round(performance.now() - t0);
      revealScene();
    })
    .catch(() => { /* 错误信息已在上面展示 */ });
}

function revealScene() {
  state.booted = true;
  $('boot').classList.add('done');
  fx && fx.burst('cyan', 1.2);
  // 镜头推进：从远处拉近到观测位
  globe.pointOfView({ lat: 28, lng: 96, altitude: 2.05 }, 1500);
  // 关键帧之后再补背景星空、地形凹凸、海面高光，避免和首屏抢带宽
  idle(() => enhanceTextures(), 600);
  prefetchNeighbours();
  loadNameIndex();
  loadEventIndex();
}

/** 首屏之后载入事件表（16 KB）：载入后补上标记与面板 */
function loadEventIndex() {
  loadEvents()
    .then(() => {
      buildTicks();
      state.eraEvents = eventsForEra(state.index);
      state.eventIndex = new Map(state.eraEvents.map((e) => [e.id, e]));
      renderMapLayers();
      renderEventsPanel();
    })
    .catch((err) => {
      console.warn('[events] 事件数据不可用：', err.message);
      state.eraEvents = [];
      renderEventsPanel();
    });
}

/** 首屏之后追加的贴图与特效（不阻塞地球出现） */
function enhanceTextures() {
  try {
    if (!globe.bumpImageUrl()) globe.bumpImageUrl(TEXTURE.bump);
  } catch { /* 忽略 */ }
  try {
    if (!globe.backgroundImageUrl()) globe.backgroundImageUrl(TEXTURE.sky);
  } catch { /* 忽略 */ }
  try {
    const mat = globe.globeMaterial();
    const map = mat.map;
    const Tex = map && map.constructor;
    if (Tex && !window.THREE && !mat.specularMap) {
      const img = new Image();
      img.src = TEXTURE.water;
      img.onload = () => {
        const tex = new Tex(img);
        tex.wrapS = map.wrapS;
        tex.wrapT = map.wrapT;
        tex.needsUpdate = true;
        mat.specularMap = tex;
        mat.needsUpdate = true;
      };
    }
  } catch { /* 忽略 */ }
}

function idle(fn, timeout = 1200) {
  if (typeof window.requestIdleCallback === 'function') {
    state.idleHandles.push(window.requestIdleCallback(fn, { timeout }));
  } else {
    state.idleHandles.push(setTimeout(fn, Math.min(timeout, 400)));
  }
}

/* 多边形样式 accessor：只定义一次，内部按当前状态求值（避免每次换年代重新 setter） */

function polygonCap(f) {
  if (state.hoverId === f.id) return f.colorHover;
  return state.layers.fill ? f.color : 'rgba(12, 30, 48, 0.08)';
}

function polygonStroke(f) {
  if (!state.layers.stroke) return null;
  return state.hoverId === f.id ? '#ffffff' : f.stroke;
}

function polygonHeight(f) {
  return state.hoverId === f.id ? HOVER_ALTITUDE : BASE_ALTITUDE;
}

function createGlobe() {
  let resolveGlobeReady;
  const globeReady = new Promise((resolve) => { resolveGlobeReady = resolve; });
  // 兜底：贴图异常时也不能一直卡在载入遮罩里
  const readyFallback = setTimeout(resolveGlobeReady, 6000);

  globe = new window.Globe($('globeViz'), { animateIn: false, waitForGlobeReady: true })
    .globeImageUrl(TEXTURE.day)
    .showAtmosphere(true)
    .atmosphereColor('#5fd8ff')
    .atmosphereAltitude(0.24)
    .polygonsTransitionDuration(1000)
    .polygonAltitude(polygonHeight)
    .polygonCapCurvatureResolution(6)
    .polygonSideColor((f) => f.side)
    .polygonStrokeColor(polygonStroke)
    .polygonCapColor(polygonCap)
    .onPolygonHover(handleHover)
    .onPolygonClick(handleClick)
    .htmlElementsData([])
    .htmlLat((d) => d.lat)
    .htmlLng((d) => d.lng)
    .htmlAltitude(0.012)
    .htmlElement(labelNode)
    .htmlElementVisibilityModifier((el, isVisible) => el.classList.toggle('is-behind', !isVisible))
    .ringsData([])
    .ringColor(() => (prog) => `rgba(120, 235, 255, ${Math.max(0, 0.55 * (1 - prog))})`)
    .ringMaxRadius((d) => 1.6 + Math.sqrt(d.rel) * 4)
    .ringPropagationSpeed((d) => 0.9 + Math.sqrt(d.rel))
    .ringRepeatPeriod((d) => 1400 + 900 * Math.random())
    .ringAltitude(0.012)
    .ringResolution(48)
    .arcsData([])
    .arcsTransitionDuration(700)
    .arcDashLength(0.32)
    .arcDashGap(0.22)
    .arcDashAnimateTime(2600)
    .arcStroke(0.22)
    .arcAltitudeAutoScale(0.42)
    .arcColor(() => ['rgba(120, 235, 255, 0.05)', 'rgba(255, 195, 107, 0.75)'])
    .pathsData([])
    .pathPointLat((p) => p[0])
    .pathPointLng((p) => p[1])
    .pathColor(() => 'rgba(96, 214, 255, 0.16)')
    .pathStroke(0.13)
    .pathPointAlt(0.002)
    .pathResolution(3)
    .pathTransitionDuration(0);

  // 光照：让夜半球也能看清版图
  globe.scene().children.forEach((obj) => {
    if (obj.type === 'AmbientLight') obj.intensity = Math.max(obj.intensity, 1.15);
    if (obj.type === 'DirectionalLight') obj.intensity = Math.max(obj.intensity, 1.25);
    if (obj.type === 'HemisphereLight') obj.intensity = Math.max(obj.intensity, 0.8);
  });

  // 球体材质：加入自发光与环境反光，贴近“星球仪表”观感
  try {
    const mat = globe.globeMaterial();
    if (mat.emissive) mat.emissive.set('#0a2942');
    if ('emissiveIntensity' in mat) mat.emissiveIntensity = 0.22;
    if (mat.specular) mat.specular.set('#2b6f9c');
    if ('shininess' in mat) mat.shininess = 14;
  } catch { /* 材质微调失败不影响主流程 */ }

  const controls = globe.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.rotateSpeed = 0.55;
  controls.zoomSpeed = 0.75;
  controls.autoRotate = state.spin;
  controls.autoRotateSpeed = 0.3;

  // 起始机位放远一点，贴图就绪后由 revealScene() 推近
  globe.pointOfView({ lat: 28, lng: 96, altitude: 3.4 }, 0);

  globe.pathsData(buildGraticule());

  fx = createEffects($('fx'), { getOrbit: globeSilhouette });

  // 调试句柄：便于在浏览器控制台或自动化测试中检查运行时状态
  window.__orbis = { globe, state, requestEra, ERAS };

  window.addEventListener('resize', debounce(() => {
    globe.width($('stage').clientWidth).height($('stage').clientHeight);
  }, 160));

  globe.onGlobeReady(() => {
    clearTimeout(readyFallback);
    state.timing.globeReadyMs = Math.round(performance.now() - (state.timing.start || 0));
    resolveGlobeReady();
  });

  return globeReady;
}

function globeSilhouette() {
  if (!globe) return null;
  const cam = globe.camera();
  const stage = $('stage');
  const h = stage.clientHeight;
  const w = stage.clientWidth;
  const dist = cam.position.length();
  const R = 100;
  if (!(dist > R * 1.001)) return null;
  const ang = Math.asin(Math.min(0.9999, R / dist));
  const r = (Math.tan(ang) * (h / 2)) / Math.tan(((cam.fov * Math.PI) / 180) / 2);
  return { x: w / 2, y: h / 2, r };
}

/* -------------------------------------------------------------- 经纬网数据 */

function buildGraticule() {
  const paths = [];
  for (let lat = -60; lat <= 60; lat += 30) {
    const line = [];
    for (let lng = -180; lng <= 180; lng += 4) line.push([lat, lng]);
    paths.push(line);
  }
  for (let lng = -180; lng < 180; lng += 30) {
    const line = [];
    for (let lat = -88; lat <= 88; lat += 3) line.push([lat, lng]);
    paths.push(line);
  }
  return paths;
}

/* ------------------------------------------------------------------ 渲染 */

function visibleFeatures(data) {
  const cap = state.maxPolitiesAll ? MAX_POLYGONS_ALL : MAX_POLYGONS;
  let list = data.features;
  // 跨洲帝国、环绕极点的"盖帽"这类巨型要素默认淡显（data.js 里按面积降透明度），
  // 想彻底不画就在这里过滤掉
  if (state.layers.hideGiant) list = list.filter((f) => !f.giant);
  return list.slice(0, cap);
}

function applyEraData(data, era) {
  const feats = visibleFeatures(data);
  state.features = feats;
  state.era = era;
  state.hoverId = null;
  state.selectedId = null;

  // 只更新数据：颜色/高度的 accessor 在 createGlobe 里设一次即可，
  // 每帧重复 setter 会让 globe.gl 重新消化一遍全部多边形（播放时的主要卡顿来源）
  globe.polygonsData(feats);

  const labelThreshold = era.modern ? 0.04 : 0.1;
  state.tops = feats.filter((f) => f.rel >= labelThreshold).slice(0, 8);
  state.eraEvents = eventsForEra(state.index);
  state.eventIndex = new Map(state.eraEvents.map((e) => [e.id, e]));
  renderMapLayers();
  renderEventsPanel();

  updateHud(data, era);
  updateLegend(feats);
  updateDetailForSelection();
}

/** 球面 DOM 图层：政权名称标签 + 历史大事标记 + 脉冲光环 + 能量弧 */
function renderMapLayers() {
  const lang = getLang();
  // 语言切换时必须换新对象：three-globe 按对象身份判断"数据没变"，
  // 直接复用同一个要素对象的话，球面标签不会重建、文字会停在旧语言
  const wrap = (d) => ({ ...d, nodeKey: `${d.id}:${lang}` });
  const markers = [];
  if (state.layers.labels) markers.push(...state.tops.map(wrap));
  if (state.layers.events) markers.push(...state.eraEvents.map(wrap));
  labelNodes.clear();
  eventNodes.clear();
  globe.htmlElementsData(markers);
  globe.ringsData(state.layers.rings ? state.tops.slice(0, 5) : []);
  globe.arcsData(state.layers.arcs ? buildArcs(state.tops) : []);
}

/** 球面标签：政权名用 DOM 标签，历史大事用事件标记（同一图层承载） */
const labelNodes = new Map();
const eventNodes = new Map();

function labelNode(d) {
  if (d.kind === 'event') return eventNode(d);
  let el = labelNodes.get(d.id);
  if (!el) {
    el = document.createElement('div');
    el.className = 'g-label';
    el.innerHTML = '<span class="g-inner"><span class="g-dot"></span><span class="g-txt"></span></span>';
    labelNodes.set(d.id, el);
  }
  el.querySelector('.g-txt').textContent = polityName(d);
  el.style.setProperty('--ls', String(11 + Math.round(Math.min(6, Math.sqrt(d.rel) * 9))));
  el.style.color = d.stroke;
  return el;
}

function eventNode(d) {
  let el = eventNodes.get(d.id);
  if (!el) {
    el = document.createElement('div');
    el.className = `g-event g-event-${d.type}`;
    el.innerHTML = '<span class="g-event-inner"><span class="g-event-marker"></span>'
      + '<span class="g-event-text"><b class="g-event-year"></b><i class="g-event-name"></i></span></span>';
    eventNodes.set(d.id, el);
  }
  el.querySelector('.g-event-year').textContent = formatEventYear(d.year, getLang());
  el.querySelector('.g-event-name').textContent = eventName(d);
  el.style.setProperty('--ev', d.color);
  return el;
}

function buildArcs(tops) {
  const arcs = [];
  const list = tops.slice(0, 6);
  for (let i = 0; i < list.length; i += 1) {
    const a = list[i];
    const b = list[(i + 1) % list.length];
    if (a.id === b.id) continue;
    arcs.push({
      startLat: a.lat,
      startLng: a.lng,
      endLat: b.lat,
      endLng: b.lng,
      rel: (a.rel + b.rel) / 2,
    });
  }
  return arcs;
}

function updateHud(data, era) {
  const lang = getLang();
  const shown = state.features.length;
  const total = data.features.length;
  const biggest = data.features.slice(0, 3).map((f) => polityName(f)).join(' · ');
  $('tlStats').textContent = t('stats.line', {
    era: formatYearShort(era.year, lang),
    total,
    cap: shown < total ? t('stats.capped', { n: shown }) : '',
    top: biggest,
  });
  $('yearValue').textContent = formatYearShort(era.year, lang);
  $('yearLabel').textContent = eraLabel(era, lang);
  $('yearMeta').textContent = `${eraNote(era, lang)}${shown < total ? t('yearMeta.capped', { n: shown }) : ''}`;
  updateTicks();
  updateSliderGlow();
}

function updateLegend(feats) {
  const lang = getLang();
  const counts = new Map();
  for (const f of feats) counts.set(f.cls, (counts.get(f.cls) || 0) + 1);
  const total = feats.length || 1;
  const rows = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cls, n]) => {
      const c = colorOf(cls);
      const pct = ((n / total) * 100).toFixed(0);
      const label = labelOf(cls, lang);
      return `<div class="legend-item" title="${label} · ${n} · ${pct}%"><span class="legend-swatch" style="background:${c};color:${c}"></span>${label} · ${n}</div>`;
    });
  $('legend').innerHTML = rows.join('') || `<div class="legend-item">${t('legend.empty')}</div>`;
}

/* ------------------------------------------------------- 历史大事面板 */

function renderEventsPanel() {
  const host = $('eventsPanel');
  if (!host) return;
  const lang = getLang();
  const list = state.eraEvents;
  const era = currentEra();
  if (!list.length) {
    host.hidden = true;
    $('eventsList').innerHTML = '';
    return;
  }
  host.hidden = false;
  $('eventsEra').textContent = eraLabel(era, lang);
  $('eventsCount').textContent = t('events.count', { n: list.length });
  const rows = list.map((e) => {
    const active = state.selectedEventId === e.id ? ' active' : '';
    return `<button type="button" class="event-row${active}" data-event="${e.id}" style="--ev:${e.color}">`
      + `<span class="event-year">${formatEventYear(e.year, lang)}</span>`
      + `<span class="event-body"><span class="event-name">${escapeHtml(eventName(e))}</span>`
      + `<span class="event-meta">${escapeHtml(eventTypeLabel(e.type, lang))}${secondaryName(e, 'name') ? ` · ${escapeHtml(secondaryName(e, 'name'))}` : ''}</span></span>`
      + '</button>';
  });
  $('eventsList').innerHTML = rows.join('');
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function focusEvent(id) {
  const e = state.eventIndex.get(id);
  if (!e) return;
  state.selectedEventId = id;
  globe.pointOfView({ lat: e.lat, lng: e.lng, altitude: 1.5 }, 1100);
  const node = eventNodes.get(e.id);
  if (node) {
    node.classList.remove('ping');
    void node.offsetWidth;
    node.classList.add('ping');
  }
  renderEventsPanel();
}

/* --------------------------------------------------------------- 时间轴 */

/** 刻度只建一次，之后仅切换 active/major 状态（避免每次换年代重建 54 个节点） */
function buildTicks() {
  const n = ERAS.length;
  const frag = document.createDocumentFragment();
  for (let i = 0; i < n; i += 1) {
    const el = document.createElement('i');
    el.style.left = `${(i / (n - 1)) * 100}%`;
    el.title = eraLabel(ERAS[i], getLang());
    el.dataset.era = ERAS[i].key;
    if (isMajorEra(ERAS[i])) el.classList.add('major');
    frag.appendChild(el);
  }
  const host = $('ticks');
  host.innerHTML = '';
  host.appendChild(frag);
  state.tickNodes = [...host.children];
  markEventTicks();
}

/** 有大事记录（尤其战争）的年代，刻度上加一点标记 */
function markEventTicks() {
  if (!state.tickNodes) return;
  for (let i = 0; i < state.tickNodes.length; i += 1) {
    const count = eventsForEra(i).length;
    const el = state.tickNodes[i];
    el.classList.toggle('has-event', count > 0);
    el.classList.toggle('has-war', eventsForEra(i).some((e) => e.type === 'war'));
    if (count) el.title = `${eraLabel(ERAS[i], getLang())} · ${t('events.count', { n: count })}`;
  }
}

function updateTicks() {
  if (!state.tickNodes) return;
  for (let i = 0; i < state.tickNodes.length; i += 1) {
    state.tickNodes[i].classList.toggle('active', i === state.index);
  }
}

function updateSliderGlow() {
  const n = ERAS.length;
  $('sliderGlow').style.width = `${(state.index / (n - 1)) * 100}%`;
}

let scrambleTimer = 0;

function flashYearChip() {
  clearInterval(scrambleTimer);
  $('yearValue').textContent = formatYearShort(currentEra().year, getLang());
  const hud = document.querySelector('.hud-year');
  hud.classList.remove('flash');
  void hud.offsetWidth;
  hud.classList.add('flash');
}

function scrambleYear() {
  const lang = getLang();
  const era = currentEra();
  const target = formatYearShort(era.year, lang);
  const prefix = lang === 'en' ? '' : (era.year < 0 ? '前' : '');
  const suffix = lang === 'en' && era.year < 0 ? ' BCE' : '';
  let frames = 0;
  clearInterval(scrambleTimer);
  scrambleTimer = setInterval(() => {
    frames += 1;
    if (frames > 6) {
      clearInterval(scrambleTimer);
      $('yearValue').textContent = target;
      return;
    }
    const digits = String(Math.abs(era.year)).replace(/\d/g, () => String(Math.floor(Math.random() * 10)));
    $('yearValue').textContent = prefix + digits + suffix;
  }, 46);
}

/* -------------------------------------------------------- 年代切换主流程 */

function requestEra(index, { silent = false } = {}) {
  const clamped = Math.max(0, Math.min(ERAS.length - 1, index));
  $('timeline').value = String(clamped);
  requestedIndex = clamped;
  state.pendingIndex = clamped;
  if (!silent && !state.playing) scrambleYear();
  if (switchRunning) return;
  switchRunning = true;
  (async () => {
    while (requestedIndex !== null) {
      const target = requestedIndex;
      requestedIndex = null;
      const era = ERAS[target];
      const cached = isCached(era);
      if (!cached) $('yearMeta').textContent = t('year.loadingEra', { era: eraLabel(era, getLang()) });
      try {
        const stepT0 = performance.now();
        const data = await loadEra(era);
        if (requestedIndex !== null) continue;
        state.index = target;
        applyEraData(data, era);
        onEraChanged();
        state.timing.lastStepMs = Math.round(performance.now() - stepT0);
        state.timing.lastStepCached = cached;
      } catch (err) {
        $('yearMeta').textContent = t('year.fail', { msg: err.message });
      }
    }
    switchRunning = false;
  })();
}

function onEraChanged({ silent = false } = {}) {
  const era = currentEra();
  // 播放时不做闪光特效：连续闪烁会明显干扰观看
  if (!silent && !state.playing) {
    flashYearChip();
    fx && fx.burst(era.modern ? 'amber' : 'cyan', era.modern ? 1.2 : 1);
  }
  history.replaceState(null, '', `#y=${era.key}`);
  prefetchNeighbours();
  updatePlayLabel();
}

function prefetchNeighbours() {
  const idx = state.index;
  if (state.playing) {
    // 播放是顺序推进的：提前把后面几个年代取回来，
    // 否则每一步都要现场下载 + 解析几百 KB 的版图数据，就会一顿一顿
    idle(() => {
      prefetch(ERAS[idx + 1]);
      prefetch(ERAS[idx + 2]);
    }, 300);
    return;
  }
  // 先拿相邻一个年代；再远一点的留到浏览器空闲时，避免和首屏抢带宽
  idle(() => {
    prefetch(ERAS[idx + 1]);
    prefetch(ERAS[idx - 1]);
  }, 800);
  idle(() => {
    prefetch(ERAS[idx + 2]);
    prefetch(ERAS[idx - 2]);
  }, 3000);
}

function step(delta) {
  stopPlay();
  const base = Number.isInteger(state.pendingIndex) ? state.pendingIndex : state.index;
  const next = base + delta;
  if (next < 0 || next >= ERAS.length) return;
  requestEra(next);
}

/* ------------------------------------------------------------- 播放控制 */

function updatePlayLabel() {
  const btn = $('btnPlay');
  btn.classList.toggle('playing', state.playing);
  $('btnPlayLabel').textContent = state.playing ? t('btn.pause') : t('btn.play');
  btn.setAttribute('aria-pressed', String(state.playing));
}

function startPlay() {
  if (state.playing) return;
  state.playing = true;
  state.playStartIndex = state.index;
  updatePlayLabel();
  const tick = () => {
    if (!state.playing) return;
    const base = Number.isInteger(state.pendingIndex) ? state.pendingIndex : state.index;
    const next = base + 1;
    if (next >= ERAS.length) {
      stopPlay();
      return;
    }
    requestEra(next);
    // 上一步的多边形还在过渡时不要叠上下一步，避免连续重建几何造成卡顿
    const wait = Math.max(state.speed, 900);
    state.playTimer = setTimeout(tick, wait);
  };
  state.playTimer = setTimeout(tick, state.speed);
}

function stopPlay() {
  state.playing = false;
  clearTimeout(state.playTimer);
  updatePlayLabel();
}

/* ------------------------------------------------------------------ 交互 */

function handleHover(feature) {
  const id = feature ? feature.id : null;
  if (id === state.hoverId) {
    if (!id) hideTooltip();
    return;
  }
  state.hoverId = id;
  // 高亮需要重新求值一次多边形样式；播放中若在快速划过多个国家，
  // 这里用一次合并刷新（拖到同一帧）避免连续多次重建几何
  schedulePolygonRefresh();
  if (!id) {
    hideTooltip();
    return;
  }
  showTooltip(feature);
}

let polygonRefreshHandle = 0;

function schedulePolygonRefresh() {
  if (polygonRefreshHandle) return;
  polygonRefreshHandle = requestAnimationFrame(() => {
    polygonRefreshHandle = 0;
    globe.polygonAltitude(polygonHeight);
    globe.polygonCapColor(polygonCap);
    globe.polygonStrokeColor(polygonStroke);
  });
}

function handleClick(feature) {
  if (!feature) return;
  state.selectedId = feature.id;
  updateDetailForSelection();
  globe.pointOfView({ lat: feature.lat, lng: feature.lng, altitude: 1.5 }, 1100);
  const p = pointerScreen;
  fx && fx.ping(p.x, p.y);
}

function updateDetailForSelection() {
  const panel = $('detailPanel');
  const f = state.features.find((x) => x.id === state.selectedId);
  if (!f) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;

  const lang = getLang();
  const era = currentEra();
  const rank = state.features.indexOf(f) + 1;
  const total = state.features.length;
  const isCulture = f.cls === 'hunting' || f.cls === 'farming' || f.cls === 'culture';

  $('detailKicker').textContent = isCulture ? t('panel.dossierCulture') : t('panel.dossier');
  $('detailName').textContent = polityName(f);
  $('detailSub').textContent = secondaryName(f, 'name');

  const subject = f.subject && f.subject !== f.name ? f.subject : '';
  const partOf = f.partOf && f.partOf !== f.name && f.partOf !== f.subject ? f.partOf : '';
  const rows = [
    [t('field.class'), labelOf(f.cls, lang)],
    [t('field.type'), f.type ? typeLabelOf(f.type, f.cls, lang) : t('field.none')],
    [t('field.share'), `${(f.share * 100).toFixed(2)}%`],
    [t('field.rank'), t('rank.value', { n: rank, total })],
    [t('field.center'), formatCoord(f.lat, f.lng)],
    [t('field.span'), spanOf(f.name, lang)],
  ];
  if (subject) rows.push([t('field.subject'), subject]);
  if (partOf) rows.push([t('field.partOf'), partOf]);
  $('detailGrid').innerHTML = rows
    .map(([k, v]) => `<div><dt>${escapeHtml(k)}</dt><dd title="${escapeHtml(v)}">${escapeHtml(v)}</dd></div>`)
    .join('');

  // 本年代收录的大事（与大事记面板联动，点一下就飞过去）
  const events = state.detailEventsAll ? state.eraEvents : state.eraEvents.slice(0, 4);
  const eventsBlock = $('detailEventsBlock');
  if (events.length) {
    eventsBlock.hidden = false;
    $('detailEvents').innerHTML = events
      .map((e) => `<button type="button" class="detail-chip" data-event="${e.id}" style="--ev:${e.color}">`
        + `<b>${formatEventYear(e.year, lang)}</b>${escapeHtml(eventName(e))}</button>`)
      .join('')
      + (state.eraEvents.length > 4
        ? `<button type="button" class="detail-chip ghost" data-more-events="1">${state.detailEventsAll ? t('panel.less') : t('panel.more', { n: state.eraEvents.length })}</button>`
        : '');
  } else {
    eventsBlock.hidden = true;
    $('detailEvents').innerHTML = '';
  }

  // 延伸资料：数据集的原始链接（若有）+ 中英文维基检索入口，永远有可用链接
  const links = [];
  const datasetUrl = sanitizeUrl(f.wiki);
  if (datasetUrl) links.push({ href: datasetUrl, label: t('panel.datasetLink'), ghost: false });
  const zhUrl = wikiSearch('zh', f.nameZh);
  if (zhUrl) links.push({ href: zhUrl, label: t('panel.zhWiki'), ghost: true });
  const enUrl = wikiSearch('en', f.nameEn || f.name);
  if (enUrl) links.push({ href: enUrl, label: t('panel.enWiki'), ghost: true });
  const linksBlock = $('detailLinksBlock');
  if (links.length) {
    linksBlock.hidden = false;
    $('detailLinks').innerHTML = links
      .map((l) => `<a class="detail-link${l.ghost ? ' ghost' : ''}" href="${escapeHtml(l.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(l.label)}</a>`)
      .join('');
  } else {
    linksBlock.hidden = true;
    $('detailLinks').innerHTML = '';
  }

  $('detailSource').textContent = era.modern
    ? t('panel.source.modern', { era: eraLabel(era, lang) })
    : t('panel.source.historical', { era: eraLabel(era, lang) });

  const foot = [];
  foot.push(isCulture ? t('panel.foot.culture') : '');
  foot.push(t('panel.foot.coord', { coord: formatCoord(f.lat, f.lng) }));
  if (!f.translated && lang === 'zh') foot.push(t('panel.foot.untranslated'));
  else if (!era.modern && lang === 'zh') foot.push(t('panel.foot.translated'));
  $('detailFoot').textContent = foot.filter(Boolean).join(' ');

  state.detailLinkCount = links.length;
}

/** 纬度/经度转成 57.2°N · 96.4°E 这样的可读形式 */
function formatCoord(lat, lng) {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lng >= 0 ? 'E' : 'W';
  return `${Math.abs(lat).toFixed(1)}°${ns} · ${Math.abs(lng).toFixed(1)}°${ew}`;
}

/**
 * 只接受 http(s) 链接；空值、锚点（如 "#"）、相对路径都会被拒绝。
 * 之前卡片上的「查看资料」在数据没有链接时 href 仍是 "#"，
 * 点击就会用新标签页打开同一个页面——这个判断就是为了堵住那种情况。
 */
function sanitizeUrl(raw) {
  const s = String(raw || '').trim();
  if (!s || s === '#' || s.startsWith('#')) return '';
  if (/^https?:\/\//i.test(s)) return s;
  if (/^\/\//.test(s)) return `https:${s}`;
  if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(s)) return `https://${s}`;
  return '';
}

function wikiSearch(wikiLang, term) {
  const s = String(term || '').trim();
  if (!s) return '';
  return `https://${wikiLang}.wikipedia.org/w/index.php?search=${encodeURIComponent(s)}`;
}

function spanOf(name, lang = getLang()) {
  const idx = state.nameIndex;
  if (!idx || !idx[name]) return t('span.current');
  const years = idx[name];
  const first = years[0];
  const last = years[years.length - 1];
  if (years.length === 1) return t('span.single', { year: formatYearShort(first, lang) });
  return t('span.multi', {
    from: formatYearShort(first, lang),
    to: formatYearShort(last, lang),
    n: years.length,
  });
}

const pointerScreen = { x: 0, y: 0 };

function showTooltip(f) {
  const lang = getLang();
  const tt = $('tooltip');
  tt.hidden = false;
  tt.querySelector('.tt-name').textContent = polityName(f);
  const extra = secondaryName(f, 'name');
  const type = typeLabelOf(f.type, f.cls, lang);
  tt.querySelector('.tt-meta').textContent = `${type} · ${t('tooltip.share', { pct: (f.share * 100).toFixed(2) })}${extra ? ` · ${extra}` : ''}`;
  positionTooltip();
}

function hideTooltip() {
  $('tooltip').hidden = true;
}

function positionTooltip() {
  const tt = $('tooltip');
  if (tt.hidden) return;
  const pad = 16;
  const w = tt.offsetWidth;
  const h = tt.offsetHeight;
  let x = pointerScreen.x + pad;
  let y = pointerScreen.y + pad;
  if (x + w > window.innerWidth - 8) x = pointerScreen.x - w - pad;
  if (y + h > window.innerHeight - 8) y = pointerScreen.y - h - pad;
  tt.style.left = `${Math.max(8, x)}px`;
  tt.style.top = `${Math.max(8, y)}px`;
}

/* ------------------------------------------------------------ 名称索引 */

async function loadNameIndex() {
  try {
    const res = await fetch('data/name-index.json', { credentials: 'omit' });
    if (!res.ok) return;
    state.nameIndex = await res.json();
    updateDetailForSelection();
  } catch { /* 索引缺失仅影响“存在年代”展示 */ }
}

/* ------------------------------------------------------------ 界面绑定 */

function buildSwitches() {
  const defs = [
    ['fill', 'layer.fill', () => globe.polygonCapColor(polygonCap)],
    ['stroke', 'layer.stroke', () => globe.polygonStrokeColor(polygonStroke)],
    ['labels', 'layer.labels', () => renderMapLayers()],
    ['events', 'layer.events', () => renderMapLayers()],
    ['rings', 'layer.rings', () => renderMapLayers()],
    ['arcs', 'layer.arcs', () => renderMapLayers()],
    ['graticule', 'layer.graticule', () => globe.pathsData(state.layers.graticule ? buildGraticule() : [])],
    ['hideGiant', 'layer.hideGiant', () => loadEra(currentEra()).then((data) => applyEraData(data, currentEra()))],
  ];
  $('layerSwitches').innerHTML = defs
    .map(([key, label]) => `<label class="switch"><span>${t(label)}</span><input type="checkbox" data-layer="${key}" ${state.layers[key] ? 'checked' : ''}><span class="track"></span></label>`)
    .join('') + `<label class="switch"><span>${t('layer.morePolities', { n: MAX_POLYGONS_ALL })}</span><input type="checkbox" data-layer="all" ${state.maxPolitiesAll ? 'checked' : ''}><span class="track"></span></label>`;

  if (!buildSwitches.bound) {
    buildSwitches.bound = true;
    $('layerSwitches').addEventListener('change', (e) => {
      const input = e.target.closest('input[data-layer]');
      if (!input) return;
      const key = input.dataset.layer;
      if (key === 'all') {
        state.maxPolitiesAll = input.checked;
        loadEra(currentEra()).then((data) => applyEraData(data, currentEra()));
        return;
      }
      state.layers[key] = input.checked;
      const def = defs.find(([k]) => k === key);
      def && def[2]();
    });
  }
}

/** 语言切换按钮（右上角 中文 / EN） */
function buildLangSwitch() {
  const host = $('langSwitch');
  if (!host) return;
  host.innerHTML = LANGS
    .map((l) => `<button type="button" class="lang-btn${l.id === getLang() ? ' active' : ''}" data-lang="${l.id}" aria-pressed="${l.id === getLang()}">${l.label}</button>`)
    .join('');
  if (!buildLangSwitch.bound) {
    buildLangSwitch.bound = true;
    host.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-lang]');
      if (btn) setLang(btn.dataset.lang);
    });
  }
}

/** 语言变化后统一刷新：静态文案 + 动态区块 + 球面标签 */
function applyLanguage() {
  applyStaticI18n();
  buildLangSwitch();
  buildSwitches();
  buildTicks();
  updateHud({ features: state.features }, currentEra());
  updateLegend(state.features);
  renderMapLayers();
  renderEventsPanel();
  updateDetailForSelection();
  updatePlayLabel();
  hideTooltip();
}

function bindUi() {
  buildSwitches();
  buildLangSwitch();
  applyStaticI18n();
  onLangChange(() => applyLanguage());

  $('timeline').addEventListener('input', (e) => {
    stopPlay();
    requestEra(Number(e.target.value));
  });

  $('btnPrev').addEventListener('click', () => step(-1));
  $('btnNext').addEventListener('click', () => step(1));
  $('btnPlay').addEventListener('click', () => (state.playing ? stopPlay() : startPlay()));
  $('speed').addEventListener('change', (e) => { state.speed = Number(e.target.value); });
  $('btnSpin').addEventListener('click', (e) => {
    state.spin = !state.spin;
    globe.controls().autoRotate = state.spin;
    e.currentTarget.setAttribute('aria-pressed', String(state.spin));
  });
  $('btnReset').addEventListener('click', () => {
    globe.pointOfView({ lat: 28, lng: 96, altitude: 2.05 }, 1200);
  });
  $('btnFull').addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  $('detailClose').addEventListener('click', () => {
    state.selectedId = null;
    updateDetailForSelection();
  });
  $('consoleToggle').addEventListener('click', (e) => {
    const panel = $('consolePanel');
    const collapsed = panel.classList.toggle('collapsed');
    e.currentTarget.setAttribute('aria-expanded', String(!collapsed));
  });

  const stage = $('stage');
  stage.addEventListener('pointermove', (e) => {
    pointerScreen.x = e.clientX;
    pointerScreen.y = e.clientY;
    positionTooltip();
  });
  stage.addEventListener('pointerleave', hideTooltip);

  // 大事记列表：点击定位到该事件
  const eventsList = $('eventsList');
  if (eventsList) {
    eventsList.addEventListener('click', (e) => {
      const row = e.target.closest('.event-row');
      if (row) focusEvent(row.dataset.event);
    });
  }
  // 档案卡内的大事条目：同样可点，外加"全部/收起"
  const detailEvents = $('detailEvents');
  if (detailEvents) {
    detailEvents.addEventListener('click', (e) => {
      const chip = e.target.closest('[data-event]');
      if (chip) {
        focusEvent(chip.dataset.event);
        return;
      }
      if (e.target.closest('[data-more-events]')) {
        state.detailEventsAll = !state.detailEventsAll;
        updateDetailForSelection();
      }
    });
  }
  const eventsToggle = $('eventsToggle');
  if (eventsToggle) {
    eventsToggle.addEventListener('click', (e) => {
      const panel = $('eventsPanel');
      const collapsed = panel.classList.toggle('collapsed');
      e.currentTarget.setAttribute('aria-expanded', String(!collapsed));
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.target && /input|select|textarea/i.test(e.target.tagName)) return;
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
    else if (e.code === 'Space') { e.preventDefault(); state.playing ? stopPlay() : startPlay(); }
    else if (e.key === 'r' || e.key === 'R') $('btnReset').click();
    else if (e.key === 'f' || e.key === 'F') $('btnFull').click();
    else if (e.key === 'Escape') { state.selectedId = null; updateDetailForSelection(); }
  });
}

/* -------------------------------------------------------------------- 启动 */

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

function init() {
  $('timeline').max = String(ERAS.length - 1);
  $('timeline').value = String(state.index);
  buildTicks();
  bindUi();
  boot();
  window.addEventListener('hashchange', () => {
    const key = (location.hash.match(/y=([\w]+)/) || [])[1];
    const idx = key ? ERAS.findIndex((e) => e.key === key) : -1;
    if (idx >= 0 && idx !== state.index) requestEra(idx);
  });
}
