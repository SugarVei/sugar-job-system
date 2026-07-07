import { useMemo, useState } from 'react';
import { HOT_COMPANY_GROUPS, HOT_COMPANY_TOTAL, type HotCompany } from '../data/hotCompanies';
import { useAppShell } from '../contexts/AppShellContext';
import { CARD, avatarColor, initialOf } from '../lib/appHelpers';
import { IconExternalLink, IconPlus } from '../components/icons';

const ALL = '全部';

export default function HotCompanies() {
  const { query, setScreen, setQuery } = useAppShell();
  const [activeGroup, setActiveGroup] = useState(ALL);

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return HOT_COMPANY_GROUPS
      .filter((group) => activeGroup === ALL || group.name === activeGroup)
      .map((group) => ({
        ...group,
        companies: group.companies.filter((company) => {
          if (!q) return true;
          return [company.name, company.industry, company.city]
            .filter(Boolean)
            .some((value) => value.toLowerCase().includes(q));
        }),
      }))
      .filter((group) => group.companies.length > 0);
  }, [activeGroup, query]);

  const addToCompanyLibrary = (company: HotCompany) => {
    setQuery(company.name);
    setScreen('companies');
  };

  return (
    <div className="flex flex-col gap-[22px] animate-rise">
      <div className="flex items-center justify-between gap-4 flex-wrap" style={{ ...CARD, padding: 18 }}>
        <div>
          <div style={{ fontFamily: 'Poppins', fontSize: 20, fontWeight: 700, color: '#1b1a17' }}>热门公司 · 快捷投递</div>
          <div style={{ fontSize: 13, color: '#8a8478', marginTop: 3 }}>
            精选大陆知名企业，共 {HOT_COMPANY_TOTAL} 家，一键直达校招官网
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#8a8478', fontSize: 13 }}>
          <span style={{ width: 8, height: 8, borderRadius: 999, background: '#8ba3bd' }} />
          {activeGroup === ALL ? '全部行业' : activeGroup}
        </div>
      </div>

      <div className="scrolly" style={{ display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
        {[ALL, ...HOT_COMPANY_GROUPS.map((group) => group.name)].map((name) => {
          const active = activeGroup === name;
          return (
            <button
              key={name}
              onClick={() => setActiveGroup(name)}
              className="btn-press"
              style={{
                height: 38,
                padding: '0 16px',
                borderRadius: 999,
                border: active ? '1px solid #1b1a17' : '1px solid #e0d8c9',
                background: active ? '#1b1a17' : '#fffdf8',
                color: active ? '#f4f1ea' : '#6b665c',
                fontSize: 13,
                fontWeight: 700,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flex: 'none',
              }}
            >
              {name}
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <div style={{ ...CARD, padding: 26, color: '#8a8478', fontSize: 14 }}>没有匹配的公司。</div>
      ) : (
        groups.map((group) => (
          <section key={group.name} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: group.dot, flex: 'none' }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#4a463e' }}>{group.name}</span>
              <span style={{ fontSize: 12, color: '#9a9488' }}>{group.companies.length} 家</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {group.companies.map((company) => (
                <CompanyCard key={`${group.name}-${company.name}`} company={company} onAdd={addToCompanyLibrary} />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function CompanyCard({ company, onAdd }: { company: HotCompany; onAdd: (company: HotCompany) => void }) {
  const color = avatarColor(company.name);
  return (
    <article
      className="card-hover"
      style={{
        background: 'rgba(255,253,248,.88)',
        border: '1px solid #e0d8c9',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: '0 3px 10px rgba(60,50,35,.08)',
        minWidth: 0,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: color.bg,
            color: color.fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'Poppins',
            fontSize: 18,
            fontWeight: 700,
            flex: 'none',
          }}
        >
          {initialOf(company.name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#4a463e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {company.name}
          </div>
          <div style={{ fontSize: 12, color: '#9a9488', marginTop: 3, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {[company.industry, company.city].filter(Boolean).join(' · ')}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href={company.url} target="_blank" rel="noopener noreferrer" className="btn-press" style={primaryLink}>
          校招官网 <IconExternalLink size={13} />
        </a>
        <button type="button" onClick={() => onAdd(company)} className="btn-press" style={secondaryButton}>
          <IconPlus size={13} /> 公司库
        </button>
      </div>
    </article>
  );
}

const primaryLink: React.CSSProperties = {
  flex: 1,
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  borderRadius: 13,
  background: '#1b1a17',
  color: '#f4f1ea',
  fontSize: 13,
  fontWeight: 700,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

const secondaryButton: React.CSSProperties = {
  height: 38,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 4,
  padding: '0 12px',
  borderRadius: 13,
  border: '1px solid #e0d8c9',
  background: '#fffdf8',
  color: '#6b665c',
  fontSize: 12.5,
  fontWeight: 700,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};