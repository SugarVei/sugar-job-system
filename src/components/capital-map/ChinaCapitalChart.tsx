import { useEffect, useMemo, useRef, type MutableRefObject } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import {
  CAPITAL_CAMPUS_BY_PROVINCE,
  CAPITAL_CAMPUS_CITIES,
  type CapitalLabelPos,
} from '../../data/capitalCampusCompanies';
import {
  PREFECTURE_BY_NAME,
  PREFECTURE_CITIES,
  UNSELECTABLE_GEO_NAMES,
} from '../../data/prefectureCities';
import { MAP_COLORS, prefersReducedMotion } from './theme';

const LOCAL_PREFECTURE_GEO = '/geo/china-prefecture.json';
const LOCAL_PROVINCE_GEO = '/geo/china-100000-full.json';
const REMOTE_GEO = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';

/** 锁死大陆+海南+台湾的初始视野，不把南海诸岛算进包围盒。 */
const MAP_VIEW = {
  layoutCenter: ['50%', '50%'] as [string, string],
  layoutSize: '96%',
  boundingCoords: [
    [73.2, 17.8],
    [135.2, 53.7],
  ] as [[number, number], [number, number]],
};

const COMPANY_DETAIL_ZOOM = 1.55;
const ALL_CITY_ZOOM = 2.15;
const MAX_ZOOM = 10;
const MIN_ZOOM = 0.85;

const CAPITAL_LABEL_POS = new Map(
  CAPITAL_CAMPUS_CITIES.map((city) => [city.name, city.labelPos]),
);

export interface ChinaMapMarker {
  name: string;
  province: string;
  lng: number;
  lat: number;
  count: number;
  color?: string;
  labelPos?: CapitalLabelPos;
}

export interface ChinaMapViewApi {
  zoomBy: (factor: number) => void;
  resetView: () => void;
}

interface ChinaCapitalChartProps {
  selectedName: string | null;
  onSelect: (name: string | null) => void;
  onMapFailed: (failed: boolean) => void;
  onGeoKind?: (kind: 'prefecture' | 'province') => void;
  markers?: ChinaMapMarker[];
  viewRef?: MutableRefObject<ChinaMapViewApi | null>;
  ariaLabel?: string;
}

