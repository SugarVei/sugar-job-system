import { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import {
  CAPITAL_CAMPUS_BY_PROVINCE,
  CAPITAL_CAMPUS_CITIES,
  UNSELECTABLE_GEO_NAMES,
  type CapitalLabelPos,
} from '../../data/capitalCampusCompanies';
import { MAP_COLORS, prefersReducedMotion } from './theme';

const LOCAL_GEO = '/geo/china-100000-full.json';
const REMOTE_GEO = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
const COMPACT_QUERY = '(max-width: 1023px)';

/** 锁死大陆+海南+台湾的初始视野，不把南海诸岛算进包围盒。 */
const MAP_VIEW = {
  layoutCenter: ['50%', '50%'] as [string, string],
  layoutSize: '96%',
  boundingCoords: [
    [73.2, 17.8],
    [135.2, 53.7],
  ] as [[number, number], [number, number]],
};

function isCompactViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches;
}

function viewOption(allowRoam: boolean) {
  return {
    roam: allowRoam,
    layoutCenter: MAP_VIEW.layoutCenter,
    layoutSize: MAP_VIEW.layoutSize,
    boundingCoords: MAP_VIEW.boundingCoords,
    scaleLimit: allowRoam ? { min: 0.85, max: 8 } : { min: 1, max: 1 },
  };
}

export interface ChinaMapMarker {
  name: string;
  province: string;
  lng: number;
  lat: number;
  count: number;
  color?: string;
  labelPos?: CapitalLabelPos;
}

interface ChinaCapitalChartProps {
  selectedName: string | null;
  onSelect: (name: string | null) => void;
  onMapFailed: (failed: boolean) => void;
  markers?: ChinaMapMarker[];
  highlightAllProvinces?: boolean;
  allowProvinceSelect?: boolean;
  ariaLabel?: string;
}

