import { IconExternalLink } from '../icons';
import {
  CAPITAL_CAMPUS_CITIES,
  CAPITAL_CAMPUS_SOURCE_DATE,
  CAPITAL_CAMPUS_TOTAL,
  type CapitalCampusCity,
} from '../../data/capitalCampusCompanies';

interface CapitalMapPanelProps {
  selected: CapitalCampusCity | null;
  mapFailed: boolean;
  onSelect: (name: string | null) => void;
}

export default function CapitalMapPanel({ selected, mapFailed, onSelect }: CapitalMapPanelProps) {
  return (
    <aside className="capital-map-panel" aria-label="当地龙头企业列表">
      <div className="capital-map-panel__head">
        {selected ? (
          <button type="button" className="capital-map-back" onClick={() => onSelect(null)}>
            ← 全部省会
          </button>
        ) : null}
        <h2>
          {selected ? selected.name : '点击省会查看企业'}
          {selected ? <span className="capital-map-badge">{selected.companies.length} 家</span> : null}
        </h2>
        <p>
          {selected
            ? `${selected.province} · 点击公司名称打开校招页（新标签）。只收录公开页，未编造。`
            : `31 个省会 / 直辖市，共 ${CAPITAL_CAMPUS_TOTAL} 家当地龙头。整理日 ${CAPITAL_CAMPUS_SOURCE_DATE}。`}
        </p>
        {mapFailed ? <p className="capital-map-warn">地图底图加载失败，仍可从下方选择省会。</p> : null}
      </div>
      <div className="capital-map-panel__list">
        {selected ? selected.companies.map((company) => (
          <a
            key={`${selected.name}-${company.name}-${company.url}`}
            className="capital-map-company"
            href={company.url}
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="capital-map-company__name">
              {company.name}
              <IconExternalLink size={13} />
            </div>
            <div className="capital-map-company__url">{company.url}</div>
          </a>
        )) : CAPITAL_CAMPUS_CITIES.map((city) => (
          <button
            key={city.name}
            type="button"
            className="capital-map-chip"
            onClick={() => onSelect(city.name)}
          >
            <b>{city.name}</b>
            <span>{city.companies.length} 家</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
