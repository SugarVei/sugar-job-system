import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { ArrowUpRight, ChevronDown, ChevronLeft, ChevronRight, Filter, Info, MoreHorizontal, PanelRightOpen, Search, X } from 'lucide-react';
import { CompanyDiscoveryPanel, type CompanyDiscoveryMode } from '../components/CompanyDiscovery';
import './HotCompanies.css';
import { type HotCompany } from '../data/hotCompanies';
import StandardCatalogImporter from '../components/StandardCatalogImporter';
import {
  type RecruitmentStatusKey,
} from '../data/campusRecruitmentAudit20260811';
import { useAppShell } from '../contexts/AppShellContext';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { useCampusRecruitmentStatuses, type CampusRecruitmentStatus } from '../hooks/useCampusRecruitmentStatuses';
import { useToast } from '../components/Toast';
import type { Company, NewRecord } from '../types';
import { CARD, initialOf } from '../lib/appHelpers';
import { applicationCompanyMatchesHotCompany, normalizeCompanyName } from '../lib/companyName';
import { seedStatusForCompany } from '../data/campusRecruitmentSeed';
import { IconExternalLink } from '../components/icons';
import ResumeCompanyFinder from '../components/ResumeCompanyFinder';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { canManageStandardCatalog } from '../lib/standardCatalogAdmin';
import {
  AI_GROUP_NAME,
  ALL_GROUP_NAME,
  useHotCompanyCatalog,
} from '../hooks/useHotCompanyCatalog';
import { EXCEL_CAMPUS_UPDATE_DATES } from '../data/excelCampusRecruitmentUpdateDates';
import { recentCatalogUpdateDates } from '../lib/standardCompanyImport';

const ALL = ALL_GROUP_NAME;
const ALL_RECRUITMENT_STATUSES = 'all';
const COMPANY_PAGE_SIZE = 48;
const AUDIT_OVERRIDE_AFTER = Date.parse('2026-08-12T07:00:00Z');

const RECRUITMENT_STATUS_META = {
  started: { label: '已开招', border: '#72a879', background: '#e6f3e7', color: '#2f7040' },
  warmup: { label: '即将开招/预热', border: '#8ca6c7', background: '#eaf1fa', color: '#41658f' },
  not_started: { label: '未开招', border: '#d7b56f', background: '#fff4d9', color: '#89631c' },
  internship_only: { label: '仅社招/实习', border: '#c39aa0', background: '#f7e9ec', color: '#8b4d58' },
  unknown: { label: '链接失效/无法判断', border: '#aaa39a', background: '#f1efeb', color: '#6f6961' },
} satisfies Record<RecruitmentStatusKey, { label: string; border: string; background: string; color: string }>;

const RECRUITMENT_STATUS_FILTERS = (Object.keys(RECRUITMENT_STATUS_META) as RecruitmentStatusKey[]).map((key) => ({
  key,
  ...RECRUITMENT_STATUS_META[key],
}));

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

function formatCalendarDate(date: string) {
  const [, month, day] = date.split('-').map(Number);
  return `${month}月${day}日`;
}

function formatUpdateDateLabel(date: string) {
  return `${formatCalendarDate(date)}开招`;
}

function updateDateForCompany(company: HotCompany) {
  return company.updateDate || EXCEL_CAMPUS_UPDATE_DATES[company.name];
}

