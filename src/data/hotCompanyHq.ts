import type { HotCompany } from './hotCompanies';
import { CAPITAL_CAMPUS_CITIES, type CapitalLabelPos } from './capitalCampusCompanies';

export interface HotCompanyHq {
  city: string;
  province: string;
  lng: number;
  lat: number;
  labelPos?: CapitalLabelPos;
}

type CityPoint = HotCompanyHq;

const CAPITAL_CITY_POINTS = new Map<string, CityPoint>(
  CAPITAL_CAMPUS_CITIES.map((city) => [city.name, {
    city: city.name,
    province: city.province,
    lng: city.lng,
    lat: city.lat,
    labelPos: city.labelPos,
  }]),
);

/**
 * 非省会总部城市坐标。省会直接复用省会地图的数据；这里仅补数据中实际出现的总部城市。
 */
const NON_CAPITAL_CITY_POINTS: Record<string, CityPoint> = {
  鞍山: { city: '鞍山', province: '辽宁省', lng: 122.99, lat: 41.11, labelPos: 'bottom' },
  包头: { city: '包头', province: '内蒙古自治区', lng: 109.84, lat: 40.66, labelPos: 'top' },
  昌吉: { city: '昌吉', province: '新疆维吾尔自治区', lng: 87.31, lat: 44.01, labelPos: 'bottom' },
  常州: { city: '常州', province: '江苏省', lng: 119.97, lat: 31.81, labelPos: 'bottom' },
  成都: { city: '成都', province: '四川省', lng: 104.07, lat: 30.67, labelPos: 'left' },
  赤峰: { city: '赤峰', province: '内蒙古自治区', lng: 118.89, lat: 42.26, labelPos: 'top' },
  东莞: { city: '东莞', province: '广东省', lng: 113.75, lat: 23.02, labelPos: 'bottom' },
  佛山: { city: '佛山', province: '广东省', lng: 113.12, lat: 23.02, labelPos: 'left' },
  福州: { city: '福州', province: '福建省', lng: 119.3, lat: 26.08, labelPos: 'right' },
  赣州: { city: '赣州', province: '江西省', lng: 114.93, lat: 25.83, labelPos: 'right' },
  高密: { city: '高密', province: '山东省', lng: 119.76, lat: 36.38, labelPos: 'bottom' },
  格尔木: { city: '格尔木', province: '青海省', lng: 94.91, lat: 36.4, labelPos: 'top' },
  个旧: { city: '个旧', province: '云南省', lng: 103.16, lat: 23.36, labelPos: 'bottom' },
  贵溪: { city: '贵溪', province: '江西省', lng: 117.24, lat: 28.29, labelPos: 'bottom' },
  桂林: { city: '桂林', province: '广西壮族自治区', lng: 110.29, lat: 25.27, labelPos: 'right' },
  海南: { city: '海口', province: '海南省', lng: 110.2, lat: 20.04, labelPos: 'left' },
  合肥: { city: '合肥', province: '安徽省', lng: 117.28, lat: 31.86, labelPos: 'left' },
  惠州: { city: '惠州', province: '广东省', lng: 114.42, lat: 23.11, labelPos: 'right' },
  淮北: { city: '淮北', province: '安徽省', lng: 116.8, lat: 33.96, labelPos: 'top' },
  呼和浩特: { city: '呼和浩特', province: '内蒙古自治区', lng: 111.67, lat: 40.82, labelPos: 'right' },
  嘉兴: { city: '嘉兴', province: '浙江省', lng: 120.76, lat: 30.75, labelPos: 'bottom' },
  济宁: { city: '济宁', province: '山东省', lng: 116.59, lat: 35.42, labelPos: 'bottom' },
  金昌: { city: '金昌', province: '甘肃省', lng: 102.19, lat: 38.52, labelPos: 'top' },
  晋江: { city: '晋江', province: '福建省', lng: 118.55, lat: 24.78, labelPos: 'bottom' },
  昆山: { city: '昆山', province: '江苏省', lng: 120.98, lat: 31.38, labelPos: 'right' },
  昆明: { city: '昆明', province: '云南省', lng: 102.83, lat: 24.88, labelPos: 'left' },
  龙岩: { city: '龙岩', province: '福建省', lng: 117.02, lat: 25.08, labelPos: 'bottom' },
  洛阳: { city: '洛阳', province: '河南省', lng: 112.45, lat: 34.62, labelPos: 'left' },
  绵阳: { city: '绵阳', province: '四川省', lng: 104.68, lat: 31.47, labelPos: 'right' },
  宁德: { city: '宁德', province: '福建省', lng: 119.55, lat: 26.67, labelPos: 'right' },
  宁波: { city: '宁波', province: '浙江省', lng: 121.55, lat: 29.87, labelPos: 'right' },
  莆田: { city: '莆田', province: '福建省', lng: 119.01, lat: 25.45, labelPos: 'bottom' },
  青岛: { city: '青岛', province: '山东省', lng: 120.38, lat: 36.07, labelPos: 'left' },
  曲靖: { city: '曲靖', province: '云南省', lng: 103.8, lat: 25.49, labelPos: 'right' },
  厦门: { city: '厦门', province: '福建省', lng: 118.09, lat: 24.48, labelPos: 'left' },
  上海: { city: '上海', province: '上海市', lng: 121.47, lat: 31.23, labelPos: 'left' },
  深圳: { city: '深圳', province: '广东省', lng: 114.06, lat: 22.54, labelPos: 'left' },
  苏州: { city: '苏州', province: '江苏省', lng: 120.59, lat: 31.3, labelPos: 'left' },
  太原: { city: '太原', province: '山西省', lng: 112.55, lat: 37.87, labelPos: 'left' },
  桐乡: { city: '嘉兴', province: '浙江省', lng: 120.54, lat: 30.63, labelPos: 'bottom' },
  潍坊: { city: '潍坊', province: '山东省', lng: 119.16, lat: 36.71, labelPos: 'right' },
  无锡: { city: '无锡', province: '江苏省', lng: 120.31, lat: 31.49, labelPos: 'left' },
  芜湖: { city: '芜湖', province: '安徽省', lng: 118.38, lat: 31.33, labelPos: 'right' },
  西宁: { city: '西宁', province: '青海省', lng: 101.78, lat: 36.62, labelPos: 'right' },
  新余: { city: '新余', province: '江西省', lng: 114.92, lat: 27.81, labelPos: 'bottom' },
  徐州: { city: '徐州', province: '江苏省', lng: 117.18, lat: 34.27, labelPos: 'top' },
  烟台: { city: '烟台', province: '山东省', lng: 121.45, lat: 37.46, labelPos: 'left' },
  招远: { city: '招远', province: '山东省', lng: 120.4, lat: 37.36, labelPos: 'bottom' },
  珠海: { city: '珠海', province: '广东省', lng: 113.58, lat: 22.27, labelPos: 'left' },
  淄博: { city: '淄博', province: '山东省', lng: 118.06, lat: 36.82, labelPos: 'right' },
};

