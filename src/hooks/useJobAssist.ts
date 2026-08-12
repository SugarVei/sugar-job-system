import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type {
  InterviewFeedback,
  JobAssistCampaign,
  JobAssistInterviewSession,
  JobAssistJdAnalysis,
  JobAssistJdMatch,
  JobAssistPreferences,
  JobAssistProfile,
  JobAssistRoute,
  MockInterviewQuestion,
  TailoringResult,
} from '../types/jobAssist';

function errorMessage(error: unknown) {
  const raw = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message)
    : String(error ?? '未知错误');
  if (/job_assist_|campaign_id|hard_requirements|tailored_draft|schema cache|does not exist/i.test(raw)) {
    return '数据库尚未安装求职辅助表。请先执行最新的 job_assist_mvp migration。';
  }
  if (/row-level security|permission denied/i.test(raw)) return '账号权限校验失败，请重新登录后重试。';
  if (/failed to fetch|network/i.test(raw)) return '无法连接 Supabase，请检查网络和环境变量。';
  return raw;
}

function normalizeJdMatch(row: Record<string, unknown>): JobAssistJdMatch {
  return {
    ...(row as unknown as JobAssistJdMatch),
    eligible: Boolean(row.eligible),
    match_score: typeof row.match_score === 'number' ? row.match_score : null,
    match_level: (row.match_level as JobAssistJdMatch['match_level']) ?? '低匹配',
    hard_requirements: (row.hard_requirements as JobAssistJdMatch['hard_requirements']) ?? [],
    score_breakdown: (row.score_breakdown as Record<string, number>) ?? {},
    coverage: typeof row.coverage === 'number' ? row.coverage : 0,
    confidence: (row.confidence as JobAssistJdMatch['confidence']) ?? 'low',
    evidence: (row.evidence as string[]) ?? [],
    presentation_gaps: (row.presentation_gaps as string[]) ?? [],
    information_gaps: (row.information_gaps as string[]) ?? [],
    capability_gaps: (row.capability_gaps as string[]) ?? [],
    next_steps: (row.next_steps as string[]) ?? [],
    summary: String(row.analysis_summary ?? ''),
    jd_requirements: (row.jd_requirements as string[]) ?? [],
    skill_keywords: (row.skill_keywords as string[]) ?? [],
    tailoring_suggestions: (row.tailoring_suggestions as string[]) ?? [],
    tailored_draft: typeof row.tailored_draft === 'string' ? row.tailored_draft : null,
  };
}

