import { useEffect, useMemo, useState } from 'react';
import { HOT_COMPANY_GROUPS, HOT_COMPANY_TOTAL, type HotCompany, type HotCompanyGroup } from '../data/hotCompanies';
import { useAppShell } from '../contexts/AppShellContext';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { useCollection } from '../hooks/useCollection';
import type { Company, NewRecord } from '../types';
import { CARD, avatarColor, initialOf } from '../lib/appHelpers';
import { IconExternalLink, IconPlus } from '../components/icons';

const ALL = '全部';
const AI_GROUP_NAME = 'AI 导入公司';
const IMPORT_STORAGE_KEY = 'sugar_hot_company_ai_imports';

interface AICompanyCandidate extends HotCompany {
  regionType: string;
  reason: string;
  sourceNote: string;
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function loadImportedCompanies(): HotCompany[] {
  try {
    const raw = localStorage.getItem(IMPORT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HotCompany[];
    return Array.isArray(parsed) ? parsed.filter((item) => item.name && item.industry) : [];
  } catch {
    return [];
  }
}

export default function HotCompanies() {
  const { query, setScreen, setQuery } = useAppShell();
  const { getActiveConfig } = useApiKeys();
  const { items: savedCompanies, create } = useCollection<Company>('companies');
  const [activeGroup, setActiveGroup] = useState(ALL);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResults, setAiResults] = useState<AICompanyCandidate[]>([]);
  const [importedCompanies, setImportedCompanies] = useState<HotCompany[]>(() => loadImportedCompanies());
  const [importingName, setImportingName] = useState('');
  const [importMessage, setImportMessage] = useState('');

  useEffect(() => {
    localStorage.setItem(IMPORT_STORAGE_KEY, JSON.stringify(importedCompanies));
  }, [importedCompanies]);

  const allGroups = useMemo<HotCompanyGroup[]>(() => {
    if (importedCompanies.length === 0) return HOT_COMPANY_GROUPS;
    return [
      { name: AI_GROUP_NAME, dot: '#a08cb5', companies: importedCompanies },
      ...HOT_COMPANY_GROUPS,
    ];
  }, [importedCompanies]);

  const existingNames = useMemo(
    () => new Set([
      ...HOT_COMPANY_GROUPS.flatMap((group) => group.companies.map((company) => company.name)),
      ...importedCompanies.map((company) => company.name),
      ...savedCompanies.map((company) => company.company_name),
    ]),
    [importedCompanies, savedCompanies],
  );

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return allGroups
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
  }, [activeGroup, allGroups, query]);

  const addToCompanyLibrary = (company: HotCompany) => {
    setQuery(company.name);
    setScreen('companies');
  };

  const searchWithAI = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;

    setAiLoading(true);
    setAiError('');
    setImportMessage('');
    try {
      const providerConfig = getActiveConfig();
      const res = await fetch('/api/company-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          existingCompanies: Array.from(existingNames),
          ...(providerConfig ? {
            provider: providerConfig.provider,
            apiKey: providerConfig.apiKey,
            model: providerConfig.model,
          } : {}),
        }),
      });
      const data = await res.json() as { companies?: AICompanyCandidate[]; error?: string };
      if (!res.ok || data.error) throw new Error(data.error || 'AI 推荐失败');
      setAiResults((data.companies ?? []).filter((company) => company.name && company.industry));
      if ((data.companies ?? []).length === 0) setAiError('AI 没有返回可导入的公司，请换一个描述再试。');
    } catch (error) {
      setAiError(errorText(error));
    } finally {
      setAiLoading(false);
    }
  };

  const importCandidate = async (candidate: AICompanyCandidate) => {
    if (importingName) return;
    setImportingName(candidate.name);
    setAiError('');
    setImportMessage('');
    try {
      const hotCompany: HotCompany = {
        name: candidate.name,
        industry: candidate.industry,
        city: candidate.city,
        url: candidate.url,
      };
      setImportedCompanies((prev) => {
        if (prev.some((item) => item.name === candidate.name)) return prev;
        return [hotCompany, ...prev].slice(0, 40);
      });

      if (!savedCompanies.some((company) => company.company_name === candidate.name)) {
        const payload: NewRecord<Company> = {
          company_name: candidate.name,
          industry: candidate.industry,
          city: candidate.city,
          scale: candidate.regionType,
          website: candidate.url,
          notes: `AI 推荐：${candidate.reason}${candidate.sourceNote ? `\n${candidate.sourceNote}` : ''}`,
        };
        await create(payload);
      }

      setImportMessage(`已导入「${candidate.name}」，可在热门公司页和公司库中查看。`);
    } catch (error) {
      setAiError(`导入失败：${errorText(error)}`);
    } finally {
      setImportingName('');
    }
  };

  const handleAIKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      searchWithAI();
    }
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

      <section style={{ ...CARD, padding: 18, borderRadius: 22 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div style={{ fontFamily: 'Poppins', fontSize: 16, fontWeight: 700, color: '#1b1a17' }}>AI 找公司</div>
            <div style={{ fontSize: 12.5, color: '#8a8478', marginTop: 4 }}>
              输入你的目标，AI 会整理候选公司。结果需要你确认后才会导入。
            </div>
          </div>
          <div style={{ fontSize: 12, color: '#9a9488' }}>使用当前 AI 设置中的 API</div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3" style={{ marginTop: 14 }}>
          <textarea
            value={aiPrompt}
            onChange={(event) => setAiPrompt(event.target.value)}
            onKeyDown={handleAIKeyDown}
            placeholder="例如：帮我找一些适合机械专业的外企；推荐上海半导体校招公司"
            rows={2}
            style={{
              width: '100%',
              resize: 'vertical',
              minHeight: 58,
              maxHeight: 130,
              border: '1.5px solid #e0d8c9',
              borderRadius: 16,
              background: '#fffdf8',
              color: '#1b1a17',
              padding: '12px 14px',
              outline: 'none',
              fontSize: 13.5,
              lineHeight: 1.55,
              fontFamily: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={searchWithAI}
            disabled={!aiPrompt.trim() || aiLoading}
            className="btn-press"
            style={{
              height: 58,
              minWidth: 132,
              border: 'none',
              borderRadius: 16,
              background: !aiPrompt.trim() || aiLoading ? '#d8d0c2' : '#1b1a17',
              color: '#f4f1ea',
              fontSize: 13.5,
              fontWeight: 700,
              cursor: !aiPrompt.trim() || aiLoading ? 'not-allowed' : 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            {aiLoading ? '整理中...' : 'AI 搜索'}
          </button>
        </div>

        {(aiError || importMessage) && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: aiError ? '#a23d24' : '#4f7a56', lineHeight: 1.6 }}>
            {aiError || importMessage}
          </div>
        )}

        {aiResults.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3" style={{ marginTop: 14 }}>
            {aiResults.map((candidate) => {
              const imported = existingNames.has(candidate.name);
              return (
                <article key={`${candidate.name}-${candidate.url}`} style={{ border: '1px solid #e0d8c9', background: '#fffdf8', borderRadius: 16, padding: 14, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: '#efe2d5', color: '#9b633d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none' }}>
                      {initialOf(candidate.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#4a463e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{candidate.name}</div>
                      <div style={{ fontSize: 11.5, color: '#9a9488', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {[candidate.industry, candidate.city, candidate.regionType].filter(Boolean).join(' · ')}
                      </div>
                    </div>
                  </div>
                  <p style={{ minHeight: 42, margin: '12px 0 10px', fontSize: 12.5, color: '#6b665c', lineHeight: 1.55 }}>{candidate.reason || candidate.sourceNote}</p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {candidate.url && (
                      <a href={candidate.url} target="_blank" rel="noopener noreferrer" className="btn-press" style={{ ...secondaryButton, textDecoration: 'none', flex: 1 }}>
                        官网 <IconExternalLink size={12} />
                      </a>
                    )}
                    <button type="button" onClick={() => importCandidate(candidate)} disabled={imported || importingName === candidate.name} className="btn-press" style={{ ...primaryLink, border: 'none', cursor: imported ? 'default' : 'pointer', opacity: imported ? 0.62 : 1 }}>
                      {imported ? '已存在' : importingName === candidate.name ? '导入中' : '导入'}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="scrolly" style={{ display: 'flex', gap: 10, overflowX: 'auto', overflowY: 'hidden', paddingBottom: 4 }}>
        {[ALL, ...allGroups.map((group) => group.name)].map((name) => {
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
