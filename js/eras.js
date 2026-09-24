/**
 * 时间轴年代定义。
 * key 对应 data/eras/<key>.json（末尾的 2025 使用 data/modern.json）。
 * 年代标注为史实时间锚点，用于界面说明；版图本身来自数据文件。
 */
export const ERAS = [
  { key: 'bc10000', year: -10000, label: '公元前 10000 年', note: '末次冰期结束，全新世开始' },
  { key: 'bc8000', year: -8000, label: '公元前 8000 年', note: '农业在西亚、东亚、中美洲分别起源' },
  { key: 'bc5000', year: -5000, label: '公元前 5000 年', note: '两河流域与尼罗河出现灌溉聚落' },
  { key: 'bc4000', year: -4000, label: '公元前 4000 年', note: '苏美尔乌鲁克时期、埃及前王朝' },
  { key: 'bc3000', year: -3000, label: '公元前 3000 年', note: '苏美尔城邦、埃及早王朝、印度河流域文明' },
  { key: 'bc2000', year: -2000, label: '公元前 2000 年', note: '古巴比伦、埃及中王国、夏代中国' },
  { key: 'bc1500', year: -1500, label: '公元前 1500 年', note: '埃及新王国、赫梯、迈锡尼、商代中国' },
  { key: 'bc1000', year: -1000, label: '公元前 1000 年', note: '铁器时代展开，周代、腓尼基、以色列王国' },
  { key: 'bc700', year: -700, label: '公元前 700 年', note: '亚述帝国鼎盛、库施王国、乌拉尔图' },
  { key: 'bc500', year: -500, label: '公元前 500 年', note: '波斯阿契美尼德、希腊城邦、中国春秋战国' },
  { key: 'bc400', year: -400, label: '公元前 400 年', note: '波斯与希腊对峙、战国诸侯、印度十六国' },
  { key: 'bc323', year: -323, label: '公元前 323 年', note: '亚历山大大帝去世，帝国开始分裂' },
  { key: 'bc300', year: -300, label: '公元前 300 年', note: '塞琉古、托勒密、孔雀王朝、战国' },
  { key: 'bc200', year: -200, label: '公元前 200 年', note: '罗马崛起、汉帝国、帕提亚' },
  { key: 'bc100', year: -100, label: '公元前 100 年', note: '汉、罗马共和国、帕提亚、安息以西诸国' },
  { key: 'bc1', year: -1, label: '公元前 1 年', note: '西汉末年、罗马帝国初建' },
  { key: '100', year: 100, label: '公元 100 年', note: '东汉、罗马帝国鼎盛、贵霜帝国' },
  { key: '200', year: 200, label: '公元 200 年', note: '东汉末年、罗马塞维鲁王朝、萨珊前夜' },
  { key: '300', year: 300, label: '公元 300 年', note: '西晋、罗马帝国、萨珊波斯' },
  { key: '400', year: 400, label: '公元 400 年', note: '东晋十六国、西罗马、笈多王朝' },
  { key: '500', year: 500, label: '公元 500 年', note: '南北朝、拜占庭、萨珊、法兰克王国' },
  { key: '600', year: 600, label: '公元 600 年', note: '隋代中国、拜占庭、萨珊、突厥汗国' },
  { key: '700', year: 700, label: '公元 700 年', note: '唐代中国、倭马亚哈里发、拜占庭' },
  { key: '800', year: 800, label: '公元 800 年', note: '唐、阿拔斯哈里发、查理曼加冕' },
  { key: '900', year: 900, label: '公元 900 年', note: '唐末五代、阿拔斯分裂、欧洲诸王国' },
  { key: '1000', year: 1000, label: '公元 1000 年', note: '北宋、拜占庭、法蒂玛、神圣罗马帝国' },
  { key: '1100', year: 1100, label: '公元 1100 年', note: '北宋与辽金、十字军东征开始' },
  { key: '1200', year: 1200, label: '公元 1200 年', note: '南宋金夏并立、花剌子模、蒙古崛起前夜' },
  { key: '1279', year: 1279, label: '公元 1279 年', note: '元灭南宋统一，蒙古诸汗国并立' },
  { key: '1300', year: 1300, label: '公元 1300 年', note: '元代中国、德里苏丹国、奥斯曼兴起' },
  { key: '1400', year: 1400, label: '公元 1400 年', note: '明代中国、帖木儿帝国、百年战争' },
  { key: '1492', year: 1492, label: '公元 1492 年', note: '哥伦布抵达美洲，收复失地运动完成' },
  { key: '1500', year: 1500, label: '公元 1500 年', note: '大航海初期，奥斯曼、萨法维、印加与阿兹特克' },
  { key: '1530', year: 1530, label: '公元 1530 年', note: '奥斯曼鼎盛、西班牙殖民帝国、莫卧儿建立' },
  { key: '1600', year: 1600, label: '公元 1600 年', note: '明代中国、伊比利亚全球帝国、俄国东扩' },
  { key: '1650', year: 1650, label: '公元 1650 年', note: '明清易代、威斯特伐利亚和约后的欧洲' },
  { key: '1700', year: 1700, label: '公元 1700 年', note: '清代中国、路易十四法国、莫卧儿鼎盛' },
  { key: '1715', year: 1715, label: '公元 1715 年', note: '西班牙王位继承战争结束、清代中国' },
  { key: '1783', year: 1783, label: '公元 1783 年', note: '美国独立、清代乾隆、欧洲列强全球扩张' },
  { key: '1800', year: 1800, label: '公元 1800 年', note: '拿破仑时代前夕、清代嘉庆、殖民帝国扩张' },
  { key: '1815', year: 1815, label: '公元 1815 年', note: '维也纳会议，拿破仑战争结束' },
  { key: '1878', year: 1878, label: '公元 1878 年', note: '柏林会议、德意志统一、大英帝国鼎盛' },
  { key: '1880', year: 1880, label: '公元 1880 年', note: '瓜分非洲前夜、列强帝国主义高峰' },
  { key: '1900', year: 1900, label: '公元 1900 年', note: '八国联军侵华、布尔战争、清末中国' },
  { key: '1914', year: 1914, label: '公元 1914 年', note: '第一次世界大战爆发' },
  { key: '1920', year: 1920, label: '公元 1920 年', note: '凡尔赛体系与国际联盟，帝国解体' },
  { key: '1930', year: 1930, label: '公元 1930 年', note: '大萧条，殖民地范围达到高峰' },
  { key: '1938', year: 1938, label: '公元 1938 年', note: '第二次世界大战前夕，慕尼黑协定' },
  { key: '1945', year: 1945, label: '公元 1945 年', note: '第二次世界大战结束，联合国成立' },
  { key: '1960', year: 1960, label: '公元 1960 年', note: '非洲独立年，冷战对峙' },
  { key: '1994', year: 1994, label: '公元 1994 年', note: '冷战结束、苏联解体、南非废除种族隔离' },
  { key: '2000', year: 2000, label: '公元 2000 年', note: '千禧年，全球化加速' },
  { key: '2010', year: 2010, label: '公元 2010 年', note: '当代国际格局' },
  { key: '2025', year: 2025, label: '2025 年', note: '现代国家（Natural Earth 110m 数据）', file: 'data/modern.json', modern: true },
];

/** 时间轴刻度上需要突出的年代 */
const MAJOR = new Set(['bc3000', 'bc1000', 'bc1', '1000', '1500', '1900', '1945', '2025']);

export function isMajorEra(era) {
  if (MAJOR.has(era.key)) return true;
  return era.year % 500 === 0 && era.year <= 1000;
}

export function formatYear(year) {
  if (year < 0) return `公元前 ${Math.abs(year)} 年`;
  return `公元 ${year} 年`;
}

export function formatYearShort(year) {
  if (year < 0) return `前${Math.abs(year)}`;
  return `${year}`;
}

export function eraFile(era) {
  return era.file || `data/eras/${era.key}.json`;
}

export function eraIndexOfKey(key) {
  return ERAS.findIndex((e) => e.key === key);
}
