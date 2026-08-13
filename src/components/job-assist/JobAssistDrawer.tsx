import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Application, ApplicationStatus, Resume, ResumeFile } from '../../types';
import type {
  InterviewFeedback,
  JobAssistInterviewSession,
  JobAssistJdMatch,
  JobAssistPreferences,
  JobAssistProfile,
  JobAssistRoute,
} from '../../types/jobAssist';
import { useApiKeys } from '../../contexts/ApiKeysContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useJobAssist } from '../../hooks/useJobAssist';
import { extractResumeText } from '../../lib/resumeText';
import {
  analyzeJd,
  analyzeResumeProfile,
  createInterviewPlan,
  scoreInterviewAnswer,
  tailorResumeForJd,
} from '../../lib/jobAssistAI';
import { Field, FormError, GhostButton, PrimaryButton, Select, TextArea, TextInput } from '../Field';

const STEPS = ['路径', '简历画像', '求职偏好', 'JD 匹配', '定制与投递', '模拟面试'];

const EMPTY_PREFERENCES: JobAssistPreferences = {
  cities: '',
  directions: '',
  industries: '',
  preferred_companies: '',
  excluded_companies: '',
  daily_quota: 5,
};

const APPLICATION_STATUSES: Array<{ value: ApplicationStatus; label: string }> = [
  { value: '待投递', label: '意向 / 待投递' },
  { value: '已投递', label: '已投递' },
  { value: '在线测评', label: '在线测评' },
  { value: 'AI面', label: 'AI 面' },
  { value: 'HR面', label: 'HR 面' },
  { value: '一面', label: '一面' },
  { value: '二面', label: '二面' },
  { value: 'Offer', label: 'Offer' },
  { value: '待跟进', label: '待跟进' },
];

