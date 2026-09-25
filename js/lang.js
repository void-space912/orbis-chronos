/**
 * 界面语言切换（中文 / English）。
 *
 * - 文案集中在下面的 DICT 里，`t('key', { n: 3 })` 取值，支持 {占位符} 替换
 * - 静态文字用 HTML 上的 data-i18n / data-i18n-title / data-i18n-aria 标记，由 applyStaticI18n() 统一刷新
 * - 动态部分（年代、档案卡片、大事记、图例）由 app.js 监听 onLangChange 后重绘
 * - 选择记录在 localStorage，地址栏 ?lang=en 或 #lang=en 也能直接指定
 */
export const LANGS = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'EN' },
];

const STORE_KEY = 'orbis.lang';

export const DICT = {
  zh: {
    'app.title': '寰宇纪年 · 历史版图三维地球',
    'app.tagline': '三维历史版图地球 · 公元前 10000 年 — 2025 年',
    'lang.switch': '语言',
    'lang.title': '界面语言',

    'boot.init': '正在初始化三维地球…',
    'boot.globe': '正在构建三维地球…',
    'boot.data': '正在读取历史版图数据…',
    'boot.textures': '版图数据就绪，正在准备贴图…',
    'boot.fail.engine': '三维引擎未能载入，请确认 vendor/globe.gl.min.js 存在',
    'boot.fail.globe': '三维初始化失败：{msg}',
    'boot.fail.data': '数据载入失败：{msg}',
    'boot.note': '首次打开需载入约 1.3 MB（引擎 + 贴图 + 版图），之后走浏览器缓存秒开',
    'boot.source': '数据来源：historical-basemaps（CC BY-SA 4.0）· Natural Earth（公有领域）',
    'boot.fileHint': '请回到文件夹，双击「启动.cmd」或「寰宇纪年」打开本页',
    'boot.fileHintSub': '直接打开 index.html 时，浏览器禁止读取本地版图数据',
    'boot.slow': '等待数据…网络较慢时请稍候',

    'year.loading': '正在载入数据…',
    'year.loadingEra': '正在载入 {era} 的版图数据…',
    'year.fail': '载入失败：{msg}',

    'panel.close': '关闭详情',
    'panel.dossier': '政权档案',
    'panel.dossierCulture': '文化区域档案',
    'panel.events': '本年代收录的大事',
    'panel.more': '全部 {n} 条 →',
    'panel.less': '收起',
    'panel.links': '延伸资料',
    'panel.datasetLink': '数据集原始链接 ↗',
    'panel.zhWiki': '中文维基检索 ↗',
    'panel.enWiki': '英文维基检索 ↗',
    'panel.source.historical': '数据来源：historical-basemaps（CC BY-SA 4.0）· {era}快照',
    'panel.source.modern': '数据来源：Natural Earth 110m adm-0 countries（公有领域）· {era}',
    'panel.foot.culture': '该要素在数据集中是文化圈／考古学文化，不是现代意义上的国家。',
    'panel.foot.coord': '近似中心为数据内最大多边形外接矩形的中心（{coord}），面积占比按经纬度估算，均非测绘精度。',
    'panel.foot.untranslated': '名称保留数据集原文（本项目暂无对应中文译名）。',
    'panel.foot.translated': '中文译名为本项目整理，可能与学术译名存在差异。',

    'field.class': '分类',
    'field.type': '数据集类型',
    'field.share': '版图占比',
    'field.rank': '本年代排名',
    'field.center': '近似中心',
    'field.span': '存在年代',
    'field.subject': '归属',
    'field.partOf': '所属',
    'field.none': '未标注',
    'rank.value': '第 {n} / {total} 大',
    'span.single': '{year} 年快照',
    'span.multi': '{from} — {to} 年 · {n} 个快照',
    'span.current': '当前快照',
    'span.noIndex': '当前快照',

    'events.title': '大事记',
    'events.count': '收录 {n} 条',
    'events.note': '大事表为人工整理，地名取大致位置；点击条目可定位到地球上的标记。',
    'events.empty': '本年代暂无收录',

    'console.title': '控制台',
    'console.layers': '观测图层',
    'console.colors': '配色',
    'console.note': '数据来源：historical-basemaps（CC BY-SA 4.0）· Natural Earth（公有领域）。版图按政权面积排序显示，可切换「更多政权」。面积占比大的区域（跨洲帝国、极地盖帽）会自动淡显，勾「隐藏巨型区域」可完全不画。能量弧为装饰性特效，不代表史实路线。',

    'layer.fill': '版图填充',
    'layer.stroke': '边界描边',
    'layer.labels': '政权名称',
    'layer.events': '历史大事',
    'layer.rings': '脉冲光环（闪烁）',
    'layer.arcs': '能量弧（装饰）',
    'layer.graticule': '经纬网',
    'layer.hideGiant': '隐藏巨型区域',
    'layer.morePolities': '更多政权（≤{n}）',

    'btn.prev': '‹ 上一段',
    'btn.next': '下一段 ›',
    'btn.play': '播放',
    'btn.pause': '暂停',
    'btn.speed': '速度',
    'btn.spin': '自转',
    'btn.reset': '重置视角',
    'btn.full': '全屏',
    'btn.prev.title': '上一个年代（←）',
    'btn.next.title': '下一个年代（→）',
    'btn.play.title': '播放 / 暂停（空格）',
    'btn.spin.title': '自动旋转',
    'btn.reset.title': '重置视角（R）',
    'btn.full.title': '全屏（F）',
    'btn.speed.title': '播放速度',
    'timeline.label': '时间轴：选择年代',
    'timeline.hint': '拖动滑块穿越时间 · ← → 切换年代 · 空格播放',
    'stats.line': '{era} · {total} 个政权／文化区域{cap} · 面积最大：{top}',
    'stats.capped': ' · 显示前 {n} 大',
    'yearMeta.capped': ' · 按面积显示前 {n} 个',

    'tooltip.share': '占比 {pct}%',
    'legend.empty': '暂无数据',

    'perf.tip': '当前设备帧率偏低（中位 {ms} ms/帧）：可在左侧控制台关掉「边界描边」或「更多政权」，并把播放速度降到 0.5×。',
    'giant.hidden': '巨型区域已隐藏',
  },

  en: {
    'app.title': 'Orbis Chronos · 3D Historical Atlas Globe',
    'app.tagline': '3D historical border globe · 10,000 BCE — 2025 CE',
    'lang.switch': 'Language',
    'lang.title': 'Interface language',

    'boot.init': 'Starting up the 3D globe…',
    'boot.globe': 'Building the globe…',
    'boot.data': 'Loading historical border data…',
    'boot.textures': 'Border data ready, preparing textures…',
    'boot.fail.engine': 'WebGL engine failed to load — check vendor/globe.gl.min.js',
    'boot.fail.globe': 'Globe initialisation failed: {msg}',
    'boot.fail.data': 'Data loading failed: {msg}',
    'boot.note': 'First visit loads about 1.3 MB (engine + textures + one era); later visits come from cache.',
    'boot.source': 'Data: historical-basemaps (CC BY-SA 4.0) · Natural Earth (public domain)',
    'boot.fileHint': 'Go back to the folder and open this page via 启动.cmd',
    'boot.fileHintSub': 'Browsers block local modules and data reads over file://',
    'boot.slow': 'Waiting for data — hold on if the network is slow',

    'year.loading': 'Loading…',
    'year.loadingEra': 'Loading borders for {era}…',
    'year.fail': 'Load failed: {msg}',

    'panel.close': 'Close details',
    'panel.dossier': 'Polity dossier',
    'panel.dossierCulture': 'Culture area dossier',
    'panel.events': 'Events in this era',
    'panel.more': 'All {n} →',
    'panel.less': 'Collapse',
    'panel.links': 'Further reading',
    'panel.datasetLink': 'Dataset source link ↗',
    'panel.zhWiki': 'Search zh.wikipedia ↗',
    'panel.enWiki': 'Search en.wikipedia ↗',
    'panel.source.historical': 'Source: historical-basemaps (CC BY-SA 4.0) · {era} snapshot',
    'panel.source.modern': 'Source: Natural Earth 110m adm-0 countries (public domain) · {era}',
    'panel.foot.culture': 'In the dataset this is a culture area or archaeological culture, not a state in the modern sense.',
    'panel.foot.coord': 'The approximate centre is the bounding-box centre of the largest polygon ({coord}); the area share is estimated from coordinates. Neither is survey-grade.',
    'panel.foot.untranslated': 'Name kept in the dataset original language (no Chinese translation curated yet).',
    'panel.foot.translated': 'The Chinese translation is curated by this project and may differ from scholarly usage.',

    'field.class': 'Category',
    'field.type': 'Dataset type',
    'field.share': 'Area share',
    'field.rank': 'Rank this era',
    'field.center': 'Approx. centre',
    'field.span': 'Era span',
    'field.subject': 'Subject to',
    'field.partOf': 'Part of',
    'field.none': 'not recorded',
    'rank.value': '#{n} of {total}',
    'span.single': '{year} snapshot',
    'span.multi': '{from} — {to} · {n} snapshots',
    'span.current': 'this snapshot',
    'span.noIndex': 'this snapshot',

    'events.title': 'Events',
    'events.count': '{n} entries',
    'events.note': 'Curated by this project; locations are approximate. Click an entry to fly to its marker.',
    'events.empty': 'No entries for this era',

    'console.title': 'Console',
    'console.layers': 'Map layers',
    'console.colors': 'Legend',
    'console.note': 'Data: historical-basemaps (CC BY-SA 4.0) · Natural Earth (public domain). Polities are drawn by area, largest first, and the "more polities" switch raises the cap. Very large areas (transcontinental empires, polar caps) are automatically dimmed — tick "hide giant areas" to drop them entirely. Energy arcs are decorative, not historical routes.',

    'layer.fill': 'Ownership fill',
    'layer.stroke': 'Borders',
    'layer.labels': 'Polity names',
    'layer.events': 'Historical events',
    'layer.rings': 'Pulsing rings (flashing)',
    'layer.arcs': 'Energy arcs (decorative)',
    'layer.graticule': 'Graticule',
    'layer.hideGiant': 'Hide giant areas',
    'layer.morePolities': 'More polities (≤{n})',

    'btn.prev': '‹ Previous',
    'btn.next': 'Next ›',
    'btn.play': 'Play',
    'btn.pause': 'Pause',
    'btn.speed': 'Speed',
    'btn.spin': 'Spin',
    'btn.reset': 'Reset view',
    'btn.full': 'Fullscreen',
    'btn.prev.title': 'Previous era (←)',
    'btn.next.title': 'Next era (→)',
    'btn.play.title': 'Play / pause (space)',
    'btn.spin.title': 'Auto-rotate',
    'btn.reset.title': 'Reset view (R)',
    'btn.full.title': 'Fullscreen (F)',
    'btn.speed.title': 'Playback speed',
    'timeline.label': 'Timeline: pick an era',
    'timeline.hint': 'Drag to travel through time · ← → change era · space plays',
    'stats.line': '{era} · {total} polities and culture areas{cap} · largest: {top}',
    'stats.capped': ' · showing the top {n}',
    'yearMeta.capped': ' · showing the {n} largest by area',

    'tooltip.share': '{pct}% of mapped land',
    'legend.empty': 'No data',

    'perf.tip': 'This device is rendering slowly (median {ms} ms/frame). Try turning off "Borders" or "More polities" in the console, and drop the playback speed to 0.5×.',
    'giant.hidden': 'Giant areas hidden',
  },
};

