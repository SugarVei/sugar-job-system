import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  ALL_HOT_COMPANIES,
  FEATURED_COMPANY_GROUPS,
  HOT_COMPANY_GROUPS,
  type HotCompany,
  type HotCompanyGroup,
} from '../data/hotCompanies';
import {
  type RecruitmentStatusKey,
} from '../data/campusRecruitmentAudit20260811';
import { useAppShell } from '../contexts/AppShellContext';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { useCollection } from '../hooks/useCollection';
import { useCampusRecruitmentStatuses, type CampusRecruitmentStatus } from '../hooks/useCampusRecruitmentStatuses';
import { useToast } from '../components/Toast';
import type { Application, Company, NewRecord } from '../types';
import { CARD, avatarColor, initialOf } from '../lib/appHelpers';
import { applicationCompanyMatchesHotCompany, normalizeCompanyName } from '../lib/companyName';
import { seedStatusForCompany } from '../data/campusRecruitmentSeed';
import { IconExternalLink, IconSearch, IconTrash } from '../components/icons';
import ResumeCompanyFinder from '../components/ResumeCompanyFinder';
import { useCompanyRecommendations } from '../hooks/useCompanyRecommendations';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { type ChinaMapMarker } from '../components/capital-map/ChinaCapitalChart';
import { resolveHotCompanyHq, type HotCompanyHq } from '../data/hotCompanyHq';
import './CapitalMap.css';

const ChinaCapitalChart = lazy(() => import('../components/capital-map/ChinaCapitalChart'));

const ALL = '全部';
const APPLIED_GROUP_NAME = '已投递';
const AI_GROUP_NAME = '我添加的公司';
const ALL_RECRUITMENT_STATUSES = 'all';
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

type HotCompanyViewMode = 'list' | 'map';

interface MapCompanyEntry {
  company: HotCompany;
  group: HotCompanyGroup;
  hq: HotCompanyHq | null;
}

interface MapCity {
  hq: HotCompanyHq;
  dot: string;
  companies: MapCompanyEntry[];
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

export default function HotCompanies() {
  const { setScreen, setQuery } = useAppShell();
  const { user } = useAuth();
  const { requireActiveConfig } = useApiKeys();
  const { items: savedCompanies, create, remove: removeCompany } = useCollection<Company>('companies');
  const { items: applications } = useCollection<Application>('applications');
  const { items: companyRecommendations, refresh: refreshCompanyRecommendations, remove: removeRecommendation } = useCompanyRecommendations();
  const { items: recruitmentStatuses, loading: statusesLoading } = useCampusRecruitmentStatuses();
  const toast = useToast();
  const [activeGroup, setActiveGroup] = useState(ALL);
  const [activeRecruitmentStatus, setActiveRecruitmentStatus] = useState<RecruitmentStatusKey | typeof ALL_RECRUITMENT_STATUSES>(ALL_RECRUITMENT_STATUSES);
  const [viewMode, setViewMode] = useState<HotCompanyViewMode>('list');
  const [selectedMapCity, setSelectedMapCity] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [pageSearch, setPageSearch] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiResults, setAiResults] = useState<AICompanyCandidate[]>([]);
  const [importingName, setImportingName] = useState('');
  const [importMessage, setImportMessage] = useState('');
  const [deletingName, setDeletingName] = useState('');

  const importedCompanies = useMemo(() => Array.from(
    new Map(
      companyRecommendations
        .filter((item) => item.recommendation_type === 'private')
        .map((item) => [normalizeCompanyName(item.company_name), {
          name: item.company_name,
          industry: item.industry || '其他',
          city: item.city || '',
          url: item.website || '',
        } satisfies HotCompany]),
    ).values(),
  ), [companyRecommendations]);

  const allGroups = useMemo<HotCompanyGroup[]>(() => {
    const importedGroup = importedCompanies.length > 0
      ? [{ name: AI_GROUP_NAME, dot: '#a08cb5', companies: importedCompanies }]
      : [];
    return [...FEATURED_COMPANY_GROUPS, ...HOT_COMPANY_GROUPS, ...importedGroup];
  }, [importedCompanies]);

