#!/usr/bin/env python3
"""Build prefecture-level China geojson + city metadata for 地图校招."""

from __future__ import annotations

import json
import re
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL_PROVINCE = ROOT / "public/geo/china-100000-full.json"
OUT_GEO = ROOT / "public/geo/china-prefecture.json"
OUT_DATA = ROOT / "src/data/prefectureCities.ts"
ALIYUN = "https://geo.datav.aliyun.com/areas_v3/bound/{code}_full.json"

PROVINCE_CODES = [
    110000, 120000, 130000, 140000, 150000,
    210000, 220000, 230000,
    310000, 320000, 330000, 340000, 350000, 360000, 370000,
    410000, 420000, 430000, 440000, 450000, 460000,
    500000, 510000, 520000, 530000, 540000,
    610000, 620000, 630000, 640000, 650000,
]
MUNICIPALITIES = {110000, 120000, 310000, 500000}
SPECIAL_REGION_CODES = {710000, 810000, 820000}
EXCLUDE_ADCODES = {460300}  # 三沙：海域过大，会破坏大陆视野

CAPITAL_NAMES = {
    "北京", "天津", "石家庄", "太原", "呼和浩特", "沈阳", "长春", "哈尔滨",
    "上海", "南京", "杭州", "合肥", "福州", "南昌", "济南", "郑州", "武汉",
    "长沙", "广州", "南宁", "海口", "重庆", "成都", "贵阳", "昆明", "拉萨",
    "西安", "兰州", "西宁", "银川", "乌鲁木齐",
}

SPECIAL_SHORT_NAMES = {
    "海南藏族自治州": "海南州",
    "伊犁哈萨克自治州": "伊犁",
    "克孜勒苏柯尔克孜自治州": "克孜勒苏",
    "香港特别行政区": "香港",
    "澳门特别行政区": "澳门",
    "台湾省": "台湾",
}

ETHNIC_TAIL = re.compile(
    r"(土家族|苗族|侗族|藏族|彝族|壮族|回族|蒙古族|蒙古|朝鲜族|傣族|白族|"
    r"景颇族|傈僳族|柯尔克孜族|柯尔克孜|哈萨克族|哈萨克|布依族|哈尼族|黎族|羌族|水族|瑶族|佤族)+$"
)


def short_name(official: str) -> str:
    if official in SPECIAL_SHORT_NAMES:
        return SPECIAL_SHORT_NAMES[official]
    if official.endswith("特别行政区"):
        return official.replace("特别行政区", "")
    if official.endswith("市"):
        return official[:-1]
    if official.endswith("地区"):
        return official[:-2]
    if official.endswith("盟"):
        return official
    if official.endswith("自治州"):
        return ETHNIC_TAIL.sub("", official[:-3])
    if official.endswith("省"):
        return official[:-1]
    return official


def is_prefecture_adcode(adcode: int) -> bool:
    return adcode % 100 == 0 and (adcode // 100) % 100 < 90 and adcode not in EXCLUDE_ADCODES


def fetch_json(url: str, retries: int = 4) -> dict:
    last_error: Exception | None = None
    for attempt in range(retries):
        try:
            request = urllib.request.Request(url, headers={"User-Agent": "sugar-job-system-map-builder"})
            with urllib.request.urlopen(request, timeout=30) as response:
                return json.loads(response.read().decode("utf-8"))
        except Exception as error:  # noqa: BLE001
            last_error = error
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f"failed to fetch {url}: {last_error}")


def simplify_ring(ring: list, ndigits: int = 3) -> list | None:
    simplified: list[list[float]] = []
    for point in ring:
        if len(point) < 2:
            continue
        rounded = [round(float(point[0]), ndigits), round(float(point[1]), ndigits)]
        if not simplified or rounded != simplified[-1]:
            simplified.append(rounded)
    if len(simplified) >= 2 and simplified[0] != simplified[-1]:
        simplified.append(simplified[0][:])
    return simplified if len(simplified) >= 4 else None


def simplify_geometry(geometry: dict) -> dict | None:
    geom_type = geometry.get("type")
    coords = geometry.get("coordinates")
    if geom_type == "Polygon":
        rings = [ring for ring in (simplify_ring(r) for r in coords) if ring]
        return {"type": "Polygon", "coordinates": rings} if rings else None
    if geom_type == "MultiPolygon":
        polygons = []
        for polygon in coords:
            rings = [ring for ring in (simplify_ring(r) for r in polygon) if ring]
            if rings:
                polygons.append(rings)
        return {"type": "MultiPolygon", "coordinates": polygons} if polygons else None
    return None


def default_label_pos(lng: float, lat: float) -> str:
    if lng < 100:
        return "right"
    if lng > 122:
        return "left"
    if lat > 44:
        return "bottom"
    if lat < 24:
        return "top"
    return "right"


