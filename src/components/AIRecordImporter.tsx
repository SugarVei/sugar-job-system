import { useState } from 'react';
import { useApiKeys } from '../contexts/ApiKeysContext';
import { useTheme } from '../contexts/ThemeContext';
import { PROVIDERS } from '../lib/providers';
import { FormError, PrimaryButton, TextArea } from './Field';

export interface ApplicationExtraction {
  company_name: string | null;
  position_name: string | null;
  city: string | null;
  channel: string | null;
  apply_date: string | null;
  status: string;
  salary_range: string | null;
  job_url: string | null;
  jd_text: string | null;
  jd_keywords: string[];
  next_action: string | null;
  next_action_at: string | null;
  deadline_at: string | null;
  priority: string;
  notes: string | null;
}

export interface OfferExtraction {
  company_name: string | null;
  position_name: string | null;
  city: string | null;
  department: string | null;
  manager_or_contact: string | null;
  workplace: string | null;
  work_schedule: string | null;
  join_date: string | null;
  reply_deadline: string | null;
  offer_status: string;
  base_salary: number | null;
  salary_months: number | null;
  bonus: number | null;
  subsidy: number | null;
  annual_package: number | null;
  social_security: string | null;
  housing_fund: string | null;
  stock_or_options: string | null;
  probation_months: number | null;
  probation_ratio: number | null;
  overtime_policy: string | null;
  hr_offer: string | null;
  negotiation_notes: string | null;
  next_action: string | null;
  next_action_at: string | null;
  is_big_week: boolean;
  is_overtime: boolean;
  is_remote: boolean;
  probation_cut: boolean;
  has_penalty: boolean;
  risk_notes: string | null;
  decision_notes: string | null;
  final_decision: string | null;
  notes: string | null;
}

interface Props<T> {
  kind: 'application' | 'offer';
  onApply: (data: T) => void;
}

export default function AIRecordImporter<T extends ApplicationExtraction | OfferExtraction>({ kind, onApply }: Props<T>) {
  const { getActiveConfig, activeProvider } = useApiKeys();
  const { theme } = useTheme();
  const [sourceText, setSourceText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const isApplication = kind === 'application';

  const recognize = async () => {
    const text = sourceText.trim();
    if (!text || loading) return;
    const config = getActiveConfig();
    if (!config) {
      setError('请先在左侧“AI 设置”中配置并选中一个可用的 API Key。');
      setSuccess('');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await fetch('/api/record-extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
          sourceText: text,
          provider: config.provider,
          apiKey: config.apiKey,
          model: config.model,
        }),
      });
      const result = await response.json() as { data?: T; error?: string };
      if (!response.ok || result.error || !result.data) throw new Error(result.error || 'AI 没有返回可用的识别结果。');
      onApply(result.data);
      setSuccess('识别完成，已自动回填表单。请核对后再保存。');
    } catch (recognitionError) {
      setError(recognitionError instanceof Error ? recognitionError.message : String(recognitionError));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="ai-record-importer" style={{ borderColor: `${theme.accent}32`, background: theme.accentSoft }}>
      <div className="ai-record-importer__header">
        <div className="ai-record-importer__badge" style={{ background: theme.accent }}>AI</div>
        <div>
          <div className="ai-record-importer__title">{isApplication ? 'AI 智能识别岗位信息' : 'AI 智能识别 Offer'}</div>
          <div className="ai-record-importer__subtitle">
            使用当前的 {PROVIDERS[activeProvider].label} · 只回填表单，不会直接保存
          </div>
        </div>
      </div>
      <TextArea
        value={sourceText}
        onChange={event => setSourceText(event.target.value)}
        placeholder={isApplication
          ? '粘贴招聘网站中的岗位 JD、职位描述或 HR 沟通内容…'
          : '粘贴 Offer 邮件、录用通知、薪资说明或 HR 聊天内容…'}
        style={{ minHeight: 104, background: '#fffdf8', resize: 'vertical' }}
      />
      <div className="ai-record-importer__actions">
        <span>AI 可能识别不完整，保存前请核对关键金额和日期。</span>
        <PrimaryButton
          type="button"
          accent={theme.accent}
          onClick={() => void recognize()}
          disabled={!sourceText.trim() || loading}
          style={{ minWidth: 168 }}
        >
          {loading ? '正在识别…' : '智能识别并填充'}
        </PrimaryButton>
      </div>
      {error && <FormError message={error} />}
      {success && <div className="ai-record-importer__success" role="status">{success}</div>}
    </section>
  );
}