export default function HotCompanies() {
  const { setScreen, setQuery, setHeaderChrome } = useAppShell();
  const { user } = useAuth();
  const { requireActiveConfig } = useApiKeys();
  const {
    savedCompanies,
    createCompany: create,
    removeCompany,
    applications,
    companyRecommendations,
    refreshCompanyRecommendations,
    removeRecommendation,
    importedCompanies,
    standardCompanies,
    standardCatalogRows,
    refreshStandardCatalog,
    standardCatalogUpdatedAt,
    standardCatalogError,
    allGroups,
    accountOnlyCompanies,
    recruitmentOverviewCompanies,
  } = useHotCompanyCatalog();
  const { items: recruitmentStatuses, loading: statusesLoading } = useCampusRecruitmentStatuses();
  const toast = useToast();
  const [activeCompanyType, setActiveCompanyType] = useState(ALL);
  const [activeIndustry, setActiveIndustry] = useState(ALL);
  const [activeUpdateDate, setActiveUpdateDate] = useState<string | null>(null);
  const [activeRecruitmentStatus, setActiveRecruitmentStatus] = useState<RecruitmentStatusKey | typeof ALL_RECRUITMENT_STATUSES>(ALL_RECRUITMENT_STATUSES);
  const [pageSearch, setPageSearch] = useState('');
  const [pageIndex, setPageIndex] = useState(0);
  const resultsStartRef = useRef<HTMLDivElement>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResults, setAiResults] = useState<AICompanyCandidate[]>([]);
  const [importingName, setImportingName] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [deletingName, setDeletingName] = useState('');
  const [discoveryMode, setDiscoveryMode] = useState<CompanyDiscoveryMode>('resume');
  const [discoveryOpen, setDiscoveryOpen] = useState(() => window.matchMedia('(min-width: 1100px)').matches);
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [visitedTools, setVisitedTools] = useState<CompanyDiscoveryMode[]>(['resume']);
  const canManage = canManageStandardCatalog(user?.email);
  const openDiscovery = useCallback((mode: CompanyDiscoveryMode) => {
    setDiscoveryMode(mode);
    setVisitedTools(tools => tools.includes(mode) ? tools : [...tools, mode]);
    setDiscoveryOpen(true);
  }, []);
  const closeDiscovery = useCallback(() => setDiscoveryOpen(false), []);

  useEffect(() => {
    setHeaderChrome({ searchPlaceholder: null, showAdd: true, contentScroll: false, inlineContent: <span className="hc-header-subtitle">2027 届校招</span>, actions: !discoveryOpen ? <button type="button" className="hc-panel-reopen" onClick={() => setDiscoveryOpen(true)}><PanelRightOpen size={16} />发现公司</button> : undefined });
    return () => setHeaderChrome(null);
  }, [discoveryOpen, setHeaderChrome]);

  useEffect(() => {
    const dismissMenus = (event: PointerEvent) => {
      document.querySelectorAll<HTMLDetailsElement>('.hc-row-actions[open]').forEach(details => {
        if (!details.contains(event.target as Node)) details.open = false;
      });
    };
    document.addEventListener('pointerdown', dismissMenus);
    return () => document.removeEventListener('pointerdown', dismissMenus);
  }, []);


  useEffect(() => {
    const media = window.matchMedia('(max-width: 1099px)');
    const collapseOnSmallScreen = () => { if (media.matches) setDiscoveryOpen(false); };
    media.addEventListener('change', collapseOnSmallScreen);
    return () => media.removeEventListener('change', collapseOnSmallScreen);
  }, []);

  const existingNames = useMemo(
    () => new Set([
      ...standardCompanies.map((company) => company.name),
      ...importedCompanies.map((company) => company.name),
      ...savedCompanies.map((company) => company.company_name),
    ]),
    [importedCompanies, savedCompanies, standardCompanies],
  );

  const appliedApplicationCompanyNames = useMemo(
    () => applications.map((application) => application.company_name),
    [applications],
  );

  const recruitmentStatusByCompany = useMemo(
    () => new Map(recruitmentStatuses.map((status) => [status.company_key, status])),
    [recruitmentStatuses],
  );

  const companyTypeOptions = useMemo(() => Array.from(new Set(
    recruitmentOverviewCompanies.map((company) => company.companyType || '未标明').filter(Boolean),
  )), [recruitmentOverviewCompanies]);

  const industryOptions = useMemo(() => Array.from(new Set(
    recruitmentOverviewCompanies.flatMap((company) => company.industryTags?.length
      ? company.industryTags
      : [company.industry || '其他']),
  )), [recruitmentOverviewCompanies]);

  const updateDateOptions = useMemo(() => recentCatalogUpdateDates(
    recruitmentOverviewCompanies
      .map(updateDateForCompany)
      .filter((date): date is string => Boolean(date)),
  ), [recruitmentOverviewCompanies]);

  const selectedUpdateDate = activeUpdateDate === ALL || (activeUpdateDate && updateDateOptions.includes(activeUpdateDate))
    ? activeUpdateDate
    : updateDateOptions[0] ?? ALL;

  const groups = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    const seenCompanies = new Set<string>();
    const sourceGroups = allGroups.filter((group) => activeIndustry === ALL || group.name === activeIndustry);
    return sourceGroups
      .map((group) => ({
        ...group,
        companies: group.companies.filter((company) => {
          const companyKey = normalizeCompanyName(company.name);
          if (activeCompanyType !== ALL && (company.companyType || '未标明') !== activeCompanyType) return false;
          const updateDate = updateDateForCompany(company);
          if (selectedUpdateDate !== ALL && updateDate !== selectedUpdateDate) return false;
          const dbStatus = recruitmentStatusByCompany.get(companyKey);
          if (activeRecruitmentStatus !== ALL_RECRUITMENT_STATUSES
            && recruitmentStatusKey(company, dbStatus) !== activeRecruitmentStatus) {
            return false;
          }
          const matchesSearch = !q || [company.name, company.industry, company.city, company.recruitment?.evidence, company.recruitment?.entry]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(q));
          if (!matchesSearch) return false;
          if (activeIndustry === ALL) {
            if (seenCompanies.has(companyKey)) return false;
            seenCompanies.add(companyKey);
          }
          return true;
        }),
      }))
      .filter((group) => group.companies.length > 0);
  }, [activeCompanyType, activeIndustry, activeRecruitmentStatus, selectedUpdateDate, allGroups, pageSearch, recruitmentStatusByCompany]);

  const matchingCompanyCount = useMemo(
    () => groups.reduce((count, group) => count + group.companies.length, 0),
    [groups],
  );
  const pageCount = Math.max(1, Math.ceil(matchingCompanyCount / COMPANY_PAGE_SIZE));
  const currentPage = Math.min(pageIndex, pageCount - 1);
  const pagedGroups = useMemo(() => {
    const pageStart = currentPage * COMPANY_PAGE_SIZE;
    const pageEnd = pageStart + COMPANY_PAGE_SIZE;
    let groupStart = 0;
    return groups.flatMap((group) => {
      const start = groupStart;
      groupStart += group.companies.length;
      const sliceStart = Math.max(0, pageStart - start);
      const sliceEnd = Math.min(group.companies.length, pageEnd - start);
      if (sliceStart >= sliceEnd) return [];
      return [{ ...group, totalCount: group.companies.length, companies: group.companies.slice(sliceStart, sliceEnd) }];
    });
  }, [currentPage, groups]);
  const changePage = (nextPage: number) => {
    setPageIndex(nextPage);
    resultsStartRef.current?.scrollIntoView({ block: 'start' });
  };

  const recruitmentStatusFilters = useMemo(() => {
    const counts = new Map<RecruitmentStatusKey, number>();
    recruitmentOverviewCompanies.forEach((company) => {
      const companyKey = normalizeCompanyName(company.name);
      const key = recruitmentStatusKey(company, recruitmentStatusByCompany.get(companyKey));
      counts.set(key, (counts.get(key) ?? 0) + 1);
    });
    return RECRUITMENT_STATUS_FILTERS.map((status) => ({
      ...status,
      count: counts.get(status.key) ?? 0,
    }));
  }, [recruitmentOverviewCompanies, recruitmentStatusByCompany]);

  const latestCheckLabel = useMemo(() => {
    const dates = recruitmentOverviewCompanies
      .flatMap((company) => [
        recruitmentStatusByCompany.get(normalizeCompanyName(company.name))?.last_checked_at,
        company.recruitment?.checkedAt,
      ])
      .filter((value): value is string => Boolean(value))
      .map((value) => Date.parse(value))
      .filter(Number.isFinite);
    if (dates.length === 0) return '等待首次核查';
    return `最新核查 ${new Date(Math.max(...dates)).toLocaleDateString('zh-CN')}`;
  }, [recruitmentOverviewCompanies, recruitmentStatusByCompany]);

  const standardCompanyCount = standardCompanies.length;
  const accountOnlyCompanyCount = accountOnlyCompanies.length;
  const recruitmentOverviewCompanyCount = recruitmentOverviewCompanies.length;


  const viewApplications = (company: HotCompany) => {
    const matchingApplication = applications.find((application) =>
      applicationCompanyMatchesHotCompany(application.company_name, company.name));
    setScreen('applications');
    setTimeout(() => setQuery(matchingApplication?.company_name ?? company.name), 0);
  };

  const searchWithAI = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || aiLoading) return;
    const providerConfig = requireActiveConfig('AI 搜索公司');
    if (!providerConfig) return;

    setAiLoading(true);
    setAiError('');
    setImportMessage('');
    try {
      const res = await fetch('/api/company-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          existingCompanies: Array.from(existingNames),
          provider: providerConfig.provider,
          apiKey: providerConfig.apiKey,
          model: providerConfig.model,
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
      if (!user) throw new Error('登录状态已失效，请重新登录后再导入。');
      const hotCompany: HotCompany = {
        name: candidate.name,
        industry: candidate.industry,
        city: candidate.city,
        url: candidate.url,
      };
      const { error: recommendationError } = await supabase.from('company_recommendations').insert({
        user_id: user.id,
        source: 'ai_search',
        recommendation_type: 'private',
        company_name: hotCompany.name,
        industry: hotCompany.industry,
        city: hotCompany.city || null,
        company_type: candidate.regionType || null,
        website: hotCompany.url || null,
        reason: candidate.reason || candidate.sourceNote || null,
      });
      if (recommendationError) throw recommendationError;

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
      await refreshCompanyRecommendations();

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
      const recommendationRows = companyRecommendations.filter((item) =>
        item.recommendation_type === 'private'
        && normalizeCompanyName(item.company_name) === normalizeCompanyName(company.name));
      await Promise.all(recommendationRows.map((row) => removeRecommendation(row.id)));
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

  const handleAIKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void searchWithAI();
    }
  };

  const companyEntries = pagedGroups.flatMap(group => group.companies.map(company => ({ company, groupName: group.name })));
  const hasFilters = Boolean(pageSearch || activeCompanyType !== ALL || activeIndustry !== ALL || selectedUpdateDate !== ALL || activeRecruitmentStatus !== ALL_RECRUITMENT_STATUSES);
  const clearFilters = () => { setPageSearch(''); setActiveCompanyType(ALL); setActiveIndustry(ALL); setActiveUpdateDate(ALL); setActiveRecruitmentStatus(ALL_RECRUITMENT_STATUSES); setPageIndex(0); };

  return (
    <div className="hot-companies-page">
      <div className="hc-page-scroll scrolly">
      <section className="hc-status-overview" aria-label="2027 届校招核查总览">
        {recruitmentStatusFilters.map(status => <button key={status.key} type="button" aria-pressed={activeRecruitmentStatus === status.key} className="hc-status-filter"
          style={{ '--status-color': ({ started: '#67a67c', warmup: '#f0bc3e', not_started: '#a4a6a8', internship_only: '#7e9ec5', unknown: '#cf9aa8' })[status.key] } as CSSProperties}
          onClick={() => { const active = activeRecruitmentStatus === status.key; setActiveRecruitmentStatus(active ? ALL_RECRUITMENT_STATUSES : status.key); setPageIndex(0); if (!active) { setActiveCompanyType(ALL); setActiveIndustry(ALL); } }}>
          <span className="hc-status-filter-label"><span className="hc-status-dot" />{status.label}</span><strong>{status.count.toLocaleString()}</strong>
        </button>)}
        <button type="button" className="hc-total-filter" aria-pressed={activeRecruitmentStatus === ALL_RECRUITMENT_STATUSES} title={`标准公司 ${standardCompanyCount} 家 · 我添加 ${accountOnlyCompanyCount} 家 · ${latestCheckLabel}`} onClick={() => { setActiveRecruitmentStatus(ALL_RECRUITMENT_STATUSES); setPageIndex(0); }}><Info size={20} /><span>每日自动核查<br />共 {recruitmentOverviewCompanyCount.toLocaleString()} 家公司</span></button>
      </section>

      <div className={`hc-workspace${discoveryOpen ? '' : ' hc-workspace-collapsed'}`}>
      <div className="hc-company-browser">
        <section className="hc-filters" aria-label="筛选公司">
          <div className="hc-search-row">
            <div className="hc-search"><Search size={18} aria-hidden="true" /><input value={pageSearch} onChange={event => { setPageSearch(event.target.value); setPageIndex(0); }} placeholder="搜索公司名称" aria-label="搜索公司名称" />{pageSearch && <button className="hc-icon-button" type="button" onClick={() => { setPageSearch(''); setPageIndex(0); }} aria-label="清除公司搜索"><X size={15} /></button>}</div>
            <button type="button" className="hc-filter-toggle" aria-expanded={filtersOpen} aria-controls="hc-company-filter-controls" onClick={() => setFiltersOpen(value => !value)}><Filter size={17} />筛选</button>
          </div>
          <div id="hc-company-filter-controls" className="hc-filter-controls" hidden={!filtersOpen}>
            <CompanyFilter label="企业性质" options={companyTypeOptions} value={activeCompanyType} onChange={value => { setActiveCompanyType(value); setPageIndex(0); }} />
            <CompanyFilter label="行业分类" options={industryOptions} value={activeIndustry} onChange={value => { setActiveIndustry(value); setPageIndex(0); }} />
            <CompanyFilter label="添加时间" options={updateDateOptions} formatOption={formatUpdateDateLabel} value={selectedUpdateDate} onChange={value => { setActiveUpdateDate(value); setPageIndex(0); }} />
          </div>
        </section>

        <section ref={resultsStartRef} className="hc-results" aria-label="公司列表">
          <div className="hc-results-top"><div className="hc-results-count"><h2>{hasFilters ? '筛选结果' : '全部公司'} <strong>{matchingCompanyCount.toLocaleString()}</strong></h2>{hasFilters && <button type="button" className="hc-text-button" onClick={clearFilters}>重置筛选</button>}</div></div>
          {matchingCompanyCount > 0 ? <>
            <div className="hc-company-results">
              {companyEntries.map(({ company, groupName }) => <CompanyEntry key={`${groupName}-${company.name}`} company={company}
                removable={groupName === AI_GROUP_NAME} deleting={deletingName === company.name}
                applied={appliedApplicationCompanyNames.some(name => applicationCompanyMatchesHotCompany(name, company.name))}
                recruitmentStatus={resolveRecruitmentStatus(company, recruitmentStatusByCompany.get(normalizeCompanyName(company.name)))} statusesLoading={statusesLoading}
                onViewApplications={viewApplications} onDelete={groupName === AI_GROUP_NAME ? () => void deleteImported(company) : undefined} />)}
            </div>
          </> : <div className="hc-empty"><Search size={28} strokeWidth={1.5} /><h2>没有找到匹配的公司</h2><p>试试其他关键词，或调整筛选条件。</p><button type="button" className="hc-text-button" onClick={clearFilters}>查看全部公司</button></div>}
        </section>
      </div>

      <CompanyDiscoveryPanel open={discoveryOpen} mode={discoveryMode} canManage={canManage} onModeChange={openDiscovery} onClose={closeDiscovery}>
        <div hidden={discoveryMode !== 'ai'}>      <section style={{ ...CARD, padding: 18, borderRadius: 22 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div style={{ fontFamily: 'Poppins', fontSize: 16, fontWeight: 700, color: '#1b1a17' }}>AI 找公司</div>
            <div style={{ fontSize: 12.5, color: 'var(--sugar-ink-tertiary)', marginTop: 4 }}>
              输入你的目标，AI 会整理候选公司。确认导入后可在本页搜索或删除。
            </div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--sugar-ink-tertiary)' }}>使用当前 AI 设置中的 API</div>
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
                <article className="hc-discovery-result" key={`${candidate.name}-${candidate.url}`} style={{ border: '1px solid #e0d8c9', background: '#fffdf8', borderRadius: 16, padding: 14, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 11, background: 'var(--hc-selected)', color: 'var(--hc-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flex: 'none' }}>
                      {initialOf(candidate.name)}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#4a463e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{candidate.name}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--sugar-ink-tertiary)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
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
      </section></div>
        <div hidden={discoveryMode !== 'resume'}>{visitedTools.includes('resume') && <ResumeCompanyFinder compact standardCompanies={standardCompanies} onSaved={refreshCompanyRecommendations} />}</div>
        <div hidden={discoveryMode !== 'excel'}>{canManage && visitedTools.includes('excel') && <StandardCatalogImporter compact currentCompanies={standardCatalogRows} updatedAt={standardCatalogUpdatedAt} catalogError={standardCatalogError} onApplied={async () => { await refreshStandardCatalog(); toast.success('标准公司库已更新，热门公司和地图校招会一起刷新'); }} />}</div>
      </CompanyDiscoveryPanel>
      </div>
      </div>
      {matchingCompanyCount > 0 && <div className={`hc-pagination-footer hc-workspace${discoveryOpen ? '' : ' hc-workspace-collapsed'}`}>
        <CompanyResultsPagination count={matchingCompanyCount} page={currentPage} pageCount={pageCount} onPageChange={changePage} />
      </div>}
    </div>
  );
}

function CompanyResultsPagination({ count, page, pageCount, onPageChange }: {
  count: number; page: number; pageCount: number; onPageChange: (page: number) => void;
}) {
  const start = Math.max(0, Math.min(page - 2, pageCount - 5));
  const pages = Array.from({ length: Math.min(5, pageCount) }, (_, index) => start + index);
  return <nav className="hc-pagination" aria-label="公司结果分页">
    <div className="hc-pagination-controls">
      <button className="hc-page-arrow" type="button" aria-label="上一页" disabled={page === 0} onClick={() => onPageChange(page - 1)}><ChevronLeft size={18} /></button>
      {pages.map(index => <button className="hc-page-number" type="button" key={index} aria-label={`第 ${index + 1} 页`} aria-current={page === index ? 'page' : undefined} onClick={() => onPageChange(index)}>{index + 1}</button>)}
      {pageCount > 5 && <span className="hc-page-jump"><MoreHorizontal size={16} aria-hidden="true" /><select aria-label="选择结果页" title="跳转页面" value={page} onChange={event => onPageChange(Number(event.target.value))}>{Array.from({ length: pageCount }, (_, index) => <option key={index} value={index}>第 {index + 1} / {pageCount} 页</option>)}</select></span>}
      {pages[pages.length - 1] < pageCount - 1 && <button className="hc-page-number" type="button" aria-label={`第 ${pageCount} 页`} onClick={() => onPageChange(pageCount - 1)}>{pageCount}</button>}
      <button className="hc-page-arrow" type="button" aria-label="下一页" disabled={page === pageCount - 1} onClick={() => onPageChange(page + 1)}><ChevronRight size={18} /></button>
    </div>
    <span className="hc-pagination-count" title={`每页 ${COMPANY_PAGE_SIZE} 家 · 显示 ${page * COMPANY_PAGE_SIZE + 1}–${Math.min(count, (page + 1) * COMPANY_PAGE_SIZE)} 家`}>共 {count.toLocaleString()} 条</span>
  </nav>;
}

function resolveRecruitmentStatus(company: HotCompany, dbStatus?: CampusRecruitmentStatus) {
  // DB 明确已开始：以库为准
  if (dbStatus?.status === 'started') return dbStatus;
  // DB 已检查且未开始：以库为准
  if (dbStatus?.status === 'not_started' && dbStatus.last_checked_at) return dbStatus;
  // 其余（无记录 / pending / error）回落静态底库，保证卡片立刻有「已开始/未开始」
  return seedStatusForCompany(company.name, company.url);
}

function CompanyFilter({ label, options, formatOption, value, onChange }: { label: string; options: string[]; formatOption?: (value: string) => string; value: string; onChange: (value: string) => void }) {
  return <label className={`hc-filter${value !== ALL ? ' hc-filter-active' : ''}`}><select aria-label={label} value={value} onChange={event => onChange(event.target.value)}><option value={ALL}>{label}</option>{options.map(option => <option key={option} value={option}>{formatOption ? formatOption(option) : option}</option>)}</select><ChevronDown size={15} aria-hidden="true" /></label>;
}

function CompanyEntry({ company, applied, recruitmentStatus, statusesLoading, removable, deleting, onViewApplications, onDelete }: {
  company: HotCompany; applied: boolean; recruitmentStatus?: CampusRecruitmentStatus; statusesLoading: boolean; removable?: boolean; deleting?: boolean; onViewApplications: (company: HotCompany) => void; onDelete?: () => void;
}) {
  const recruitment = recruitmentStatusPresentation(company, recruitmentStatus, statusesLoading);
  const suggestedEntry = company.recruitment?.entry;
  const suggestedEntryUrl = isHttpUrl(suggestedEntry) ? suggestedEntry : undefined;
  const entryUrl = suggestedEntryUrl || company.applyUrl || company.url;
  const evidenceUrl = recruitmentStatus?.evidence_url || suggestedEntryUrl || company.url;
  const industries = (company.industryTags?.length ? company.industryTags : [company.industry]).filter(Boolean).join(' · ');
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const updateDate = updateDateForCompany(company);
  const activityLabel = updateDate ? `${updateDate} 更新` : recruitmentCheckLabel(recruitmentStatus, company);
  const statusLabel = recruitment.label.replace(/^27校招/u, '').replace('已开始', '已开招').replace('未开始', '未开招').replace('即将开招/预热', '即将开招');
  const nameRef = useFittedCompanyName(company.name, statusLabel);
  const statusColors = statusLabel === '已开招'
    ? { '--status-color': '#1E7F3C', '--status-dot': '#22A35C' }
    : statusLabel === '未开招'
      ? { '--status-color': '#B7791F', '--status-dot': '#E8A33D' }
      : { '--status-color': recruitment.style.color, '--status-dot': recruitment.style.color };
  return <article className={`hc-company-entry${applied ? ' hc-company-applied' : ''}`} data-company-name={company.name} aria-label={company.name}>
    <div className="hc-company-top">
      <h2 ref={nameRef} title={company.name}>{company.name}</h2>
      <span className="hc-recruitment-label" style={statusColors as CSSProperties} title={recruitment.title}><span className="hc-status-dot" /><span>{statusLabel}</span></span>
    </div>
    <div className="hc-company-industry">{[company.companyType, industries].filter(Boolean).join(' · ') || '公司信息待补充'}</div>
    <div className="hc-company-cities">{company.city || '招聘城市待补充'}</div>
    <div className="hc-check-label">{activityLabel}</div>
    <div className="hc-company-footer">
      {isHttpUrl(entryUrl) ? <a className="hc-company-website" href={entryUrl} target="_blank" rel="noopener noreferrer" aria-label={`${company.name}招聘官网`}>招聘官网<ArrowUpRight size={14} /></a> : <span className="hc-link-unavailable">暂无官网</span>}
      <details ref={detailsRef} className="hc-row-actions" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) event.currentTarget.open = false; }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.currentTarget.open = false; event.currentTarget.querySelector('summary')?.focus(); } }}>
        <summary aria-label={`${company.name}更多操作`}><MoreHorizontal size={19} /></summary><div className="hc-row-menu">
          <p>{recruitment.title}</p>{suggestedEntry && !suggestedEntryUrl && <p>建议入口：{suggestedEntry}</p>}{company.deadlineText && <p>截止：{company.deadlineText}</p>}
          {isHttpUrl(evidenceUrl) && <a href={evidenceUrl} target="_blank" rel="noopener noreferrer">查看核查依据<ArrowUpRight size={14} /></a>}
          {applied && <button type="button" onClick={() => onViewApplications(company)}>查看投递记录</button>}
          {removable && onDelete && <button type="button" className="hc-delete-action" disabled={deleting} onClick={() => { if (detailsRef.current) detailsRef.current.open = false; onDelete(); }}>{deleting ? '正在删除…' : '删除私有公司'}</button>}
        </div>
      </details>
    </div>
  </article>;
}

