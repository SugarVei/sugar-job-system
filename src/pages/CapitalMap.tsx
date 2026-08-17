import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import CapitalMapPanel from '../components/capital-map/CapitalMapPanel';
import ChinaCapitalChart, { type ChinaMapMarker, type ChinaMapViewApi } from '../components/capital-map/ChinaCapitalChart';
import CompanyMapPanel, { type MapCity, type MapCompanyEntry } from '../components/capital-map/CompanyMapPanel';
import { CAPITAL_CAMPUS_BY_NAME, CAPITAL_CAMPUS_CITIES } from '../data/capitalCampusCompanies';
import { resolveHotCompanyHq } from '../data/hotCompanyHq';
import {
  ALL_GROUP_NAME,
  groupsForCatalogSelection,
  uniqueCompaniesInGroups,
  useHotCompanyCatalog,
} from '../hooks/useHotCompanyCatalog';
import { MAP_COLORS } from '../components/capital-map/theme';
import './CapitalMap.css';

type MapMode = 'companies' | 'capitals';

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
  const [mode, setMode] = useState<MapMode>('companies');
  const [activeGroup, setActiveGroup] = useState(ALL_GROUP_NAME);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
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
    return Array.from(cities.values()).sort((a, b) => a.hq.city.localeCompare(b.hq.city, 'zh-CN'));
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
    <div className="capital-map-page">
      <section className="capital-map-stage">
        {!mapReady && !mapFailed ? <div className="capital-map-loading">正在加载中国地图…</div> : null}
        {mapFailed ? <div className="capital-map-loading">底图未加载，右侧列表仍可使用</div> : null}

        <div className="capital-map-overlay capital-map-overlay--top">
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
          <div className="capital-map-zoom" aria-label="地图缩放">
            <button type="button" onClick={() => viewRef.current?.zoomBy(1.25)} aria-label="放大">+</button>
            <button type="button" onClick={() => viewRef.current?.zoomBy(0.8)} aria-label="缩小">−</button>
            <button type="button" onClick={() => viewRef.current?.resetView()} aria-label="回到全国">全</button>
          </div>
        </div>

        {mode === 'companies' ? (
          <div className="capital-map-legend" aria-label="公司分类图例">
            {catalog.legendGroupNames.map((name) => {
              const active = activeGroup === name;
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
                  {name}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="capital-map-hint">缩小只看省会，放大后标出其他地级市。仅省会可点开当地龙头企业。</p>
        )}

        <ChinaCapitalChart
          selectedName={selectedName}
          onSelect={onSelect}
          onMapFailed={onMapFailed}
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
          onSelect={onSelect}
        />
      ) : (
        <CapitalMapPanel selected={selectedCapital} mapFailed={mapFailed} onSelect={onSelect} />
      )}
    </div>
  );
}