const DEFAULT_MARKERS: ChinaMapMarker[] = CAPITAL_CAMPUS_CITIES.map((city, index) => ({
  name: city.name,
  province: city.province,
  lng: city.lng,
  lat: city.lat,
  count: city.companies.length,
  color: MAP_COLORS.dots[index % MAP_COLORS.dots.length],
  labelPos: city.labelPos,
}));

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function loadChinaGeo(): Promise<object> {
  const errors: string[] = [];
  for (const url of [LOCAL_GEO, REMOTE_GEO]) {
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

function regionStyle(pulsing: boolean, focused: boolean) {
  return {
    areaColor: focused ? '#e9eff9' : MAP_COLORS.selectedArea,
    borderColor: pulsing ? '#c9a36a' : MAP_COLORS.selectedStroke,
    borderWidth: pulsing ? 2.4 : 1.35,
    shadowBlur: pulsing ? 16 : 0,
    shadowColor: 'rgba(201, 163, 106, 0.45)',
  };
}

function highlightOption(
  markers: ChinaMapMarker[],
  selectedName: string | null,
  pulsing: boolean,
  reduceMotion: boolean,
  highlightAllProvinces: boolean,
) {
  const markerByName = new Map(markers.map((marker) => [marker.name, marker]));
  const selected = selectedName ? markerByName.get(selectedName) : null;
  const highlightedProvinces = new Set(
    highlightAllProvinces
      ? markers.map((marker) => marker.province)
      : selected ? [selected.province] : [],
  );
  return {
    geo: {
      regions: [
        ...[...UNSELECTABLE_GEO_NAMES].map((name) => ({
          name,
          silent: true,
          itemStyle: { areaColor: MAP_COLORS.area, borderColor: MAP_COLORS.line, borderWidth: 1 },
          emphasis: { itemStyle: { areaColor: MAP_COLORS.area } },
        })),
        ...[...highlightedProvinces].map((province) => ({
          name: province,
          itemStyle: regionStyle(pulsing && !reduceMotion, selected?.province === province),
          emphasis: { itemStyle: { areaColor: selected?.province === province ? '#e9eff9' : MAP_COLORS.selectedArea } },
        })),
      ],
    },
    series: [{
      data: markers.map((marker, index) => ({
        name: marker.name,
        value: [marker.lng, marker.lat, marker.count],
        label: { position: marker.labelPos },
        itemStyle: marker.name === selectedName
          ? { color: marker.color ?? MAP_COLORS.selectedDot, borderColor: '#fffdf8', borderWidth: 2, shadowBlur: 11, shadowColor: 'rgba(103, 89, 66, .28)' }
          : { color: marker.color ?? MAP_COLORS.dots[index % MAP_COLORS.dots.length] },
      })),
      symbolSize: (value: number[], params: { name: string }) => (
        params.name === selectedName ? 18 : Math.min(20, 8 + Math.sqrt(value[2] || 1) * 3)
      ),
    }],
  };
}

function buildOption(
  markers: ChinaMapMarker[],
  selectedName: string | null,
  pulsing: boolean,
  reduceMotion: boolean,
  allowRoam: boolean,
  highlightAllProvinces: boolean,
) {
  const highlights = highlightOption(markers, selectedName, pulsing, reduceMotion, highlightAllProvinces);
  const markerByName = new Map(markers.map((marker) => [marker.name, marker]));
  return {
    backgroundColor: 'transparent',
    animation: !reduceMotion,
    animationDuration: reduceMotion ? 0 : 420,
    animationDurationUpdate: reduceMotion ? 0 : 420,
    animationEasingUpdate: 'cubicOut' as const,
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: MAP_COLORS.panel,
      borderColor: MAP_COLORS.line,
      textStyle: { color: MAP_COLORS.ink, fontSize: 13 },
      formatter: (params: { name?: string }) => {
        const city = params?.name ? markerByName.get(params.name) : undefined;
        if (!city) return '';
        return `<b>${escapeHtml(city.name)}</b><br/>${escapeHtml(city.province)} · ${city.count} 家`;
      },
    },
    geo: {
      map: 'china',
      itemStyle: {
        areaColor: MAP_COLORS.area,
        borderColor: MAP_COLORS.line,
        borderWidth: 1,
      },
      emphasis: {
        itemStyle: { areaColor: MAP_COLORS.areaHover },
        label: { show: false },
      },
      select: { disabled: true },
      label: { show: false },
      ...viewOption(allowRoam),
      ...highlights.geo,
    },
    series: [{
      type: 'scatter' as const,
      coordinateSystem: 'geo',
      ...highlights.series[0],
      label: {
        show: true,
        formatter: '{b}',
        fontWeight: 'bold' as const,
        fontSize: 12,
        color: MAP_COLORS.label,
        textBorderColor: MAP_COLORS.labelHalo,
        textBorderWidth: 3,
      },
      emphasis: {
        scale: 1.15,
        label: {
          show: true,
          fontWeight: 'bold' as const,
          fontSize: 13,
          color: MAP_COLORS.label,
          textBorderColor: MAP_COLORS.labelHalo,
          textBorderWidth: 3,
        },
      },
    }],
  };
}

export default function ChinaCapitalChart({
  selectedName,
  onSelect,
  onMapFailed,
  markers = DEFAULT_MARKERS,
  highlightAllProvinces = false,
  allowProvinceSelect = true,
  ariaLabel = '中国省会校招地图',
}: ChinaCapitalChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const selectedRef = useRef(selectedName);
  const onSelectRef = useRef(onSelect);
  const onMapFailedRef = useRef(onMapFailed);
  const markersRef = useRef(markers);
  const markerSignatureRef = useRef(markers.map((marker) => `${marker.name}-${marker.count}-${marker.color ?? ''}`).join('|'));
  const readyRef = useRef(false);
  const pulseTimerRef = useRef<number | null>(null);
  const roamingRef = useRef(false);
  const [allowRoam, setAllowRoam] = useState(isCompactViewport);

  useEffect(() => {
    selectedRef.current = selectedName;
    onSelectRef.current = onSelect;
    onMapFailedRef.current = onMapFailed;
    markersRef.current = markers;
  }, [markers, onMapFailed, onSelect, selectedName]);

  useEffect(() => {
    const media = window.matchMedia(COMPACT_QUERY);
    const sync = () => setAllowRoam(media.matches);
    sync();
    media.addEventListener('change', sync);
    return () => media.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const chart = echarts.init(host, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    let cancelled = false;

    const toggleCity = (name: string) => {
      onSelectRef.current(selectedRef.current === name ? null : name);
    };

    chart.on('georoam', () => {
      roamingRef.current = true;
      window.setTimeout(() => {
        roamingRef.current = false;
      }, 120);
    });

    chart.on('click', (params: { seriesType?: string; componentType?: string; name?: string }) => {
      if (roamingRef.current) return;
      if (params.seriesType === 'scatter' && params.name && markersRef.current.some((marker) => marker.name === params.name)) {
        toggleCity(params.name);
        return;
      }
      if (params.componentType === 'geo' && params.name) {
        if (UNSELECTABLE_GEO_NAMES.has(params.name)) return;
        if (!allowProvinceSelect) {
          onSelectRef.current(null);
          return;
        }
        const city = CAPITAL_CAMPUS_BY_PROVINCE[params.name];
        if (city) toggleCity(city.name);
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
        onMapFailedRef.current(false);
        chart.setOption(buildOption(markersRef.current, selectedRef.current, false, prefersReducedMotion(), isCompactViewport(), highlightAllProvinces), true);
      })
      .catch(() => {
        if (cancelled) return;
        readyRef.current = false;
        onMapFailedRef.current(true);
      });

    return () => {
      cancelled = true;
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [allowProvinceSelect, highlightAllProvinces]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !readyRef.current) return;
    chart.setOption({ geo: viewOption(allowRoam) });
  }, [allowRoam]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !readyRef.current) return;
    const reduceMotion = prefersReducedMotion();
    const markerSignature = markers.map((marker) => `${marker.name}-${marker.count}-${marker.color ?? ''}`).join('|');
    const markersChanged = markerSignatureRef.current !== markerSignature;
    markerSignatureRef.current = markerSignature;
    const shouldPulse = !reduceMotion && (Boolean(selectedName) || markersChanged);
    chart.setOption(buildOption(markers, selectedName, shouldPulse, reduceMotion, allowRoam, highlightAllProvinces), true);
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    if (!shouldPulse) return undefined;
    pulseTimerRef.current = window.setTimeout(() => {
      if (!chartRef.current || !readyRef.current) return;
      chartRef.current.setOption(buildOption(markersRef.current, selectedRef.current, false, prefersReducedMotion(), isCompactViewport(), highlightAllProvinces), true);
    }, 780);
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [allowRoam, highlightAllProvinces, markers, selectedName]);

  return <div ref={hostRef} className="capital-map-chart" role="img" aria-label={ariaLabel} />;
}
