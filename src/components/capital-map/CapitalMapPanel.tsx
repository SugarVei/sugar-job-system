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
            ← 返回省会列表
          </button>
        ) : null}
        <h2>
          {selected ? selected.name : '选择一座省会'}
          {selected ? <span className="capital-map-badge">{selected.companies.length} 家</span> : null}
        </h2>
        <p>
          {selected
            ? `${selected.province} · 点击公司打开校招页。只收录公开页，未编造。`
            : `31 个省会 / 直辖市，共 ${CAPITAL_CAMPUS_TOTAL} 家当地龙头。整理日 ${CAPITAL_CAMPUS_SOURCE_DATE}。`}
        </p>
        {mapFailed ? <p className="capital-map-warn">地图底图加载失败，仍可从下方选择省会。</p> : null}
      </div>
      {/* key 随选中省会变化，让这块信息区重播一次入场；地图与面板外框不动 */}
      <div className="capital-map-panel__list" key={selected ? selected.name : '__list__'}>
        {selected ? selected.companies.map((company) => (
          <article key={`${selected.name}-${company.name}-${company.url}`} className="capital-map-company">
            <div className="capital-map-company__name">{company.name}</div>
            <a
              className="capital-map-link"
              href={company.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              校招 / 招聘链接
              <IconExternalLink size={13} />
            </a>
          </article>
        )) : CAPITAL_CAMPUS_CITIES.map((city) => (
          <button
            key={city.name}
            type="button"
            className="capital-map-chip"
            onClick={() => onSelect(city.name)}
          >
            <span className="capital-map-chip__meta">
              <b>{city.name}</b>
              <span>{city.province}</span>
            </span>
            <span className="capital-map-chip__count">{city.companies.length} 家</span>
          </button>
        ))}
      </div>
    </aside>
  );
}
