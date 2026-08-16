import { useCallback, useEffect, useState } from 'react';
import { useAppShell } from '../contexts/AppShellContext';
import CapitalMapPanel from '../components/capital-map/CapitalMapPanel';
import ChinaCapitalChart from '../components/capital-map/ChinaCapitalChart';
import { CAPITAL_CAMPUS_BY_NAME } from '../data/capitalCampusCompanies';
import './CapitalMap.css';

export default function CapitalMap() {
  const { setHeaderChrome } = useAppShell();
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    setHeaderChrome({ searchPlaceholder: null, showAdd: false });
    return () => setHeaderChrome(null);
  }, [setHeaderChrome]);

  const onSelect = useCallback((name: string | null) => {
    setSelectedName(name);
  }, []);

  const onMapFailed = useCallback((failed: boolean) => {
    setMapFailed(failed);
    setMapReady(!failed);
  }, []);

  const selected = selectedName ? CAPITAL_CAMPUS_BY_NAME[selectedName] ?? null : null;

  return (
    <div className="capital-map-page">
      <section className="capital-map-stage">
        {!mapReady && !mapFailed ? <div className="capital-map-loading">正在加载中国地图…</div> : null}
        {mapFailed ? <div className="capital-map-loading">底图未加载，右侧列表仍可使用</div> : null}
        <ChinaCapitalChart selectedName={selectedName} onSelect={onSelect} onMapFailed={onMapFailed} />
      </section>
      <CapitalMapPanel selected={selected} mapFailed={mapFailed} onSelect={onSelect} />
    </div>
  );
}
