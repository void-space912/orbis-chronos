/**
 * 历史大事索引：读取 data/events.json，并按当前年代切出"这一段时间发生了什么"。
 * 事件表是人工整理的（地名取大致城市/战场坐标），不是数据集自带字段。
 */
import { ERAS } from './eras.js';

export const EVENT_TYPES = {
  war: { label: '战争与战役', labelEn: 'Wars & battles', color: '#ff6b5a' },
  revolution: { label: '革命与起义', labelEn: 'Revolutions & revolts', color: '#ffa23d' },
  dynasty: { label: '王朝兴替', labelEn: 'Dynastic change', color: '#c08cff' },
  treaty: { label: '条约与外交', labelEn: 'Treaties & diplomacy', color: '#57e8ff' },
  explore: { label: '探索与航行', labelEn: 'Exploration & voyages', color: '#ffd166' },
  disaster: { label: '灾害与瘟疫', labelEn: 'Disasters & plagues', color: '#9fb4c7' },
  culture: { label: '文化与科技', labelEn: 'Culture & technology', color: '#5ce6a8' },
};

/** 事件类型文案（按语言） */
export function eventTypeLabel(type, lang = 'zh') {
  const meta = EVENT_TYPES[type];
  if (!meta) return type;
  return lang === 'en' ? meta.labelEn || meta.label : meta.label;
}

let all = null;
let loading = null;

export function loadEvents() {
  if (all) return Promise.resolve(all);
  if (loading) return loading;
  loading = fetch('data/events.json', { cache: 'force-cache', credentials: 'omit' })
    .then((r) => {
      if (!r.ok) throw new Error(`事件数据载入失败（HTTP ${r.status}）`);
      return r.json();
    })
    .then((json) => {
      all = (json.events || []).map((e, i) => ({
        id: `ev-${e.y}-${i}`,
        year: e.y,
        name: e.en || e.n,
        nameZh: e.n,
        nameEn: e.en || e.n,
        lat: e.lat,
        lng: e.lng,
        kind: 'event',
        type: e.k,
        color: (EVENT_TYPES[e.k] || {}).color || '#cfd8e3',
        note: e.note || '',
      }));
      all.sort((a, b) => a.year - b.year);
      loading = null;
      return all;
    })
    .catch((err) => {
      loading = null;
      throw err;
    });
  return loading;
}

/** 取「上一个年代快照之后、到本年代快照为止」这段时间里的事件 */
export function eventsForEra(eraIndex) {
  if (!all) return [];
  const era = ERAS[eraIndex];
  if (!era) return [];
  const from = eraIndex > 0 ? ERAS[eraIndex - 1].year : -Infinity;
  const to = era.year;
  return all.filter((e) => e.year > from && e.year <= to).slice().sort((a, b) => a.year - b.year);
}

/** 某个年代是否收录了战争类事件（用于时间轴刻度提示） */
export function eraFlags() {
  const flags = new Array(ERAS.length).fill(null);
  if (!all) return flags;
  for (let i = 0; i < ERAS.length; i += 1) {
    const list = eventsForEra(i);
    if (!list.length) continue;
    flags[i] = { count: list.length, war: list.some((e) => e.type === 'war') };
  }
  return flags;
}

export function formatEventYear(year, lang = 'zh') {
  if (lang === 'en') return year < 0 ? `${Math.abs(year)} BCE` : `${year}`;
  return year < 0 ? `前 ${Math.abs(year)}` : `${year}`;
}