def feature_center(props: dict, geometry: dict) -> tuple[float, float]:
    center = props.get("center") or props.get("centroid")
    if isinstance(center, list) and len(center) >= 2:
        return float(center[0]), float(center[1])
    rings = geometry["coordinates"][0] if geometry["type"] == "Polygon" else geometry["coordinates"][0][0]
    lngs = [p[0] for p in rings]
    lats = [p[1] for p in rings]
    return sum(lngs) / len(lngs), sum(lats) / len(lats)


def make_feature(name: str, official: str, province: str, adcode: int, props: dict, geometry: dict) -> tuple[dict, dict]:
    simplified = simplify_geometry(geometry)
    if not simplified:
        raise RuntimeError(f"empty geometry: {official}")
    lng, lat = feature_center(props, simplified)
    city = {
        "name": name,
        "officialName": official,
        "province": province,
        "adcode": adcode,
        "lng": round(lng, 2),
        "lat": round(lat, 2),
        "isCapital": name in CAPITAL_NAMES,
        "labelPos": default_label_pos(lng, lat),
    }
    feature = {
        "type": "Feature",
        "properties": {
            "name": name,
            "officialName": official,
            "province": province,
            "adcode": adcode,
            "center": [lng, lat],
        },
        "geometry": simplified,
    }
    return feature, city


def main() -> None:
    province_geo = json.loads(LOCAL_PROVINCE.read_text(encoding="utf-8"))
    province_by_adcode = {}
    for feature in province_geo["features"]:
        raw_adcode = feature.get("properties", {}).get("adcode")
        if raw_adcode is None or not str(raw_adcode).isdigit():
            continue
        province_by_adcode[int(raw_adcode)] = feature

    features: list[dict] = []
    cities: list[dict] = []

    for code in PROVINCE_CODES:
        province_feature = province_by_adcode[code]
        province_name = province_feature["properties"]["name"]
        if code in MUNICIPALITIES:
            name = short_name(province_name)
            feature, city = make_feature(
                name,
                province_name,
                province_name,
                code,
                province_feature["properties"],
                province_feature["geometry"],
            )
            features.append(feature)
            cities.append(city)
            continue

        remote = fetch_json(ALIYUN.format(code=code))
        for item in remote["features"]:
            props = item.get("properties") or {}
            adcode = int(props.get("adcode") or 0)
            official = str(props.get("name") or "")
            if not official or not is_prefecture_adcode(adcode):
                continue
            name = short_name(official)
            feature, city = make_feature(name, official, province_name, adcode, props, item["geometry"])
            features.append(feature)
            cities.append(city)

    for code in SPECIAL_REGION_CODES:
        item = province_by_adcode[code]
        official = item["properties"]["name"]
        name = short_name(official)
        feature, city = make_feature(name, official, official, code, item["properties"], item["geometry"])
        city["isCapital"] = False
        features.append(feature)
        cities.append(city)

    names = [city["name"] for city in cities]
    dupes = sorted({name for name in names if names.count(name) > 1})
    if dupes:
        raise SystemExit(f"duplicate short names: {dupes}")

    missing_capitals = sorted(CAPITAL_NAMES - {city["name"] for city in cities})
    if missing_capitals:
        raise SystemExit(f"missing capitals: {missing_capitals}")

    cities.sort(key=lambda item: (not item["isCapital"], item["adcode"]))
    geo = {"type": "FeatureCollection", "features": features}
    OUT_GEO.write_text(json.dumps(geo, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    lines = [
        "import type { CapitalLabelPos } from './capitalCampusCompanies';",
        "",
        "export interface PrefectureCity {",
        "  name: string;",
        "  officialName: string;",
        "  province: string;",
        "  adcode: number;",
        "  lng: number;",
        "  lat: number;",
        "  isCapital: boolean;",
        "  labelPos: CapitalLabelPos;",
        "}",
        "",
        "export const PREFECTURE_CITIES: PrefectureCity[] = " + json.dumps(cities, ensure_ascii=False, indent=2) + ";",
        "",
        "export const PREFECTURE_BY_NAME = Object.fromEntries(",
        "  PREFECTURE_CITIES.map((city) => [city.name, city]),",
        ") as Record<string, PrefectureCity>;",
        "",
        "export const UNSELECTABLE_GEO_NAMES = new Set(['台湾', '香港', '澳门']);",
        "",
        "/** 热门公司总部里出现的县级市，归到所属地级市区域。 */",
        "export const COUNTY_TO_PREFECTURE: Record<string, string> = {",
        "  招远: '烟台',",
        "  个旧: '红河',",
        "  格尔木: '海西',",
        "  高密: '潍坊',",
        "  贵溪: '鹰潭',",
        "  昆山: '苏州',",
        "  晋江: '泉州',",
        "  桐乡: '嘉兴',",
        "  海南: '海口',",
        "};",
        "",
    ]
    OUT_DATA.write_text("\n".join(lines), encoding="utf-8")
    print(f"cities={len(cities)} capitals={sum(1 for city in cities if city['isCapital'])} bytes={OUT_GEO.stat().st_size}")


if __name__ == "__main__":
    main()