interface JobAssistDrawerProps {
  open: boolean;
  resume: Resume;
  files: ResumeFile[];
  onClose: () => void;
  getDownloadUrl: (filePath: string) => Promise<string>;
  onCreateApplication: (payload: Record<string, unknown>) => Promise<Application>;
  onCreateResumeVersion: (name: string, targetPosition: string, notes: string, draft: string) => Promise<void>;
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function asProfile(value: JobAssistProfile | Record<string, never> | undefined): JobAssistProfile | null {
  return value && Array.isArray((value as JobAssistProfile).snapshot) ? value as JobAssistProfile : null;
}

function asPreferences(value: JobAssistPreferences | Record<string, never> | undefined) {
  return value && Object.keys(value).length > 0
    ? { ...EMPTY_PREFERENCES, ...value }
    : EMPTY_PREFERENCES;
}

function routeName(route: JobAssistRoute | null) {
  return route === 'campus' ? '校招' : route === 'social' ? '社招' : '未选择';
}

function clampQuota(value: number) {
  if (!Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(20, Math.round(value)));
}

export default function JobAssistDrawer(props: JobAssistDrawerProps) {
  const { open, resume, files, onClose, getDownloadUrl, onCreateApplication, onCreateResumeVersion } = props;
  const { theme } = useTheme();
  const { requireActiveConfig } = useApiKeys();
  const assist = useJobAssist(resume.id);
  const resumeFiles = useMemo(
    () => files.filter((file) => file.kind === 'resume' && file.source !== 'ai' && file.file_path),
    [files],
  );
  const [step, setStep] = useState(0);
  const [route, setRoute] = useState<JobAssistRoute | null>(null);
  const [selectedResumeFileId, setSelectedResumeFileId] = useState('');
  const [profile, setProfile] = useState<JobAssistProfile | null>(null);
  const [correction, setCorrection] = useState('');
  const [preferences, setPreferences] = useState<JobAssistPreferences>(EMPTY_PREFERENCES);
  const [companyName, setCompanyName] = useState('');
  const [positionName, setPositionName] = useState(resume.target_position ?? '');
  const [city, setCity] = useState('');
  const [jdText, setJdText] = useState('');
  const [selectedJdId, setSelectedJdId] = useState('');
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus>('待投递');
  const [applicationNotes, setApplicationNotes] = useState('');
  const [savedApplicationId, setSavedApplicationId] = useState('');
  const [session, setSession] = useState<JobAssistInterviewSession | null>(null);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [working, setWorking] = useState('');
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const selectedResumeFile = resumeFiles.find((file) => file.id === selectedResumeFileId) ?? resumeFiles[0];
  const selectedJd = assist.jdMatches.find((item) => item.id === selectedJdId) ?? assist.jdMatches[0] ?? null;

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !working) onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose, open, working]);

  useEffect(() => {
    if (!assist.campaign) return;
    setRoute(assist.campaign.route);
    setSelectedResumeFileId(assist.campaign.resume_file_id ?? resumeFiles[0]?.id ?? '');
    setProfile(asProfile(assist.campaign.profile));
    setPreferences(asPreferences(assist.campaign.preferences));
  }, [assist.campaign, resumeFiles]);

  useEffect(() => {
    if (!selectedResumeFileId && resumeFiles[0]) setSelectedResumeFileId(resumeFiles[0].id);
  }, [resumeFiles, selectedResumeFileId]);

  useEffect(() => {
    if (!selectedJdId && assist.jdMatches[0]) setSelectedJdId(assist.jdMatches[0].id);
  }, [assist.jdMatches, selectedJdId]);

  const requireAI = () => requireActiveConfig('AI 求职辅助');

  const readResume = async () => {
    if (!selectedResumeFile) throw new Error('请先上传并选择一份 PDF 或 DOCX 简历。');
    const text = await extractResumeText(selectedResumeFile, getDownloadUrl);
    if (!text.trim()) throw new Error('简历内容为空或无法解析，请换一份可读取的文件。');
    return text;
  };

  const runAction = async (label: string, action: () => Promise<void>) => {
    setWorking(label);
    setActionError('');
    setNotice('');
    try {
      await action();
    } catch (error) {
      setActionError(toMessage(error));
    } finally {
      setWorking('');
    }
  };

  const chooseRoute = (nextRoute: JobAssistRoute) => runAction('正在保存求职路径…', async () => {
    await assist.saveCampaign(nextRoute, selectedResumeFile?.id ?? null);
    setRoute(nextRoute);
    setProfile(null);
    setStep(1);
    setNotice(`已建立${routeName(nextRoute)} Campaign。`);
  });

  const analyzeProfile = (corrections?: string) => runAction('正在读取并分析简历…', async () => {
    if (!route) throw new Error('请先选择校招或社招。');
    const config = requireAI();
    if (!config) return;
    const resumeText = await readResume();
    await assist.saveCampaign(route, selectedResumeFile.id);
    const nextFacts = corrections?.trim()
      ? Array.from(new Set([...(assist.campaign?.confirmed_facts ?? []), corrections.trim()]))
      : assist.campaign?.confirmed_facts ?? [];
    const result = await analyzeResumeProfile({ config, route, resumeText, corrections });
    await assist.saveProfile(result, nextFacts, false);
    setProfile(result);
    setCorrection('');
    setNotice(corrections ? '已按你的更正重新生成画像，请再次确认。' : '画像分析完成，请检查后确认。');
  });

  const confirmProfile = () => runAction('正在确认画像…', async () => {
    if (!profile) throw new Error('请先完成简历画像分析。');
    await assist.saveProfile(profile, assist.campaign?.confirmed_facts ?? [], true);
    setStep(2);
    setNotice('画像已确认。后续 AI 只会使用简历和已确认事实。');
  });

  const persistPreferences = () => runAction('正在保存求职偏好…', async () => {
    if (!preferences.cities.trim() || !preferences.directions.trim()) {
      throw new Error('请至少填写目标城市和目标方向。');
    }
    const next = { ...preferences, daily_quota: clampQuota(preferences.daily_quota) };
    await assist.savePreferences(next);
    setPreferences(next);
    setStep(3);
    setNotice('偏好已按当前账号和简历版本保存。');
  });

  const runJdAnalysis = () => runAction('正在检查硬门槛并评分…', async () => {
    if (!route || !profile || !assist.campaign?.profile_confirmed) throw new Error('请先完成并确认简历画像。');
    if (jdText.trim().length < 80) throw new Error('JD 内容过短，请粘贴完整的岗位职责和任职要求。');
    const config = requireAI();
    if (!config) return;
    const resumeText = await readResume();
    const analysis = await analyzeJd({
      config,
      route,
      resumeText,
      profile,
      confirmedFacts: assist.campaign.confirmed_facts,
      preferences,
      jdText,
    });
    const saved = await assist.createJdMatch({ companyName, positionName, city, jdText, analysis });
    setSelectedJdId(saved.id);
    setStep(4);
    setNotice('JD 匹配结果已保存，可继续生成定制草稿或记录投递。');
  });

  const runTailoring = () => runAction('正在生成定制简历草稿…', async () => {
    if (!selectedJd || !route || !assist.campaign) throw new Error('请先完成一份 JD 匹配分析。');
    const config = requireAI();
    if (!config) return;
    const resumeText = await readResume();
    const result = await tailorResumeForJd({
      config,
      resumeText,
      confirmedFacts: assist.campaign.confirmed_facts,
      jdText: selectedJd.jd_text,
      analysis: selectedJd,
    });
    await assist.saveTailoring(selectedJd.id, result);
    setNotice('定制建议和文字草稿已保存。信息缺口与能力缺口没有写入草稿。');
  });

  const saveResumeVersion = () => runAction('正在保存简历版本…', async () => {
    if (!selectedJd?.tailored_draft) throw new Error('请先生成定制简历草稿。');
    const target = selectedJd.position_name || resume.target_position || '目标岗位';
    const company = selectedJd.company_name ? `${selectedJd.company_name}-` : '';
    const versionName = `${resume.resume_name}-${company}${target}定制版`;
    await onCreateResumeVersion(
      versionName,
      target,
      `由“${resume.resume_name}”针对 ${company}${target} 生成的文字定制版；仅使用已确认事实。`,
      selectedJd.tailored_draft,
    );
    setNotice(`已在简历库新增“${versionName}”，原上传逻辑未改变。`);
  });

  const saveApplication = () => runAction('正在写入投递记录…', async () => {
    if (!selectedJd) throw new Error('请先选择一份 JD 匹配结果。');
    if (!selectedJd.company_name || !selectedJd.position_name) throw new Error('记录投递前请补全公司和岗位名称并重新分析 JD。');
    const submitted = applicationStatus !== '待投递';
    const nextActionAt = submitted ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() : null;
    const application = await onCreateApplication({
      company_id: null,
      company_name: selectedJd.company_name,
      position_name: selectedJd.position_name,
      city: selectedJd.city,
      channel: '求职辅助',
      apply_date: submitted ? new Date().toISOString().slice(0, 10) : null,
      status: applicationStatus,
      salary_range: null,
      job_url: selectedJd.job_url,
      notes: applicationNotes || '由简历库“求职辅助”记录。最终提交仍由本人完成。',
      resume_id: resume.id,
      jd_text: selectedJd.jd_text,
      jd_keywords: selectedJd.skill_keywords,
      match_score: selectedJd.match_score,
      match_summary: selectedJd.summary,
      next_action: submitted ? '查看投递状态' : '本人确认后再提交',
      next_action_at: nextActionAt,
      deadline_at: null,
      priority: 'normal',
    });
    await assist.linkApplication(selectedJd.id, application.id, submitted);
    setSavedApplicationId(application.id);
    setNotice(`已写入现有投递记录，状态为“${APPLICATION_STATUSES.find((item) => item.value === applicationStatus)?.label}”。`);
  });

  const startInterview = () => runAction('正在准备 3 道模拟面试题…', async () => {
    if (!selectedJd || !route || !assist.campaign) throw new Error('请先完成一份 JD 匹配分析。');
    const config = requireAI();
    if (!config) return;
    const resumeText = await readResume();
    const plan = await createInterviewPlan({
      config,
      route,
      resumeText,
      confirmedFacts: assist.campaign.confirmed_facts,
      jdText: selectedJd.jd_text,
      count: 3,
    });
    if (!Array.isArray(plan) || plan.length < 3) throw new Error('AI 返回题目不足 3 道，请重试。');
    const nextSession = await assist.createInterviewSession(selectedJd.id, plan.slice(0, 3), savedApplicationId || selectedJd.application_id);
    setSession(nextSession);
    setQuestionIndex(0);
    setAnswer('');
    setFeedback(null);
    setScores([]);
    setNotice('模拟面试已开始。一次只展示一题；回答原文不会写入数据库。');
  });

  const scoreAnswer = () => runAction('正在评分并给出改进建议…', async () => {
    if (!session || !selectedJd || !assist.campaign) throw new Error('请先开始模拟面试。');
    if (answer.trim().length < 10) throw new Error('回答过短，请先完整回答当前问题。');
    const config = requireAI();
    if (!config) return;
    const question = session.plan[questionIndex];
    const resumeText = await readResume();
    const result = await scoreInterviewAnswer({
      config,
      question,
      answer,
      resumeText,
      confirmedFacts: assist.campaign.confirmed_facts,
      jdText: selectedJd.jd_text,
    });
    const complete = questionIndex + 1 >= session.plan.length;
    const updatedSession = await assist.saveInterviewFeedback({
      session,
      question,
      questionIndex: questionIndex + 1,
      feedback: result,
      complete,
    });
    setSession(updatedSession);
    setFeedback(result);
    setScores((current) => [...current.slice(0, questionIndex), result.total_score]);
    setAnswer('');
    if (complete) setNotice('已完成 3 题模拟面试；数据库仅保存分数和简短改进摘要。');
  });

  const goNextQuestion = () => {
    setQuestionIndex((current) => Math.min(current + 1, (session?.plan.length ?? 1) - 1));
    setFeedback(null);
    setAnswer('');
    setActionError('');
  };

  if (!open) return null;

  const averageScore = scores.length
    ? Math.round(scores.reduce((total, score) => total + score, 0) / scores.length)
    : 0;

  return createPortal(
    <div style={overlayStyle} onMouseDown={(event) => event.target === event.currentTarget && !working && onClose()}>
      <aside role="dialog" aria-modal="true" aria-label={`${resume.resume_name} 求职辅助`} style={drawerStyle}>
        <header style={headerStyle}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#1b1a17' }}>✨ 求职辅助</div>
            <div style={{ fontSize: 12.5, color: '#8a8478', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              当前简历：{resume.resume_name} · {routeName(route)}
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={Boolean(working)} aria-label="关闭求职辅助" style={closeButtonStyle}>✕</button>
        </header>

        <nav aria-label="求职辅助步骤" style={stepNavStyle}>
          {STEPS.map((label, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(index)}
              className="btn-press"
              style={{
                ...stepButtonStyle,
                background: index === step ? theme.accentSoft : '#faf7f0',
                borderColor: index === step ? theme.accent : '#e8e0d2',
                color: index === step ? theme.accent : '#706a60',
              }}
            >
              <span style={{ fontSize: 11 }}>{index + 1}</span>{label}
            </button>
          ))}
        </nav>

        <main style={bodyStyle}>
          {assist.loading ? (
            <StatusPanel text="正在读取当前简历的求职辅助数据…" />
          ) : resumeFiles.length === 0 ? (
            <EmptyResumePanel />
          ) : (
            <>
              <FormError message={assist.error || actionError} />
              {assist.error && <div style={{ marginBottom: 14 }}><GhostButton onClick={assist.refresh}>重试读取</GhostButton></div>}
              {notice && <Notice text={notice} />}
              {working && <StatusPanel text={working} />}

              <Field label="本次使用的简历文件">
                <Select value={selectedResumeFile?.id ?? ''} onChange={(event) => setSelectedResumeFileId(event.target.value)} disabled={Boolean(working)}>
                  {resumeFiles.map((file) => <option key={file.id} value={file.id}>{file.file_name}</option>)}
                </Select>
              </Field>

              {step === 0 && <RouteStep route={route} busy={Boolean(working)} onChoose={chooseRoute} />}
              {step === 1 && (
                <ProfileStep
                  profile={profile}
                  confirmed={Boolean(assist.campaign?.profile_confirmed)}
                  correction={correction}
                  busy={Boolean(working)}
                  accent={theme.accent}
                  onCorrectionChange={setCorrection}
                  onAnalyze={() => analyzeProfile()}
                  onApplyCorrection={() => analyzeProfile(correction)}
                  onConfirm={confirmProfile}
                />
              )}
              {step === 2 && (
                <PreferencesStep
                  route={route}
                  value={preferences}
                  busy={Boolean(working)}
                  accent={theme.accent}
                  onChange={setPreferences}
                  onSave={persistPreferences}
                />
              )}
              {step === 3 && (
                <JdStep
                  jdMatches={assist.jdMatches}
                  selectedJdId={selectedJd?.id ?? ''}
                  companyName={companyName}
                  positionName={positionName}
                  city={city}
                  jdText={jdText}
                  busy={Boolean(working)}
                  accent={theme.accent}
                  onSelectJd={setSelectedJdId}
                  onCompanyName={setCompanyName}
                  onPositionName={setPositionName}
                  onCity={setCity}
                  onJdText={setJdText}
                  onAnalyze={runJdAnalysis}
                />
              )}
              {step === 4 && (
                <TailoringAndApplicationStep
                  jd={selectedJd}
                  status={applicationStatus}
                  notes={applicationNotes}
                  busy={Boolean(working)}
                  accent={theme.accent}
                  onStatus={setApplicationStatus}
                  onNotes={setApplicationNotes}
                  onTailor={runTailoring}
                  onSaveVersion={saveResumeVersion}
                  onSaveApplication={saveApplication}
                />
              )}
              {step === 5 && (
                <InterviewStep
                  jd={selectedJd}
                  session={session}
                  questionIndex={questionIndex}
                  answer={answer}
                  feedback={feedback}
                  averageScore={averageScore}
                  busy={Boolean(working)}
                  accent={theme.accent}
                  onAnswer={setAnswer}
                  onStart={startInterview}
                  onScore={scoreAnswer}
                  onRetry={() => setFeedback(null)}
                  onNext={goNextQuestion}
                />
              )}
            </>
          )}
        </main>

        <footer style={footerStyle}>
          <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: '#8a8478' }}>
            安全边界：不自动最终提交；不处理密码、验证码、身份证、银行卡、健康/犯罪/征信、电子签名或法律声明；不生成或换脸证件照。
          </p>
        </footer>
      </aside>
    </div>,
    document.body,
  );
}

