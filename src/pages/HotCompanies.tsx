import { useEffect, useMemo, useState } from 'react';
import { HOT_COMPANY_GROUPS, type HotCompany, type HotCompanyGroup } from '../data/hotCompanies';
import { useAppShell } from '../contexts/AppShellContext';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { useCollection } from '../hooks/useCollection';
import { useCampusRecruitmentStatuses, type CampusRecruitmentStatus } from '../hooks/useCampusRecruitmentStatuses';
import { useToast } from '../components/Toast';
import type { Application, Company, NewRecord } from '../types';
import { CARD, avatarColor, initialOf } from '../lib/appHelpers';
import { applicationCompanyMatchesHotCompany, normalizeCompanyName } from '../lib/companyName';
import { IconExternalLink, IconSearch, IconTrash } from '../components/icons';

const ALL = '全部';
const AI_GROUP_NAME = '我添加的公司';
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
  const { setScreen, setQuery } = useAppShell();
  const { getActiveConfig } = useApiKeys();
  const { items: savedCompanies, create, remove: removeCompany } = useCollection<Company>('companies');
  const { items: applications } = useCollection<Application>('applications');
  const { items: recruitmentStatuses, loading: statusesLoading } = useCampusRecruitmentStatuses();
  const toast = useToast();
  const [activeGroup, setActiveGroup] = useState(ALL);
  const [pageSearch, setPageSearch] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResults, setAiResults] = useState<AICompanyCandidate[]>([]);
  const [importedCompanies, setImportedCompanies] = useState<HotCompany[]>(() => loadImportedCompanies());
  const [importingName, setImportingName] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [deletingName, setDeletingName] = useState('');

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

  const appliedApplicationCompanyNames = useMemo(
    () => applications.map((application) => application.company_name),
    [applications],
  );

  const recruitmentStatusByCompany = useMemo(
    () => new Map(recruitmentStatuses.map((status) => [status.company_key, status])),
    [recruitmentStatuses],
  );

  const groups = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    return allGroups
      .filter((group) => activeGroup === ALL || group.name === activeGroup)
      .map((group) => ({
        ...group,
        companies: group.companies.filter((company) => {
          if (!q) return true;
          // 页面内搜索：按公司名优先，行业/城市为辅
          return [company.name, company.industry, company.city]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(q));
        }),
      }))
      .filter((group) => group.companies.length > 0);
  }, [activeGroup, allGroups, pageSearch]);

  const importedMatches = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    if (!q) return importedCompanies;
    return importedCompanies.filter((c) => c.name.toLowerCase().includes(q));
  }, [importedCompanies, pageSearch]);

  const viewApplications = (company: HotCompany) => {
    setScreen('applications');
    setTimeout(() => setQuery(company.name), 0);
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

      if (!savedCompanies.some((company) => normalizeCompanyName(company.company_name) === normalizeCompanyName(candidate.name))) {
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

      setImportMessage(`已导入「${candidate.name}」；产生投递记录后会自动出现在公司库。`);
      toast.success(`已添加「${candidate.name}」`);
    } catch (error) {
      setAiError(`导入失败：${errorText(error)}`);
      toast.error('导入失败');
    } finally {
      setImportingName('');
    }
  };

  const deleteImported = async (company: HotCompany) => {
    if (deletingName) return;
    if (!confirm(`从「我添加的公司」中删除「${company.name}」？\n（不会删除已有投递记录）`)) return;
    setDeletingName(company.name);
    try {
      setImportedCompanies((prev) => prev.filter((item) => item.name !== company.name));
      // 若公司库中有同名且备注含 AI 推荐，则同步移除（有投递关联时跳过，避免破坏外键）
      const matched = savedCompanies.filter(
        (c) => normalizeCompanyName(c.company_name) === normalizeCompanyName(company.name),
      );
      for (const row of matched) {
        const hasApp = applications.some(
          (a) => a.company_id === row.id || normalizeCompanyName(a.company_name) === normalizeCompanyName(company.name),
        );
        if (!hasApp) {
          try {
            await removeCompany(row.id);
          } catch {
            /* 有关联时忽略 */
          }
        }
      }
      toast.success(`已删除「${company.name}」`);
    } catch (error) {
      toast.error('删除失败：' + errorText(error));
    } finally {
      setDeletingName('');
    }
  };

  const handleAIKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void searchWithAI();
    }
  };

  return (
    <div className="flex flex-col gap-[22px] animate-rise">
      {/* 页面内公司名搜索 */}
      <div style={{ ...CARD, padding: 16, borderRadius: 20 }}>
        <div className="flex items-center gap-3 flex-wrap">
          <div
            style={{
              flex: 1,
              minWidth: 200,
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              height: 46,
              background: '#faf7f0',
              border: '1.5px solid #e0d8c9',
              borderRadius: 14,
              padding: '0 14px',
            }}
          >
            <IconSearch size={17} color="#a39d90" />
            <input
              value={pageSearch}
              onChange={(e) => setPageSearch(e.target.value)}
              placeholder="搜索公司名称（支持已添加与精选列表）…"
              aria-label="搜索公司名称"
              style={{ border: 'none', background: 'none', outline: 'none', fontSize: 14, width: '100%', color: '#1b1a17' }}
            />
            {pageSearch && (
              <button
                type="button"
                onClick={() => setPageSearch('')}
                className="btn-press"
                style={{ border: 'none', background: 'none', color: '#9a9488', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}
              >
                清除
              </button>
            )}
          </div>
          <div style={{ fontSize: 12.5, color: '#9a9488' }}>
            {pageSearch
              ? `匹配 ${groups.reduce((n, g) => n + g.companies.length, 0)} 家`
              : `已添加 ${importedCompanies.length} 家 · 可删除`}
          </div>
        </div>
        {pageSearch.trim() && importedCompanies.length > 0 && (
          <div style={{ marginTop: 12, fontSize: 12.5, color: '#6b665c' }}>
            在「我添加的公司」中命中 {importedMatches.length} 家
          </div>
        )}
      </div>

      <section style={{ ...CARD, padding: 18, borderRadius: 22 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div style={{ fontFamily: 'Poppins', fontSize: 16, fontWeight: 700, color: '#1b1a17' }}>AI 找公司</div>
            <div style={{ fontSize: 12.5, color: '#8a8478', marginTop: 4 }}>
              输入你的目标，AI 会整理候选公司。确认导入后可在本页搜索或删除。
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
            onClick={() => void searchWithAI()}
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
                    <button type="button" onClick={() => void importCandidate(candidate)} disabled={imported || importingName === candidate.name} className="btn-press" style={{ ...primaryLink, border: 'none', cursor: imported ? 'default' : 'pointer', opacity: imported ? 0.62 : 1 }}>
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
        <div style={{ ...CARD, padding: 26, color: '#8a8478', fontSize: 14 }}>
          {pageSearch ? `没有名称包含「${pageSearch}」的公司。` : '没有匹配的公司。'}
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.name} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: group.dot, flex: 'none' }} />
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#4a463e' }}>{group.name}</span>
              <span style={{ fontSize: 12, color: '#9a9488' }}>{group.companies.length} 家</span>
              {group.name === AI_GROUP_NAME && (
                <span style={{ fontSize: 11.5, color: '#a08cb5', fontWeight: 600 }}>可删除</span>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {group.companies.map((company) => (
                <CompanyCard
                  key={`${group.name}-${company.name}`}
                  company={company}
                  removable={group.name === AI_GROUP_NAME}
                  deleting={deletingName === company.name}
                  applied={appliedApplicationCompanyNames.some((applicationCompanyName) =>
                    applicationCompanyMatchesHotCompany(applicationCompanyName, company.name))}
                  recruitmentStatus={recruitmentStatusByCompany.get(normalizeCompanyName(company.name))}
                  statusesLoading={statusesLoading}
                  onViewApplications={viewApplications}
                  onDelete={group.name === AI_GROUP_NAME ? () => void deleteImported(company) : undefined}
                />
              ))}
            </div>
          </section>
        ))
      )}
    </div>
  );
}

