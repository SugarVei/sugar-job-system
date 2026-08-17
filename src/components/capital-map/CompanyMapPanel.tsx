import { IconExternalLink } from '../icons';
import type { HotCompany, HotCompanyGroup } from '../../data/hotCompanies';
import type { HotCompanyHq } from '../../data/hotCompanyHq';

export interface MapCompanyEntry {
  company: HotCompany;
  group: HotCompanyGroup;
  hq: HotCompanyHq | null;
}

export interface MapCity {
  hq: HotCompanyHq;
  dot: string;
  companies: MapCompanyEntry[];
}

interface CompanyMapPanelProps {
  activeGroup: string;
  cities: MapCity[];
  selectedCity: MapCity | null;
  unmappedEntries: MapCompanyEntry[];
  mapFailed: boolean;
  onSelect: (name: string | null) => void;
}

function companyUrl(company: HotCompany) {
  const entry = company.recruitment?.entry;
  return entry && /^https?:\/\//iu.test(entry) ? entry : company.url;
}

export default function CompanyMapPanel({
  activeGroup,
  cities,
  selectedCity,
  unmappedEntries,
  mapFailed,
  onSelect,
}: CompanyMapPanelProps) {
  const selectedCompanies = selectedCity?.companies ?? [];
  const title = selectedCity ? selectedCity.hq.city : '选择城市查看公司';
  const description = selectedCity
    ? `${selectedCity.hq.province} · ${selectedCompanies.length} 家总部企业`
    : `当前「${activeGroup}」共有 ${cities.length} 个可点总部城市。缩小看省会，放大看其他地级市。`;

  return (
    <aside className="capital-map-panel" aria-label="全部企业总部列表">
      <div className="capital-map-panel__head">
        {selectedCity ? (
          <button type="button" className="capital-map-back" onClick={() => onSelect(null)}>
            ← 返回城市列表
          </button>
        ) : null}
        <h2>
          {title}
          {selectedCity ? <span className="capital-map-badge">{selectedCompanies.length} 家</span> : null}
        </h2>
        <p>{description}</p>
        {mapFailed ? <p className="capital-map-warn">地图底图加载失败，仍可从下方选择城市。</p> : null}
      </div>

      <div className="capital-map-panel__list">
        {selectedCity ? selectedCompanies.map((entry) => (
          <a
            key={`${entry.group.name}-${entry.company.name}`}
            href={companyUrl(entry.company)}
            target="_blank"
            rel="noopener noreferrer"
            className="capital-map-company"
          >
            <div className="capital-map-company__name">
              {entry.company.name}
              <IconExternalLink size={13} />
            </div>
            <div className="capital-map-company__url">
              {[entry.company.industry, entry.group.name].filter(Boolean).join(' · ')}
            </div>
          </a>
        )) : (
          <>
            <div style={{ display: 'grid', gap: 7 }}>
              {cities.map((city) => (
                <button
                  key={city.hq.city}
                  type="button"
                  className="capital-map-chip"
                  onClick={() => onSelect(city.hq.city)}
                  style={{ marginBottom: 0 }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                    <i style={{ width: 8, height: 8, borderRadius: 999, background: city.dot, flex: 'none' }} />
                    <b>{city.hq.city}</b>
                  </span>
                  <span>{city.companies.length} 家</span>
                </button>
              ))}
            </div>

            {unmappedEntries.length > 0 && (
              <div style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid #efe7d8' }}>
                <div style={{ color: '#6b665c', fontSize: 13, fontWeight: 750, marginBottom: 8 }}>总部城市待补</div>
                <div style={{ display: 'grid', gap: 7 }}>
                  {unmappedEntries.map((entry) => (
                    <a
                      key={`${entry.group.name}-${entry.company.name}`}
                      href={companyUrl(entry.company)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="capital-map-company"
                      style={{ marginBottom: 0, padding: '10px 12px' }}
                    >
                      <div className="capital-map-company__name">
                        {entry.company.name}
                        <IconExternalLink size={13} />
                      </div>
                      <div className="capital-map-company__url">{entry.company.industry} · 总部城市待补</div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