function RouteStep({ route, busy, onChoose }: { route: JobAssistRoute | null; busy: boolean; onChoose: (route: JobAssistRoute) => void }) {
  return (
    <StepSection title="先选择求职路径" intro="路径会决定画像问题、硬门槛和 JD 评分权重。一个简历版本对应一条独立 Campaign。">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {([
          ['campus', '🎓 校招', '应届、秋招/春招、实习转正'],
          ['social', '💼 社招', '跳槽、转行、正式工作机会'],
        ] as const).map(([value, title, detail]) => (
          <button key={value} type="button" disabled={busy} onClick={() => onChoose(value)} className="btn-press" style={{ ...choiceCardStyle, borderColor: route === value ? '#8f6bd8' : '#e5ddcf', background: route === value ? '#f3effc' : '#faf7f0' }}>
            <strong style={{ fontSize: 16 }}>{title}</strong><span style={{ fontSize: 12.5, color: '#8a8478' }}>{detail}</span>
          </button>
        ))}
      </div>
    </StepSection>
  );
}

function ProfileStep(props: {
  profile: JobAssistProfile | null;
  confirmed: boolean;
  correction: string;
  busy: boolean;
  accent: string;
  onCorrectionChange: (value: string) => void;
  onAnalyze: () => void;
  onApplyCorrection: () => void;
  onConfirm: () => void;
}) {
  const { profile, confirmed, correction, busy, accent, onCorrectionChange, onAnalyze, onApplyCorrection, onConfirm } = props;
  return (
    <StepSection title="简历画像分析" intro="结论只能来自当前简历。请先检查，再确认或写明更正。">
      {!profile ? (
        <PrimaryButton accent={accent} onClick={onAnalyze} disabled={busy}>分析当前简历</PrimaryButton>
      ) : (
        <div className="flex flex-col gap-3">
          {confirmed && <Notice text="画像已由你确认。" />}
          <ResultBlock title="画像速览" items={profile.snapshot} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <ResultBlock title="有证据的优势" items={profile.strengths.map((item) => `${item.conclusion} —— ${item.evidence}`)} />
            <ResultBlock title="短板与影响" items={profile.weaknesses.map((item) => `${item.gap} —— ${item.impact}`)} tone="warning" />
          </div>
          <div style={resultBlockStyle}>
            <strong>推荐方向</strong>
            {profile.directions.map((direction, index) => (
              <div key={`${direction.title}-${index}`} style={{ paddingTop: 10 }}>
                <div style={{ fontWeight: 700 }}>{direction.primary || index === 0 ? '主推 · ' : ''}{direction.title}</div>
                <div style={mutedStyle}>{direction.typical_titles.join(' / ')}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{direction.reason}</div>
              </div>
            ))}
          </div>
          {profile.needs_confirmation.length > 0 && <ResultBlock title="仍需确认" items={profile.needs_confirmation} tone="warning" />}
          <Field label="发现事实错误？写下正确说法（会作为已确认事实保存）">
            <TextArea value={correction} onChange={(event) => onCorrectionChange(event.target.value)} placeholder="例如：我不是独立负责整个项目，而是负责需求分析和上线验收。" />
          </Field>
          <div className="flex flex-wrap justify-end gap-2">
            <GhostButton onClick={onApplyCorrection} disabled={busy || !correction.trim()}>应用更正并重新分析</GhostButton>
            <PrimaryButton accent={accent} onClick={onConfirm} disabled={busy}>确认画像并继续</PrimaryButton>
          </div>
        </div>
      )}
    </StepSection>
  );
}

