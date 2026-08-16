import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const sourcePath = resolve(process.argv[2] || '/home/ubuntu/.cursor/projects/workspace/uploads/________-_____3a1d.md');
const outPath = resolve(process.argv[3] || 'src/data/capitalCampusCompanies.ts');

const PROVINCE_BY_CAPITAL = {
  北京: '北京市',
  天津: '天津市',
  石家庄: '河北省',
  太原: '山西省',
  呼和浩特: '内蒙古自治区',
  沈阳: '辽宁省',
  长春: '吉林省',
  哈尔滨: '黑龙江省',
  上海: '上海市',
  南京: '江苏省',
  杭州: '浙江省',
  合肥: '安徽省',
  福州: '福建省',
  南昌: '江西省',
  济南: '山东省',
  郑州: '河南省',
  武汉: '湖北省',
  长沙: '湖南省',
  广州: '广东省',
  南宁: '广西壮族自治区',
  海口: '海南省',
  重庆: '重庆市',
  成都: '四川省',
  贵阳: '贵州省',
  昆明: '云南省',
  拉萨: '西藏自治区',
  西安: '陕西省',
  兰州: '甘肃省',
  西宁: '青海省',
  银川: '宁夏回族自治区',
  乌鲁木齐: '新疆维吾尔自治区',
};

const COORD_BY_CAPITAL = {
  北京: [116.41, 39.9],
  天津: [117.2, 39.13],
  石家庄: [114.48, 38.04],
  太原: [112.55, 37.87],
  呼和浩特: [111.75, 40.84],
  沈阳: [123.43, 41.8],
  长春: [125.32, 43.82],
  哈尔滨: [126.53, 45.8],
  上海: [121.47, 31.23],
  南京: [118.8, 32.06],
  杭州: [120.15, 30.28],
  合肥: [117.23, 31.82],
  福州: [119.3, 26.08],
  南昌: [115.86, 28.68],
  济南: [117.0, 36.65],
  郑州: [113.65, 34.76],
  武汉: [114.31, 30.59],
  长沙: [112.94, 28.23],
  广州: [113.26, 23.13],
  南宁: [108.37, 22.82],
  海口: [110.35, 20.02],
  重庆: [106.55, 29.56],
  成都: [104.07, 30.67],
  贵阳: [106.63, 26.65],
  昆明: [102.71, 25.04],
  拉萨: [91.11, 29.65],
  西安: [108.94, 34.34],
  兰州: [103.83, 36.06],
  西宁: [101.78, 36.62],
  银川: [106.27, 38.47],
  乌鲁木齐: [87.62, 43.83],
};

const LABEL_POS_BY_CAPITAL = {
  北京: 'left',
  天津: 'right',
  石家庄: 'bottom',
  太原: 'left',
  呼和浩特: 'top',
  沈阳: 'right',
  长春: 'right',
  哈尔滨: 'top',
  上海: 'right',
  南京: 'left',
  杭州: 'bottom',
  合肥: 'bottom',
  福州: 'right',
  南昌: 'left',
  济南: 'right',
  郑州: 'left',
  武汉: 'right',
  长沙: 'left',
  广州: 'right',
  南宁: 'left',
  海口: 'right',
  重庆: 'bottom',
  成都: 'left',
  贵阳: 'right',
  昆明: 'left',
  拉萨: 'right',
  西安: 'top',
  兰州: 'bottom',
  西宁: 'left',
  银川: 'right',
  乌鲁木齐: 'right',
};

const EXPECTED_COUNTS = {
  北京: 20,
  天津: 20,
  石家庄: 20,
  太原: 20,
  呼和浩特: 20,
  沈阳: 20,
  长春: 20,
  哈尔滨: 16,
  上海: 20,
  南京: 20,
  杭州: 20,
  合肥: 20,
  福州: 16,
  南昌: 14,
  济南: 14,
  郑州: 20,
  武汉: 20,
  长沙: 20,
  广州: 20,
  南宁: 20,
  海口: 20,
  重庆: 20,
  成都: 20,
  贵阳: 20,
  昆明: 20,
  拉萨: 16,
  西安: 20,
  兰州: 20,
  西宁: 15,
  银川: 17,
  乌鲁木齐: 20,
};

