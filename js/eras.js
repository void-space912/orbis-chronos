/**
 * 时间轴年代定义（中英双语）。
 * key 对应 data/eras/<key>.json（末尾的 2025 使用 data/modern.json）。
 * 年代标注为史实时间锚点，用于界面说明；版图本身来自数据文件。
 */
export const ERAS = [
  {
    key: 'bc10000',
    year: -10000,
    label: '公元前 10000 年',
    labelEn: '10,000 BCE',
    note: '末次冰期结束，全新世开始',
    noteEn: 'The last ice age ends; the Holocene begins',
  },
  {
    key: 'bc8000',
    year: -8000,
    label: '公元前 8000 年',
    labelEn: '8,000 BCE',
    note: '农业在西亚、东亚、中美洲分别起源',
    noteEn: 'Farming emerges independently in Southwest Asia, East Asia and Mesoamerica',
  },
  {
    key: 'bc5000',
    year: -5000,
    label: '公元前 5000 年',
    labelEn: '5,000 BCE',
    note: '两河流域与尼罗河出现灌溉聚落',
    noteEn: 'Irrigated settlements appear along the Tigris–Euphrates and the Nile',
  },
  {
    key: 'bc4000',
    year: -4000,
    label: '公元前 4000 年',
    labelEn: '4,000 BCE',
    note: '苏美尔乌鲁克时期、埃及前王朝',
    noteEn: 'The Uruk period in Sumer; Predynastic Egypt',
  },
  {
    key: 'bc3000',
    year: -3000,
    label: '公元前 3000 年',
    labelEn: '3,000 BCE',
    note: '苏美尔城邦、埃及早王朝、印度河流域文明',
    noteEn: 'Sumerian city-states, Early Dynastic Egypt, the Indus Valley civilisation',
  },
  {
    key: 'bc2000',
    year: -2000,
    label: '公元前 2000 年',
    labelEn: '2,000 BCE',
    note: '古巴比伦、埃及中王国、夏代中国',
    noteEn: 'Old Babylon, Egypt’s Middle Kingdom, Xia-era China',
  },
  {
    key: 'bc1500',
    year: -1500,
    label: '公元前 1500 年',
    labelEn: '1,500 BCE',
    note: '埃及新王国、赫梯、迈锡尼、商代中国',
    noteEn: 'New Kingdom Egypt, the Hittites, Mycenaean Greece, Shang China',
  },
  {
    key: 'bc1000',
    year: -1000,
    label: '公元前 1000 年',
    labelEn: '1,000 BCE',
    note: '铁器时代展开，周代、腓尼基、以色列王国',
    noteEn: 'The Iron Age spreads; Zhou China, Phoenicia, the Kingdom of Israel',
  },
  {
    key: 'bc700',
    year: -700,
    label: '公元前 700 年',
    labelEn: '700 BCE',
    note: '亚述帝国鼎盛、库施王国、乌拉尔图',
    noteEn: 'The Neo-Assyrian Empire at its height; Kush and Urartu',
  },
  {
    key: 'bc500',
    year: -500,
    label: '公元前 500 年',
    labelEn: '500 BCE',
    note: '波斯阿契美尼德、希腊城邦、中国春秋战国',
    noteEn: 'Achaemenid Persia, Greek city-states, China’s Spring and Autumn period',
  },
  {
    key: 'bc400',
    year: -400,
    label: '公元前 400 年',
    labelEn: '400 BCE',
    note: '波斯与希腊对峙、战国诸侯、印度十六国',
    noteEn: 'Persia and Greece in conflict; China’s Warring States; India’s mahajanapadas',
  },
  {
    key: 'bc323',
    year: -323,
    label: '公元前 323 年',
    labelEn: '323 BCE',
    note: '亚历山大大帝去世，帝国开始分裂',
    noteEn: 'Death of Alexander; his empire begins to fragment',
  },
  {
    key: 'bc300',
    year: -300,
    label: '公元前 300 年',
    labelEn: '300 BCE',
    note: '塞琉古、托勒密、孔雀王朝、战国',
    noteEn: 'Seleucid and Ptolemaic kingdoms, Mauryan India, Warring States China',
  },
  {
    key: 'bc200',
    year: -200,
    label: '公元前 200 年',
    labelEn: '200 BCE',
    note: '罗马崛起、汉帝国、帕提亚',
    noteEn: 'Rome on the rise, Han China, Parthia',
  },
  {
    key: 'bc100',
    year: -100,
    label: '公元前 100 年',
    labelEn: '100 BCE',
    note: '汉、罗马共和国、帕提亚',
    noteEn: 'Han China, the Roman Republic, Parthia',
  },
  {
    key: 'bc1',
    year: -1,
    label: '公元前 1 年',
    labelEn: '1 BCE',
    note: '西汉末年、罗马帝国初建',
    noteEn: 'Late Western Han; the Roman Empire takes shape under Augustus',
  },
  {
    key: '100',
    year: 100,
    label: '公元 100 年',
    labelEn: '100 CE',
    note: '东汉、罗马帝国鼎盛、贵霜帝国',
    noteEn: 'Eastern Han, Rome at its height, the Kushan Empire',
  },
  {
    key: '200',
    year: 200,
    label: '公元 200 年',
    labelEn: '200 CE',
    note: '东汉末年、罗马塞维鲁王朝、萨珊前夜',
    noteEn: 'The end of the Eastern Han, Rome’s Severan dynasty, the eve of the Sasanians',
  },
  {
    key: '300',
    year: 300,
    label: '公元 300 年',
    labelEn: '300 CE',
    note: '西晋、罗马帝国、萨珊波斯',
    noteEn: 'Western Jin China, the Roman Empire, Sasanian Persia',
  },
  {
    key: '400',
    year: 400,
    label: '公元 400 年',
    labelEn: '400 CE',
    note: '东晋十六国、西罗马、笈多王朝',
    noteEn: 'Eastern Jin and the Sixteen Kingdoms, the Western Roman Empire, Gupta India',
  },
  {
    key: '500',
    year: 500,
    label: '公元 500 年',
    labelEn: '500 CE',
    note: '南北朝、拜占庭、萨珊、法兰克王国',
    noteEn: 'Northern and Southern Dynasties, Byzantium, Sasanian Persia, the Frankish kingdom',
  },
  {
    key: '600',
    year: 600,
    label: '公元 600 年',
    labelEn: '600 CE',
    note: '隋代中国、拜占庭、萨珊、突厥汗国',
    noteEn: 'Sui China, Byzantium, Sasanian Persia, the Turkic Khaganate',
  },
  {
    key: '700',
    year: 700,
    label: '公元 700 年',
    labelEn: '700 CE',
    note: '唐代中国、倭马亚哈里发、拜占庭',
    noteEn: 'Tang China, the Umayyad Caliphate, Byzantium',
  },
  {
    key: '800',
    year: 800,
    label: '公元 800 年',
    labelEn: '800 CE',
    note: '唐、阿拔斯哈里发、查理曼加冕',
    noteEn: 'Tang China, the Abbasid Caliphate, Charlemagne crowned emperor',
  },
  {
    key: '900',
    year: 900,
    label: '公元 900 年',
    labelEn: '900 CE',
    note: '唐末五代、阿拔斯分裂、欧洲诸王国',
    noteEn: 'The collapse of Tang China, a fragmenting Abbasid caliphate, the kingdoms of Europe',
  },
  {
    key: '1000',
    year: 1000,
    label: '公元 1000 年',
    labelEn: '1000 CE',
    note: '北宋、拜占庭、法蒂玛、神圣罗马帝国',
    noteEn: 'Northern Song China, Byzantium, the Fatimids, the Holy Roman Empire',
  },
  {
    key: '1100',
    year: 1100,
    label: '公元 1100 年',
    labelEn: '1100 CE',
    note: '北宋与辽金、十字军东征开始',
    noteEn: 'Song China with Liao and Jin; the First Crusade',
  },
  {
    key: '1200',
    year: 1200,
    label: '公元 1200 年',
    labelEn: '1200 CE',
    note: '南宋金夏并立、花剌子模、蒙古崛起前夜',
    noteEn: 'Southern Song, Jin and Western Xia; Khwarezm; the eve of the Mongol conquests',
  },
  {
    key: '1279',
    year: 1279,
    label: '公元 1279 年',
    labelEn: '1279 CE',
    note: '元灭南宋统一，蒙古诸汗国并立',
    noteEn: 'The Yuan conquest unifies China; the Mongol khanates',
  },
  {
    key: '1300',
    year: 1300,
    label: '公元 1300 年',
    labelEn: '1300 CE',
    note: '元代中国、德里苏丹国、奥斯曼兴起',
    noteEn: 'Yuan China, the Delhi Sultanate, the rise of the Ottomans',
  },
  {
    key: '1400',
    year: 1400,
    label: '公元 1400 年',
    labelEn: '1400 CE',
    note: '明代中国、帖木儿帝国、百年战争',
    noteEn: 'Ming China, the Timurid Empire, the Hundred Years’ War',
  },
  {
    key: '1492',
    year: 1492,
    label: '公元 1492 年',
    labelEn: '1492 CE',
    note: '哥伦布抵达美洲，收复失地运动完成',
    noteEn: 'Columbus reaches the Americas; the Reconquista is completed',
  },
  {
    key: '1500',
    year: 1500,
    label: '公元 1500 年',
    labelEn: '1500 CE',
    note: '大航海初期，奥斯曼、萨法维、印加与阿兹特克',
    noteEn: 'The age of exploration begins; Ottomans, Safavids, the Inca and the Aztec',
  },
  {
    key: '1530',
    year: 1530,
    label: '公元 1530 年',
    labelEn: '1530 CE',
    note: '奥斯曼鼎盛、西班牙殖民帝国、莫卧儿建立',
    noteEn: 'Ottoman zenith, the Spanish colonial empire, the Mughal Empire founded',
  },
  {
    key: '1600',
    year: 1600,
    label: '公元 1600 年',
    labelEn: '1600 CE',
    note: '明代中国、伊比利亚全球帝国、俄国东扩',
    noteEn: 'Ming China, Iberian world empires, Russian expansion eastward',
  },
  {
    key: '1650',
    year: 1650,
    label: '公元 1650 年',
    labelEn: '1650 CE',
    note: '明清易代、威斯特伐利亚和约后的欧洲',
    noteEn: 'The Qing replace the Ming; Europe after the Peace of Westphalia',
  },
  {
    key: '1700',
    year: 1700,
    label: '公元 1700 年',
    labelEn: '1700 CE',
    note: '清代中国、路易十四法国、莫卧儿鼎盛',
    noteEn: 'Qing China, Louis XIV’s France, the Mughals at their height',
  },
  {
    key: '1715',
    year: 1715,
    label: '公元 1715 年',
    labelEn: '1715 CE',
    note: '西班牙王位继承战争结束、清代中国',
    noteEn: 'The War of the Spanish Succession ends; Qing China',
  },
  {
    key: '1783',
    year: 1783,
    label: '公元 1783 年',
    labelEn: '1783 CE',
    note: '美国独立、清代乾隆、欧洲列强全球扩张',
    noteEn: 'American independence; Qianlong-era China; European expansion worldwide',
  },
  {
    key: '1800',
    year: 1800,
    label: '公元 1800 年',
    labelEn: '1800 CE',
    note: '拿破仑时代前夕、清代嘉庆、殖民帝国扩张',
    noteEn: 'On the eve of the Napoleonic wars; Jiaqing-era China; expanding colonial empires',
  },
  {
    key: '1815',
    year: 1815,
    label: '公元 1815 年',
    labelEn: '1815 CE',
    note: '维也纳会议，拿破仑战争结束',
    noteEn: 'The Congress of Vienna; the Napoleonic Wars end',
  },
  {
    key: '1878',
    year: 1878,
    label: '公元 1878 年',
    labelEn: '1878 CE',
    note: '柏林会议、德意志统一、大英帝国鼎盛',
    noteEn: 'The Congress of Berlin; German unification; the British Empire at its height',
  },
  {
    key: '1880',
    year: 1880,
    label: '公元 1880 年',
    labelEn: '1880 CE',
    note: '瓜分非洲前夜、列强帝国主义高峰',
    noteEn: 'On the eve of the Scramble for Africa; the peak of high imperialism',
  },
  {
    key: '1900',
    year: 1900,
    label: '公元 1900 年',
    labelEn: '1900 CE',
    note: '八国联军侵华、布尔战争、清末中国',
    noteEn: 'The Eight-Nation Alliance in Beijing; the Second Boer War; late Qing China',
  },
  {
    key: '1914',
    year: 1914,
    label: '公元 1914 年',
    labelEn: '1914 CE',
    note: '第一次世界大战爆发',
    noteEn: 'World War I begins',
  },
  {
    key: '1920',
    year: 1920,
    label: '公元 1920 年',
    labelEn: '1920 CE',
    note: '凡尔赛体系与国际联盟，帝国解体',
    noteEn: 'The Versailles order and the League of Nations; empires dissolved',
  },
  {
    key: '1930',
    year: 1930,
    label: '公元 1930 年',
    labelEn: '1930 CE',
    note: '大萧条，殖民地范围达到高峰',
    noteEn: 'The Great Depression; colonial empires at their greatest extent',
  },
  {
    key: '1938',
    year: 1938,
    label: '公元 1938 年',
    labelEn: '1938 CE',
    note: '第二次世界大战前夕，慕尼黑协定',
    noteEn: 'On the eve of World War II; the Munich Agreement',
  },
  {
    key: '1945',
    year: 1945,
    label: '公元 1945 年',
    labelEn: '1945 CE',
    note: '第二次世界大战结束，联合国成立',
    noteEn: 'World War II ends; the United Nations is founded',
  },
  {
    key: '1960',
    year: 1960,
    label: '公元 1960 年',
    labelEn: '1960 CE',
    note: '非洲独立年，冷战对峙',
    noteEn: 'The Year of Africa; the Cold War standoff',
  },
  {
    key: '1994',
    year: 1994,
    label: '公元 1994 年',
    labelEn: '1994 CE',
    note: '冷战结束、苏联解体、南非废除种族隔离',
    noteEn: 'The Cold War is over; the USSR dissolved; apartheid ends in South Africa',
  },
  {
    key: '2000',
    year: 2000,
    label: '公元 2000 年',
    labelEn: '2000 CE',
    note: '千禧年，全球化加速',
    noteEn: 'The millennium; globalisation accelerates',
  },
  {
    key: '2010',
    year: 2010,
    label: '公元 2010 年',
    labelEn: '2010 CE',
    note: '当代国际格局',
    noteEn: 'The contemporary international order',
  },
  {
    key: '2025',
    year: 2025,
    label: '2025 年',
    labelEn: '2025 CE',
    note: '现代国家（Natural Earth 110m 数据）',
    noteEn: 'Modern states (Natural Earth 110m data)',
    file: 'data/modern.json',
    modern: true,
  },
];