function PreferencesStep({ route, value, busy, accent, onChange, onSave }: {
  route: JobAssistRoute | null;
  value: JobAssistPreferences;
  busy: boolean;
  accent: string;
  onChange: (value: JobAssistPreferences) => void;
  onSave: () => void;
}) {
  const set = (key: keyof JobAssistPreferences, next: string | number) => onChange({ ...value, [key]: next });
  return (
    <StepSection title={`${routeName(route)}求职偏好`} intro="每日推荐数量是上限，不会用低质量岗位凑数。">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
        <Field label="目标城市 / 远程 *"><TextInput value={value.cities} onChange={(event) => set('cities', event.target.value)} placeholder="如：深圳、广州，可远程" /></Field>
        <Field label="目标方向 *"><TextInput value={value.directions} onChange={(event) => set('directions', event.target.value)} placeholder="如：数据产品、商业分析" /></Field>
        <Field label="意向行业"><TextInput value={value.industries} onChange={(event) => set('industries', event.target.value)} placeholder="如：互联网、企业服务" /></Field>
        <Field label="每天最多推荐"><TextInput type="number" min={1} max={20} value={value.daily_quota} onChange={(event) => set('daily_quota', Number(event.target.value))} /></Field>
        <Field label="意向公司"><TextInput value={value.preferred_companies} onChange={(event) => set('preferred_companies', event.target.value)} placeholder="可留空" /></Field>
        <Field label="排除公司"><TextInput value={value.excluded_companies} onChange={(event) => set('excluded_companies', event.target.value)} placeholder="可留空" /></Field>
        {route === 'campus' ? (
          <>
            <Field label="毕业届别"><TextInput value={value.graduation_year ?? ''} onChange={(event) => set('graduation_year', event.target.value)} placeholder="如：2027 届" /></Field>
            <Field label="招聘季"><TextInput value={value.recruitment_season ?? ''} onChange={(event) => set('recruitment_season', event.target.value)} placeholder="如：2026 秋招" /></Field>
            <Field label="岗位类型"><TextInput value={value.job_type ?? ''} onChange={(event) => set('job_type', event.target.value)} placeholder="正式校招 / 实习" /></Field>
            <Field label="学历专业限制"><TextInput value={value.education_constraints ?? ''} onChange={(event) => set('education_constraints', event.target.value)} placeholder="按真实情况填写" /></Field>
          </>
        ) : (
          <>
            <Field label="工作年限"><TextInput value={value.years_experience ?? ''} onChange={(event) => set('years_experience', event.target.value)} placeholder="如：2 年" /></Field>
            <Field label="目标职级"><TextInput value={value.target_level ?? ''} onChange={(event) => set('target_level', event.target.value)} placeholder="如：产品经理" /></Field>
            <Field label="是否接受转行业"><TextInput value={value.switch_industry ?? ''} onChange={(event) => set('switch_industry', event.target.value)} placeholder="接受 / 不接受" /></Field>
            <Field label="到岗时间"><TextInput value={value.availability ?? ''} onChange={(event) => set('availability', event.target.value)} placeholder="如：一个月内" /></Field>
          </>
        )}
      </div>
      <div className="flex justify-end"><PrimaryButton accent={accent} onClick={onSave} disabled={busy}>保存偏好并继续</PrimaryButton></div>
    </StepSection>
  );
}

