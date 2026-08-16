import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as echarts from 'echarts';
import { useAppShell } from '../contexts/AppShellContext';
import { useTheme } from '../contexts/ThemeContext';
import { CAPITAL_CAMPUS_CITIES, CAPITAL_CAMPUS_TOTAL, type CapitalCampusCity } from '../data/capitalCampusCompanies';
import { IconExternalLink, IconMapPin } from '../components/icons';
import './CapitalMap.css';

const MAP_URL = 'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json';
const POINT_COLORS = ['#b8d5eb', '#bfe2d1', '#f1c8b8', '#dfcfab'];

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function CapitalMap() {
  const { setHeaderChrome } = useAppShell();
  const { theme } = useTheme();
  const chartElement = useRef<HTMLDivElement>(null);
  const chartRef = useRef<echarts.ECharts | null>(null);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [pulse, setPulse] = useState(false);
  const pulseTimer = useRef<number | null>(null);
  const selected = useMemo(() => CAPITAL_CAMPUS_CITIES.find((city) => city.name === selectedName) ?? null, [selectedName]);

  useEffect(() => {
    setHeaderChrome({ searchPlaceholder: null, showAdd: false });
    return () => setHeaderChrome(null);
  }, [setHeaderChrome]);

  const chooseCity = useCallback((city: CapitalCampusCity | null) => {
    setSelectedName((current) => current === city?.name ? null : city?.name ?? null);
  }, []);

  useEffect(() => {
    if (!chartElement.current) return;
    const chart = echarts.init(chartElement.current);
    chartRef.current = chart;
    const onChartClick = (params: { name?: string; componentType?: string }) => {
      const city = CAPITAL_CAMPUS_CITIES.find((entry) => entry.name === params.name || entry.province === params.name);
      chooseCity(city ?? null);
    };
    chart.on('click', onChartClick);
    const onBlankClick = (event: { target?: unknown }) => {
      if (!event.target) chooseCity(null);
    };
    chart.getZr().on('click', onBlankClick);
    const resizeObserver = new ResizeObserver(() => chart.resize());
    resizeObserver.observe(chartElement.current);

    fetch(MAP_URL)
      .then((response) => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then((geoJson) => {
        echarts.registerMap('china-capital-campus', geoJson);
        setMapReady(true);
      })
      .catch(() => setMapError(true));

    return () => {
      chart.off('click', onChartClick);
      chart.getZr().off('click', onBlankClick);
      resizeObserver.disconnect();
      chart.dispose();
      chartRef.current = null;
    };
  }, [chooseCity]);

  useEffect(() => {
    if (!selected || prefersReducedMotion()) return;
    setPulse(true);
    if (pulseTimer.current) window.clearTimeout(pulseTimer.current);
    pulseTimer.current = window.setTimeout(() => setPulse(false), 760);
    return () => { if (pulseTimer.current) window.clearTimeout(pulseTimer.current); };
  }, [selectedName, selected]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart || !mapReady) return;
    const reducedMotion = prefersReducedMotion();
    const selectedProvince = selected?.province;
    chart.setOption({
      animation: !reducedMotion,
      animationDurationUpdate: reducedMotion ? 0 : 420,
      animationEasingUpdate: 'cubicOut',
      tooltip: {
        trigger: 'item',
        backgroundColor: '#fffdf8',
        borderColor: '#e0d8c9',
        borderWidth: 1,
        textStyle: { color: '#4a463e', fontSize: 12 },
        formatter: (params: { name?: string }) => {
          const city = CAPITAL_CAMPUS_CITIES.find((entry) => entry.name === params.name);
          return city ? `<b>${city.name}</b><br/>代表性企业 ${city.companies.length} 家` : '';
        },
      },
      geo: {
        map: 'china-capital-campus',
        roam: true,
        zoom: selected ? 1.45 : 1.1,
        center: selected ? [selected.lng, selected.lat] : undefined,
        top: 10,
        bottom: 8,
        itemStyle: { areaColor: '#f3eee4', borderColor: '#e0d8c9', borderWidth: 1 },
        emphasis: { itemStyle: { areaColor: '#ebe3d5' }, label: { show: false } },
        select: { disabled: true },
        label: { show: false },
        regions: selectedProvince ? [{
          name: selectedProvince,
          itemStyle: {
            areaColor: theme.accentSoft || '#f3d7b0',
            borderColor: '#b99354',
            borderWidth: pulse ? 2.5 : 1.5,
            shadowBlur: pulse ? 18 : 0,
            shadowColor: 'rgba(185,147,84,.36)',
          },
        }] : [],
      },
      series: [{
        type: 'scatter',
        coordinateSystem: 'geo',
        symbol: 'circle',
        symbolSize: (value: number[]) => 10 + Math.sqrt(value[2]) + (value[3] ? 4 : 0),
        data: CAPITAL_CAMPUS_CITIES.map((city, index) => ({
          name: city.name,
          value: [city.lng, city.lat, city.companies.length, city.name === selected?.name ? 1 : 0],
          itemStyle: {
            color: city.name === selected?.name ? '#f4c84a' : POINT_COLORS[index % POINT_COLORS.length],
            borderColor: '#fffdf8',
            borderWidth: 2,
            shadowBlur: city.name === selected?.name ? 10 : 3,
            shadowColor: 'rgba(91,78,55,.22)',
          },
          label: { position: city.name === '北京' ? 'left' : city.name === '天津' ? 'right' : 'top' },
        })),
        label: {
          show: true,
          formatter: '{b}',
          fontWeight: 700,
          fontSize: 12,
          color: '#4a463e',
          textBorderColor: '#fffdf8',
          textBorderWidth: 3,
        },
        emphasis: { scale: true, label: { show: true, fontWeight: 700, fontSize: 13 } },
        zlevel: 2,
      }],
    }, true);
  }, [mapReady, pulse, selected, theme.accentSoft]);

  return (
    <div className="capital-campus-page">
      <section className="capital-map-card" aria-label="中国省会校招地图">
        <div className="capital-map-toolbar">
          <span><IconMapPin size={15} /> 31 个省会 · {CAPITAL_CAMPUS_TOTAL} 家企业</span>
          {selected && <button type="button" onClick={() => chooseCity(null)}>返回全部省会</button>}
        </div>
        <div ref={chartElement} className="capital-map-canvas" role="img" aria-label="可点击的中国省会校招地图" />
        {mapError && <p className="capital-map-failure">地图底图暂未加载，可直接从右侧选择省会。</p>}
      </section>

      <aside className="capital-campus-panel">
        <div className="capital-panel-head">
          <div>
            <h2>{selected ? `${selected.name} · 校招入口` : '选择省会'}</h2>
            <p>{selected ? `${selected.province} · ${selected.companies.length} 家附件收录企业` : '点地图圆点、行政区或下方省会，查看当地代表性企业。'}</p>
          </div>
          {selected && <span className="capital-count">{selected.companies.length} 家</span>}
        </div>
        <div className="capital-panel-list scrolly">
          {selected ? selected.companies.map((company) => (
            <a className="capital-company" key={`${selected.name}-${company.name}`} href={company.url} target="_blank" rel="noopener noreferrer">
              <strong>{company.name}</strong>
              <span>{company.url}</span>
              <IconExternalLink size={13} />
            </a>
          )) : CAPITAL_CAMPUS_CITIES.map((city) => (
            <button className="capital-city-chip btn-press" key={city.name} type="button" onClick={() => chooseCity(city)}>
              <strong>{city.name}</strong><span>{city.companies.length} 家</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
