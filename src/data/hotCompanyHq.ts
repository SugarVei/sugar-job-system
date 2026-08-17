import type { HotCompany } from './hotCompanies';
import { COUNTY_TO_PREFECTURE, PREFECTURE_BY_NAME, type PrefectureCity } from './prefectureCities';

export interface HotCompanyHq {
  city: string;
  province: string;
  lng: number;
  lat: number;
  labelPos?: PrefectureCity['labelPos'];
}

/**
 * 单一总部映射：仅用于地图落点。这里不写分公司或招聘城市。
 * 采矿公司按用户指定的总部常识补齐；全国/中国字段只在可确认总部时补充。
 */
const COMPANY_HQ_CITY: Record<string, string> = {
  国家能源集团: '北京', 中国神华: '北京', 中国中煤: '北京', 中煤集团: '北京', 陕煤集团: '西安',
  山东能源: '济南', 兖矿能源: '济南', 山西焦煤: '太原', 晋能控股: '太原', 潞安化工: '太原', 华阳集团: '太原',
  淮北矿业: '淮北', 河南能源: '郑州', 紫金矿业: '龙岩', 山东黄金: '济南', 招金矿业: '招远',
  中国黄金集团: '北京', 赤峰黄金: '赤峰', 湖南黄金: '长沙', 江西铜业: '贵溪', 洛阳钼业: '洛阳',
  中国五矿: '北京', 中国有色矿业集团: '北京', 中色股份: '北京', 中铝集团: '北京', 云南铜业: '昆明',
  驰宏锌锗: '曲靖', 金川集团: '金昌', 西部矿业: '西宁', '云锡 / 锡业股份': '个旧', 厦门钨业: '厦门',
  中国稀土集团: '赣州', 北方稀土: '包头', 盛和资源: '成都', 盐湖股份: '格尔木', 藏格矿业: '格尔木',
  中矿资源: '北京', 赣锋锂业: '新余', 天齐锂业: '成都', 华友钴业: '嘉兴', 宝武资源: '上海',
  海德斯: '杭州',
  国家电网: '北京', 南方电网: '广州', 中国石油: '北京', 中国石化: '北京', 中国海油: '北京',
  中国华能: '北京', 中国大唐: '北京', 中国华电: '北京', 国家电投: '北京', 三峡集团: '武汉', 中国广核: '深圳',
  中国建筑: '北京', 中国中铁: '北京', 中国铁建: '北京', 中国交建: '北京', 中国电建: '北京', 中国能建: '北京',
  中国中车: '北京', 中国中冶: '北京', 中国移动: '北京', 中国电信: '北京', 中国联通: '北京',
  中国航天科技: '北京', 中国航天科工: '北京', 中国航空工业: '北京', 中国航发: '北京', 中国核工业: '北京',
  中国船舶: '北京', 中国电科: '北京', 中国电子: '深圳', 工商银行: '北京', 建设银行: '北京', 农业银行: '北京',
  中国银行: '北京', 交通银行: '上海', 邮储银行: '北京', 中国人寿: '北京', 中国人保: '北京', 中国宝武: '上海',
  中国铝业: '北京', 鞍钢集团: '鞍山', 中国中化: '北京', 华润集团: '深圳', 招商局集团: '深圳', 中粮集团: '北京',
  中国邮政: '北京', 国药集团: '北京', 中远海运: '上海',
  礼来: '上海', 宝洁: '广州', 博世: '上海', 赛默飞: '上海', 诺华: '上海', 雅培: '上海',
};

export function resolvePrefectureName(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (COUNTY_TO_PREFECTURE[trimmed]) return COUNTY_TO_PREFECTURE[trimmed];
  if (PREFECTURE_BY_NAME[trimmed]) return trimmed;
  return null;
}

function cityFromValue(value: string): string | null {
  return value
    .split(/[·、/]/u)
    .map((part) => resolvePrefectureName(part.trim()))
    .find((part): part is string => Boolean(part)) ?? null;
}

function toHq(city: PrefectureCity): HotCompanyHq {
  return {
    city: city.name,
    province: city.province,
    lng: city.lng,
    lat: city.lat,
    labelPos: city.labelPos,
  };
}

/** 返回可落图的地级市总部；无可靠总部时返回 null，交给页面的“总部城市待补”列表。 */
export function resolveHotCompanyHq(company: Pick<HotCompany, 'name' | 'city'>): HotCompanyHq | null {
  const cityName = resolvePrefectureName(COMPANY_HQ_CITY[company.name] ?? '') ?? cityFromValue(company.city);
  if (!cityName) return null;
  const city = PREFECTURE_BY_NAME[cityName];
  return city ? toHq(city) : null;
}