function JdStep(props: {
  jdMatches: JobAssistJdMatch[];
  selectedJdId: string;
  companyName: string;
  positionName: string;
  city: string;
  jdText: string;
  busy: boolean;
  accent: string;
  onSelectJd: (value: string) => void;
  onCompanyName: (value: string) => void;
  onPositionName: (value: string) => void;
  onCity: (value: string) => void;
  onJdText: (value: string) => void;
  onAnalyze: () => void;
}) {
  const selected = props.jdMatches.find((item) => item.id === props.selectedJdId) ?? null;
  return (
    <StepSection title="JD 匹配" intro="先检查硬门槛，再给出分数、简历证据和三类缺口。">
      {props.jdMatches.length > 0 && (
        <Field label="历史分析">
          <Select value={props.selectedJdId} onChange={(event) => props.onSelectJd(event.target.value)}>
            {props.jdMatches.map((item) => <option key={item.id} value={item.id}>{item.company_name || '未填公司'} · {item.position_name || '未填岗位'} · {item.match_score ?? '门槛未过'}分</option>)}
          </Select>
        </Field>
      )}
      {selected && <JdResult jd={selected} />}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3">
        <Field label="公司名称"><TextInput value={props.companyName} onChange={(event) => props.onCompanyName(event.target.value)} placeholder="便于后续记录投递" /></Field>
        <Field label="岗位名称"><TextInput value={props.positionName} onChange={(event) => props.onPositionName(event.target.value)} placeholder="如：产品经理" /></Field>
        <Field label="城市"><TextInput value={props.city} onChange={(event) => props.onCity(event.target.value)} placeholder="如：深圳" /></Field>
      </div>
      <Field label="粘贴完整 JD 文本">
        <TextArea value={props.jdText} onChange={(event) => props.onJdText(event.target.value)} placeholder="粘贴岗位职责、任职要求、学历/年限/城市等信息…" style={{ minHeight: 190 }} />
      </Field>
      <div className="flex justify-end"><PrimaryButton accent={props.accent} onClick={props.onAnalyze} disabled={props.busy}>检查硬门槛并评分</PrimaryButton></div>
    </StepSection>
  );
}