function CompanyCard({
  company,
  applied,
  recruitmentStatus,
  statusesLoading,
  removable,
  deleting,
  onViewApplications,
  onDelete,
}: {
  company: HotCompany;
  applied: boolean;
  recruitmentStatus?: CampusRecruitmentStatus;
  statusesLoading: boolean;
  removable?: boolean;
  deleting?: boolean;
  onViewApplications: (company: HotCompany) => void;
  onDelete?: () => void;
}) {
  const color = avatarColor(company.name);
  const recruitment = recruitmentStatusPresentation(recruitmentStatus, statusesLoading);
  return (
    <article
      className="card-hover"
      style={{
        position: 'relative',
        background: applied ? 'linear-gradient(145deg, rgba(239,247,255,.98), rgba(224,238,253,.94))' : 'rgba(255,253,248,.88)',
        border: applied ? '1.5px solid #83add8' : '1px solid #e0d8c9',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        boxShadow: applied ? '0 7px 18px rgba(66,112,163,.16)' : '0 3px 10px rgba(60,50,35,.08)',
        minWidth: 0,
      }}
    >
      {applied && (
        <button
          type="button"
          onClick={() => onViewApplications(company)}
          aria-label={`查看${company.name}的投递记录`}
          style={{
            position: 'absolute',
            top: 12,
            right: removable ? 48 : 12,
            padding: '4px 9px',
            borderRadius: 999,
            background: '#3975b7',
            color: '#fff',
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '.04em',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          已投递
        </button>
      )}
      {removable && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={deleting}
          aria-label={`删除${company.name}`}
          title="从我添加的公司中删除"
          className="btn-press"
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            width: 32,
            height: 32,
            borderRadius: 10,
            border: '1px solid #f3b3a1',
            background: '#fff5f2',
            color: '#a23d24',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: deleting ? 'not-allowed' : 'pointer',
            opacity: deleting ? 0.6 : 1,
          }}
        >
          <IconTrash size={14} />
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, paddingRight: applied || removable ? 72 : 0 }}>
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
        <a
          href={recruitmentStatus?.evidence_url || company.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-press"
          style={{ ...recruitmentButton, ...recruitment.style }}
          aria-label={`${company.name}${recruitment.label}，查看官网依据`}
          title={recruitment.title}
        >
          {recruitment.label}
        </a>
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

const recruitmentButton: React.CSSProperties = {
  ...secondaryButton,
  minWidth: 112,
  padding: '0 10px',
  textDecoration: 'none',
};

function recruitmentStatusPresentation(status: CampusRecruitmentStatus | undefined, loading: boolean) {
  if (loading && !status) {
    return {
      label: '27校招查询中',
      title: '正在读取每日同步结果',
      style: { background: '#f3efe6', color: '#8a8478' },
    };
  }

  if (status?.status === 'started') {
    return {
      label: '27校招已开始',
      title: status.evidence_text || '官网已发现 2027 届校园招聘信息；该公司已停止每日检查。',
      style: { border: '1px solid #72a879', background: '#e6f3e7', color: '#2f7040' },
    };
  }

  if (status?.status === 'not_started') {
    const announced = status.evidence_text?.startsWith('【豆包调查：已公布但尚未开始');
    if (announced) {
      return {
        label: '27校招已公布',
        title: status.evidence_text || '官方已公布 2027 届校招安排，但目前尚未开放投递。',
        style: { border: '1px solid #8ca6c7', background: '#eaf1fa', color: '#41658f' },
      };
    }
    return {
      label: '27校招暂未开始',
      title: status.last_checked_at
        ? `官网暂未发现明确的 2027 校招信息。最近检查：${new Date(status.last_checked_at).toLocaleString('zh-CN')}`
        : '官网暂未发现明确的 2027 校招信息。',
      style: { border: '1px solid #d7b56f', background: '#fff4d9', color: '#89631c' },
    };
  }

  if (status?.status === 'error') {
    return {
      label: '27校招待复查',
      title: `本次官网检查失败，将自动重试。${status.error_message ? ` ${status.error_message}` : ''}`,
      style: { border: '1px solid #d8a19a', background: '#fbe9e7', color: '#a14b40' },
    };
  }

  return {
    label: '27校招待确认',
    title: '等待每日自动检查；点击可先打开校招官网。',
    style: { background: '#f3efe6', color: '#756f65' },
  };
}