const CITY_POINTS = new Map<string, CityPoint>([
  ...CAPITAL_CITY_POINTS,
  ...Object.entries(NON_CAPITAL_CITY_POINTS),
]);

/**
 * 单一总部映射：仅用于地图落点。这里不写分公司或招聘城市。
 * 采矿公司按用户指定的总部常识补齐；全国/中国字段只在可确认总部时补充。
 */
const COMPANY_HQ_CITY: Record<string, string> = {
  // 采矿
  国家能源集团: '北京', 中国神华: '北京', 中国中煤: '北京', 中煤集团: '北京', 陕煤集团: '西安',
  山东能源: '济南', 兖矿能源: '济南', 山西焦煤: '太原', 晋能控股: '太原', 潞安化工: '太原', 华阳集团: '太原',
  淮北矿业: '淮北', 河南能源: '郑州', 紫金矿业: '龙岩', 山东黄金: '济南', 招金矿业: '招远',
  中国黄金集团: '北京', 赤峰黄金: '赤峰', 湖南黄金: '长沙', 江西铜业: '贵溪', 洛阳钼业: '洛阳',
  中国五矿: '北京', 中国有色矿业集团: '北京', 中色股份: '北京', 中铝集团: '北京', 云南铜业: '昆明',
  驰宏锌锗: '曲靖', 金川集团: '金昌', 西部矿业: '西宁', '云锡 / 锡业股份': '个旧', 厦门钨业: '厦门',
  中国稀土集团: '赣州', 北方稀土: '包头', 盛和资源: '成都', 盐湖股份: '格尔木', 藏格矿业: '格尔木',
  中矿资源: '北京', 赣锋锂业: '新余', 天齐锂业: '成都', 华友钴业: '嘉兴', 宝武资源: '上海',
  // 现有空总部字段
  海德斯: '杭州',
  // 全国字段中可确认的集团总部
  国家电网: '北京', 南方电网: '广州', 中国石油: '北京', 中国石化: '北京', 中国海油: '北京',
  中国华能: '北京', 中国大唐: '北京', 中国华电: '北京', 国家电投: '北京', 三峡集团: '武汉', 中国广核: '深圳',
  中国建筑: '北京', 中国中铁: '北京', 中国铁建: '北京', 中国交建: '北京', 中国电建: '北京', 中国能建: '北京',
  中国中车: '北京', 中国中冶: '北京', 中国移动: '北京', 中国电信: '北京', 中国联通: '北京',
  中国航天科技: '北京', 中国航天科工: '北京', 中国航空工业: '北京', 中国航发: '北京', 中国核工业: '北京',
  中国船舶: '北京', 中国电科: '北京', 中国电子: '深圳', 工商银行: '北京', 建设银行: '北京', 农业银行: '北京',
  中国银行: '北京', 交通银行: '上海', 邮储银行: '北京', 中国人寿: '北京', 中国人保: '北京', 中国宝武: '上海',
  中国铝业: '北京', 鞍钢集团: '鞍山', 中国中化: '北京', 华润集团: '深圳', 招商局集团: '深圳', 中粮集团: '北京',
  中国邮政: '北京', 国药集团: '北京', 中远海运: '上海',
  // 中国总部可明确的外企示例；其余“中国”保留待补，避免硬点。
  礼来: '上海', 宝洁: '广州', 博世: '上海', 赛默飞: '上海', 诺华: '上海', 雅培: '上海',
};

function cityFromValue(value: string): string | null {
  const candidate = value
    .split(/[·、/]/u)
    .map((part) => part.trim())
    .find((part) => CITY_POINTS.has(part));
  return candidate ?? null;
}

/** 返回可落图的单一总部；无可靠总部时返回 null，交给页面的“总部城市待补”列表。 */
export function resolveHotCompanyHq(company: Pick<HotCompany, 'name' | 'city'>): HotCompanyHq | null {
  const city = COMPANY_HQ_CITY[company.name] ?? cityFromValue(company.city);
  if (!city) return null;
  return CITY_POINTS.get(city) ?? null;
}