function JdResult({ jd }: { jd: JobAssistJdMatch }) {
  return (
    <div style={{ ...resultBlockStyle, marginBottom: 16 }}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <strong>{jd.eligible ? '通过硬门槛' : '硬门槛未通过'}</strong>
        <span style={{ fontSize: 18, fontWeight: 800 }}>{jd.match_score === null ? '不评分' : `${jd.match_score} 分`}</span>
      </div>
      <div style={mutedStyle}>证据覆盖 {jd.coverage}% · 置信度 {jd.confidence} · {jd.summary}</div>
      <ResultBlock title="硬门槛" items={jd.hard_requirements.map((item) => `${item.passed === true ? '✓' : item.passed === false ? '✕' : '?'} ${item.requirement} —— ${item.evidence}`)} />
      <ResultBlock title="简历证据" items={jd.evidence} />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2" style={{ marginTop: 10 }}>
        <ResultBlock title="表达缺口" items={jd.presentation_gaps} tone="warning" />
        <ResultBlock title="信息缺口" items={jd.information_gaps} tone="warning" />
        <ResultBlock title="能力缺口" items={jd.capability_gaps} tone="danger" />
      </div>
    </div>
  );
}

function TailoringAndApplicationStep(props: {
  jd: JobAssistJdMatch | null;
  status: ApplicationStatus;
  notes: string;
  busy: boolean;
  accent: string;
  onStatus: (value: ApplicationStatus) => void;
  onNotes: (value: string) => void;
  onTailor: () => void;
  onSaveVersion: () => void;
  onSaveApplication: () => void;
}) {
  if (!props.jd) return <StatusPanel text="请先到“JD 匹配”完成一份分析。" />;
  return (
    <StepSection title="定制简历与投递记录" intro="定制草稿只使用简历和已确认事实；记录会写入现有投递模块。">
      <JdResult jd={props.jd} />
      <div className="flex flex-wrap gap-2">
        <PrimaryButton accent={props.accent} onClick={props.onTailor} disabled={props.busy}>生成定制建议与草稿</PrimaryButton>
        <GhostButton onClick={props.onSaveVersion} disabled={props.busy || !props.jd.tailored_draft}>保存为新简历版本</GhostButton>
      </div>
      {props.jd.tailoring_suggestions.length > 0 && <ResultBlock title="修改建议" items={props.jd.tailoring_suggestions} />}
      {props.jd.tailored_draft && <div style={{ ...resultBlockStyle, marginTop: 12 }}><strong>修订后的文字草稿</strong><div style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.75, marginTop: 10, maxHeight: 320, overflowY: 'auto' }}>{props.jd.tailored_draft}</div></div>}

      <div style={{ borderTop: '1px solid #eee5d8', marginTop: 22, paddingTop: 18 }}>
        <h4 style={{ margin: '0 0 12px' }}>写入关联投递</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
          <Field label="状态"><Select value={props.status} onChange={(event) => props.onStatus(event.target.value as ApplicationStatus)}>{APPLICATION_STATUSES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</Select></Field>
          <Field label="备注"><TextInput value={props.notes} onChange={(event) => props.onNotes(event.target.value)} placeholder="如：等待内推 / 已约一面" /></Field>
        </div>
        <div className="flex justify-end"><PrimaryButton accent={props.accent} onClick={props.onSaveApplication} disabled={props.busy}>保存到投递记录</PrimaryButton></div>
      </div>

      <div style={{ ...resultBlockStyle, marginTop: 18, opacity: 0.7 }}>
        <strong>网申草稿（后续版本）</strong>
        <p style={{ ...mutedStyle, marginBottom: 8 }}>第一期不做浏览器自动网申。未来也只会生成填写清单或停在最终提交前。</p>
        <GhostButton disabled>即将上线</GhostButton>
      </div>
    </StepSection>
  );
}

