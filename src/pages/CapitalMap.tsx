import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import CapitalMapPanel from '../components/capital-map/CapitalMapPanel';
import ChinaCapitalChart, { type ChinaMapMarker, type ChinaMapViewApi } from '../components/capital-map/ChinaCapitalChart';
import CompanyMapPanel, { type MapCity, type MapCompanyEntry } from '../components/capital-map/CompanyMapPanel';
import { CAPITAL_CAMPUS_BY_NAME, CAPITAL_CAMPUS_CITIES, CAPITAL_CAMPUS_TOTAL } from '../data/capitalCampusCompanies';
import { resolveHotCompanyHq } from '../data/hotCompanyHq';
import {
  ALL_GROUP_NAME,
  APPLIED_GROUP_NAME,
  groupsForCatalogSelection,
  uniqueCompaniesInGroups,
  useHotCompanyCatalog,
} from '../hooks/useHotCompanyCatalog';
import { useCampusRecruitmentStatuses } from '../hooks/useCampusRecruitmentStatuses';
import { normalizeCompanyName } from '../lib/companyName';
import { MAP_COLORS } from '../components/capital-map/theme';
import './CapitalMap.css';

type MapMode = 'companies' | 'capitals';

const LEGEND_DOTS: Record<string, string> = {
  [ALL_GROUP_NAME]: '#1b1a17',
  [APPLIED_GROUP_NAME]: '#6f8f72',
};

const CAPITAL_MARKERS: ChinaMapMarker[] = CAPITAL_CAMPUS_CITIES.map((city, index) => ({
  name: city.name,
  province: city.province,
  lng: city.lng,
  lat: city.lat,
  count: city.companies.length,
  color: MAP_COLORS.dots[index % MAP_COLORS.dots.length],
  labelPos: city.labelPos,
}));

