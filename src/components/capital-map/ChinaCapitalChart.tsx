import { useEffect, useRef } from 'react';
import * as echarts from 'echarts';
import type { ECharts } from 'echarts';
import {
  CAPITAL_CAMPUS_BY_NAME,
  CAPITAL_CAMPUS_BY_PROVINCE,
  CAPITAL_CAMPUS_CITIES,
  UNSELECTABLE_GEO_NAMES,
} from '../../data/capitalCampusCompanies';
import { MAP_COLORS, prefersReducedMotion } from './theme';

const LOCAL_GEO = '/geo/china-100000-full.json';
const REMOTE_GEO = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
const DEFAULT_CENTER: [number, number] = [104.2, 35.6];
const DEFAULT_ZOOM = 1.18;

interface ChinaCapitalChartProps {
  selectedName: string | null;
  onSelect: (name: string | null) => void;
  onMapFailed: (failed: boolean) => void;
}

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

function viewFor(name: string | null, reduceMotion: boolean): { center: [number, number]; zoom: number } {
  if (!name || reduceMotion) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  const city = CAPITAL_CAMPUS_BY_NAME[name];
  if (!city) return { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM };
  const large = new Set(['新疆维吾尔自治区', '西藏自治区', '内蒙古自治区', '青海省', '黑龙江省']);
  const small = new Set(['北京市', '天津市', '上海市', '重庆市', '海南省', '宁夏回族自治区']);
  const zoom = large.has(city.province) ? 1.42 : small.has(city.province) ? 2.25 : 1.78;
  return { center: [city.lng, city.lat], zoom };
}

function regionStyle(pulsing: boolean) {
  return {
    areaColor: MAP_COLORS.selectedArea,
    borderColor: pulsing ? '#c9a36a' : MAP_COLORS.selectedStroke,
    borderWidth: pulsing ? 2.4 : 1.35,
    shadowBlur: pulsing ? 16 : 0,
    shadowColor: 'rgba(201, 163, 106, 0.45)',
  };
}

function buildOption(selectedName: string | null, pulsing: boolean, reduceMotion: boolean) {
  const view = viewFor(selectedName, reduceMotion);
  const selected = selectedName ? CAPITAL_CAMPUS_BY_NAME[selectedName] : null;
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
        const city = params?.name ? CAPITAL_CAMPUS_BY_NAME[params.name] : undefined;
        if (!city) return '';
        return `<b>${escapeHtml(city.name)}</b><br/>${escapeHtml(city.province)} · ${city.companies.length} 家`;
      },
    },
    geo: {
      map: 'china',
      roam: true,
      zoom: view.zoom,
      center: view.center,
      top: 18,
      bottom: 12,
      scaleLimit: { min: 0.9, max: 6 },
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
      regions: [
        ...[...UNSELECTABLE_GEO_NAMES].map((name) => ({
          name,
          silent: true,
          itemStyle: { areaColor: MAP_COLORS.area, borderColor: MAP_COLORS.line, borderWidth: 1 },
          emphasis: { itemStyle: { areaColor: MAP_COLORS.area } },
        })),
        ...(selected ? [{
          name: selected.province,
          itemStyle: regionStyle(pulsing && !reduceMotion),
          emphasis: { itemStyle: { areaColor: MAP_COLORS.selectedArea } },
        }] : []),
      ],
    },
    series: [{
      type: 'scatter' as const,
      coordinateSystem: 'geo',
      data: CAPITAL_CAMPUS_CITIES.map((city, index) => ({
        name: city.name,
        value: [city.lng, city.lat, city.companies.length],
        label: { position: city.labelPos },
        itemStyle: city.name === selectedName
          ? { color: MAP_COLORS.selectedDot, shadowBlur: 10, shadowColor: 'rgba(244,200,74,0.45)' }
          : { color: MAP_COLORS.dots[index % MAP_COLORS.dots.length] },
      })),
      symbolSize: (_value: number[], params: { name: string }) => (
        params.name === selectedName ? 16 : 11
      ),
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

export default function ChinaCapitalChart({ selectedName, onSelect, onMapFailed }: ChinaCapitalChartProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<ECharts | null>(null);
  const selectedRef = useRef(selectedName);
  const onSelectRef = useRef(onSelect);
  const readyRef = useRef(false);
  const pulseTimerRef = useRef<number | null>(null);

  selectedRef.current = selectedName;
  onSelectRef.current = onSelect;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const chart = echarts.init(host, undefined, { renderer: 'canvas' });
    chartRef.current = chart;
    let cancelled = false;

    const toggleCity = (name: string) => {
      onSelectRef.current(selectedRef.current === name ? null : name);
    };

    chart.on('click', (params: { seriesType?: string; componentType?: string; name?: string }) => {
      if (params.seriesType === 'scatter' && params.name && CAPITAL_CAMPUS_BY_NAME[params.name]) {
        toggleCity(params.name);
        return;
      }
      if (params.componentType === 'geo' && params.name) {
        if (UNSELECTABLE_GEO_NAMES.has(params.name)) return;
        const city = CAPITAL_CAMPUS_BY_PROVINCE[params.name];
        if (city) toggleCity(city.name);
      }
    });

    chart.getZr().on('click', (event: { target?: unknown }) => {
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
        onMapFailed(false);
        chart.setOption(buildOption(selectedRef.current, false, prefersReducedMotion()), true);
      })
      .catch(() => {
        if (cancelled) return;
        readyRef.current = false;
        onMapFailed(true);
      });

    return () => {
      cancelled = true;
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
      observer.disconnect();
      window.removeEventListener('resize', resize);
      chart.dispose();
      chartRef.current = null;
    };
  }, [onMapFailed]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !readyRef.current) return;
    const reduceMotion = prefersReducedMotion();
    const shouldPulse = Boolean(selectedName) && !reduceMotion;
    chart.setOption(buildOption(selectedName, shouldPulse, reduceMotion), { notMerge: false, lazyUpdate: false });
    if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    if (!shouldPulse) return undefined;
    pulseTimerRef.current = window.setTimeout(() => {
      if (!chartRef.current || !readyRef.current) return;
      chartRef.current.setOption(buildOption(selectedRef.current, false, prefersReducedMotion()));
    }, 780);
    return () => {
      if (pulseTimerRef.current) window.clearTimeout(pulseTimerRef.current);
    };
  }, [selectedName]);

  return <div ref={hostRef} className="capital-map-chart" role="img" aria-label="中国省会校招地图" />;
}