/** 时间轴刻度上需要突出的年代 */
const MAJOR = new Set(['bc3000', 'bc1000', 'bc1', '1000', '1500', '1900', '1945', '2025']);

export function isMajorEra(era) {
  if (MAJOR.has(era.key)) return true;
  return era.year % 500 === 0 && era.year <= 1000;
}

/** 五位以上的年份加千位分隔（10,000 BCE），四位数年份保持 1900 这种写法 */
function group(n) {
  const s = String(n);
  return s.length >= 5 ? s.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : s;
}

export function formatYear(year, lang = 'zh') {
  if (lang === 'en') return year < 0 ? `${group(Math.abs(year))} BCE` : `${group(year)} CE`;
  if (year < 0) return `公元前 ${group(Math.abs(year))} 年`;
  return `公元 ${group(year)} 年`;
}

export function formatYearShort(year, lang = 'zh') {
  if (lang === 'en') return year < 0 ? `${group(Math.abs(year))} BCE` : `${group(year)}`;
  if (year < 0) return `前${group(Math.abs(year))}`;
  return `${group(year)}`;
}

export function eraLabel(era, lang = 'zh') {
  if (!era) return '';
  return lang === 'en' ? era.labelEn || era.label : era.label;
}

export function eraNote(era, lang = 'zh') {
  if (!era) return '';
  return lang === 'en' ? era.noteEn || era.note : era.note;
}

export function eraFile(era) {
  return era.file || `data/eras/${era.key}.json`;
}

export function eraIndexOfKey(key) {
  return ERAS.findIndex((e) => e.key === key);
}