  const existingNames = useMemo(
    () => new Set([
      ...ALL_HOT_COMPANIES.map((company) => company.name),
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

  const standardCompanyKeys = useMemo(
    () => new Set(ALL_HOT_COMPANIES.map((company) => normalizeCompanyName(company.name))),
    [],
  );

  const accountOnlyCompanies = useMemo<HotCompany[]>(
    () => importedCompanies.filter((company) => !standardCompanyKeys.has(normalizeCompanyName(company.name))),
    [importedCompanies, standardCompanyKeys],
  );

  const recruitmentOverviewCompanies = useMemo<HotCompany[]>(
    () => [...ALL_HOT_COMPANIES, ...accountOnlyCompanies],
    [accountOnlyCompanies],
  );

  const appliedCompanies = useMemo<HotCompany[]>(() => {
    const companies = new Map<string, HotCompany>();
    applications.forEach((application) => {
      const knownCompany = recruitmentOverviewCompanies.find((company) =>
        applicationCompanyMatchesHotCompany(application.company_name, company.name));
      const savedCompany = savedCompanies.find((company) =>
        company.id === application.company_id
        || applicationCompanyMatchesHotCompany(application.company_name, company.company_name));
      const company = knownCompany ?? {
        name: savedCompany?.company_name || application.company_name,
        industry: savedCompany?.industry || '其他',
        city: savedCompany?.city || application.city || '',
        url: savedCompany?.website || '',
      };
      const key = normalizeCompanyName(company.name);
      if (key && !companies.has(key)) companies.set(key, company);
    });
    return Array.from(companies.values());
  }, [applications, recruitmentOverviewCompanies, savedCompanies]);

  const groups = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    const seenCompanies = new Set<string>();
    const sourceGroups = activeGroup === ALL
      ? allGroups
      : activeGroup === APPLIED_GROUP_NAME
        ? [{ name: APPLIED_GROUP_NAME, dot: '#6f8f72', companies: appliedCompanies }]
      : allGroups.filter((group) => group.name === activeGroup);
    return sourceGroups
      .map((group) => ({
        ...group,
        companies: group.companies.filter((company) => {
          const companyKey = normalizeCompanyName(company.name);
          const dbStatus = recruitmentStatusByCompany.get(companyKey);
          if (activeRecruitmentStatus !== ALL_RECRUITMENT_STATUSES
            && recruitmentStatusKey(company, dbStatus) !== activeRecruitmentStatus) {
            return false;
          }
          const matchesSearch = !q || [company.name, company.industry, company.city, company.recruitment?.evidence, company.recruitment?.entry]
            .filter(Boolean)
            .some((value) => value!.toLowerCase().includes(q));
          if (!matchesSearch) return false;
          if (activeGroup === ALL) {
            if (seenCompanies.has(companyKey)) return false;
            seenCompanies.add(companyKey);
          }
          return true;
        }),
      }))
      .filter((group) => group.companies.length > 0);
  }, [activeGroup, activeRecruitmentStatus, allGroups, appliedCompanies, pageSearch, recruitmentStatusByCompany]);

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

  const standardCompanyCount = ALL_HOT_COMPANIES.length;
  const accountOnlyCompanyCount = accountOnlyCompanies.length;
  const recruitmentOverviewCompanyCount = recruitmentOverviewCompanies.length;

  const importedMatches = useMemo(() => {
    const q = pageSearch.trim().toLowerCase();
    if (!q) return importedCompanies;
    return importedCompanies.filter((c) => c.name.toLowerCase().includes(q));
  }, [importedCompanies, pageSearch]);

  const mapEntries = useMemo<MapCompanyEntry[]>(
    () => groups.flatMap((group) => group.companies.map((company) => ({
      company,
      group,
      hq: resolveHotCompanyHq(company),
    }))),
    [groups],
  );

  const mapCities = useMemo<MapCity[]>(() => {
    const cities = new Map<string, MapCity>();
    mapEntries.forEach((entry) => {
      if (!entry.hq) return;
      const current = cities.get(entry.hq.city);
      if (current) {
        current.companies.push(entry);
        return;
      }
      cities.set(entry.hq.city, { hq: entry.hq, dot: entry.group.dot, companies: [entry] });
    });
    return Array.from(cities.values()).sort((a, b) => a.hq.city.localeCompare(b.hq.city, 'zh-CN'));
  }, [mapEntries]);

  const mapMarkers = useMemo<ChinaMapMarker[]>(
    () => mapCities.map((city) => ({
      name: city.hq.city,
      province: city.hq.province,
      lng: city.hq.lng,
      lat: city.hq.lat,
      count: city.companies.length,
      color: city.dot,
      labelPos: city.hq.labelPos,
    })),
    [mapCities],
  );

  const selectedMapCityData = useMemo(
    () => mapCities.find((city) => city.hq.city === selectedMapCity) ?? null,
    [mapCities, selectedMapCity],
  );

  const unmappedMapEntries = useMemo(
    () => mapEntries.filter((entry) => !entry.hq),
    [mapEntries],
  );

  useEffect(() => {
    if (selectedMapCity && !mapCities.some((city) => city.hq.city === selectedMapCity)) {
      setSelectedMapCity(null);
    }
  }, [mapCities, selectedMapCity]);

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

  const handleAIKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void searchWithAI();
    }
  };

  return (
    <div className="flex flex-col gap-[22px] animate-rise">
      <section style={{ ...CARD, padding: 18, borderRadius: 22 }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div style={{ fontSize: 15, fontWeight: 750, color: '#1b1a17' }}>2027 届校招核查总览</div>
            <div style={{ fontSize: 12.5, color: '#8a8478', marginTop: 4 }}>
              标准公司 {standardCompanyCount} 家 + 我添加 {accountOnlyCompanyCount} 家 = 共 {recruitmentOverviewCompanyCount} 家 · {latestCheckLabel} · 每日自动更新
            </div>
          </div>
          {activeRecruitmentStatus !== ALL_RECRUITMENT_STATUSES && (
            <button
              type="button"
              onClick={() => setActiveRecruitmentStatus(ALL_RECRUITMENT_STATUSES)}
              className="btn-press"
              style={{ ...secondaryButton, height: 34, background: '#faf7f0' }}
            >
              查看全部状态
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2.5" style={{ marginTop: 14 }}>
          {recruitmentStatusFilters.map((status) => {
            const active = activeRecruitmentStatus === status.key;
            return (
              <button
                key={status.key}
                type="button"
                onClick={() => {
                  setActiveRecruitmentStatus(active ? ALL_RECRUITMENT_STATUSES : status.key);
                  if (!active) setActiveGroup(ALL);
                  setSelectedMapCity(null);
                }}
                aria-pressed={active}
                className="btn-press"
                style={{
                  minHeight: 68,
                  padding: '10px 12px',
                  borderRadius: 14,
                  border: `1.5px solid ${active ? status.color : status.border}`,
                  background: active ? status.color : status.background,
                  color: active ? '#fff' : status.color,
                  textAlign: 'left',
                  cursor: 'pointer',
                }}
              >
                <span style={{ display: 'block', fontFamily: 'Poppins', fontSize: 20, fontWeight: 750, lineHeight: 1 }}>
                  {status.count}
                </span>
                <span style={{ display: 'block', fontSize: 11.5, fontWeight: 700, marginTop: 7 }}>
                  {status.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <ResumeCompanyFinder standardCompanies={ALL_HOT_COMPANIES} onSaved={refreshCompanyRecommendations} />

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
        {[ALL, APPLIED_GROUP_NAME, ...allGroups.map((group) => group.name)].map((name) => {
          const active = activeGroup === name;
          return (
            <button
              key={name}
              onClick={() => {
                setActiveGroup(name);
                setSelectedMapCity(null);
              }}
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

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'inline-flex', padding: 4, border: '1px solid #e0d8c9', borderRadius: 14, background: '#faf6f0' }}>
          {([
            ['list', '列表'],
            ['map', '地图'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              className="btn-press"
              aria-pressed={viewMode === mode}
              onClick={() => {
                setViewMode(mode);
                setSelectedMapCity(null);
              }}
              style={{
                height: 32,
                padding: '0 14px',
                border: 'none',
                borderRadius: 10,
                background: viewMode === mode ? '#1b1a17' : 'transparent',
                color: viewMode === mode ? '#fffdf8' : '#6b665c',
                fontSize: 13,
                fontWeight: 750,
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <span style={{ color: '#8a8478', fontSize: 12.5 }}>
          {viewMode === 'map' ? '按总部城市查看当前分类的公司' : '按卡片浏览当前分类的公司'}
        </span>
      </div>

      {viewMode === 'list' ? (
        <>
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

      {groups.length === 0 ? (
        <div style={{ ...CARD, padding: 26, color: '#8a8478', fontSize: 14 }}>
          {pageSearch
            ? `没有名称包含「${pageSearch}」的公司。`
            : activeGroup === APPLIED_GROUP_NAME
              ? '当前账号还没有投递公司。'
              : '没有匹配的公司。'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
              {group.companies.map((company) => (
                <CompanyCard
                  key={`${group.name}-${company.name}`}
                  company={company}
                  removable={group.name === AI_GROUP_NAME}
                  deleting={deletingName === company.name}
                  applied={appliedApplicationCompanyNames.some((applicationCompanyName) =>
                    applicationCompanyMatchesHotCompany(applicationCompanyName, company.name))}
                  recruitmentStatus={resolveRecruitmentStatus(
                    company,
                    recruitmentStatusByCompany.get(normalizeCompanyName(company.name)),
                  )}
                  statusesLoading={statusesLoading}
                  onViewApplications={viewApplications}
                  onDelete={group.name === AI_GROUP_NAME ? () => void deleteImported(company) : undefined}
                />
              ))}
            </div>
          </section>
        ))
      )}
        </>
      ) : (
        <HotCompaniesMap
          activeGroup={activeGroup}
          cities={mapCities}
          markers={mapMarkers}
          selectedCity={selectedMapCityData}
          unmappedEntries={unmappedMapEntries}
          mapFailed={mapFailed}
          mapReady={mapReady}
          onMapFailed={(failed) => {
            setMapFailed(failed);
            setMapReady(!failed);
          }}
          onSelectCity={setSelectedMapCity}
          recruitmentStatusByCompany={recruitmentStatusByCompany}
          statusesLoading={statusesLoading}
        />
      )}
    </div>
  );
}


function HotCompaniesMap({
  activeGroup,
  cities,
  markers,
  selectedCity,
  unmappedEntries,
  mapFailed,
  mapReady,
  onMapFailed,
  onSelectCity,
  recruitmentStatusByCompany,
  statusesLoading,
}: {
  activeGroup: string;
  cities: MapCity[];
  markers: ChinaMapMarker[];
  selectedCity: MapCity | null;
  unmappedEntries: MapCompanyEntry[];
  mapFailed: boolean;
  mapReady: boolean;
  onMapFailed: (failed: boolean) => void;
  onSelectCity: (city: string | null) => void;
  recruitmentStatusByCompany: Map<string, CampusRecruitmentStatus>;
  statusesLoading: boolean;
}) {
  const selectedCompanies = selectedCity?.companies ?? [];
  const title = selectedCity ? selectedCity.hq.city : '选择城市查看公司';
  const description = selectedCity
    ? `${selectedCity.hq.province} · ${selectedCompanies.length} 家总部企业`
    : `当前「${activeGroup}」共有 ${cities.length} 个可落图总部城市。点击圆点查看公司。`;

  return (
    <section className="capital-map-page" aria-label="热门公司地图模式">
      <div className="capital-map-stage">
        {!mapReady && !mapFailed ? <div className="capital-map-loading">正在加载总部地图…</div> : null}
        {mapFailed ? <div className="capital-map-loading">底图未加载，右侧城市列表仍可使用</div> : null}
        <Suspense fallback={<div className="capital-map-loading">正在加载总部地图…</div>}>
          <ChinaCapitalChart
            selectedName={selectedCity?.hq.city ?? null}
            onSelect={onSelectCity}
            onMapFailed={onMapFailed}
            markers={markers}
            highlightAllProvinces
            allowProvinceSelect={false}
            ariaLabel="热门公司总部地图"
          />
        </Suspense>
      </div>

      <aside className="capital-map-panel" aria-label="热门公司总部列表">
        <div className="capital-map-panel__head">
          {selectedCity ? (
            <button type="button" className="capital-map-back" onClick={() => onSelectCity(null)}>
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
            <MapCompanyCard
              key={`${entry.group.name}-${entry.company.name}`}
              entry={entry}
              recruitmentStatus={resolveRecruitmentStatus(
                entry.company,
                recruitmentStatusByCompany.get(normalizeCompanyName(entry.company.name)),
              )}
              statusesLoading={statusesLoading}
            />
          )) : (
            <>
              <div style={{ display: 'grid', gap: 7 }}>
                {cities.map((city) => (
                  <button
                    key={city.hq.city}
                    type="button"
                    className="capital-map-chip"
                    onClick={() => onSelectCity(city.hq.city)}
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
                        href={mapCompanyUrl(entry.company)}
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
    </section>
  );
}

function MapCompanyCard({
  entry,
  recruitmentStatus,
  statusesLoading,
}: {
  entry: MapCompanyEntry;
  recruitmentStatus?: CampusRecruitmentStatus;
  statusesLoading: boolean;
}) {
  const recruitment = recruitmentStatusPresentation(entry.company, recruitmentStatus, statusesLoading);
  return (
    <article style={{ marginBottom: 9, padding: 12, border: '1px solid #e0d8c9', borderRadius: 14, background: '#fffdf8' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ color: '#1b1a17', fontSize: 14, fontWeight: 750 }}>{entry.company.name}</div>
          <div style={{ marginTop: 3, color: '#8a8478', fontSize: 12 }}>{entry.company.industry}</div>
        </div>
        <span style={{ border: `1px solid ${recruitment.style.borderColor ?? '#e0d8c9'}`, borderRadius: 999, background: recruitment.style.background, color: recruitment.style.color, padding: '3px 7px', fontSize: 10.5, fontWeight: 750, whiteSpace: 'nowrap' }}>
          {recruitment.label}
        </span>
      </div>
      <a
        href={mapCompanyUrl(entry.company)}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-press"
        style={{ ...secondaryButton, marginTop: 10, width: '100%', textDecoration: 'none' }}
      >
        校招 / 招聘链接 <IconExternalLink size={13} />
      </a>
    </article>
  );
}

function mapCompanyUrl(company: HotCompany) {
  return isHttpUrl(company.recruitment?.entry) ? company.recruitment.entry : company.url;
}


function resolveRecruitmentStatus(company: HotCompany, dbStatus?: CampusRecruitmentStatus) {
  // DB 明确已开始：以库为准
  if (dbStatus?.status === 'started') return dbStatus;
  // DB 已检查且未开始：以库为准
  if (dbStatus?.status === 'not_started' && dbStatus.last_checked_at) return dbStatus;
  // 其余（无记录 / pending / error）回落静态底库，保证卡片立刻有「已开始/未开始」
  return seedStatusForCompany(company.name, company.url);
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
  const recruitment = recruitmentStatusPresentation(company, recruitmentStatus, statusesLoading);
  const suggestedEntry = company.recruitment?.entry;
  const suggestedEntryUrl = isHttpUrl(suggestedEntry) ? suggestedEntry : undefined;
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
        gap: 12,
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
      <div
        style={{
          minHeight: 58,
          padding: '10px 11px',
          borderRadius: 12,
          border: `1px solid ${recruitment.style.borderColor ?? '#e0d8c9'}`,
          background: recruitment.style.background,
          color: recruitment.style.color,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <span style={{ fontSize: 12.5, fontWeight: 800 }}>{recruitment.label}</span>
          <span style={{ fontSize: 10.5, color: '#8a8478', whiteSpace: 'nowrap' }}>
            {recruitmentCheckLabel(recruitmentStatus, company)}
          </span>
        </div>
        <div
          title={recruitment.title}
          style={{
            marginTop: 5,
            color: '#625d54',
            fontSize: 11.5,
            lineHeight: 1.45,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {recruitment.title}
        </div>
      </div>
      {suggestedEntry && !suggestedEntryUrl && (
        <div
          title={suggestedEntry}
          style={{
            color: '#756f65',
            fontSize: 11.5,
            lineHeight: 1.45,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          建议入口：{suggestedEntry}
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <a href={suggestedEntryUrl || company.url} target="_blank" rel="noopener noreferrer" className="btn-press" style={primaryLink}>
          建议入口 <IconExternalLink size={13} />
        </a>
        <a
          href={recruitmentStatus?.evidence_url || suggestedEntryUrl || company.url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-press"
          style={recruitmentButton}
          aria-label={`${company.name}查看核查依据`}
          title={recruitment.title}
        >
          核查依据
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
  minWidth: 84,
  padding: '0 10px',
  textDecoration: 'none',
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
      style: { borderColor: '#d8d0c2', background: '#f3efe6', color: '#8a8478' },
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
