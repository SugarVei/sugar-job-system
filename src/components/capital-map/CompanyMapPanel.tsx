import { IconExternalLink } from '../icons';
import type { HotCompany, HotCompanyGroup } from '../../data/hotCompanies';
import type { HotCompanyHq } from '../../data/hotCompanyHq';
import type { CampusRecruitmentStatus } from '../../hooks/useCampusRecruitmentStatuses';
import { normalizeCompanyName } from '../../lib/companyName';
import { companyRecruitmentUrl, recruitmentPill } from '../../lib/recruitmentStatus';

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
  statusByName: Map<string, CampusRecruitmentStatus>;
  onSelect: (name: string | null) => void;
}

function CompanyCard({ entry, status }: { entry: MapCompanyEntry; status?: CampusRecruitmentStatus }) {
  const pill = recruitmentPill(entry.company, status);
  const href = companyRecruitmentUrl(entry.company);
  const sub = [entry.company.industry, entry.group.name].filter(Boolean).join(' · ');

  return (
    <article className="capital-map-company">
      <div className="capital-map-company__row">
        <div>
          <div className="capital-map-company__name">{entry.company.name}</div>
          {sub ? <div className="capital-map-company__sub">{sub}</div> : null}
        </div>
        <span className={`capital-map-pill is-${pill.kind}`}>{pill.label}</span>
      </div>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="capital-map-link"
        >
          校招 / 招聘链接
          <IconExternalLink size={13} />
        </a>
      ) : null}
    </article>
  );
}

export default function CompanyMapPanel({
  activeGroup,
  cities,
  selectedCity,
  unmappedEntries,
  mapFailed,
  statusByName,
  onSelect,
}: CompanyMapPanelProps) {
  const selectedCompanies = selectedCity?.companies ?? [];
  const title = selectedCity ? selectedCity.hq.city : '选择一座城市';
  const description = selectedCity
    ? `${selectedCity.hq.province} · 按总部所在地汇总。点击公司打开校招页。`
    : `点地图上的城市，或从右侧列表进入公司。当前「${activeGroup}」共 ${cities.length} 个可点城市。`;

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
          <CompanyCard
            key={`${entry.group.name}-${entry.company.name}`}
            entry={entry}
            status={statusByName.get(normalizeCompanyName(entry.company.name))}
          />
        )) : (
          <>
            {cities.map((city) => (
              <button
                key={city.hq.city}
                type="button"
                className="capital-map-chip"
                onClick={() => onSelect(city.hq.city)}
              >
                <span className="capital-map-chip__meta">
                  <b>{city.hq.city}</b>
                  <span>{city.hq.province}</span>
                </span>
                <span className="capital-map-chip__count">{city.companies.length} 家</span>
              </button>
            ))}

            {unmappedEntries.length > 0 ? (
              <div className="capital-map-unmapped">
                <div className="capital-map-unmapped__title">总部城市待补</div>
                {unmappedEntries.map((entry) => (
                  <CompanyCard
                    key={`${entry.group.name}-${entry.company.name}`}
                    entry={entry}
                    status={statusByName.get(normalizeCompanyName(entry.company.name))}
                  />
                ))}
              </div>
            ) : null}
          </>
        )}
      </div>
    </aside>
  );
}