let current = 'zh';
const listeners = new Set();

function readInitialLang() {
  try {
    const fromQuery = new URLSearchParams(location.search).get('lang')
      || (/lang=([a-zA-Z-]+)/.exec(location.hash) || [])[1];
    if (fromQuery && LANGS.some((l) => l.id === fromQuery.slice(0, 2).toLowerCase())) {
      return fromQuery.slice(0, 2).toLowerCase();
    }
    const stored = localStorage.getItem(STORE_KEY);
    if (stored && LANGS.some((l) => l.id === stored)) return stored;
  } catch { /* 隐私模式下 localStorage 可能不可用 */ }
  const nav = (navigator.language || 'zh').toLowerCase();
  return nav.startsWith('zh') ? 'zh' : 'en';
}

current = readInitialLang();

export function getLang() {
  return current;
}

export function setLang(lang) {
  if (!LANGS.some((l) => l.id === lang) || lang === current) return;
  current = lang;
  try { localStorage.setItem(STORE_KEY, lang); } catch { /* 忽略 */ }
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  document.documentElement.dataset.lang = lang;
  for (const cb of listeners) cb(lang);
}

export function onLangChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** 取文案：{key} 找不到时回退中文，再找不到就把 key 原样返回，便于发现漏翻 */
export function t(key, vars) {
  const table = DICT[current] || DICT.zh;
  let str = table[key];
  if (str === undefined) str = DICT.zh[key];
  if (str === undefined) return key;
  if (!vars) return str;
  return str.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));
}

/** 按当前语言挑选对象的字段：pickLang(f, 'name') → zh 取 nameZh，en 取 nameEn */
export function pickLang(obj, base) {
  if (!obj) return '';
  const zh = obj[`${base}Zh`];
  const en = obj[`${base}En`] || obj[base];
  if (current === 'en') return en || zh || '';
  return zh || en || '';
}

/** 次级名称（英文界面显示中文名，反之显示英文名） */
export function secondaryName(obj, base) {
  if (!obj) return '';
  const zh = obj[`${base}Zh`];
  const en = obj[`${base}En`] || obj[base];
  const primary = pickLang(obj, base);
  const other = current === 'en' ? zh : en;
  return other && other !== primary ? other : '';
}

/** 刷新所有静态标记文案 */
export function applyStaticI18n(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-html]').forEach((el) => {
    el.innerHTML = t(el.dataset.i18nHtml);
  });
  root.querySelectorAll('[data-i18n-title]').forEach((el) => {
    el.title = t(el.dataset.i18nTitle);
  });
  root.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  root.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.title = t('app.title');
}