export function useJobAssist(resumeId: string) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<JobAssistCampaign | null>(null);
  const [jdMatches, setJdMatches] = useState<JobAssistJdMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const refresh = useCallback(async () => {
    if (!user || !isSupabaseConfigured) {
      setCampaign(null);
      setJdMatches([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [campaignResult, jdResult] = await Promise.all([
        supabase
          .from('job_assist_campaigns')
          .select('*')
          .eq('user_id', user.id)
          .eq('resume_id', resumeId)
          .maybeSingle(),
        supabase
          .from('jd_matches')
          .select('*')
          .eq('user_id', user.id)
          .eq('resume_id', resumeId)
          .not('campaign_id', 'is', null)
          .order('created_at', { ascending: false }),
      ]);
      if (campaignResult.error) throw campaignResult.error;
      if (jdResult.error) throw jdResult.error;
      setCampaign((campaignResult.data as JobAssistCampaign | null) ?? null);
      setJdMatches(((jdResult.data ?? []) as Record<string, unknown>[]).map(normalizeJdMatch));
    } catch (caught) {
      setError(errorMessage(caught));
    } finally {
      setLoading(false);
    }
  }, [resumeId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const saveCampaign = useCallback(async (route: JobAssistRoute, resumeFileId?: string | null) => {
    if (!user) throw new Error('未登录');
    if (!isSupabaseConfigured) throw new Error('Supabase 尚未配置，无法保存求职辅助数据。');
    const { data, error: saveError } = await supabase
      .from('job_assist_campaigns')
      .upsert(
        {
          user_id: user.id,
          resume_id: resumeId,
          route,
          ...(resumeFileId !== undefined ? { resume_file_id: resumeFileId } : {}),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,resume_id' },
      )
      .select()
      .single();
    if (saveError) throw new Error(errorMessage(saveError));
    setCampaign(data as JobAssistCampaign);
    return data as JobAssistCampaign;
  }, [resumeId, user]);

  const updateCampaign = useCallback(async (payload: Record<string, unknown>) => {
    if (!user || !campaign) throw new Error('请先选择校招或社招并建立 Campaign。');
    const { data, error: saveError } = await supabase
      .from('job_assist_campaigns')
      .update({ ...payload, updated_at: new Date().toISOString() })
      .eq('id', campaign.id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (saveError) throw new Error(errorMessage(saveError));
    setCampaign(data as JobAssistCampaign);
    return data as JobAssistCampaign;
  }, [campaign, user]);

  const saveProfile = useCallback((profile: JobAssistProfile, confirmedFacts: string[], confirmed: boolean) => (
    updateCampaign({ profile, confirmed_facts: confirmedFacts, profile_confirmed: confirmed })
  ), [updateCampaign]);

  const savePreferences = useCallback((preferences: JobAssistPreferences) => (
    updateCampaign({ preferences })
  ), [updateCampaign]);

  const createJdMatch = useCallback(async ({
    companyName,
    positionName,
    city,
    jdText,
    analysis,
  }: {
    companyName: string;
    positionName: string;
    city: string;
    jdText: string;
    analysis: JobAssistJdAnalysis;
  }) => {
    if (!user || !campaign) throw new Error('请先完成 Campaign 设置。');
    const recommendAction = !analysis.eligible
      ? '不建议优先投递'
      : (analysis.match_score ?? 0) >= 70 ? '建议投递' : '建议修改后投递';
    const { data, error: saveError } = await supabase
      .from('jd_matches')
      .insert({
        user_id: user.id,
        campaign_id: campaign.id,
        resume_id: resumeId,
        company_name: companyName || null,
        position_name: positionName || null,
        city: city || null,
        jd_text: jdText,
        jd_requirements: analysis.jd_requirements,
        skill_keywords: analysis.skill_keywords,
        match_score: analysis.match_score,
        match_level: analysis.match_level,
        recommend_action: recommendAction,
        matched_keywords: analysis.skill_keywords,
        missing_keywords: analysis.capability_gaps,
        strong_exp: analysis.evidence,
        weak_exp: [...analysis.presentation_gaps, ...analysis.information_gaps],
        suggestions: analysis.next_steps,
        analysis_summary: analysis.summary,
        analysis_method: `AI ${campaign.route === 'campus' ? '校招' : '社招'}硬门槛评分`,
        eligible: analysis.eligible,
        hard_requirements: analysis.hard_requirements,
        score_breakdown: analysis.score_breakdown,
        evidence: analysis.evidence,
        coverage: analysis.coverage,
        confidence: analysis.confidence,
        presentation_gaps: analysis.presentation_gaps,
        information_gaps: analysis.information_gaps,
        capability_gaps: analysis.capability_gaps,
        next_steps: analysis.next_steps,
      })
      .select()
      .single();
    if (saveError) throw new Error(errorMessage(saveError));
    const normalized = normalizeJdMatch(data as Record<string, unknown>);
    setJdMatches((current) => [normalized, ...current]);
    return normalized;
  }, [campaign, resumeId, user]);

  const saveTailoring = useCallback(async (jdMatchId: string, result: TailoringResult) => {
    if (!user) throw new Error('未登录');
    const { data, error: saveError } = await supabase
      .from('jd_matches')
      .update({ tailoring_suggestions: result.suggestions, tailored_draft: result.revised_draft })
      .eq('id', jdMatchId)
      .eq('user_id', user.id)
      .select()
      .single();
    if (saveError) throw new Error(errorMessage(saveError));
    const normalized = normalizeJdMatch(data as Record<string, unknown>);
    setJdMatches((current) => current.map((item) => item.id === jdMatchId ? normalized : item));
    return normalized;
  }, [user]);

  const linkApplication = useCallback(async (jdMatchId: string, applicationId: string, applied: boolean) => {
    if (!user) throw new Error('未登录');
    const { error: saveError } = await supabase
      .from('jd_matches')
      .update({ application_id: applicationId, applied })
      .eq('id', jdMatchId)
      .eq('user_id', user.id);
    if (saveError) throw new Error(errorMessage(saveError));
    setJdMatches((current) => current.map((item) => item.id === jdMatchId
      ? { ...item, application_id: applicationId }
      : item));
  }, [user]);

  const createInterviewSession = useCallback(async (
    jdMatchId: string,
    plan: MockInterviewQuestion[],
    applicationId?: string | null,
  ) => {
    if (!user || !campaign) throw new Error('请先完成 Campaign 设置。');
    const { data, error: saveError } = await supabase
      .from('job_assist_interview_sessions')
      .insert({
        user_id: user.id,
        campaign_id: campaign.id,
        resume_id: resumeId,
        jd_match_id: jdMatchId,
        application_id: applicationId ?? null,
        total_questions: plan.length,
        plan,
      })
      .select()
      .single();
    if (saveError) throw new Error(errorMessage(saveError));
    return data as JobAssistInterviewSession;
  }, [campaign, resumeId, user]);

  const saveInterviewFeedback = useCallback(async ({
    session,
    question,
    questionIndex,
    feedback,
    complete,
  }: {
    session: JobAssistInterviewSession;
    question: MockInterviewQuestion;
    questionIndex: number;
    feedback: InterviewFeedback;
    complete: boolean;
  }) => {
    if (!user) throw new Error('未登录');
    const { error: questionError } = await supabase
      .from('job_assist_interview_questions')
      .upsert({
        user_id: user.id,
        session_id: session.id,
        question_index: questionIndex,
        question_type: question.type,
        question_text: question.question,
        scores: feedback.scores,
        total_score: feedback.total_score,
        issue_tags: feedback.issue_tags,
        improvement_summary: feedback.improvement_summary,
      }, { onConflict: 'session_id,question_index' });
    if (questionError) throw new Error(errorMessage(questionError));

    const { data, error: sessionError } = await supabase
      .from('job_assist_interview_sessions')
      .update({
        current_question: complete ? questionIndex : questionIndex + 1,
        status: complete ? 'completed' : 'in_progress',
        ...(complete ? { summary: { completed_questions: questionIndex } } : {}),
      })
      .eq('id', session.id)
      .eq('user_id', user.id)
      .select()
      .single();
    if (sessionError) throw new Error(errorMessage(sessionError));
    return data as JobAssistInterviewSession;
  }, [user]);

  return {
    campaign,
    jdMatches,
    loading,
    error,
    refresh,
    saveCampaign,
    saveProfile,
    savePreferences,
    createJdMatch,
    saveTailoring,
    linkApplication,
    createInterviewSession,
    saveInterviewFeedback,
  };
}