/** Refit on card/panel/viewport changes and after fonts load, including a larger width. */
function useFittedCompanyName(name: string, status: string) {
  const ref = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    let disposed = false;
    let frame = 0;
    const fit = () => {
      if (disposed || !element.clientWidth) return;
      element.style.fontSize = '22px';
      if (element.scrollWidth <= element.clientWidth) return;
      // Binary search half-pixel steps; 15px still falls back to CSS ellipsis.
      let low = 0;
      let high = 13;
      let best = 15;
      while (low <= high) {
        const middle = Math.floor((low + high) / 2);
        const size = 15 + middle * .5;
        element.style.fontSize = `${size}px`;
        if (element.scrollWidth <= element.clientWidth) {
          best = size;
          low = middle + 1;
        } else high = middle - 1;
      }
      element.style.fontSize = `${best}px`;
    };
    fit();
    const scheduleFit = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit); };
    const observer = new ResizeObserver(scheduleFit);
    observer.observe(element);
    void document.fonts.ready.then(() => { if (!disposed) scheduleFit(); });
    return () => { disposed = true; observer.disconnect(); cancelAnimationFrame(frame); };
  }, [name, status]);
  return ref;
}

const primaryLink: CSSProperties = {
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

const secondaryButton: CSSProperties = {
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


function isHttpUrl(value?: string): value is string {
  return Boolean(value && /^https?:\/\//iu.test(value));
}

function recruitmentStatusPresentation(
  company: HotCompany,
  status: CampusRecruitmentStatus | undefined,
  loading: boolean,
) {
  const hasNewerAutomatedCheck = Boolean(
    company.recruitment
    && status?.last_checked_at
    && !status.evidence_text?.startsWith('【核查状态：')
    && Date.parse(status.last_checked_at) > AUDIT_OVERRIDE_AFTER,
  );

  if (company.recruitment && !hasNewerAutomatedCheck) {
    const meta = RECRUITMENT_STATUS_META[company.recruitment.status];
    return {
      label: meta.label,
      title: company.recruitment.evidence,
      style: { borderColor: meta.border, background: meta.background, color: meta.color },
    };
  }

  if (loading && !status) {
    return {
      label: '27校招查询中',
      title: '正在读取每日同步结果',
      style: { borderColor: '#d8d0c2', background: '#f3efe6', color: 'var(--sugar-ink-tertiary)' },
    };
  }

  if (status?.status === 'started') {
    return {
      label: '27校招已开始',
      title: status.evidence_text || '官网已发现 2027 届校园招聘信息；该公司已停止每日检查。',
      style: { borderColor: '#72a879', background: '#e6f3e7', color: '#2f7040' },
    };
  }

  if (status?.status === 'not_started') {
    const announced = status.evidence_text?.startsWith('【豆包调查：已公布但尚未开始');
    if (announced) {
      return {
          label: '27校招已公布',
          title: status.evidence_text || '官方已公布 2027 届校招安排，但目前尚未开放投递。',
          style: { borderColor: '#8ca6c7', background: '#eaf1fa', color: '#41658f' },
      };
    }
    return {
      label: '27校招未开始',
      title: status.last_checked_at
        ? `官网暂未发现明确的 2027 校招信息。最近检查：${new Date(status.last_checked_at).toLocaleString('zh-CN')}`
        : '官网暂未发现明确的 2027 校招信息。',
      style: { borderColor: '#d7b56f', background: '#fff4d9', color: '#89631c' },
    };
  }

  if (status?.status === 'error') {
    return {
      label: '27校招待复查',
      title: `本次官网检查失败，将自动重试。${status.error_message ? ` ${status.error_message}` : ''}`,
      style: { borderColor: '#d8a19a', background: '#fbe9e7', color: '#a14b40' },
    };
  }

  return {
    label: '27校招待确认',
    title: '等待每日自动检查；点击可先打开校招官网。',
    style: { borderColor: '#d8d0c2', background: '#f3efe6', color: '#756f65' },
  };
}

function recruitmentStatusKey(company: HotCompany, status?: CampusRecruitmentStatus): RecruitmentStatusKey {
  if (company.recruitment && status?.evidence_text?.startsWith('【核查状态：')) {
    return company.recruitment.status;
  }
  if (status?.status === 'started') return 'started';
  if (status?.status === 'not_started') return 'not_started';
  if (status?.status === 'error') return 'unknown';
  return company.recruitment?.status ?? 'unknown';
}

function recruitmentCheckLabel(status: CampusRecruitmentStatus | undefined, company: HotCompany) {
  const value = status?.last_checked_at || company.recruitment?.checkedAt;
  if (!value) return '等待首检';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '等待首检';
  return `核查 ${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