interface ViewState {
  zoom: number;
  center?: [number, number];
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function geoKindOf(geo: object): 'prefecture' | 'province' {
  const features = (geo as { features?: unknown[] }).features;
  return (features?.length ?? 0) > 100 ? 'prefecture' : 'province';
}

async function loadChinaGeo(): Promise<object> {
  const errors: string[] = [];
  for (const url of [LOCAL_PREFECTURE_GEO, LOCAL_PROVINCE_GEO, REMOTE_GEO]) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json() as object;
    } catch (error) {
      errors.push(`${url}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  throw new Error(errors.join('；'));
}

function readView(chart: ECharts): ViewState {
  const option = chart.getOption() as { geo?: Array<{ zoom?: number; center?: [number, number] }> };
  const geo = option.geo?.[0];
  return {
    zoom: geo?.zoom ?? 1,
    center: geo?.center,
  };
}

function showCompanyCities(zoom: number): boolean {
  return zoom >= COMPANY_DETAIL_ZOOM;
}

function showAllCities(zoom: number): boolean {
  return zoom >= ALL_CITY_ZOOM;
}

function regionStyle(pulsing: boolean, focused: boolean) {
  return {
    areaColor: focused ? '#e9eff9' : MAP_COLORS.selectedArea,
    borderColor: pulsing ? '#c9a36a' : MAP_COLORS.selectedStroke,
    borderWidth: pulsing ? 2.2 : 1.25,
    shadowBlur: pulsing ? 14 : 0,
    shadowColor: 'rgba(201, 163, 106, 0.4)',
  };
}

function isVisibleCity(name: string, selectedName: string | null, zoom: number, selectable: Set<string>) {
  if (UNSELECTABLE_GEO_NAMES.has(name)) return false;
  if (name === selectedName) return true;
  const city = PREFECTURE_BY_NAME[name];
  if (!city) return selectable.has(name);
  if (city.isCapital) return true;
  if (selectable.has(name) && showCompanyCities(zoom)) return true;
  return showAllCities(zoom);
}

function buildOption(
  markers: ChinaMapMarker[],
  selectedName: string | null,
  zoom: number,
  center: [number, number] | undefined,
  reduceMotion: boolean,
) {
  const markerByName = new Map(markers.map((marker) => [marker.name, marker]));
  const selectable = new Set(markers.map((marker) => marker.name));
  const showSelectableRegions = showCompanyCities(zoom);

  return {
    backgroundColor: 'transparent',
    animation: !reduceMotion,
    animationDuration: reduceMotion ? 0 : 280,
    animationDurationUpdate: reduceMotion ? 0 : 280,
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: MAP_COLORS.panel,
      borderColor: MAP_COLORS.line,
      textStyle: { color: MAP_COLORS.ink, fontSize: 13 },
      formatter: (params: { name?: string }) => {
        const name = params?.name;
        if (!name || !selectable.has(name)) return '';
        const marker = markerByName.get(name);
        const city = PREFECTURE_BY_NAME[name];
        const province = marker?.province || city?.province || '';
        const count = marker?.count ?? 0;
        return `<b>${escapeHtml(name)}</b><br/>${escapeHtml(province)} · ${count} 家`;
      },
    },
    geo: {
      map: 'china',
      roam: true,
      zoom,
      ...(center ? { center } : {}),
      layoutCenter: MAP_VIEW.layoutCenter,
      layoutSize: MAP_VIEW.layoutSize,
      boundingCoords: MAP_VIEW.boundingCoords,
      scaleLimit: { min: MIN_ZOOM, max: MAX_ZOOM },
      itemStyle: {
        areaColor: MAP_COLORS.area,
        borderColor: '#c9bfae',
        borderWidth: 0.9,
      },
      emphasis: {
        itemStyle: { areaColor: MAP_COLORS.areaHover },
        label: { show: false },
      },
      select: { disabled: true },
      label: { show: false },
      regions: PREFECTURE_CITIES.map((city) => {
        const canSelect = selectable.has(city.name);
        const selected = city.name === selectedName;
        const highlight = selected || (canSelect && (city.isCapital || showSelectableRegions));
        return {
          name: city.name,
          silent: !canSelect,
          itemStyle: selected
            ? regionStyle(false, true)
            : highlight
              ? { areaColor: '#f6ead6', borderColor: '#d4b48a', borderWidth: 1 }
              : { areaColor: MAP_COLORS.area, borderColor: '#c9bfae', borderWidth: 0.9 },
          emphasis: {
            itemStyle: { areaColor: selected ? '#e9eff9' : canSelect ? MAP_COLORS.areaHover : MAP_COLORS.area },
          },
        };
      }),
    },
    series: [{
      type: 'scatter' as const,
      coordinateSystem: 'geo',
      data: PREFECTURE_CITIES
        .filter((city) => isVisibleCity(city.name, selectedName, zoom, selectable))
        .map((city, index) => {
          const marker = markerByName.get(city.name);
          const selected = city.name === selectedName;
          const canSelect = selectable.has(city.name);
          return {
            name: city.name,
            value: [city.lng, city.lat, marker?.count ?? 0],
            silent: !canSelect,
            label: {
              show: true,
              position: marker?.labelPos ?? CAPITAL_LABEL_POS.get(city.name) ?? city.labelPos,
              formatter: '{b}',
              fontWeight: city.isCapital || selected ? 'bold' : 600,
              fontSize: city.isCapital || selected ? 12 : 10,
              color: canSelect ? MAP_COLORS.label : '#8a8478',
              textBorderColor: MAP_COLORS.labelHalo,
              textBorderWidth: 3,
            },
            itemStyle: selected
              ? { color: marker?.color ?? MAP_COLORS.selectedDot, borderColor: '#fffdf8', borderWidth: 2, shadowBlur: 10, shadowColor: 'rgba(103, 89, 66, .28)' }
              : {
                color: canSelect
                  ? marker?.color ?? MAP_COLORS.dots[index % MAP_COLORS.dots.length]
                  : '#c8c0b3',
                borderColor: '#fffdf8',
                borderWidth: 1,
              },
            symbolSize: selected
              ? 17
              : canSelect
                ? Math.min(18, 8 + Math.sqrt(marker?.count || 1) * 2.6)
                : 5,
          };
        }),
      emphasis: {
        scale: 1.12,
        label: { show: true },
      },
    }],
  };
}

export default function ChinaCapitalChart({
  selectedName,
  onSelect,
  onMapFailed,
  onGeoKind,
  markers,
  viewRef,
  ariaLabel = '中国地图校招',
}: ChinaCapitalChartProps) {
  const resolvedMarkers = useMemo(
    () => markers ?? CAPITAL_CAMPUS_CITIES.map((city, index) => ({
      name: city.name,
      province: city.province,
      lng: city.lng,
      lat: city.lat,
      count: city.companies.length,
      color: MAP_COLORS.dots[index % MAP_COLORS.dots.length],
      labelPos: city.labelPos,
    })),
    [markers],
  );
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const selectedRef = useRef(selectedName);
  const onSelectRef = useRef(onSelect);
  const onMapFailedRef = useRef(onMapFailed);
  const onGeoKindRef = useRef(onGeoKind);
  const markersRef = useRef(resolvedMarkers);
  const readyRef = useRef(false);
  const roamingRef = useRef(false);
  const viewRefInternal = useRef<ViewState>({ zoom: 1 });

  useEffect(() => {
    selectedRef.current = selectedName;
    onSelectRef.current = onSelect;
    onMapFailedRef.current = onMapFailed;
    onGeoKindRef.current = onGeoKind;
    markersRef.current = resolvedMarkers;
  }, [markers, onGeoKind, onMapFailed, onSelect, resolvedMarkers, selectedName]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const chart = echarts.init(host, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    let cancelled = false;

    const selectableNames = () => new Set(markersRef.current.map((marker) => marker.name));

    const toggleCity = (name: string) => {
      if (!selectableNames().has(name)) return;
      onSelectRef.current(selectedRef.current === name ? null : name);
    };

    const resolveClickedName = (name: string): string | null => {
      if (PREFECTURE_BY_NAME[name]) return name;
      const capital = CAPITAL_CAMPUS_BY_PROVINCE[name];
      return capital?.name ?? null;
    };

    chart.on('georoam', () => {
      roamingRef.current = true;
      window.setTimeout(() => {
        roamingRef.current = false;
      }, 120);
      if (!readyRef.current) return;
      const view = readView(chart);
      const prev = viewRefInternal.current;
      const crossed = showCompanyCities(prev.zoom) !== showCompanyCities(view.zoom)
        || showAllCities(prev.zoom) !== showAllCities(view.zoom);
      viewRefInternal.current = view;
      if (!crossed) return;
      chart.setOption(buildOption(markersRef.current, selectedRef.current, view.zoom, view.center, prefersReducedMotion()));
    });

    chart.on('click', (params: { seriesType?: string; componentType?: string; name?: string }) => {
      if (roamingRef.current) return;
      const rawName = params.name;
      if (!rawName) return;
      const name = resolveClickedName(rawName);
      if (!name || UNSELECTABLE_GEO_NAMES.has(name)) return;
      if (params.seriesType === 'scatter' || params.componentType === 'geo') {
        toggleCity(name);
      }
    });

    chart.getZr().on('click', (event: { target?: unknown }) => {
      if (roamingRef.current) return;
      if (event.target) return;
      onSelectRef.current(null);
    });

    const resize = () => chart.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    window.addEventListener('resize', resize);

    loadChinaGeo()
      .then((geo) => {
        if (cancelled) return;
        echarts.registerMap('china', geo as Parameters<typeof echarts.registerMap>[1]);
        readyRef.current = true;
        onGeoKindRef.current?.(geoKindOf(geo));
        onMapFailedRef.current(false);
        const view = viewRefInternal.current;
        chart.setOption(buildOption(markersRef.current, selectedRef.current, view.zoom, view.center, prefersReducedMotion()), true);
      })
      .catch(() => {
        if (cancelled) return;
        readyRef.current = false;
        onMapFailedRef.current(true);
      });

    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener('resize', resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!viewRef) return undefined;
    viewRef.current = {
      zoomBy: (factor: number) => {
        const chart = chartRef.current;
        if (!chart || !readyRef.current) return;
        const view = readView(chart);
        const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, view.zoom * factor));
        viewRefInternal.current = { zoom, center: view.center };
        chart.setOption(buildOption(markersRef.current, selectedRef.current, zoom, view.center, prefersReducedMotion()));
      },
      resetView: () => {
        const chart = chartRef.current;
        if (!chart || !readyRef.current) return;
        viewRefInternal.current = { zoom: 1 };
        chart.setOption(buildOption(markersRef.current, selectedRef.current, 1, undefined, prefersReducedMotion()), true);
      },
    };
    return () => {
      viewRef.current = null;
    };
  }, [viewRef]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !readyRef.current) return;
    const view = readView(chart);
    const selectedCity = selectedName ? PREFECTURE_BY_NAME[selectedName] : null;
    let nextZoom = view.zoom;
    let nextCenter = view.center;
    if (selectedCity && !selectedCity.isCapital && view.zoom < COMPANY_DETAIL_ZOOM) {
      nextZoom = COMPANY_DETAIL_ZOOM + 0.35;
      nextCenter = [selectedCity.lng, selectedCity.lat];
    }
    viewRefInternal.current = { zoom: nextZoom, center: nextCenter };
    chart.setOption(buildOption(resolvedMarkers, selectedName, nextZoom, nextCenter, prefersReducedMotion()));
  }, [resolvedMarkers, selectedName]);

  return <div ref={hostRef} className="capital-map-chart" role="img" aria-label={ariaLabel} />;
}