function InterviewStep(props: {
  jd: JobAssistJdMatch | null;
  session: JobAssistInterviewSession | null;
  questionIndex: number;
  answer: string;
  feedback: InterviewFeedback | null;
  averageScore: number;
  busy: boolean;
  accent: string;
  onAnswer: (value: string) => void;
  onStart: () => void;
  onScore: () => void;
  onRetry: () => void;
  onNext: () => void;
}) {
  if (!props.jd) return <StatusPanel text="请先到“JD 匹配”选择一个岗位。" />;
  if (!props.session) {
    return (
      <StepSection title="文字模拟面试" intro="至少 3 题，一次一题。评分后可重答或继续；不会保存你的逐字回答。">
        <PrimaryButton accent={props.accent} onClick={props.onStart} disabled={props.busy}>开始 3 题模拟面试</PrimaryButton>
      </StepSection>
    );
  }
  const question = props.session.plan[props.questionIndex];
  const complete = props.session.status === 'completed' && props.questionIndex + 1 >= props.session.plan.length;
  return (
    <StepSection title="文字模拟面试" intro={`第 ${props.questionIndex + 1} / ${props.session.plan.length} 题 · ${question.type}`}>
      <div style={{ ...resultBlockStyle, fontSize: 16, fontWeight: 700 }}>{question.question}<div style={{ ...mutedStyle, fontWeight: 400 }}>考察重点：{question.focus}</div></div>
      {!props.feedback && !complete && (
        <>
          <Field label="你的回答（仅用于本次即时评分，不写入数据库）"><TextArea value={props.answer} onChange={(event) => props.onAnswer(event.target.value)} style={{ minHeight: 150 }} placeholder="请按真实经历回答；没有准确数字时直接说明没有。" /></Field>
          <div className="flex justify-end"><PrimaryButton accent={props.accent} onClick={props.onScore} disabled={props.busy}>提交本题回答并评分</PrimaryButton></div>
        </>
      )}
      {props.feedback && (
        <div className="flex flex-col gap-3" style={{ marginTop: 14 }}>
          <div style={{ ...resultBlockStyle, background: '#f0f6ec' }}><strong>本题 {props.feedback.total_score} 分</strong><p style={mutedStyle}>{props.feedback.effective_point}</p></div>
          <ResultBlock title="最大问题" items={[props.feedback.main_issue]} tone="warning" />
          <ResultBlock title="推荐结构" items={[props.feedback.recommended_structure]} />
          <div style={resultBlockStyle}><strong>不虚构事实的润色示例</strong><p style={{ fontSize: 13, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{props.feedback.improved_example}</p></div>
          <div className="flex justify-end gap-2 flex-wrap">
            {!complete && <GhostButton onClick={props.onRetry} disabled={props.busy}>重答本题</GhostButton>}
            {props.questionIndex + 1 < props.session.plan.length && <PrimaryButton accent={props.accent} onClick={props.onNext} disabled={props.busy}>继续下一题</PrimaryButton>}
          </div>
        </div>
      )}
      {complete && (
        <div style={{ ...resultBlockStyle, background: '#f0f6ec', marginTop: 14 }}>
          <strong>3 题训练完成 · 当前平均 {props.averageScore} 分</strong>
          <p style={mutedStyle}>已保存每题分数、问题标签和简短改进摘要；未保存回答原文和完整润色答案。</p>
        </div>
      )}
    </StepSection>
  );
}

function StepSection({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return <section><h3 style={{ margin: '0 0 5px', fontSize: 17 }}>{title}</h3><p style={{ ...mutedStyle, margin: '0 0 18px' }}>{intro}</p>{children}</section>;
}

function ResultBlock({ title, items, tone = 'normal' }: { title: string; items: string[]; tone?: 'normal' | 'warning' | 'danger' }) {
  const background = tone === 'danger' ? '#fff0ec' : tone === 'warning' ? '#fff8e6' : '#faf7f0';
  return (
    <div style={{ ...resultBlockStyle, background, marginTop: 10 }}>
      <strong style={{ fontSize: 13.5 }}>{title}</strong>
      {items.length === 0 ? <p style={mutedStyle}>暂无</p> : <ul style={{ margin: '8px 0 0', paddingLeft: 18, fontSize: 12.8, lineHeight: 1.65 }}>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul>}
    </div>
  );
}

function StatusPanel({ text }: { text: string }) {
  return <div style={{ ...resultBlockStyle, textAlign: 'center', padding: 24, color: '#706a60' }}>⏳ {text}</div>;
}

function EmptyResumePanel() {
  return (
    <div style={{ ...resultBlockStyle, textAlign: 'center', padding: 30 }}>
      <div style={{ fontSize: 34 }}>📄</div><h3>请先上传简历本体</h3>
      <p style={mutedStyle}>求职辅助只读取当前卡片中已上传的 PDF / DOCX 简历。关闭此窗口后，点击卡片上的“上传简历”。</p>
    </div>
  );
}

function Notice({ text }: { text: string }) {
  return <div style={{ background: '#edf6e9', color: '#315e38', padding: '10px 13px', borderRadius: 12, fontSize: 12.8, fontWeight: 600, marginBottom: 14 }}>{text}</div>;
}

const overlayStyle: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 450, background: 'rgba(35, 28, 24, .38)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'flex-end' };
const drawerStyle: React.CSSProperties = { width: 'min(760px, 100vw)', height: '100vh', background: '#fffdfa', boxShadow: '-22px 0 60px rgba(80, 50, 30, .18)', display: 'flex', flexDirection: 'column' };
const headerStyle: React.CSSProperties = { padding: '18px 22px 14px', borderBottom: '1px solid #eee6da', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 };
const closeButtonStyle: React.CSSProperties = { width: 38, height: 38, borderRadius: 11, border: '1px solid #e5ddcf', background: '#faf7f0', cursor: 'pointer', color: '#6f695f' };
const stepNavStyle: React.CSSProperties = { display: 'flex', gap: 7, overflowX: 'auto', padding: '12px 18px', borderBottom: '1px solid #f1eadd' };
const stepButtonStyle: React.CSSProperties = { flex: '0 0 auto', border: '1px solid', borderRadius: 999, padding: '7px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 };
const bodyStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '20px 22px 28px' };
const footerStyle: React.CSSProperties = { padding: '12px 20px', borderTop: '1px solid #eee6da', background: '#faf7f0' };
const choiceCardStyle: React.CSSProperties = { minHeight: 105, border: '1.5px solid', borderRadius: 16, padding: 18, cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 7, textAlign: 'left' };
const resultBlockStyle: React.CSSProperties = { border: '1px solid #ece4d6', borderRadius: 14, padding: '12px 14px', background: '#faf7f0' };
const mutedStyle: React.CSSProperties = { color: '#837d72', fontSize: 12.5, lineHeight: 1.6, marginTop: 5 };