export default function CapitalMap() {
  const { setHeaderChrome } = useAppShell();
  const catalog = useHotCompanyCatalog();
  const { items: recruitmentStatuses } = useCampusRecruitmentStatuses();
  const [mode, setMode] = useState<MapMode>('companies');
  const [activeGroup, setActiveGroup] = useState(ALL_GROUP_NAME);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [geoKind, setGeoKind] = useState<'prefecture' | 'province' | null>(null);
  const viewRef = useRef<ChinaMapViewApi | null>(null);

  useEffect(() => {
    setHeaderChrome({ searchPlaceholder: null, showAdd: false });
    return () => setHeaderChrome(null);
  }, [setHeaderChrome]);

  const sourceGroups = useMemo(
    () => groupsForCatalogSelection(catalog.allGroups, catalog.appliedCompanies, activeGroup),
    [activeGroup, catalog.allGroups, catalog.appliedCompanies],
  );

  const mapEntries = useMemo<MapCompanyEntry[]>(
    () => uniqueCompaniesInGroups(sourceGroups).map(({ company, group }) => ({
      company,
      group,
      hq: resolveHotCompanyHq(company),
    })),
    [sourceGroups],
  );

  const mapCities = useMemo<MapCity[]>(() => {
    const cities = new Map<string, MapCity>();
    mapEntries.forEach((entry) => {
      if (!entry.hq) return;
      const current = cities.get(entry.hq.city);
      if (current) {
        current.companies.push(entry);
        return;
      }
      cities.set(entry.hq.city, { hq: entry.hq, dot: entry.group.dot, companies: [entry] });
    });
    return Array.from(cities.values()).sort((a, b) => (
      b.companies.length - a.companies.length
      || a.hq.city.localeCompare(b.hq.city, 'zh-CN')
    ));
  }, [mapEntries]);

  const companyMarkers = useMemo<ChinaMapMarker[]>(
    () => mapCities.map((city) => ({
      name: city.hq.city,
      province: city.hq.province,
      lng: city.hq.lng,
      lat: city.hq.lat,
      count: city.companies.length,
      color: city.dot,
      labelPos: city.hq.labelPos,
    })),
    [mapCities],
  );

  const unmappedEntries = useMemo(
    () => mapEntries.filter((entry) => !entry.hq),
    [mapEntries],
  );

  const selectedCity = useMemo(
    () => mapCities.find((city) => city.hq.city === selectedName) ?? null,
    [mapCities, selectedName],
  );

  const selectedCapital = selectedName ? CAPITAL_CAMPUS_BY_NAME[selectedName] ?? null : null;
  const markers = mode === 'companies' ? companyMarkers : CAPITAL_MARKERS;
  const mappedCount = mode === 'companies'
    ? mapEntries.filter((entry) => entry.hq).length
    : CAPITAL_CAMPUS_TOTAL;

  const statusByName = useMemo(() => {
    const next = new Map<string, (typeof recruitmentStatuses)[number]>();
    recruitmentStatuses.forEach((status) => {
      next.set(normalizeCompanyName(status.company_name), status);
    });
    return next;
  }, [recruitmentStatuses]);

  useEffect(() => {
    if (mode === 'companies' && selectedName && !mapCities.some((city) => city.hq.city === selectedName)) {
      setSelectedName(null);
    }
    if (mode === 'capitals' && selectedName && !CAPITAL_CAMPUS_BY_NAME[selectedName]) {
      setSelectedName(null);
    }
  }, [mapCities, mode, selectedName]);

  const onSelect = useCallback((name: string | null) => {
    setSelectedName(name);
  }, []);

  const onMapFailed = useCallback((failed: boolean) => {
    setMapFailed(failed);
    setMapReady(!failed);
  }, []);

  const switchMode = (next: MapMode) => {
    setMode(next);
    setSelectedName(null);
  };

  return (
    <div className="capital-map-shell">
      <div className="capital-map-page">
        <section className="capital-map-stage">
          {!mapReady && !mapFailed ? <div className="capital-map-loading">正在加载中国地图…</div> : null}
          {mapFailed ? <div className="capital-map-loading">底图未加载，右侧列表仍可使用</div> : null}

          <div className="capital-map-hud">
            <div className="capital-map-switch" role="tablist" aria-label="地图类型">
              {([
                ['companies', '全部企业'],
                ['capitals', '当地龙头'],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={mode === key}
                  className={mode === key ? 'is-active' : undefined}
                  onClick={() => switchMode(key)}
                >
                  {label}
                </button>
              ))}
            </div>
            <span className="capital-map-count">
              {mappedCount} {mode === 'companies' ? '家可落图' : '家当地龙头'}
            </span>
          </div>

          {geoKind === 'province' ? (
            <p className="capital-map-fallback">地级市底图未加载成功，当前仍是省级轮廓。刷新后再试。</p>
          ) : null}

          {mode === 'companies' ? (
            <div className="capital-map-legend" aria-label="公司分类图例">
              {catalog.legendGroupNames.map((name) => {
                const active = activeGroup === name;
                const dot = LEGEND_DOTS[name] ?? catalog.allGroups.find((group) => group.name === name)?.dot ?? '#1b1a17';
                return (
                  <button
                    key={name}
                    type="button"
                    className={active ? 'is-active' : undefined}
                    onClick={() => {
                      setActiveGroup(name);
                      setSelectedName(null);
                    }}
                  >
                    <i className="capital-map-legend__dot" style={active ? { background: dot } : undefined} aria-hidden />
                    {name}
                  </button>
                );
              })}
            </div>
          ) : null}

          <div className="capital-map-zoom" aria-label="地图缩放">
            <button type="button" onClick={() => viewRef.current?.zoomBy(1.25)} aria-label="放大">+</button>
            <button type="button" onClick={() => viewRef.current?.zoomBy(0.8)} aria-label="缩小">−</button>
            <button type="button" onClick={() => viewRef.current?.resetView()} aria-label="回到全国">全</button>
          </div>

          <ChinaCapitalChart
            selectedName={selectedName}
            onSelect={onSelect}
            onMapFailed={onMapFailed}
            onGeoKind={setGeoKind}
            markers={markers}
            viewRef={viewRef}
            ariaLabel={mode === 'companies' ? '全部企业总部地图' : '当地龙头省会地图'}
          />
        </section>

        {mode === 'companies' ? (
          <CompanyMapPanel
            activeGroup={activeGroup}
            cities={mapCities}
            selectedCity={selectedCity}
            unmappedEntries={unmappedEntries}
            mapFailed={mapFailed}
            statusByName={statusByName}
            onSelect={onSelect}
          />
        ) : (
          <CapitalMapPanel selected={selectedCapital} mapFailed={mapFailed} onSelect={onSelect} />
        )}
      </div>
    </div>
  );
}