const source = readFileSync(sourcePath, 'utf8');
const cities = [];
let current = null;

for (const rawLine of source.split(/\r?\n/u)) {
  const heading = rawLine.match(/^## (.+)$/u);
  if (heading) {
    const name = heading[1].trim();
    if (name === '总览') {
      current = null;
      continue;
    }
    if (!PROVINCE_BY_CAPITAL[name]) {
      throw new Error(`未知省会章节：${name}`);
    }
    current = { name, companies: [] };
    cities.push(current);
    continue;
  }
  if (!current) continue;
  const row = rawLine.match(/^\| ([^|]+?) \| ([^|]+?) \|\s*$/u);
  if (!row) continue;
  const name = row[1].trim();
  const url = row[2].trim();
  if (name === '公司' || name === '---' || name.startsWith('-')) continue;
  if (!/^https?:\/\//u.test(url)) {
    throw new Error(`${current.name} 的「${name}」网址不是 http(s)：${url}`);
  }
  current.companies.push({ name, url });
}

const expectedNames = Object.keys(PROVINCE_BY_CAPITAL);
if (cities.length !== expectedNames.length) {
  throw new Error(`省会数量不对：解析到 ${cities.length}，期望 ${expectedNames.length}`);
}
for (const [index, name] of expectedNames.entries()) {
  if (cities[index].name !== name) {
    throw new Error(`省会顺序不对：第 ${index + 1} 个是 ${cities[index].name}，期望 ${name}`);
  }
  const count = cities[index].companies.length;
  if (count !== EXPECTED_COUNTS[name]) {
    throw new Error(`${name} 家数不对：解析到 ${count}，总览写 ${EXPECTED_COUNTS[name]}`);
  }
}

const total = cities.reduce((sum, city) => sum + city.companies.length, 0);
if (total !== 588) {
  throw new Error(`合计不对：解析到 ${total}，期望 588`);
}

const records = cities.map((city) => {
  const [lng, lat] = COORD_BY_CAPITAL[city.name];
  return {
    name: city.name,
    province: PROVINCE_BY_CAPITAL[city.name],
    lng,
    lat,
    labelPos: LABEL_POS_BY_CAPITAL[city.name],
    companies: city.companies,
  };
});

const file = `export interface CapitalCampusCompany {
  name: string;
  url: string;
}

export type CapitalLabelPos = 'left' | 'right' | 'top' | 'bottom';

export interface CapitalCampusCity {
  name: string;
  province: string;
  lng: number;
  lat: number;
  labelPos: CapitalLabelPos;
  companies: CapitalCampusCompany[];
}

/** 来源：各省会代表性企业校招网址.md（整理日 2026-08-16），未补录、未编造。 */
export const CAPITAL_CAMPUS_SOURCE_DATE = '2026-08-16';
export const CAPITAL_CAMPUS_TOTAL = ${total};

export const CAPITAL_CAMPUS_CITIES: CapitalCampusCity[] = ${JSON.stringify(records, null, 2)};

export const CAPITAL_CAMPUS_BY_NAME = Object.fromEntries(
  CAPITAL_CAMPUS_CITIES.map((city) => [city.name, city]),
) as Record<string, CapitalCampusCity>;

export const CAPITAL_CAMPUS_BY_PROVINCE = Object.fromEntries(
  CAPITAL_CAMPUS_CITIES.map((city) => [city.province, city]),
) as Record<string, CapitalCampusCity>;

export const UNSELECTABLE_GEO_NAMES = new Set([
  '台湾省',
  '香港特别行政区',
  '澳门特别行政区',
]);
`;

writeFileSync(outPath, file);
console.log(`wrote ${outPath}: ${records.length} cities, ${total} companies`);
